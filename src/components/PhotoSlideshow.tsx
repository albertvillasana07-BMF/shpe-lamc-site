"use client";

import Image from "next/image";
import { useEffect, useState, useSyncExternalStore } from "react";

type Photo = {
  src: string;
  alt: string;
  caption?: string | null;
};

const FALLBACK_PHOTOS: Photo[] = [
  { src: "/images/hero-banner.jpg", alt: "SHPE LAMC chapter members together" },
  { src: "/images/lamc-stem-logo.png", alt: "LAMC STEM logo" },
];

const SLIDE_MS = 6000;
const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(cb: () => void) {
  const mq = window.matchMedia(REDUCE_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

export default function PhotoSlideshow({ photos }: { photos?: Photo[] }) {
  const slides = photos && photos.length > 0 ? photos : FALLBACK_PHOTOS;
  const [index, setIndex] = useState(0);
  // People with "reduce motion" turned on start with the slideshow paused
  const reduceMotion = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCE_QUERY).matches,
    () => false
  );
  const [userPlaying, setUserPlaying] = useState<boolean | null>(null);
  const playing = userPlaying ?? !reduceMotion;
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  const running = playing && !hovered && !focused && slides.length > 1;

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), SLIDE_MS);
    return () => clearInterval(t);
  }, [running, slides.length]);

  const go = (dir: 1 | -1) =>
    setIndex((i) => (i + dir + slides.length) % slides.length);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Chapter photos"
      className="relative mx-auto mt-4 w-full max-w-6xl"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setFocused(false);
      }}
    >
      <div
        className="relative aspect-video w-full overflow-hidden rounded-2xl bg-navy/5">
        {slides.map((photo, i) => (
          <div
            key={photo.src + i}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${slides.length}`}
            aria-hidden={i !== index}
            className="absolute inset-0 transition-opacity duration-1000"
            style={{ opacity: i === index ? 1 : 0 }}
          >
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              className="object-cover"
              sizes="100vw"
              unoptimized={photo.src.startsWith("http")}
              priority={i === 0}
            />
            {photo.caption && (
              <div className="absolute bottom-3 left-3 max-w-[70%] rounded-full bg-black/70 px-3 py-1.5">
                <p className="truncate text-xs font-semibold text-white md:text-sm">
                  {photo.caption}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {slides.length > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => go(-1)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-navy/60 text-navy hover:bg-navy/5"
          >
            <span aria-hidden="true">‹</span>
            <span className="sr-only">Previous photo</span>
          </button>
          <button
            type="button"
            onClick={() => setUserPlaying(!playing)}
            className="flex h-11 items-center justify-center gap-2 rounded-full border border-navy/60 px-4 text-sm font-semibold text-navy hover:bg-navy/5"
          >
            <span aria-hidden="true">{playing ? "❚❚" : "▶"}</span>
            {playing ? "Pause slideshow" : "Play slideshow"}
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-navy/60 text-navy hover:bg-navy/5"
          >
            <span aria-hidden="true">›</span>
            <span className="sr-only">Next photo</span>
          </button>
          <p className="sr-only" aria-live="polite">
            {running ? "" : `Photo ${index + 1} of ${slides.length}`}
          </p>
        </div>
      )}
    </section>
  );
}
