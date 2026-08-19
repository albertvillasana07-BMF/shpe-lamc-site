"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ImageCropModal from "@/components/ImageCropModal";

export default function ImageUploadField({
  name,
  label,
  defaultValue,
  folder,
  aspect = 1,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  folder: string;
  /** width / height for the crop box — 1 = square, 16/9 = widescreen, etc. */
  aspect?: number;
}) {
  const [url, setUrl] = useState(defaultValue ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingImageSrc, setPendingImageSrc] = useState<string | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const reader = new FileReader();
    reader.onload = () => setPendingImageSrc(reader.result as string);
    reader.readAsDataURL(file);
    // reset the input so selecting the same file again still fires onChange
    e.target.value = "";
  }

  async function handleCropComplete(blob: Blob) {
    setPendingImageSrc(null);
    setUploading(true);

    const supabase = createClient();
    const path = `${folder}/${Date.now()}-cropped.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("public-images")
      .upload(path, blob, { upsert: true, contentType: "image/jpeg" });

    if (uploadError) {
      setError("Upload failed — try again, or paste an image URL below.");
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("public-images").getPublicUrl(path);
    setUrl(data.publicUrl);
    setUploading(false);
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-black/10 p-3">
      <label className="text-xs font-bold uppercase tracking-wide text-navy/60">
        {label}
      </label>
      <input type="hidden" name={name} value={url} />

      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          className="h-20 w-20 rounded-lg border border-black/10 object-cover"
        />
      )}

      <input
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="text-xs"
      />
      {uploading && <p className="text-xs text-navy/50">Uploading…</p>}
      {error && <p className="text-xs text-pink">{error}</p>}

      <input
        type="text"
        placeholder="Or paste an image URL"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="rounded-lg border border-black/10 px-3 py-2 text-sm"
      />

      {pendingImageSrc && (
        <ImageCropModal
          imageSrc={pendingImageSrc}
          aspect={aspect}
          onCancel={() => setPendingImageSrc(null)}
          onComplete={handleCropComplete}
        />
      )}
    </div>
  );
}
}
