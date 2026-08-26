/**
 * Import motorcycle listing data + images from a URL.
 *
 * 1. Fetches the page HTML
 * 2. Extracts large image URLs directly from the HTML (og:image, srcset, etc.)
 * 3. Sends text content to GPT-4o to extract structured listing data
 */

const API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? "";

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
  "location": "city/area if mentioned, e.g. 'Minneapolis, MN'"
}

If you cannot determine a field, use an empty string. Always try your best to extract year, make, model, and price.`;

export interface ImportedListing {
  year: string;
  make: string;
  model: string;
  price: string;
  mileage: string;
  description: string;
  condition: string;
  location: string;
  images: string[];
}

/**
 * Extract image URLs from raw HTML.
 * Looks for og:image meta tags, high-res img src/srcset, and common
 * marketplace image patterns. Filters to likely listing photos.
 */
function extractImageUrls(html: string): string[] {
  const urls = new Set<string>();

  // 1. Open Graph images (highest priority — usually the main listing photo)
  const ogMatches = html.matchAll(
    /property=["']og:image["']\s+content=["']([^"']+)["']/gi
  );
  for (const m of ogMatches) urls.add(m[1]);

  // Also catch content before property
  const ogMatches2 = html.matchAll(
    /content=["']([^"']+)["']\s+property=["']og:image["']/gi
  );
  for (const m of ogMatches2) urls.add(m[1]);

  // 2. Large images from img tags (filter out icons/logos by URL patterns)
  const imgMatches = html.matchAll(
    /(?:src|data-src)=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["']/gi
  );
  for (const m of imgMatches) {
    const url = m[1];
    // Skip tiny images, tracking pixels, icons, logos
    if (
      url.includes("icon") ||
      url.includes("logo") ||
      url.includes("avatar") ||
      url.includes("sprite") ||
      url.includes("1x1") ||
      url.includes("pixel") ||
      url.includes("badge") ||
      url.includes("btn") ||
      url.includes("flag")
    ) continue;
    urls.add(url);
  }

  // 3. srcset large variants
  const srcsetMatches = html.matchAll(
    /srcset=["']([^"']+)["']/gi
  );
  for (const m of srcsetMatches) {
    const entries = m[1].split(",").map((s) => s.trim());
    for (const entry of entries) {
      const parts = entry.split(/\s+/);
      const url = parts[0];
      const descriptor = parts[1] ?? "";
      // Prefer larger images (2x, 800w+, etc.)
      if (
        url.match(/^https?:\/\//) &&
        url.match(/\.(jpg|jpeg|png|webp)/i) &&
        !url.includes("icon") &&
        !url.includes("logo")
      ) {
        // Prefer images with larger descriptors
        const widthMatch = descriptor.match(/(\d+)w/);
        if (widthMatch && parseInt(widthMatch[1]) < 200) continue;
        urls.add(url);
      }
    }
  }

  // 4. eBay-specific: look for i.ebayimg.com URLs
  const ebayMatches = html.matchAll(
    /(https?:\/\/i\.ebayimg\.com\/images\/g\/[^"'\s]+)/gi
  );
  for (const m of ebayMatches) {
    let url = m[1];
    // Upsize eBay thumbnails to large
    url = url.replace(/\/s-l\d+\./, "/s-l800.");
    urls.add(url);
  }

  // 5. Craigslist-specific: look for images.craigslist.org
  const clMatches = html.matchAll(
    /(https?:\/\/images\.craigslist\.org\/[^"'\s]+)/gi
  );
  for (const m of clMatches) urls.add(m[1]);

  // Deduplicate and limit to 10
  return Array.from(urls).slice(0, 10);
}

export async function importFromUrl(url: string): Promise<ImportedListing> {
  let html = "";
  let pageContent = "";

  // Fetch the page
  try {
    const resp = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      },
    });
    html = await resp.text();
    // Strip scripts/styles for GPT, keep text
    pageContent = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 8000);
  } catch {
    pageContent = `[Could not fetch page. URL: ${url}]`;
  }

  // Extract images from raw HTML (before stripping tags)
  const images = html ? extractImageUrls(html) : [];

  // Extract listing data via GPT-4o
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      max_tokens: 512,
      messages: [
        { role: "system", content: EXTRACT_PROMPT },
        {
          role: "user",
          content: `Extract motorcycle listing data from this marketplace page:\n\nURL: ${url}\n\nPage content:\n${pageContent}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content ?? "";
  const clean = text.replace(/```json\n?|```\n?/g, "").trim();
  const parsed = JSON.parse(clean);

  return {
    year: parsed.year ?? "",
    make: parsed.make ?? "",
    model: parsed.model ?? "",
    price: parsed.price ?? "",
    mileage: parsed.mileage ?? "",
    description: parsed.description ?? "",
    condition: parsed.condition ?? "",
    location: parsed.location ?? "",
    images,
  };
}
