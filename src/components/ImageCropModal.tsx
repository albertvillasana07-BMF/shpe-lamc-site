"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { getCroppedImageBlob } from "@/lib/cropImage";

export default function ImageCropModal({
  imageSrc,
  aspect,
  cropShape = "rect",
  onCancel,
  onComplete,
}: {
  imageSrc: string;
  aspect: number;
  cropShape?: "rect" | "round";
  onCancel: () => void;
  onComplete: (blob: Blob) => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);
  const titleId = useId();
  const helpId = useId();
  const zoomId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  const onCropComplete = useCallback((_croppedArea: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  // Move focus into the dialog, keep it there, close on Escape,
  // and send focus back where it was when the dialog closes.
  useEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLElement>("[data-autofocus]")?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
        return;
      }
      if (e.key !== "Tab" || !dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      previousFocus.current?.focus();
    };
  }, [onCancel]);

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
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={helpId}
        className="flex max-h-full w-full max-w-2xl flex-col gap-4 overflow-y-auto rounded-2xl bg-white p-4 shadow-xl"
      >
        <h2 id={titleId} className="text-lg text-navy">
          Crop your photo
        </h2>
        <p id={helpId} className="-mt-3 text-sm text-navy/70">
          Drag the photo or use the arrow keys to move it. Use the slider, your
          scroll wheel, or pinch to zoom.
        </p>

        <div className="relative h-[22rem] w-full overflow-hidden rounded-lg bg-black/5 sm:h-[28rem]">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            minZoom={0.5}
            maxZoom={5}
            zoomWithScroll
            aspect={aspect}
            cropShape={cropShape}
            objectFit="contain"
            keyboardStep={10}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            cropperProps={{
              tabIndex: 0,
              "aria-label": "Crop area. Use the arrow keys to move the photo.",
            }}
          />
        </div>

        <div className="flex items-center gap-3">
          <label htmlFor={zoomId} className="text-sm font-semibold text-navy">
            Zoom
          </label>
          <input
            id={zoomId}
            type="range"
            min={0.5}
            max={5}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            aria-valuetext={`${Math.round(zoom * 100)} percent`}
            className="flex-1 accent-[var(--orange)]"
          />
          <span className="w-12 text-right text-sm text-navy/70" aria-hidden="true">
            {Math.round(zoom * 100)}%
          </span>
        </div>

        <div className="flex flex-wrap justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              setZoom(1);
              setCrop({ x: 0, y: 0 });
            }}
            disabled={saving}
            className="rounded-full border border-navy/30 px-4 py-2 text-sm font-semibold text-navy hover:bg-black/5"
          >
            Reset
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="rounded-full border border-navy/30 px-4 py-2 text-sm font-semibold text-navy hover:bg-black/5"
            >
              Cancel
            </button>
            <button
              type="button"
              data-autofocus
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
