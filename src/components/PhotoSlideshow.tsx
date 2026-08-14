"use client";

import Image from "next/image";

type Photo = {
  src: string;
  alt: string;
};

// TODO: once the admin gallery is wired up, load these from Supabase
// instead of this hardcoded list.
const photos: Photo[] = [
  { src: "/images/hero-banner.jpg", alt: "SHPE LAMC chapter photo" },
  { src: "/images/lamc-stem-logo.png", alt: "LAMC STEM" },
  { src: "/images/shpe-logo.jpeg", alt: "SHPE" },
];

const SLIDE_SECONDS = 5;
const TOTAL_SECONDS = SLIDE_SECONDS * photos.length;

export default function PhotoSlideshow() {
  return (
    <div className="relative mx-auto mt-4 h-56 w-full max-w-6xl overflow-hidden rounded-2xl bg-navy/5 md:h-80">
      {photos.map((photo, i) => (
        <div
          key={photo.src + i}
          className="absolute inset-0"
          style={{
            animation: `shpe-fade ${TOTAL_SECONDS}s infinite`,
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
          />
        </div>
      ))}
      <style>{`
        @keyframes shpe-fade {
          0% { opacity: 0; }
          5% { opacity: 1; }
          ${Math.round((100 / photos.length) - 5)}% { opacity: 1; }
          ${Math.round(100 / photos.length)}% { opacity: 0; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
