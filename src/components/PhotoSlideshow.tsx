"use client";

import Image from "next/image";

type Photo = {
  src: string;
  alt: string;
};

const FALLBACK_PHOTOS: Photo[] = [
  { src: "/images/hero-banner.jpg", alt: "SHPE LAMC chapter photo" },
  { src: "/images/lamc-stem-logo.png", alt: "LAMC STEM" },
  { src: "/images/shpe-logo.jpeg", alt: "SHPE" },
];

export default function PhotoSlideshow({ photos }: { photos?: Photo[] }) {
  const slides = photos && photos.length > 0 ? photos : FALLBACK_PHOTOS;
  const SLIDE_SECONDS = 5;
  const totalSeconds = SLIDE_SECONDS * slides.length;

  return (
    <div className="relative mx-auto mt-4 h-56 w-full max-w-6xl overflow-hidden rounded-2xl bg-navy/5 md:h-80">
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
