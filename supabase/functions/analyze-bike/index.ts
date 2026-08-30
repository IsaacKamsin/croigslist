const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type OpenAIAnalysis = {
  base_bike?: {
    brand?: string;
    model?: string;
    year_estimate?: string;
  };
  build_style?: string;
  handlebar_type?: string;
  seat_type?: string;
  exhaust_type?: string;
  tank_style?: string;
  notable_mods?: string[];
  color_scheme?: string;
  overall_condition?: string;
  vibe?: string;
  confidence?: number;
};

const VISION_PROMPT = `You are analyzing a motorcycle photo for a members-only motorcycle registry. The community cares about how bikes are built, not just what they are off the lot. Custom builds, cafe racers, trackers, scramblers, and project bikes are the core audience.

Analyze this motorcycle image and return ONLY valid JSON with no other text, no markdown fences:

{
  "base_bike": {
    "brand": "manufacturer name",
    "model": "model name or best guess",
    "year_estimate": "year or range like 2020-2024"
  },
  "build_style": "cafe racer | scrambler | tracker | bobber | cruiser | adventure | sport | standard | touring | project | stock | custom",
  "handlebar_type": "clip-on | drag | clubman | tracker | stock | ADV | ape hanger | other",
  "seat_type": "solo cowl | brat | tuck-and-roll | cafe hump | stock | touring | custom",
  "exhaust_type": "2-into-1 | megaphone | wrapped | shorty | pod | slip-on | full system | stock",
  "tank_style": "stock | peanut | manx | benelli | tracker | custom",
  "notable_mods": ["list of visible modifications or aftermarket parts"],
  "color_scheme": "primary colors and finish description",
  "overall_condition": "show | daily | project | rough",
  "vibe": "one sentence describing the feel and energy of this bike as a rider would describe it to a friend",
  "confidence": 0.0 to 1.0
}

If you cannot identify the motorcycle clearly, still provide your best guess and set confidence below 0.5. Focus on build characteristics over factory specs.`;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function extractJson(text: string) {
  const clean = text.replace(/```json\n?|```\n?/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("OpenAI response did not contain JSON.");
  }

  return JSON.parse(clean.slice(start, end + 1)) as OpenAIAnalysis;
}

function normalize(parsed: OpenAIAnalysis) {
  return {
    baseBike: {
      brand: parsed.base_bike?.brand ?? "Unknown",
      model: parsed.base_bike?.model ?? "Unknown",
      yearEstimate: parsed.base_bike?.year_estimate ?? "Unknown",
    },
    buildStyle: parsed.build_style ?? "unknown",
    handlebarType: parsed.handlebar_type ?? "unknown",
    seatType: parsed.seat_type ?? "unknown",
    exhaustType: parsed.exhaust_type ?? "unknown",
    tankStyle: parsed.tank_style ?? "unknown",
    notableMods: Array.isArray(parsed.notable_mods)
      ? parsed.notable_mods
      : [],
    colorScheme: parsed.color_scheme ?? "unknown",
    overallCondition: parsed.overall_condition ?? "unknown",
    vibe: parsed.vibe ?? "",
    confidence:
      typeof parsed.confidence === "number"
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0,
  };
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

    const { imageDataUrl } = await req.json();
    if (
      typeof imageDataUrl !== "string" ||
      !imageDataUrl.startsWith("data:image/")
    ) {
      return jsonResponse({ error: "imageDataUrl is required." }, 400);
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: imageDataUrl,
                  detail: "high",
                },
              },
              {
                type: "text",
                text: VISION_PROMPT,
              },
            ],
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
    return jsonResponse(normalize(extractJson(text)));
  } catch (error) {
    return jsonResponse(
      {
        error:
          error instanceof Error ? error.message : "Bike analysis failed.",
      },
      500,
    );
  }
});
