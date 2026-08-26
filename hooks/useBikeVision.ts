// hooks/useBikeVision.ts

import { useState } from "react";

const API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? "";

export interface BikeAnalysis {
  baseBike: {
    brand: string;
    model: string;
    yearEstimate: string;
  };
  buildStyle: string;
  handlebarType: string;
  seatType: string;
  exhaustType: string;
  tankStyle: string;
  notableMods: string[];
  colorScheme: string;
  overallCondition: string;
  vibe: string;
  confidence: number;
}

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

async function imageToBase64(uri: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Strip the data:image/...;base64, prefix
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function useBikeVision() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = async (imageUri: string): Promise<BikeAnalysis | null> => {
    console.log("🔵 [BikeVision] Starting analysis...");
    console.log(
      "🔵 [BikeVision] API_KEY:",
      API_KEY ? `${API_KEY.slice(0, 10)}...${API_KEY.slice(-4)}` : "❌ EMPTY",
    );

    setLoading(true);
    setError(null);

    try {
      console.log("🔵 [BikeVision] Reading image as base64...");
      const base64 = await imageToBase64(imageUri);
      console.log("🔵 [BikeVision] Base64 length:", base64.length);

      const ext = imageUri.split(".").pop()?.toLowerCase();
      const mediaType =
        ext === "png"
          ? "image/png"
          : ext === "webp"
            ? "image/webp"
            : ext === "gif"
              ? "image/gif"
              : "image/jpeg";

      const dataUrl = `data:${mediaType};base64,${base64}`;

      console.log("🔵 [BikeVision] Calling OpenAI API...");
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${API_KEY}`,
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
                      url: dataUrl,
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
        },
      );

      console.log("🔵 [BikeVision] Response status:", response.status);

      if (!response.ok) {
        const errText = await response.text();
        console.error("🔴 [BikeVision] API error response:", errText);
        throw new Error(`API error ${response.status}: ${errText}`);
      }

      const data = await response.json();
      console.log(
        "🔵 [BikeVision] Raw response:",
        JSON.stringify(data).slice(0, 500),
      );

      const text = data.choices?.[0]?.message?.content ?? "";
      console.log("🔵 [BikeVision] Extracted text:", text.slice(0, 300));

      const clean = text.replace(/```json\n?|```\n?/g, "").trim();
      const parsed = JSON.parse(clean);

      const result: BikeAnalysis = {
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
        notableMods: parsed.notable_mods ?? [],
        colorScheme: parsed.color_scheme ?? "unknown",
        overallCondition: parsed.overall_condition ?? "unknown",
        vibe: parsed.vibe ?? "",
        confidence: parsed.confidence ?? 0,
      };

      console.log(
        "✅ [BikeVision] Success:",
        result.baseBike.brand,
        result.baseBike.model,
      );
      console.log("✅ [BikeVision] Vibe:", result.vibe);
      return result;
    } catch (err: any) {
      console.error("🔴 [BikeVision] ERROR:", err.message);
      setError(err.message ?? "Unknown error");
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { analyze, loading, error };
}
