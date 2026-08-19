"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { getCroppedImageBlob } from "@/lib/cropImage";

export default function ImageCropModal({
  imageSrc,
  aspect,
  onCancel,
  onComplete,
}: {
  imageSrc: string;
  aspect: number;
  onCancel: () => void;
  onComplete: (blob: Blob) => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_croppedArea: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  async function handleSave() {
    if (!croppedAreaPixels) return;
    setSaving(true);
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels);
      onComplete(blob);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
      <div className="flex w-full max-w-2xl flex-col gap-4 rounded-2xl bg-white p-4 shadow-xl">
        <p className="text-sm font-bold text-navy">
          Crop image — scroll or use the slider to zoom, drag to reposition
        </p>

        <div className="relative h-[28rem] w-full overflow-hidden rounded-lg bg-black/5">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            minZoom={0.5}
            maxZoom={5}
            zoomWithScroll
            aspect={aspect}
            objectFit="contain"
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-navy/60">Zoom out</span>
          <input
            type="range"
            min={0.5}
            max={5}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1"
          />
          <span className="text-xs font-semibold text-navy/60">Zoom in</span>
        </div>

        <div className="flex justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              setZoom(1);
              setCrop({ x: 0, y: 0 });
            }}
            disabled={saving}
            className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-navy hover:bg-black/5"
          >
            Reset
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-navy hover:bg-black/5"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-full bg-orange px-5 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Use this crop"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}