import * as FileSystem from "expo-file-system/legacy";
import { useState } from "react";

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

type BikeVisionError = {
  error?: string;
  message?: string;
};

function isBikeAnalysis(value: unknown): value is BikeAnalysis {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<BikeAnalysis>;
  return Boolean(
    candidate.baseBike &&
      typeof candidate.baseBike.brand === "string" &&
      typeof candidate.baseBike.model === "string" &&
      typeof candidate.baseBike.yearEstimate === "string",
  );
}

function errorMessageFromResult(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const candidate = value as BikeVisionError;
  return candidate.error ?? candidate.message ?? null;
}

function mimeTypeForUri(uri: string) {
  const cleanUri = uri.split("?")[0]?.toLowerCase() ?? "";
  if (cleanUri.endsWith(".png")) return "image/png";
  if (cleanUri.endsWith(".webp")) return "image/webp";
  if (cleanUri.endsWith(".heic")) return "image/heic";
  if (cleanUri.endsWith(".heif")) return "image/heif";
  return "image/jpeg";
}

function isDataUrl(value: string) {
  return /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(value);
}

function isSupportedImageDataUrl(value: string) {
  return /^data:image\/(png|jpe?g|gif|webp);base64,/i.test(value);
}

async function imageToDataUrl(uri: string): Promise<string> {
  if (isDataUrl(uri)) {
    if (!isSupportedImageDataUrl(uri)) {
      throw new Error("Bike analysis supports PNG, JPEG, GIF, or WebP images.");
    }
    return uri;
  }

  if (uri.startsWith("file://") || uri.startsWith("ph://")) {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: "base64",
    });
    const imageDataUrl = `data:${mimeTypeForUri(uri)};base64,${base64}`;
    if (!isSupportedImageDataUrl(imageDataUrl)) {
      throw new Error("Bike analysis supports PNG, JPEG, GIF, or WebP images.");
    }
    return imageDataUrl;
  }

  const response = await fetch(uri);
  const contentType = response.headers.get("content-type") ?? mimeTypeForUri(uri);
  if (!response.ok) {
    throw new Error(`Could not load image for analysis (${response.status}).`);
  }
  if (!contentType.startsWith("image/")) {
    throw new Error(`Analysis URL returned ${contentType}, not an image.`);
  }
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const imageDataUrl = `data:${contentType};base64,${btoa(binary)}`;
  if (!isSupportedImageDataUrl(imageDataUrl)) {
    throw new Error("Bike analysis supports PNG, JPEG, GIF, or WebP images.");
  }
  return imageDataUrl;
}

async function invokeBikeVision(imageDataUrl: string) {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error("Missing Supabase configuration.");
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/analyze-bike`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ imageDataUrl }),
  });
  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      errorMessageFromResult(result) ??
        `Bike analysis failed with status ${response.status}.`,
    );
  }

  return result;
}

export function useBikeVision() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = async (imageUri: string): Promise<BikeAnalysis | null> => {
    setLoading(true);
    setError(null);

    try {
      const imageDataUrl = await imageToDataUrl(imageUri);
      const data = await invokeBikeVision(imageDataUrl);

      if (!data) throw new Error("Bike analysis returned no data.");
      if (!isBikeAnalysis(data)) {
        throw new Error(
          errorMessageFromResult(data) ?? "Bike analysis returned invalid data.",
        );
      }

      return data;
    } catch (err: any) {
      const message = err?.message ?? "Could not analyze this bike.";
      console.warn("🟠 [BikeVision] Analysis failed:", message);
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { analyze, loading, error };
}
