import { createId } from "@/lib/ids";
import {
  base64ToBytes,
  contentTypeForUri,
  extensionForContentType,
  imageUploadBody,
  type LocalImageData,
} from "@/lib/image-upload";
import { supabase } from "@/lib/supabase";
import { Directory, File, Paths } from "expo-file-system";

export type GarageDetails = {
  garageName: string;
  garageImageUrl: string;
  contactEmail: string;
  phone: string;
  website: string;
  city: string;
  bio: string;
};

type GarageDetailsRow = {
  garage_name: string | null;
  garage_image_url: string | null;
  contact_email: string | null;
  phone: string | null;
  website: string | null;
  city: string | null;
  bio: string | null;
};

const localGarageDir = new Directory(Paths.document, "garage-profile");
const localGarageIndexFile = new File(localGarageDir, "images.json");

function clean(value?: string | null) {
  return value?.trim() || null;
}

function fromRow(row: GarageDetailsRow | null): GarageDetails {
  return {
    garageName: row?.garage_name ?? "",
    garageImageUrl: row?.garage_image_url ?? "",
    contactEmail: row?.contact_email ?? "",
    phone: row?.phone ?? "",
    website: row?.website ?? "",
    city: row?.city ?? "",
    bio: row?.bio ?? "",
  };
}

function isMissingStorageBucket(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { message?: string; error?: string };
  const text = `${candidate.message ?? ""} ${candidate.error ?? ""}`.toLowerCase();
  return text.includes("bucket not found") || (text.includes("bucket") && text.includes("not found"));
}

function isMissingGarageImageColumn(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; message?: string };
  return (
    candidate.code === "42703" ||
    Boolean(candidate.message?.includes("garage_image_url")) ||
    Boolean(candidate.message?.includes("Could not find"))
  );
}

async function ensureLocalGarageDir() {
  if (!localGarageDir.exists) {
    localGarageDir.create({ intermediates: true, idempotent: true });
  }
}

async function readLocalGarageImages() {
  try {
    await ensureLocalGarageDir();
    if (!localGarageIndexFile.exists) return {} as Record<string, string>;
    return JSON.parse(await localGarageIndexFile.text()) as Record<string, string>;
  } catch {
    return {};
  }
}

async function getLocalGarageImage(userId: string) {
  const images = await readLocalGarageImages();
  return images[userId] ?? "";
}

async function writeLocalGarageImage(userId: string, imageUrl: string) {
  await ensureLocalGarageDir();
  const images = await readLocalGarageImages();
  images[userId] = imageUrl;
  if (!localGarageIndexFile.exists) {
    localGarageIndexFile.create({ intermediates: true, overwrite: true });
  }
  localGarageIndexFile.write(JSON.stringify(images));
}

async function saveLocalGarageImage(
  userId: string,
  imageUri: string,
  imageData?: LocalImageData,
) {
  await ensureLocalGarageDir();
  const contentType = imageData?.mimeType ?? contentTypeForUri(imageUri);
  const extension = extensionForContentType(contentType);
  const file = new File(localGarageDir, `${userId}-${createId()}.${extension}`);

  if (!file.exists) file.create({ intermediates: true, overwrite: true });

  if (imageData?.base64) {
    file.write(base64ToBytes(imageData.base64));
  } else {
    const source = new File(imageUri);
    source.copy(file);
  }

  await writeLocalGarageImage(userId, file.uri);
  return file.uri;
}

async function uploadGarageImage(
  userId: string,
  imageUri: string,
  imageData?: LocalImageData,
) {
  const contentType = imageData?.mimeType ?? contentTypeForUri(imageUri);
  const extension = extensionForContentType(contentType);
  const storagePath = `${userId}/${createId()}.${extension}`;
  const buckets = ["garage-images", "profile-images", "listing-images", "garage-bike-images"];

  for (const bucket of buckets) {
    const uploadBody = await imageUploadBody(imageUri, imageData);
    const { error } = await supabase.storage
      .from(bucket)
      .upload(storagePath, uploadBody, {
        contentType,
        upsert: true,
      });

    if (!error) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
      return data.publicUrl;
    }

    if (!isMissingStorageBucket(error) || bucket === buckets[buckets.length - 1]) {
      throw error;
    }
  }

  return "";
}

export async function fetchGarageDetails(): Promise<GarageDetails> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("Sign in required.");

  const localGarageImage = await getLocalGarageImage(user.id);

  const { data, error } = await supabase
    .from("profiles")
    .select("garage_name, garage_image_url, contact_email, phone, website, city, bio")
    .eq("id", user.id)
    .maybeSingle<GarageDetailsRow>();

  if (error) {
    if (!isMissingGarageImageColumn(error)) throw error;

    const { data: fallbackData, error: fallbackError } = await supabase
      .from("profiles")
      .select("garage_name, contact_email, phone, website, city, bio")
      .eq("id", user.id)
      .maybeSingle<Omit<GarageDetailsRow, "garage_image_url">>();

    if (fallbackError) throw fallbackError;
    return fromRow({
      garage_name: fallbackData?.garage_name ?? null,
      garage_image_url: localGarageImage,
      contact_email: fallbackData?.contact_email ?? null,
      phone: fallbackData?.phone ?? null,
      website: fallbackData?.website ?? null,
      city: fallbackData?.city ?? null,
      bio: fallbackData?.bio ?? null,
    });
  }

  return {
    ...fromRow(data ?? null),
    garageImageUrl: data?.garage_image_url ?? localGarageImage,
  };
}

export async function updateGarageDetails(
  input: GarageDetails,
  image?: { uri: string; data?: LocalImageData },
) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("Sign in required.");

  let garageImageUrl = input.garageImageUrl;

  if (image?.uri) {
    try {
      garageImageUrl = await uploadGarageImage(user.id, image.uri, image.data);
    } catch (error) {
      console.warn("Remote garage image upload failed; saving local garage image.", error);
      garageImageUrl = await saveLocalGarageImage(user.id, image.uri, image.data);
    }
  }

  const updatePayload = {
    garage_name: clean(input.garageName),
    garage_image_url: clean(garageImageUrl),
    contact_email: clean(input.contactEmail),
    phone: clean(input.phone),
    website: clean(input.website),
    city: clean(input.city) ?? "",
    bio: clean(input.bio),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("id", user.id);

  if (error) {
    if (!isMissingGarageImageColumn(error)) throw error;

    const { garage_image_url: _garageImageUrl, ...fallbackPayload } = updatePayload;
    const { error: fallbackError } = await supabase
      .from("profiles")
      .update(fallbackPayload)
      .eq("id", user.id);

    if (fallbackError) throw fallbackError;
  }

  if (garageImageUrl) await writeLocalGarageImage(user.id, garageImageUrl);
}
