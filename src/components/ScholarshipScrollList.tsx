"use client";

import { useEffect, useRef } from "react";
import type { ScholarshipRow } from "@/lib/types";

function formatDeadline(deadline: string | null) {
  if (!deadline) return "Deadline: TBA";
  return `Deadline: ${new Date(deadline + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

export default function ScholarshipScrollList({ rows }: { rows: ScholarshipRow[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function update() {
      if (!container || reduceMotion) return;
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
      role="region"
      aria-label="Scholarships, scrollable list"
      tabIndex={0}
      className="max-h-[70vh] overflow-y-auto rounded-2xl bg-navy/5 p-6 py-16"
      style={{ scrollSnapType: "y proximity" }}
    >
      <ul className="flex flex-col gap-4">
      {rows.map((s, i) => (
        <li
          key={s.id}
          ref={(el) => {
            cardRefs.current[i] = el;
          }}
          className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm transition-transform duration-200 ease-out"
          style={{ scrollSnapAlign: "center" }}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-bold text-navy">{s.title}</h2>
            {s.amount && (
              <span className="text-base font-bold text-orange">{s.amount}</span>
            )}
          </div>
          {s.description && (
            <p className="mt-2 text-sm text-navy/80">{s.description}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold text-navy/80">
              <span aria-hidden="true">📅 </span>
              {formatDeadline(s.deadline)}
            </span>
            {s.link && (
              <a
                href={s.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-bold text-orange underline-offset-2 hover:underline"
              >
                Apply<span className="sr-only"> for {s.title} (opens in a new tab)</span>
                <span aria-hidden="true"> →</span>
              </a>
            )}
          </div>
        </li>
      ))}
      </ul>
    </div>
  );
}
