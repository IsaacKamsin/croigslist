import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { createId } from "@/lib/ids";
import {
  contentTypeForUri,
  extensionForContentType,
  imageUploadBody,
  type LocalImageData,
} from "@/lib/image-upload";

export type GarageBikeRecord = {
  id: string;
  imageUri: string;
  imagePath?: string;
  brand?: string;
  model?: string;
  yearEstimate?: string;
  frameType?: string;
  color?: string;
  condition?: string;
  vibe?: string;
  confidence?: number;
  processing: boolean;
  createdAt: Date;
};

type GarageBikeRow = {
  id: string;
  image_url: string;
  image_path: string | null;
  brand: string | null;
  model: string | null;
  year_estimate: string | null;
  frame_type: string | null;
  color: string | null;
  condition: string | null;
  vibe: string | null;
  confidence: number | null;
  analysis_status: "pending" | "complete" | "failed";
  created_at: string;
};

function bikeFromRow(row: GarageBikeRow): GarageBikeRecord {
  return {
    id: row.id,
    imageUri: row.image_url,
    imagePath: row.image_path ?? undefined,
    brand: row.brand ?? undefined,
    model: row.model ?? undefined,
    yearEstimate: row.year_estimate ?? undefined,
    frameType: row.frame_type ?? undefined,
    color: row.color ?? undefined,
    condition: row.condition ?? undefined,
    vibe: row.vibe ?? undefined,
    confidence: row.confidence ?? undefined,
    processing: row.analysis_status === "pending",
    createdAt: new Date(row.created_at),
  };
}

const SIGNED_URL_TTL_SECONDS = 60 * 60;

// garage-bike-images is a private bucket, so a stored public URL no longer
// resolves. Paths are signed per read; rows written before image_path existed
// keep whatever URL they have.
async function withSignedImageUrls(bikes: GarageBikeRecord[]) {
  const paths = bikes
    .map((bike) => bike.imagePath)
    .filter((path): path is string => Boolean(path));

  if (paths.length === 0) return bikes;

  const { data, error } = await supabase.storage
    .from("garage-bike-images")
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);

  if (error) return bikes;

  const signed = new Map<string, string>();
  for (const entry of data ?? []) {
    if (entry.path && entry.signedUrl) signed.set(entry.path, entry.signedUrl);
  }

  return bikes.map((bike) =>
    bike.imagePath && signed.has(bike.imagePath)
      ? { ...bike, imageUri: signed.get(bike.imagePath) as string }
      : bike,
  );
}

export async function fetchGarageBikes(): Promise<GarageBikeRecord[]> {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from("garage_bikes")
    .select(
      "id, image_url, image_path, brand, model, year_estimate, frame_type, color, condition, vibe, confidence, analysis_status, created_at",
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  return withSignedImageUrls(((data ?? []) as GarageBikeRow[]).map(bikeFromRow));
}

export async function createGarageBike(
  imageUri: string,
  imageData?: LocalImageData,
) {
  if (!isSupabaseConfigured) return null;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) return null;

  const bikeId = createId();
  const contentType = imageData?.mimeType ?? contentTypeForUri(imageUri);
  const extension = extensionForContentType(contentType);
  const storagePath = `${user.id}/${bikeId}.${extension}`;
  const uploadBody = await imageUploadBody(imageUri, imageData);

  const { error: uploadError } = await supabase.storage
    .from("garage-bike-images")
    .upload(storagePath, uploadBody, {
      contentType,
      upsert: true,
    });

  if (uploadError) throw uploadError;

  const { data: signedUrlData } = await supabase.storage
    .from("garage-bike-images")
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

  const imageUrl = signedUrlData?.signedUrl ?? "";

  const { data, error } = await supabase
    .from("garage_bikes")
    .insert({
      id: bikeId,
      owner_id: user.id,
      image_url: imageUrl,
      image_path: storagePath,
      analysis_status: "pending",
    })
    .select(
      "id, image_url, image_path, brand, model, year_estimate, frame_type, color, condition, vibe, confidence, analysis_status, created_at",
    )
    .single<GarageBikeRow>();

  if (error) throw error;
  return bikeFromRow(data);
}

export async function refreshGarageBikeImageUrl(imagePath: string) {
  if (!isSupabaseConfigured || !imagePath) return "";

  const { data } = await supabase.storage
    .from("garage-bike-images")
    .createSignedUrl(imagePath, SIGNED_URL_TTL_SECONDS);

  return data?.signedUrl ?? "";
}

export async function updateGarageBikeAnalysis(
  bikeId: string,
  analysis: Partial<Omit<GarageBikeRecord, "id" | "imageUri" | "createdAt">>,
) {
  if (!isSupabaseConfigured) return;

  const { error } = await supabase
    .from("garage_bikes")
    .update({
      brand: analysis.brand ?? null,
      model: analysis.model ?? null,
      year_estimate: analysis.yearEstimate ?? null,
      frame_type: analysis.frameType ?? null,
      color: analysis.color ?? null,
      condition: analysis.condition ?? null,
      vibe: analysis.vibe ?? null,
      confidence: analysis.confidence ?? null,
      analysis_status: analysis.processing ? "pending" : "complete",
      updated_at: new Date().toISOString(),
    })
    .eq("id", bikeId);

  if (error) throw error;
}

export async function markGarageBikeFailed(bikeId: string) {
  if (!isSupabaseConfigured) return;

  const { error } = await supabase
    .from("garage_bikes")
    .update({
      brand: "UNIDENTIFIED",
      model: "Tap to retry",
      analysis_status: "failed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", bikeId);

  if (error) throw error;
}

export async function deleteGarageBike(
  bikeId: string,
  imagePath?: string,
) {
  if (!isSupabaseConfigured) return;

  const { error } = await supabase
    .from("garage_bikes")
    .delete()
    .eq("id", bikeId);

  if (error) throw error;

  if (imagePath) {
    await supabase.storage
      .from("garage-bike-images")
      .remove([imagePath])
      .catch(() => undefined);
  }
}
