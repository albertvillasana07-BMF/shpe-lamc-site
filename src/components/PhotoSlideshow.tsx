"use client";

import Image from "next/image";

type Photo = {
  src: string;
  alt: string;
  caption?: string | null;
};

const FALLBACK_PHOTOS: Photo[] = [
  { src: "/images/hero-banner.jpg", alt: "SHPE LAMC chapter photo" },
  { src: "/images/lamc-stem-logo.png", alt: "LAMC STEM" },
];

export default function PhotoSlideshow({ photos }: { photos?: Photo[] }) {
  const slides = photos && photos.length > 0 ? photos : FALLBACK_PHOTOS;
  const SLIDE_SECONDS = 5;
  const totalSeconds = SLIDE_SECONDS * slides.length;

  return (
    <div className="relative mx-auto mt-4 aspect-video w-full max-w-6xl overflow-hidden rounded-2xl bg-navy/5">
      {slides.map((photo, i) => (
        <div
          key={photo.src + i}
          className="absolute inset-0"
          style={{
            animation: `shpe-fade ${totalSeconds}s infinite`,
            animationDelay: `${i * SLIDE_SECONDS}s`,
            opacity: 0,
          }}
        >
          <Image
            src={photo.src}
            alt={photo.alt}
            fill
            className="object-cover"
            sizes="100vw"
            unoptimized={photo.src.startsWith("http")}
          />
          {photo.caption && (
            <div className="absolute bottom-3 left-3 max-w-[70%] rounded-full bg-black/35 px-3 py-1.5 backdrop-blur-sm">
              <p className="truncate text-xs font-semibold text-white md:text-sm">
                {photo.caption}
              </p>
            </div>
          )}
        </div>
      ))}
      <style>{`
        @keyframes shpe-fade {
          0% { opacity: 0; }
          5% { opacity: 1; }
          ${Math.round((100 / slides.length) - 5)}% { opacity: 1; }
          ${Math.round(100 / slides.length)}% { opacity: 0; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}