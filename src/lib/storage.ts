import { env } from "@/lib/env";

export const MEDIA_BUCKET = "business-media";
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
export const MAX_GALLERY_IMAGES = 8;

/** Public URL of an object in the business media bucket. */
export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${env.supabaseUrl}/storage/v1/object/public/${MEDIA_BUCKET}/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

/** Storage paths must live in the uploader's own folder: "<userId>/<file>". */
export function isOwnStoragePath(path: string, userId: string): boolean {
  return (
    path.startsWith(`${userId}/`) &&
    !path.includes("..") &&
    /^[0-9a-f-]{36}\/[A-Za-z0-9._/-]+$/.test(path)
  );
}
