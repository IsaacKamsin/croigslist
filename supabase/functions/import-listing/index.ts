const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const IMAGE_BUCKET = "listing-images";
const MAX_IMPORTED_IMAGES = 10;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const EXTRACT_PROMPT = `You are extracting motorcycle listing data from a marketplace page.
Parse the content and return ONLY valid JSON with no other text, no markdown fences:

{
  "year": "year as string, e.g. '1975'",
  "make": "manufacturer, e.g. 'Honda'",
  "model": "model name",
  "price": "price as string without $, e.g. '4200'",
  "mileage": "mileage/odometer as string, e.g. '23400'. Use '' if not listed",
  "description": "the listing description text, cleaned up. Max 500 chars",
  "condition": "rideable or project — your best guess from the description",
  "location": "city/area if mentioned, e.g. 'Minneapolis, MN'",
  "category": "bike or part — choose part only for motorcycle parts/accessories"
}

If you cannot determine a field, use an empty string. Always try your best to extract year, make, model, price, and mileage. Facebook may label mileage as odometer.`;

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

function cleanPlainText(value: string) {
  return decodeHtml(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

function extractTitleCandidates(html: string) {
  const decodedHtml = decodeHtml(html);
  const source = `${html}\n${decodedHtml}`;
  const candidates = new Set<string>();

  for (const value of extractMetaContent(source, [
    "title",
    "og:title",
    "twitter:title",
  ])) {
    const cleaned = cleanPlainText(value);
    if (cleaned) candidates.add(cleaned);
  }

  const titleMatches = source.matchAll(/<title[^>]*>([\s\S]*?)<\/title>/gi);
  for (const match of titleMatches) {
    const cleaned = cleanPlainText(match[1]);
    if (cleaned) candidates.add(cleaned);
  }

  return Array.from(candidates)
    .filter((candidate) => {
      const lower = candidate.toLowerCase();
      return (
        candidate.length > 3 &&
        !lower.includes("log in") &&
        !lower.includes("facebook helps you connect")
      );
    })
    .slice(0, 5);
}

function extractPriceCandidate(text: string) {
  const patterns = [
    /\$\s?([0-9][0-9,.]*)\b/,
    /["'](?:price|amount|listing_price|formatted_price)["']\s*:\s*["']?\$?\s?([0-9][0-9,.]*)/i,
    /\b([0-9][0-9,.]*)\s*(?:usd|dollars)\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].replace(/[,.]/g, "");
  }

  return "";
}

function extractMileageCandidate(text: string) {
  const patterns = [
    /\b(?:mileage|odometer)\b[^0-9]{0,24}([0-9][0-9,.]*)\s*(?:mi|miles)?\b/i,
    /\b([0-9][0-9,.]*)\s*(?:mi|miles)\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].replace(/[,.]/g, "");
  }

  return "";
}

function extractVehicleCandidate(text: string) {
  const makes = [
    "Aprilia",
    "BMW",
    "Ducati",
    "Harley-Davidson",
    "Harley Davidson",
    "Honda",
    "Husqvarna",
    "Indian",
    "Kawasaki",
    "KTM",
    "Moto Guzzi",
    "Royal Enfield",
    "Suzuki",
    "Triumph",
    "Yamaha",
  ];
  const cleaned = cleanPlainText(text)
    .replace(/\|/g, " ")
    .replace(/ - Marketplace.*$/i, " ")
    .replace(/\$\s?[0-9][0-9,.]*/g, " ")
    .replace(/\bfor sale\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const yearMatch = cleaned.match(/\b(19[3-9]\d|20[0-3]\d)\b/);
  const year = yearMatch?.[1] ?? "";
  const make = makes.find((candidate) =>
    new RegExp(`\\b${candidate.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "i").test(cleaned),
  ) ?? "";

  let model = "";
  if (make) {
    const makePattern = make.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&").replace(/\s+/g, "\\s+");
    const afterMake = cleaned.match(
      new RegExp(`\\b${makePattern}\\b\\s+([^|,;\\n]+)`, "i"),
    )?.[1] ?? "";
    model = afterMake
      .replace(/\b(19[3-9]\d|20[0-3]\d)\b/g, " ")
      .replace(/\b(motorcycle|bike|dirt bike|street bike|for sale)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .slice(0, 4)
      .join(" ");
  }

  return { year, make, model };
}

function extractFallbackFields(candidates: string[]) {
  const joined = candidates.join(" ");
  return {
    ...extractVehicleCandidate(joined),
    price: extractPriceCandidate(joined),
    mileage: extractMileageCandidate(joined),
  };
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

function extensionForContentType(contentType: string) {
  const normalized = contentType.split(";")[0]?.trim().toLowerCase();
  if (normalized === "image/png") return "png";
  if (normalized === "image/webp") return "webp";
  return "jpg";
}

function isSupportedImageContentType(contentType: string) {
  const normalized = contentType.split(";")[0]?.trim().toLowerCase();
  return ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(normalized);
}

function publicStorageUrl(supabaseUrl: string, path: string) {
  return `${supabaseUrl}/storage/v1/object/public/${IMAGE_BUCKET}/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

// The function fetches user-supplied URLs server-side and uploads the result
// with the service role key, so an unguarded fetch is an SSRF into anything the
// function can reach. Block loopback, private, link-local and metadata targets,
// and re-check after each redirect hop rather than letting fetch follow blindly.
const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.goog",
  "instance-data",
]);

function isPrivateIpv4(host: string) {
  const parts = host.split(".");
  if (parts.length !== 4) return false;

  const octets = parts.map((part) => Number(part));
  if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return false;
  }

  const [a, b] = octets;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

function isBlockedHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (BLOCKED_HOSTNAMES.has(host)) return true;
  if (host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) {
    return true;
  }
  if (isPrivateIpv4(host)) return true;

  // IPv6 loopback, unique-local (fc00::/7) and link-local (fe80::/10).
  if (host === "::1" || host === "::") return true;
  if (/^f[cd][0-9a-f]{2}:/.test(host)) return true;
  if (/^fe[89ab][0-9a-f]:/.test(host)) return true;
  // IPv4-mapped IPv6, e.g. ::ffff:127.0.0.1
  const mapped = host.match(/^::ffff:(.+)$/);
  if (mapped && isPrivateIpv4(mapped[1])) return true;

  return false;
}

function assertFetchableUrl(rawUrl: string) {
  const parsed = new URL(rawUrl);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only http and https URLs are allowed.");
  }
  if (isBlockedHost(parsed.hostname)) {
    throw new Error("That host is not allowed.");
  }
  return parsed;
}

const MAX_REDIRECTS = 5;

// fetch() with redirect:"follow" would resolve a public host to a private one
// without us ever seeing the hop, so each Location is validated in turn.
async function safeFetch(rawUrl: string, init: RequestInit) {
  let current = assertFetchableUrl(rawUrl);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const response = await fetch(current.toString(), { ...init, redirect: "manual" });

    if (response.status < 300 || response.status > 399) return response;

    const location = response.headers.get("location");
    if (!location) return response;

    await response.body?.cancel();
    current = assertFetchableUrl(new URL(location, current).toString());
  }

  throw new Error("Too many redirects.");
}

async function fetchImage(url: string) {
  const response = await safeFetch(url, {
    signal: AbortSignal.timeout(12000),
    headers: {
      "Accept": "image/webp,image/jpeg,image/png,image/*;q=0.8",
      "Referer": new URL(url).hostname.includes("fbcdn")
        ? "https://www.facebook.com/"
        : new URL(url).origin,
      "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
    },
  });

  if (!response.ok) return null;

  const contentType = response.headers.get("content-type") ?? "";
  if (!isSupportedImageContentType(contentType)) return null;

  const contentLength = Number(response.headers.get("content-length") ?? "0");
  if (contentLength > MAX_IMAGE_BYTES) return null;

  const body = await response.arrayBuffer();
  if (body.byteLength === 0 || body.byteLength > MAX_IMAGE_BYTES) return null;

  return { body, contentType };
}

async function uploadImportedImages(urls: string[]) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) return [];

  const uploaded: string[] = [];
  const uniqueUrls = Array.from(new Set(urls)).slice(0, MAX_IMPORTED_IMAGES);

  for (let index = 0; index < uniqueUrls.length; index += 1) {
    try {
      const image = await fetchImage(uniqueUrls[index]);
      if (!image) continue;

      const extension = extensionForContentType(image.contentType);
      const storagePath = `imports/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${index}.${extension}`;
      const uploadResponse = await fetch(
        `${supabaseUrl}/storage/v1/object/${IMAGE_BUCKET}/${storagePath}`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${serviceRoleKey}`,
            "apikey": serviceRoleKey,
            "Content-Type": image.contentType,
            "x-upsert": "true",
          },
          body: image.body,
        },
      );

      if (!uploadResponse.ok) continue;
      uploaded.push(publicStorageUrl(supabaseUrl, storagePath));
    } catch {
      continue;
    }
  }

  return uploaded;
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

    let parsedUrl: URL;
    try {
      parsedUrl = assertFetchableUrl(url);
    } catch (urlError) {
      return jsonResponse(
        { error: urlError instanceof Error ? urlError.message : "Invalid URL." },
        400,
      );
    }

    let html = "";
    let pageContent = "";
    let titleCandidates: string[] = [];
    let descriptionCandidates: string[] = [];

    try {
      const pageResponse = await safeFetch(parsedUrl.toString(), {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
        },
      });
      html = await pageResponse.text();
      titleCandidates = extractTitleCandidates(html);
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

    const sourceImages = html ? extractImageUrls(html) : [];
    const images = await uploadImportedImages(sourceImages);
    const fallbackFields = extractFallbackFields([
      ...titleCandidates,
      ...descriptionCandidates,
      pageContent,
    ]);

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
            content: `Extract motorcycle listing data from this marketplace page:\n\nURL: ${parsedUrl.toString()}\n\nTitle candidates from page metadata:\n${titleCandidates.join("\n\n---\n\n") || "[none]"}\n\nDescription candidates from page metadata or embedded JSON:\n${descriptionCandidates.join("\n\n---\n\n") || "[none]"}\n\nPage content:\n${pageContent}`,
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
      year: parsed.year || fallbackFields.year || "",
      make: parsed.make || fallbackFields.make || "",
      model: parsed.model || fallbackFields.model || "",
      price: parsed.price || fallbackFields.price || "",
      mileage: parsed.mileage || fallbackFields.mileage || "",
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
