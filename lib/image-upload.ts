export type LocalImageData = {
  base64?: string;
  mimeType?: string;
};

export function contentTypeForUri(uri: string) {
  const cleanUri = uri.split("?")[0]?.toLowerCase() ?? "";
  if (cleanUri.endsWith(".png")) return "image/png";
  if (cleanUri.endsWith(".webp")) return "image/webp";
  if (cleanUri.endsWith(".heic")) return "image/heic";
  if (cleanUri.endsWith(".heif")) return "image/heif";
  return "image/jpeg";
}

export function extensionForContentType(contentType: string) {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("heic")) return "heic";
  if (contentType.includes("heif")) return "heif";
  return "jpg";
}

export function base64ToBytes(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export async function imageUploadBody(uri: string, imageData?: LocalImageData) {
  if (imageData?.base64) return base64ToBytes(imageData.base64);
  return fetch(uri).then((response) => response.blob());
}
