"use client";

import { useId, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, MEDIA_BUCKET, mediaUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };

/** Uploads straight from the browser to Supabase Storage into the user's own folder. */
async function uploadImage(file: File, userId: string): Promise<{ path?: string; error?: string }> {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) return { error: "fileType" };
  if (file.size > MAX_IMAGE_BYTES) return { error: "fileTooLarge" };
  const path = `${userId}/${crypto.randomUUID()}.${EXT[file.type]}`;
  const { error } = await createClient()
    .storage.from(MEDIA_BUCKET)
    .upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
  return error ? { error: "uploadFailed" } : { path };
}

export function SingleImageUpload({
  name,
  label,
  userId,
  defaultPath,
  aspect = "square",
  error,
}: {
  name: string;
  label: string;
  userId: string;
  defaultPath?: string;
  aspect?: "square" | "wide";
  error?: string;
}) {
  const t = useTranslations("form");
  const tv = useTranslations("validation");
  const tc = useTranslations("common");
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [path, setPath] = useState(defaultPath ?? "");
  const [busy, setBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const url = mediaUrl(path);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setUploadError(null);
    const result = await uploadImage(file, userId);
    setBusy(false);
    if (result.path) setPath(result.path);
    else setUploadError(result.error ?? "uploadFailed");
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-charcoal">
        {label} <span className="text-xs font-normal text-muted-foreground">({tc("optional")})</span>
      </span>
      <input type="hidden" name={name} value={path} />
      <div
        className={cn(
          "relative flex items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-input bg-muted/50",
          aspect === "square" ? "size-32" : "aspect-[16/7] w-full",
        )}
      >
        {url ? (
          <Image src={url} alt="" fill sizes="(min-width: 768px) 400px, 100vw" className="object-cover" />
        ) : (
          <ImagePlus className="size-8 text-muted-foreground" aria-hidden="true" />
        )}
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <Loader2 className="size-6 animate-spin text-forest" aria-label={t("uploading")} />
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <label
          htmlFor={inputId}
          className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-input bg-white px-3 text-sm font-medium hover:bg-muted focus-within:ring-2 focus-within:ring-ring"
        >
          <ImagePlus className="size-4" aria-hidden="true" /> {busy ? t("uploading") : t("upload")}
          <input
            id={inputId}
            ref={fileRef}
            type="file"
            accept={ALLOWED_IMAGE_TYPES.join(",")}
            className="sr-only"
            disabled={busy}
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </label>
        {path && (
          <button
            type="button"
            onClick={() => setPath("")}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="size-4" aria-hidden="true" /> {t("removeImage")}
          </button>
        )}
      </div>
      {(uploadError || error) && (
        <p className="text-xs font-medium text-destructive" role="alert">
          {uploadError ? t(uploadError as "fileType" | "fileTooLarge" | "uploadFailed") : tv("invalidImage")}
        </p>
      )}
    </div>
  );
}

export function GalleryUpload({
  userId,
  defaultPaths,
  max,
  error,
}: {
  userId: string;
  defaultPaths: string[];
  max: number;
  error?: string;
}) {
  const t = useTranslations("form");
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [paths, setPaths] = useState<string[]>(defaultPaths);
  const [busy, setBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setUploadError(null);
    const room = max - paths.length;
    const added: string[] = [];
    for (const file of Array.from(files).slice(0, room)) {
      const result = await uploadImage(file, userId);
      if (result.path) added.push(result.path);
      else setUploadError(result.error ?? "uploadFailed");
    }
    setPaths((prev) => [...prev, ...added].slice(0, max));
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="space-y-3">
      {paths.map((p) => (
        <input key={p} type="hidden" name="galleryPaths" value={p} />
      ))}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {paths.map((p) => (
          <li key={p} className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
            <Image src={mediaUrl(p)!} alt="" fill sizes="200px" className="object-cover" />
            <button
              type="button"
              onClick={() => setPaths((prev) => prev.filter((x) => x !== p))}
              className="absolute top-1.5 right-1.5 rounded-full bg-white/90 p-1.5 text-destructive shadow hover:bg-white"
              aria-label={t("removeImage")}
            >
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
        {paths.length < max && (
          <li>
            <label
              htmlFor={inputId}
              className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-input bg-muted/50 text-sm text-muted-foreground hover:border-forest hover:text-forest focus-within:ring-2 focus-within:ring-ring"
            >
              {busy ? <Loader2 className="size-6 animate-spin" aria-hidden="true" /> : <ImagePlus className="size-6" aria-hidden="true" />}
              {busy ? t("uploading") : t("upload")}
              <input
                id={inputId}
                ref={fileRef}
                type="file"
                multiple
                accept={ALLOWED_IMAGE_TYPES.join(",")}
                className="sr-only"
                disabled={busy}
                onChange={(e) => onFiles(e.target.files)}
              />
            </label>
          </li>
        )}
      </ul>
      {(uploadError || error) && (
        <p className="text-xs font-medium text-destructive" role="alert">
          {uploadError ? t(uploadError as "fileType" | "fileTooLarge" | "uploadFailed") : t("uploadFailed")}
        </p>
      )}
    </div>
  );
}
