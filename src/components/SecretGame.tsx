"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { H, W, startBreakout } from "@/lib/fun/breakout";
import Leaderboard from "@/components/games/Leaderboard";
import ScoreSubmit from "@/components/games/ScoreSubmit";

const BEST_KEY = "shpe-breakout-best";

type Game = ReturnType<typeof startBreakout>;

/**
 * Wraps the footer discipline bar. Clicking it opens Discipline Breakout,
 * a hidden mini game. It's a real button, so keyboard users can find it too.
 */
export default function SecretGame({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Secret: play Discipline Breakout, a mini game"
        title="🤫"
        className="block w-full cursor-pointer transition-[filter] hover:brightness-110"
      >
        {children}
      </button>
      {open && <GameDialog onClose={close} />}
    </>
  );
}

function GameDialog({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const game = useRef<Game | null>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [best, setBest] = useState(0);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"ready" | "playing" | "paused" | "won" | "lost">("ready");
  const [refresh, setRefresh] = useState(0);
  const [round, setRound] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const titleId = useId();
  const helpId = useId();

  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(BEST_KEY) || 0);
      if (saved) setTimeout(() => setBest(saved), 0);
    } catch {}
  }, []);

  useEffect(() => {
    if (status === "won" || status === "lost") setTimeout(() => setFinalScore(score), 0);
  }, [status, score]);

  useEffect(() => {
    if (score > best) {
      setTimeout(() => setBest(score), 0);
      try {
        localStorage.setItem(BEST_KEY, String(score));
      } catch {}
    }
  }, [score, best]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    game.current = startBreakout(canvas, {
      onScore: setScore,
      onLives: setLives,
      onMessage: setMessage,
      onStatus: (s) => {
        setStatus(s);
        if (s === "won" || s === "lost") setRound((r) => r + 1);
      },
    });
    canvas.focus();

    function onKey(e: KeyboardEvent) {
      const g = game.current;
      if (!g) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowLeft" || e.key === "a") {
        g.setLeft(e.type === "keydown");
        e.preventDefault();
      } else if (e.key === "ArrowRight" || e.key === "d") {
        g.setRight(e.type === "keydown");
        e.preventDefault();
      } else if ((e.key === " " || e.key === "Enter") && e.type === "keydown" && document.activeElement === canvas) {
        e.preventDefault();
        g.launch();
      }
    }
    // Pause if the visitor switches tabs
    function onHide() {
      if (document.hidden) game.current?.pause();
    }

    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    document.addEventListener("visibilitychange", onHide);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      game.current?.destroy();
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      document.removeEventListener("visibilitychange", onHide);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  // Keep Tab focus inside the dialog
  function trapFocus(e: React.KeyboardEvent) {
    if (e.key !== "Tab" || !dialogRef.current) return;
    const items = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>("button, a[href], canvas[tabindex]")
    );
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

  function toGameX(clientX: number) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return ((clientX - rect.left) / rect.width) * W;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-3">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={helpId}
        onKeyDown={trapFocus}
        className="on-dark max-h-full w-full max-w-xl overflow-y-auto rounded-2xl bg-navy p-4 text-white shadow-2xl"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="text-xl">
              Discipline Breakout
            </h2>
            <p id={helpId} className="text-sm text-white/80">
              Clear every engineering discipline. Move with your mouse, finger, or
              arrow keys. Space or tap to launch and pause.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full border border-white/40 px-3 py-1.5 text-sm font-bold hover:bg-white/10"
          >
            Close
          </button>
        </div>

        <div className="mb-2 flex justify-between text-sm font-semibold" aria-hidden="true">
          <span>Score {score}</span>
          <span>Best {best}</span>
          <span>Lives {"●".repeat(Math.max(0, lives))}</span>
        </div>

        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          tabIndex={0}
          aria-label={`Game area. Score ${score}, ${lives} lives left. ${
            status === "ready" ? "Press Space to launch." : status === "paused" ? "Paused." : ""
          }`}
          className="block w-full touch-none rounded-lg"
          style={{ aspectRatio: `${W} / ${H}` }}
          onPointerMove={(e) => game.current?.movePaddleTo(toGameX(e.clientX))}
          onPointerDown={(e) => {
            game.current?.movePaddleTo(toGameX(e.clientX));
            if (e.pointerType !== "mouse" || e.button === 0) game.current?.launch();
          }}
        />

        <p role="status" aria-live="polite" className="sr-only">
          {message}
        </p>

        {(status === "won" || status === "lost") && score > 0 && (
          <div key={round} className="mt-3 rounded-xl bg-white/5 p-3">
            <ScoreSubmit
              game="breakout"
              score={finalScore || score}
              dark
              onSubmitted={() => setRefresh((r) => r + 1)}
            />
          </div>
        )}

        <div className="mt-3">
          <Leaderboard game="breakout" refreshKey={refresh} dark />
        </div>

        {status === "won" && (
          <p className="mt-3 text-center font-semibold text-gold">
            Every discipline cleared. You&apos;d fit right in.{" "}
            <Link href="/join" onClick={onClose} className="underline underline-offset-2">
              Join <span className="font-shpe">SHPE</span> LAMC
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
