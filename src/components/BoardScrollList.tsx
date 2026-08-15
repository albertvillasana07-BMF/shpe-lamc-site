"use client";

import { useEffect, useRef } from "react";
import type { BoardMemberRow } from "@/lib/types";

export default function BoardScrollList({ rows }: { rows: BoardMemberRow[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function update() {
      if (!container) return;
      const mid = container.scrollTop + container.clientHeight / 2;
      cardRefs.current.forEach((card) => {
        if (!card) return;
        const center = card.offsetTop + card.offsetHeight / 2;
        const dist = Math.abs(center - mid);
        const t = Math.max(0, 1 - dist / 220);
        const scale = 0.94 + 0.08 * t;
        const opacity = 0.7 + 0.3 * t;
        card.style.transform = `scale(${scale.toFixed(3)})`;
        card.style.opacity = opacity.toFixed(2);
      });
    }

    update();
    container.addEventListener("scroll", update, { passive: true });
    return () => container.removeEventListener("scroll", update);
  }, [rows]);

  return (
    <div
      ref={containerRef}
      className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto rounded-2xl bg-navy/5 p-6 py-16"
      style={{ scrollSnapType: "y proximity" }}
    >
      {rows.map((m, i) => (
        <div
          key={m.id}
          ref={(el) => {
            cardRefs.current[i] = el;
          }}
          className="flex gap-4 rounded-2xl border border-black/5 bg-white p-5 shadow-sm transition-transform duration-200 ease-out"
          style={{ scrollSnapAlign: "center" }}
        >
          <div className="h-28 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-navy/10">
            {m.headshot_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={m.headshot_url}
                alt={m.full_name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-navy/30">
                <svg width="32" height="32" fill="none" viewBox="0 0 24 24">
                  <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
                  <path
                    d="M4 20c0-4 4-6 8-6s8 2 8 6"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                </svg>
              </div>
            )}
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-orange">{m.full_name}</p>
            {m.role && <p className="text-sm font-semibold text-navy">{m.role}</p>}
            {m.about_me && (
              <p className="mt-1 text-sm leading-snug text-navy/70">{m.about_me}</p>
            )}
            {m.linkedin_url && (
              <a
                href={m.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 text-xs font-bold text-orange"
              >
                LinkedIn →
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
