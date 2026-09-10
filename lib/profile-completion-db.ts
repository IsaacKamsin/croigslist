import { createId } from "@/lib/ids";
import {
  base64ToBytes,
  contentTypeForUri,
  extensionForContentType,
  imageUploadBody,
  type LocalImageData,
} from "@/lib/image-upload";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { Directory, File, Paths } from "expo-file-system";

export type ProfileCompletion = {
  accountName: string;
  garageName: string;
  avatarUrl: string;
};

type ProfileCompletionRow = {
  full_name: string | null;
  garage_name: string | null;
  avatar_url: string | null;
};

const localProfileDir = new Directory(Paths.document, "profile-completion");
const localProfileIndexFile = new File(localProfileDir, "avatars.json");

function clean(value: string) {
  return value.trim() || null;
}

function isMissingStorageBucket(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { message?: string; error?: string };
  const text = `${candidate.message ?? ""} ${candidate.error ?? ""}`.toLowerCase();
  return text.includes("bucket not found") || text.includes("bucket") && text.includes("not found");
}

function isMissingAvatarColumn(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; message?: string };
  return (
    candidate.code === "42703" ||
    Boolean(candidate.message?.includes("avatar_url")) ||
    Boolean(candidate.message?.includes("Could not find"))
  );
}

function isShareableAvatar(url: string) {
  return url.startsWith("http://") || url.startsWith("https://");
}

async function uploadProfileImage(
  userId: string,
  avatarUri: string,
  avatarData?: LocalImageData,
) {
  const contentType = avatarData?.mimeType ?? contentTypeForUri(avatarUri);
  const extension = extensionForContentType(contentType);
  const storagePath = `${userId}/${createId()}.${extension}`;
  // garage-bike-images is private; an avatar stored there would be unreadable
  // by everyone except its owner.
  const buckets = ["profile-images", "listing-images"];

  for (const bucket of buckets) {
    const uploadBody = await imageUploadBody(avatarUri, avatarData);
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

async function ensureLocalProfileDir() {
  if (!localProfileDir.exists) {
    localProfileDir.create({ intermediates: true, idempotent: true });
  }
}

async function readLocalAvatars() {
  try {
    await ensureLocalProfileDir();
    if (!localProfileIndexFile.exists) return {} as Record<string, string>;
    return JSON.parse(await localProfileIndexFile.text()) as Record<string, string>;
  } catch {
    return {};
  }
}

export async function getLocalProfileAvatar(userId: string) {
  const avatars = await readLocalAvatars();
  return avatars[userId] ?? "";
}

async function writeLocalAvatar(userId: string, avatarUrl: string) {
  await ensureLocalProfileDir();
  const avatars = await readLocalAvatars();
  avatars[userId] = avatarUrl;
  if (!localProfileIndexFile.exists) {
    localProfileIndexFile.create({ intermediates: true, overwrite: true });
  }
  localProfileIndexFile.write(JSON.stringify(avatars));
}

async function saveLocalProfileImage(
  userId: string,
  avatarUri: string,
  avatarData?: LocalImageData,
) {
  await ensureLocalProfileDir();
  const contentType = avatarData?.mimeType ?? contentTypeForUri(avatarUri);
  const extension = extensionForContentType(contentType);
  const file = new File(localProfileDir, `${userId}-${createId()}.${extension}`);

  if (!file.exists) file.create({ intermediates: true, overwrite: true });

  if (avatarData?.base64) {
    file.write(base64ToBytes(avatarData.base64));
  } else {
    const source = new File(avatarUri);
    source.copy(file);
  }

  await writeLocalAvatar(userId, file.uri);
  return file.uri;
}

export async function fetchMyProfileCompletion(): Promise<ProfileCompletion> {
  if (!isSupabaseConfigured) return { accountName: "", garageName: "", avatarUrl: "" };

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) return { accountName: "", garageName: "", avatarUrl: "" };
  const metadata = user.user_metadata ?? {};
  const metadataAvatar =
    typeof metadata.avatar_url === "string" ? metadata.avatar_url : "";
  const localAvatars = await readLocalAvatars();
  const localAvatar = localAvatars[user.id] ?? "";

  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, garage_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle<ProfileCompletionRow>();

  if (error) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("profiles")
      .select("full_name, garage_name")
      .eq("id", user.id)
      .maybeSingle<{ full_name: string | null; garage_name: string | null }>();

    if (fallbackError) return { accountName: "", garageName: "", avatarUrl: "" };

    return {
      accountName: fallbackData?.full_name ?? "",
      garageName: fallbackData?.garage_name ?? "",
      avatarUrl: metadataAvatar || localAvatar,
    };
  }

  return {
    accountName: data?.full_name ?? "",
    garageName: data?.garage_name ?? "",
    avatarUrl: (data?.avatar_url ?? metadataAvatar) || localAvatar,
  };
}

export async function updateMyProfilePhoto({
  avatarUri,
  avatarData,
}: {
  avatarUri: string;
  avatarData?: LocalImageData;
}) {
  if (!isSupabaseConfigured) return "";

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("Sign in required.");

  let avatarUrl = "";

  try {
    avatarUrl = await uploadProfileImage(user.id, avatarUri, avatarData);
  } catch (error) {
    console.warn("Remote profile photo upload failed; saving local account photo.", error);
    avatarUrl = await saveLocalProfileImage(user.id, avatarUri, avatarData);
  }

  // profiles.avatar_url is world-readable, so only a real remote URL belongs there.
  // A file:// path from a failed upload is device-local and renders as a broken
  // image for every other member.
  if (isShareableAvatar(avatarUrl)) {
    const { error } = await supabase
      .from("profiles")
      .update({
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error && !isMissingAvatarColumn(error)) {
      console.warn("Profile avatar_url update failed; keeping account photo in auth metadata/local storage.", error);
    }

    const { error: updateUserError } = await supabase.auth.updateUser({
      data: { avatar_url: avatarUrl },
    });
    if (updateUserError) {
      console.warn("Auth avatar metadata update failed; keeping account photo in local storage.", updateUserError);
    }
  }

  await writeLocalAvatar(user.id, avatarUrl);

  return avatarUrl;
}

export async function updateMyProfileCompletion({
  garageName,
  avatarUri,
  avatarData,
}: {
  garageName: string;
  avatarUri?: string;
  avatarData?: LocalImageData;
}) {
  if (!isSupabaseConfigured) return;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("Sign in required.");

  let avatarUrl: string | undefined;

  if (avatarUri) {
    try {
      avatarUrl = await uploadProfileImage(user.id, avatarUri, avatarData);
    } catch (error) {
      console.warn("Remote profile photo upload failed; saving local account photo.", error);
      avatarUrl = await saveLocalProfileImage(user.id, avatarUri, avatarData);
    }
  }

  const name = clean(garageName);
  const shareableAvatar = avatarUrl && isShareableAvatar(avatarUrl) ? avatarUrl : "";
  const { error } = await supabase
    .from("profiles")
    .update({
      garage_name: name,
      ...(shareableAvatar ? { avatar_url: shareableAvatar } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error && !isMissingAvatarColumn(error)) {
    console.warn("Profile completion update failed; keeping available local/auth profile data.", error);
  }

  if (shareableAvatar) {
    const { error: updateUserError } = await supabase.auth.updateUser({
      data: { avatar_url: shareableAvatar },
    });
    if (updateUserError) {
      console.warn("Auth avatar metadata update failed; keeping account photo in local storage.", updateUserError);
    }
  }

  if (avatarUrl) await writeLocalAvatar(user.id, avatarUrl);
}
