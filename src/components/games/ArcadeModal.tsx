"use client";

import { useEffect, useId, useRef, useState } from "react";
import WordleGame from "@/components/games/WordleGame";
import RocketGame from "@/components/games/RocketGame";

type View = "menu" | "wordle" | "rocket";

const GAMES = [
  {
    id: "wordle" as const,
    emoji: "🔤",
    title: "Weekly Wordle",
    text: "A new 5-letter word every Monday. Fewest guesses tops the leaderboard.",
  },
  {
    id: "rocket" as const,
    emoji: "🚀",
    title: "Rocket SHPE",
    text: "Launch into deep space. Dodge asteroids and grab SHPE logos.",
  },
];

/** Pop-up arcade that opens on top of whatever page you're on. */
export default function ArcadeModal({ onClose }: { onClose: () => void }) {
  const [view, setView] = useState<View>("menu");
  const dialogRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const titleId = useId();

  // Lock page scroll, close on Escape, and put focus back when closing
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      previous?.focus();
    };
  }, [onClose]);

  // Move focus to the title whenever the view changes
  useEffect(() => {
    headingRef.current?.focus();
  }, [view]);

  // Keep Tab inside the pop-up
  function trapFocus(e: React.KeyboardEvent) {
    if (e.key !== "Tab" || !dialogRef.current) return;
    const items = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), [tabindex="0"]'
      )
    ).filter((el) => el.offsetParent !== null);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  const title = view === "menu" ? "SHPE Arcade" : GAMES.find((g) => g.id === view)!.title;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-black/70 p-2 sm:items-center sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={trapFocus}
        className="relative my-auto flex max-h-[96vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        {/* Header bar */}
        <div className="on-dark blueprint flex items-center justify-between gap-3 px-4 py-3 text-white">
          <div className="flex items-center gap-3">
            {view !== "menu" && (
              <button
                type="button"
                onClick={() => setView("menu")}
                className="rounded-full border border-white/50 px-3 py-1 text-sm font-bold hover:bg-white/10"
              >
                <span aria-hidden="true">← </span>Games
              </button>
            )}
            <h2 id={titleId} ref={headingRef} tabIndex={-1} className="text-xl focus:outline-none">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/50 text-xl hover:bg-white/10"
          >
            <span aria-hidden="true">×</span>
            <span className="sr-only">Close arcade</span>
          </button>
        </div>

        <div className="overflow-y-auto p-4 sm:p-6">
          {view === "menu" && (
            <>
              <p className="mb-5 text-navy/80">Take a study break. Weekly leaderboards, bragging rights included.</p>
              <ul className="grid gap-4 sm:grid-cols-2">
                {GAMES.map((g) => (
                  <li key={g.id}>
                    <button
                      type="button"
                      onClick={() => setView(g.id)}
                      className="group flex h-full w-full flex-col items-start rounded-2xl border border-black/5 bg-white p-5 text-left shadow-sm transition-shadow hover:shadow-md"
                    >
                      <span className="text-4xl" aria-hidden="true">{g.emoji}</span>
                      <span className="mt-2 text-xl font-bold text-navy group-hover:underline">{g.title}</span>
                      <span className="mt-1 text-navy/80">{g.text}</span>
                      <span className="mt-3 font-bold text-orange" aria-hidden="true">Play →</span>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-6 rounded-2xl border border-dashed border-navy/40 p-4 text-center text-sm text-navy/80">
                <span aria-hidden="true">🤫 </span>
                There&apos;s also a secret game hidden somewhere on this site. Can you find it?
              </p>
            </>
          )}
          {view === "wordle" && <WordleGame />}
          {view === "rocket" && <RocketGame />}
        </div>
      </div>
    </div>
  );
}
