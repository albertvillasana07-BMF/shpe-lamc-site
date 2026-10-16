"use client";

import { useCallback, useId, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ImageCropModal from "@/components/ImageCropModal";

/**
 * Admin-only photo picker: choose or drag in a photo, crop it, and it uploads
 * to Supabase Storage. Only approved admins can upload (enforced by the
 * database), so visitors can't use it even if they found it.
 *
 * Pass `altName` to also collect a short photo description, which screen
 * readers read out for people who can't see the photo.
 */
export default function ImageUploadField({
  name,
  label,
  defaultValue,
  folder,
  aspect = 1,
  cropShape = "rect",
  altName,
  altDefault,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  folder: string;
  aspect?: number;
  cropShape?: "rect" | "round";
  altName?: string;
  altDefault?: string | null;
}) {
  const [url, setUrl] = useState(defaultValue ?? "");
  const [alt, setAlt] = useState(altDefault ?? "");
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingImageSrc, setPendingImageSrc] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileId = useId();
  const urlId = useId();
  const altId = useId();
  const altHelpId = useId();

  function readFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("That file isn't an image. Choose a JPG, PNG, or similar.");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => setPendingImageSrc(reader.result as string);
    reader.readAsDataURL(file);
  }

  const handleCancel = useCallback(() => setPendingImageSrc(null), []);

  async function handleCropComplete(blob: Blob) {
    setPendingImageSrc(null);
    setUploading(true);
    setStatus("Uploading photo…");

    const supabase = createClient();
    const path = `${folder}/${Date.now()}-cropped.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("public-images")
      .upload(path, blob, { upsert: true, contentType: "image/jpeg" });

    if (uploadError) {
      setError("Upload failed. Try again, or paste an image link below.");
      setStatus("");
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("public-images").getPublicUrl(path);
    setUrl(data.publicUrl);
    setUploading(false);
    setStatus("Photo uploaded. Remember to save the form.");
  }

  return (
    <fieldset className="flex flex-col gap-2 rounded-lg border border-black/10 p-3">
      <legend className="px-1 text-sm font-bold text-navy">{label}</legend>
      <input type="hidden" name={name} value={url} />

      <div className="flex items-center gap-3">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt="Current photo preview"
            className={`h-20 w-20 border border-black/10 object-cover ${
              cropShape === "round" ? "rounded-full" : "rounded-lg"
            }`}
          />
        ) : (
          <div
            className="flex h-20 w-20 items-center justify-center rounded-lg bg-navy/5 text-xs text-navy/70"
            aria-hidden="true"
          >
            No photo
          </div>
        )}

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            readFile(e.dataTransfer.files?.[0]);
          }}
          className={`flex flex-1 flex-col items-start gap-1 rounded-lg border-2 border-dashed p-3 ${
            dragging ? "border-orange bg-orange/5" : "border-navy/30"
          }`}
        >
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-full bg-navy px-4 py-2 text-sm font-bold text-white hover:opacity-90"
          >
            {url ? "Replace photo" : "Choose photo"}
          </button>
          <span className="text-xs text-navy/70">or drag a photo here</span>
          <label htmlFor={fileId} className="sr-only">
            {label}: choose a photo file
          </label>
          <input
            ref={fileInputRef}
            id={fileId}
            type="file"
            accept="image/*"
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => {
              readFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <p role="status" aria-live="polite" className="text-xs text-navy/70">
        {uploading ? "Uploading photo…" : status}
      </p>
      {error && (
        <p role="alert" className="text-sm font-semibold text-pink">
          {error}
        </p>
      )}

      {altName && (
        <div className="flex flex-col gap-1">
          <label htmlFor={altId} className="text-sm font-semibold text-navy">
            Photo description {url ? "(required)" : ""}
          </label>
          <input
            id={altId}
            name={altName}
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            required={Boolean(url)}
            aria-describedby={altHelpId}
            placeholder="Board members smiling at the Magic of Science booth"
            className="rounded-lg border px-3 py-2 text-sm"
          />
          <p id={altHelpId} className="text-xs text-navy/70">
            Describe what&apos;s in the photo in one sentence. Screen readers read
            this out loud for people who can&apos;t see it.
          </p>
        </div>
      )}

      <details className="text-sm">
        <summary className="cursor-pointer font-semibold text-navy/70">
          Or paste an image link
        </summary>
        <label htmlFor={urlId} className="mt-2 block text-xs font-semibold text-navy">
          Image link
        </label>
        <input
          id={urlId}
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://"
          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
        />
        {url && (
          <button
            type="button"
            onClick={() => {
              setUrl("");
              setStatus("Photo removed. Remember to save the form.");
            }}
            className="mt-2 text-xs font-bold text-pink hover:underline"
          >
            Remove photo
          </button>
        )}
      </details>

      {pendingImageSrc && (
        <ImageCropModal
          imageSrc={pendingImageSrc}
          aspect={aspect}
          cropShape={cropShape}
          onCancel={handleCancel}
          onComplete={handleCropComplete}
        />
      )}
    </fieldset>
  );
}
