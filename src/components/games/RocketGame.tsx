"use client";

import { useEffect, useRef, useState } from "react";
import { RH, RW, startRocket } from "@/lib/fun/rocket";
import { createSynthwave } from "@/lib/fun/synthwave";
import Leaderboard from "@/components/games/Leaderboard";
import ScoreSubmit from "@/components/games/ScoreSubmit";

type Game = ReturnType<typeof startRocket>;

export default function RocketGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const game = useRef<Game | null>(null);
  const [status, setStatus] = useState<"ready" | "playing" | "paused" | "over">("ready");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [message, setMessage] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [round, setRound] = useState(0);
  const [muted, setMuted] = useState(false);
  const audio = useRef<ReturnType<typeof createSynthwave> | null>(null);

  // Remember the sound setting
  useEffect(() => {
    try {
      if (localStorage.getItem("shpe-rocket-muted") === "1") setTimeout(() => setMuted(true), 0);
    } catch {}
  }, []);

  useEffect(() => {
    audio.current?.setMuted(muted);
    try {
      localStorage.setItem("shpe-rocket-muted", muted ? "1" : "0");
    } catch {}
  }, [muted]);

  // Soundtrack plays only while flying. The site's lo-fi pauses meanwhile.
  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    const flying = status === "playing";
    if (flying) a.start();
    else a.stop();
    window.dispatchEvent(new CustomEvent("shpe-game-music", { detail: { playing: flying && !muted } }));
  }, [status, muted]);

  useEffect(
    () => () => {
      window.dispatchEvent(new CustomEvent("shpe-game-music", { detail: { playing: false } }));
    },
    []
  );

  useEffect(() => {
    try {
      const b = Number(localStorage.getItem("shpe-rocket-best") || 0);
      if (b) setTimeout(() => setBest(b), 0);
    } catch {}
  }, []);

  useEffect(() => {
    if (status === "over" && score > best) {
      setTimeout(() => setBest(score), 0);
      try {
        localStorage.setItem("shpe-rocket-best", String(score));
      } catch {}
    }
  }, [status, score, best]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    audio.current = createSynthwave();
    game.current = startRocket(canvas, {
      onSfx: (kind) => audio.current?.sfx(kind),
      onScore: setScore,
      onStatus: (s) => {
        setStatus(s);
        if (s === "ready") setRound((r) => r + 1);
      },
      onMessage: setMessage,
    });

    function onKey(e: KeyboardEvent) {
      const g = game.current;
      if (!g) return;
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select")) return;
      const down = e.type === "keydown";
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") { g.setLeft(down); e.preventDefault(); }
      else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") { g.setRight(down); e.preventDefault(); }
      else if ((e.key === " " || e.key === "p" || e.key === "P") && down && document.activeElement === canvas) {
        e.preventDefault();
        g.action();
      }
    }
    function onHide() {
      if (document.hidden) game.current?.pause();
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      game.current?.destroy();
      audio.current?.destroy();
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, []);

  function toGameX(clientX: number) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return ((clientX - rect.left) / rect.width) * RW;
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,440px)_1fr]">
      <div>
        <div className="mb-2 flex justify-between text-sm font-semibold text-navy" aria-hidden="true">
          <span>Score {score.toLocaleString()}</span>
          <span>Your best {best.toLocaleString()}</span>
        </div>
        <canvas
          ref={canvasRef}
          width={RW}
          height={RH}
          tabIndex={0}
          aria-label={`Rocket SHPE game. Score ${score}. ${
            status === "ready" ? "Press Space to launch." : status === "paused" ? "Paused." : status === "over" ? "Game over." : ""
          } Steer with the arrow keys.`}
          className="mx-auto block touch-none rounded-2xl shadow-lg"
          // Fits the screen height too, so the whole game is visible without scrolling
          style={{ aspectRatio: `${RW} / ${RH}`, width: `min(100%, calc(70vh * ${RW / RH}))` }}
          onPointerMove={(e) => {
            if (e.pointerType !== "mouse" || e.buttons === 1 || status === "playing") game.current?.steerTo(toGameX(e.clientX));
          }}
          onPointerLeave={() => game.current?.steerTo(null)}
          onPointerDown={(e) => {
            canvasRef.current?.focus();
            if (status !== "playing") game.current?.action();
            game.current?.steerTo(toGameX(e.clientX));
          }}
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              game.current?.action();
              canvasRef.current?.focus();
            }}
            className="rounded-full bg-orange px-5 py-2 text-sm font-bold text-white hover:opacity-90"
          >
            {status === "ready" ? "🚀 Launch" : status === "playing" ? "Pause" : status === "paused" ? "Resume" : "Fly again"}
          </button>
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            aria-pressed={!muted}
            className="rounded-full border-2 border-navy px-4 py-1.5 text-sm font-bold text-navy hover:bg-navy hover:text-white"
          >
            <span aria-hidden="true">{muted ? "🔇" : "🔊"} </span>
            Sound
          </button>
          <p className="text-xs text-navy/70">
            Steer with your mouse, finger, or ← → keys. Grab SHPE logos (+50), blue S = shield.
          </p>
        </div>
        <p className="sr-only" role="status" aria-live="polite">{message}</p>

        {status === "over" && score > 0 && (
          <div key={round} className="mt-4 rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
            <ScoreSubmit game="rocket" score={score} onSubmitted={() => setRefresh((r) => r + 1)} />
          </div>
        )}
      </div>

      <div>
        <Leaderboard game="rocket" refreshKey={refresh} />
      </div>
    </div>
  );
}
