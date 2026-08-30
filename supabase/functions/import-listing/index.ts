const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const EXTRACT_PROMPT = `You are extracting motorcycle listing data from a marketplace page.
Parse the content and return ONLY valid JSON with no other text, no markdown fences:

{
  "year": "year as string, e.g. '1975'",
  "make": "manufacturer, e.g. 'Honda'",
  "model": "model name, e.g. 'CB550'",
  "price": "price as string without $, e.g. '4200'",
  "mileage": "mileage as string, e.g. '23400'. Use '' if not listed",
  "description": "the listing description text, cleaned up. Max 500 chars",
  "condition": "rideable or project — your best guess from the description",
  "location": "city/area if mentioned, e.g. 'Minneapolis, MN'",
  "category": "bike or part — choose part only for motorcycle parts/accessories"
}

If you cannot determine a field, use an empty string. Always try your best to extract year, make, model, and price.`;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function decodeHtml(value: string) {
  return value
    .replace(/\\\//g, "/")
    .replace(/\\n/g, "\n")
    .replace(/\\u0025/g, "%")
    .replace(/\\u0026/g, "&")
    .replace(/\\u003c/g, "<")
    .replace(/\\u003e/g, ">")
    .replace(/\\u003d/g, "=")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function cleanDescription(value: string) {
  return decodeHtml(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1200);
}

function extractMetaContent(source: string, names: string[]) {
  const escapedNames = names.map((name) => name.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"));
  const namePattern = `(?:${escapedNames.join("|")})`;
  const results: string[] = [];

  const attrFirst = source.matchAll(
    new RegExp(
      `(?:property|name)=["']${namePattern}["'][^>]+content=["']([^"']+)["']`,
      "gi",
    ),
  );
  for (const match of attrFirst) results.push(match[1]);

  const contentFirst = source.matchAll(
    new RegExp(
      `content=["']([^"']+)["'][^>]+(?:property|name)=["']${namePattern}["']`,
      "gi",
    ),
  );
  for (const match of contentFirst) results.push(match[1]);

  return results;
}

function extractDescriptionCandidates(html: string) {
  const decodedHtml = decodeHtml(html);
  const source = `${html}\n${decodedHtml}`;
  const candidates = new Set<string>();

  for (const value of extractMetaContent(source, [
    "description",
    "og:description",
    "twitter:description",
  ])) {
    const cleaned = cleanDescription(value);
    if (cleaned) candidates.add(cleaned);
  }

  const jsonDescriptionMatches = source.matchAll(
    /["'](?:description|redacted_description|listing_description|marketplace_listing_description|body|postBody|message)["']\s*:\s*["']((?:\\.|[^"'\\]){20,4000})["']/gi,
  );
  for (const match of jsonDescriptionMatches) {
    const cleaned = cleanDescription(match[1]);
    if (cleaned) candidates.add(cleaned);
  }

  return Array.from(candidates)
    .filter((candidate) => {
      const lower = candidate.toLowerCase();
      return (
        candidate.length > 20 &&
        !lower.includes("facebook helps you connect") &&
        !lower.includes("log in to facebook") &&
        !lower.includes("javascript")
      );
    })
    .slice(0, 5);
}

function extractImageUrls(html: string): string[] {
  const urls = new Set<string>();
  const decodedHtml = decodeHtml(html);
  const source = `${html}\n${decodedHtml}`;

  const ogMatches = source.matchAll(
    /property=["']og:image["']\s+content=["']([^"']+)["']/gi,
  );
  for (const match of ogMatches) urls.add(match[1]);

  const ogMatches2 = source.matchAll(
    /content=["']([^"']+)["']\s+property=["']og:image["']/gi,
  );
  for (const match of ogMatches2) urls.add(match[1]);

  const metaImageMatches = source.matchAll(
    /(?:property|name)=["'](?:twitter:image|twitter:image:src|og:image:url)["'][^>]+content=["']([^"']+)["']/gi,
  );
  for (const match of metaImageMatches) urls.add(match[1]);

  const metaImageMatches2 = source.matchAll(
    /content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:twitter:image|twitter:image:src|og:image:url)["']/gi,
  );
  for (const match of metaImageMatches2) urls.add(match[1]);

  const imgMatches = source.matchAll(
    /(?:src|data-src|data-original|data-full)=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["']/gi,
  );
  for (const match of imgMatches) {
    const imageUrl = match[1];
    if (
      imageUrl.includes("icon") ||
      imageUrl.includes("logo") ||
      imageUrl.includes("avatar") ||
      imageUrl.includes("sprite") ||
      imageUrl.includes("1x1") ||
      imageUrl.includes("pixel") ||
      imageUrl.includes("badge") ||
      imageUrl.includes("btn") ||
      imageUrl.includes("flag")
    ) {
      continue;
    }
    urls.add(imageUrl);
  }

  const srcsetMatches = source.matchAll(/srcset=["']([^"']+)["']/gi);
  for (const match of srcsetMatches) {
    const entries = match[1].split(",").map((entry) => entry.trim());
    for (const entry of entries) {
      const parts = entry.split(/\s+/);
      const imageUrl = parts[0];
      const descriptor = parts[1] ?? "";
      if (
        imageUrl.match(/^https?:\/\//) &&
        imageUrl.match(/\.(jpg|jpeg|png|webp)/i) &&
        !imageUrl.includes("icon") &&
        !imageUrl.includes("logo")
      ) {
        const widthMatch = descriptor.match(/(\d+)w/);
        if (widthMatch && parseInt(widthMatch[1], 10) < 200) continue;
        urls.add(imageUrl);
      }
    }
  }

  const jsonImageMatches = source.matchAll(
    /["'](?:url|uri|src|image|image_url|imageURI|thumbnail|display_url)["']\s*:\s*["'](https?:\/\/[^"']+)["']/gi,
  );
  for (const match of jsonImageMatches) {
    const imageUrl = match[1];
    if (/\.(jpg|jpeg|png|webp)(?:\?|$)/i.test(imageUrl) || imageUrl.includes("fbcdn")) {
      urls.add(imageUrl);
    }
  }

  const fbCdnMatches = source.matchAll(
    /(https?:\/\/[^"'\s\\]+(?:fbcdn|scontent)[^"'\s\\]+)/gi,
  );
  for (const match of fbCdnMatches) urls.add(match[1]);

  const ebayMatches = source.matchAll(
    /(https?:\/\/i\.ebayimg\.com\/images\/g\/[^"'\s]+)/gi,
  );
  for (const match of ebayMatches) {
    urls.add(match[1].replace(/\/s-l\d+\./, "/s-l800."));
  }

  const craigslistMatches = source.matchAll(
    /(https?:\/\/images\.craigslist\.org\/[^"'\s]+)/gi,
  );
  for (const match of craigslistMatches) urls.add(match[1]);

  return Array.from(urls)
    .map((url) => url.replace(/\\u0026/g, "&").replace(/\\\//g, "/"))
    .filter((url) => {
      const lower = url.toLowerCase();
      return !lower.includes("emoji") && !lower.includes("profile");
    })
    .slice(0, 20);
}

function extractJson(text: string) {
  const clean = text.replace(/```json\n?|```\n?/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("OpenAI response did not contain JSON.");
  }

  return JSON.parse(clean.slice(start, end + 1));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return jsonResponse({ error: "Missing OPENAI_API_KEY." }, 500);
    }

    const { url } = await req.json();
    if (typeof url !== "string") {
      return jsonResponse({ error: "url is required." }, 400);
    }

    const parsedUrl = new URL(url);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return jsonResponse({ error: "Only http and https URLs are allowed." }, 400);
    }

    let html = "";
    let pageContent = "";
    let descriptionCandidates: string[] = [];

    try {
      const pageResponse = await fetch(parsedUrl.toString(), {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
        },
      });
      html = await pageResponse.text();
      descriptionCandidates = extractDescriptionCandidates(html);
      pageContent = html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 8000);
    } catch {
      pageContent = `[Could not fetch page. URL: ${parsedUrl.toString()}]`;
    }

    const images = html ? extractImageUrls(html) : [];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        max_tokens: 512,
        messages: [
          { role: "system", content: EXTRACT_PROMPT },
          {
            role: "user",
            content: `Extract motorcycle listing data from this marketplace page:\n\nURL: ${parsedUrl.toString()}\n\nDescription candidates from page metadata or embedded JSON:\n${descriptionCandidates.join("\n\n---\n\n") || "[none]"}\n\nPage content:\n${pageContent}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return jsonResponse(
        { error: `OpenAI request failed: ${errorText}` },
        response.status,
      );
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content ?? "";
    const parsed = extractJson(text);
    const fallbackDescription = descriptionCandidates[0] ?? "";

    return jsonResponse({
      year: parsed.year ?? "",
      make: parsed.make ?? "",
      model: parsed.model ?? "",
      price: parsed.price ?? "",
      mileage: parsed.mileage ?? "",
      description: parsed.description || fallbackDescription,
      condition: parsed.condition ?? "",
      location: parsed.location ?? "",
      category: parsed.category ?? "",
      images,
    });
  } catch (error) {
    return jsonResponse(
      {
        error:
          error instanceof Error ? error.message : "Listing import failed.",
      },
      500,
    );
  }
});
