"use client";

import { useEffect, useRef, useState } from "react";
import { pickSize, ROCKET_COLORS, ROCKET_STYLES, startRocket, type RocketStatus } from "@/lib/fun/rocket";
import { createSynthwave } from "@/lib/fun/synthwave";
import { createClient } from "@/lib/supabase/client";
import { fetchLeaderboard } from "@/lib/games/scores";
import Leaderboard from "@/components/games/Leaderboard";
import ScoreSubmit from "@/components/games/ScoreSubmit";

type Game = ReturnType<typeof startRocket>;

const SECRET = "albert"; // owner-only keyboard code

export default function RocketGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const game = useRef<Game | null>(null);
  const [size, setSize] = useState<{ W: number; H: number } | null>(null);
  const [status, setStatus] = useState<RocketStatus>("ready");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [message, setMessage] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [round, setRound] = useState(0);
  const [muted, setMuted] = useState(false);
  const [recordPosted, setRecordPosted] = useState(false);
  const [colorId, setColorId] = useState("classic");
  const [styleId, setStyleId] = useState("classic");
  const audio = useRef<ReturnType<typeof createSynthwave> | null>(null);
  const isOwner = useRef(false);
  const keyBuf = useRef("");
  const taps = useRef<number[]>([]);

  // Owner check: only the site owner's login can use the secret mode
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (!data.user) return;
        const { data: me } = await supabase.from("profiles").select("is_owner").eq("id", data.user.id).maybeSingle();
        if (!cancelled) isOwner.current = !!me?.is_owner;
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function tryPrez() {
    if (!isOwner.current || !game.current) return;
    const on = game.current.togglePrez();
    // Screen-reader-only confirmation, nothing visible on the page
    setMessage(on ? "Mode on." : "Mode off.");
  }

  // Remember the rocket picked in the hangar
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("shpe-rocket-skin") || "null");
      if (saved?.color) setTimeout(() => setColorId(saved.color), 0);
      if (saved?.style) setTimeout(() => setStyleId(saved.style), 0);
    } catch {}
  }, []);

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
    if ((status === "over" || status === "record") && score > best) {
      setTimeout(() => setBest(score), 0);
      try {
        localStorage.setItem("shpe-rocket-best", String(score));
      } catch {}
    }
  }, [status, score, best]);

  // Pick the playfield size for this screen (bigger view on phone and computer)
  useEffect(() => {
    setTimeout(() => setSize(pickSize(window.innerWidth, window.innerHeight)), 0);
  }, []);

  // Keep the game's idea of the current #1 fresh, for the secret ending
  useEffect(() => {
    if (!size) return;
    let cancelled = false;
    fetchLeaderboard("rocket").then((rows) => {
      if (cancelled) return;
      game.current?.setRecord(rows[0]?.score ?? 0);
      // Only count "top 5" once the board actually has 5 names on it
      game.current?.setTop5(rows.length >= 5 ? rows[4].score : 0);
    });
    return () => {
      cancelled = true;
    };
  }, [size, refresh, round]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !size) return;
    audio.current = createSynthwave();
    game.current = startRocket(
      canvas,
      {
        onSfx: (kind) => audio.current?.sfx(kind),
        onScore: setScore,
        onStatus: (s) => {
          setStatus(s);
          if (s === "ready") setRound((r) => r + 1);
          if (s === "cutscene") setRecordPosted(false);
        },
        onMessage: setMessage,
      },
      size
    );

    function onKey(e: KeyboardEvent) {
      const g = game.current;
      if (!g) return;
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select")) return;
      const down = e.type === "keydown";
      if (down && e.key.length === 1) {
        keyBuf.current = (keyBuf.current + e.key.toLowerCase()).slice(-SECRET.length);
        if (keyBuf.current === SECRET) {
          keyBuf.current = "";
          tryPrez();
        }
      }
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
  }, [size]);

  // Apply the hangar pick (runs after the game is created, and on every change)
  useEffect(() => {
    game.current?.setSkin(colorId, styleId);
    try {
      localStorage.setItem("shpe-rocket-skin", JSON.stringify({ color: colorId, style: styleId }));
    } catch {}
  }, [colorId, styleId, size]);

  function toGameX(clientX: number) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return ((clientX - rect.left) / rect.width) * (size?.W ?? 400);
  }

  // Phone-friendly secret: tap "Your best" 5 times quickly
  function onBestTap() {
    const now = performance.now();
    taps.current = [...taps.current.filter((t) => now - t < 2500), now];
    if (taps.current.length >= 5) {
      taps.current = [];
      tryPrez();
    }
  }

  const W = size?.W ?? 460;
  const H = size?.H ?? 640;
  const inEnding = status === "cutscene" || status === "record";

  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="mx-auto mb-2 flex justify-between text-sm font-semibold text-navy" style={{ maxWidth: `calc(80vh * ${W / H})` }}>
          <span aria-hidden="true">Score {score.toLocaleString()}</span>
          <span aria-hidden="true" onClick={onBestTap} className="select-none">
            Your best {best.toLocaleString()}
          </span>
        </div>
        <canvas
          ref={canvasRef}
          tabIndex={0}
          aria-label={`Rocket SHPE game. Score ${score}. ${
            status === "ready"
              ? "Press Space to launch."
              : status === "paused"
                ? "Paused."
                : status === "over"
                  ? "Game over."
                  : inEnding
                    ? "Secret ending. You're the new number one."
                    : ""
          } Steer with the arrow keys.`}
          className="mx-auto block touch-none rounded-2xl bg-[#12002e] shadow-lg"
          // Fills the width, but stays short enough that the whole game fits on screen
          style={{ aspectRatio: `${W} / ${H}`, width: `min(100%, calc(80vh * ${W / H}))` }}
          onPointerMove={(e) => {
            if (e.pointerType !== "mouse" || e.buttons === 1 || status === "playing") game.current?.steerTo(toGameX(e.clientX));
          }}
          onPointerLeave={() => game.current?.steerTo(null)}
          onPointerDown={(e) => {
            canvasRef.current?.focus();
            if (status !== "playing" && !inEnding) game.current?.action();
            game.current?.steerTo(toGameX(e.clientX));
          }}
        />
        <div className="mx-auto mt-3 flex flex-wrap items-center gap-3" style={{ maxWidth: `calc(80vh * ${W / H})` }}>
          {!inEnding && (
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
          )}
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

        {status === "ready" && (
          <div
            className="mx-auto mt-4 rounded-2xl border border-black/5 bg-white p-4 shadow-sm"
            style={{ maxWidth: `calc(80vh * ${W / H})` }}
          >
            <h3 className="text-lg font-bold text-navy">
              <span aria-hidden="true">🛠️ </span>Hangar: pick your rocket
            </h3>
            <p className="text-xs text-navy/70">Your rocket on the launch pad updates as you pick.</p>

            <fieldset className="mt-3">
              <legend className="text-sm font-semibold text-navy">Color</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {ROCKET_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={colorId === c.id}
                    onClick={() => setColorId(c.id)}
                    className={`flex items-center gap-2 rounded-full border-2 px-3 py-1.5 text-sm font-bold text-navy ${
                      colorId === c.id ? "border-orange bg-orange/10" : "border-navy/20 hover:border-navy/50"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className="inline-block h-4 w-4 rounded-full border border-black/20"
                      style={{ background: c.swatch }}
                    />
                    {c.name}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="mt-3">
              <legend className="text-sm font-semibold text-navy">Style</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {ROCKET_STYLES.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    aria-pressed={styleId === st.id}
                    onClick={() => setStyleId(st.id)}
                    className={`rounded-full border-2 px-3 py-1.5 text-sm font-bold text-navy ${
                      styleId === st.id ? "border-orange bg-orange/10" : "border-navy/20 hover:border-navy/50"
                    }`}
                  >
                    <span aria-hidden="true">{st.emoji} </span>
                    {st.name}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        )}

        {status === "record" && (
          <div
            key={`rec-${round}`}
            className="mx-auto mt-4 rounded-2xl border-2 border-gold bg-white p-4 shadow-sm"
            style={{ maxWidth: `calc(80vh * ${W / H})` }}
          >
            <p className="mb-3 text-lg font-bold text-navy">
              <span aria-hidden="true">🏆 </span>You passed #1! Put your name at the top.
            </p>
            <ScoreSubmit
              game="rocket"
              score={score}
              onSubmitted={() => {
                setRecordPosted(true);
                setRefresh((r) => r + 1);
              }}
            />
            <button
              type="button"
              onClick={() => {
                game.current?.continueRun();
                canvasRef.current?.focus();
              }}
              className="mt-3 rounded-full bg-orange px-5 py-2 text-sm font-bold text-white hover:opacity-90"
            >
              {recordPosted ? "🚀 Keep flying" : "Skip & keep flying"}
            </button>
          </div>
        )}

        {status === "over" && score > 0 && (
          <div
            key={round}
            className="mx-auto mt-4 rounded-2xl border border-black/5 bg-white p-4 shadow-sm"
            style={{ maxWidth: `calc(80vh * ${W / H})` }}
          >
            <ScoreSubmit game="rocket" score={score} onSubmitted={() => setRefresh((r) => r + 1)} />
          </div>
        )}
      </div>

      <div className="mx-auto w-full max-w-xl">
        <Leaderboard game="rocket" refreshKey={refresh} />
      </div>
    </div>
  );
}
