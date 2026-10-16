"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Vertical list where every item stops exactly in the center of the box,
 * one at a time. The centered item grows slightly; the others fade back.
 * Used for the board members and scholarships lists.
 */
export default function SnapScrollList({
  label,
  heightClass = "h-[70vh]",
  children,
}: {
  label: string;
  heightClass?: string;
  children: ReactNode[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Start with the first item centered
    const first = itemRefs.current[0];
    if (first) {
      container.scrollTop = first.offsetTop + first.offsetHeight / 2 - container.clientHeight / 2;
    }

    function update() {
      if (!container || reduceMotion) return;
      const mid = container.scrollTop + container.clientHeight / 2;
      itemRefs.current.forEach((item) => {
        if (!item) return;
        // offsetTop is measured from the scroll box (it's position: relative)
        const center = item.offsetTop + item.offsetHeight / 2;
        const t = Math.max(0, 1 - Math.abs(center - mid) / 260);
        item.style.transform = `scale(${(0.94 + 0.06 * t).toFixed(3)})`;
        item.style.opacity = (0.65 + 0.35 * t).toFixed(2);
      });
    }

    update();
    container.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      container.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [children.length]);

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label={label}
      tabIndex={0}
      className={`relative ${heightClass} overflow-y-auto overscroll-contain rounded-2xl bg-navy/5 px-6`}
      style={{ scrollSnapType: "y mandatory" }}
    >
      <ul className="flex flex-col gap-5">
        {/* Empty space so the first and last items can reach the center */}
        <li aria-hidden="true" className="shrink-0" style={{ height: "calc(35vh - 6rem)" }} />
        {children.map((child, i) => (
          <li
            key={i}
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            className="transition-transform duration-200 ease-out"
            style={{ scrollSnapAlign: "center", scrollSnapStop: "always" }}
          >
            {child}
          </li>
        ))}
        <li aria-hidden="true" className="shrink-0" style={{ height: "calc(35vh - 6rem)" }} />
      </ul>
    </div>
  );
}
