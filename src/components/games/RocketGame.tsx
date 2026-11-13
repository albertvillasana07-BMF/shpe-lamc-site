"use client";

import { useEffect, useRef, useState } from "react";
import { pickSize, ROCKET_COLORS, ROCKET_STYLES, startRocket, type RocketStatus } from "@/lib/fun/rocket";
import { createSynthwave } from "@/lib/fun/synthwave";
import { createClient } from "@/lib/supabase/client";
import { fetchLeaderboard } from "@/lib/games/scores";
import Leaderboard from "@/components/games/Leaderboard";
import ScoreSubmit from "@/components/games/ScoreSubmit";
import { makeShareCard, shareScoreImage } from "@/lib/fun/shareCard";

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
  const [bossActive, setBossActive] = useState(false);
  // First-time tutorial (shown once per device, on the first launch)
  const [tutorial, setTutorial] = useState<number | null>(null);
  const tutorialSeen = useRef(true);
  const tutorialRef = useRef<HTMLDivElement>(null);
  // Share card: made as soon as the run ends, so the share sheet opens instantly on tap
  const shareBlob = useRef<Blob | null>(null);
  const [shareMsg, setShareMsg] = useState("");
  const [runBadges, setRunBadges] = useState<string[]>([]);
  const mutedRef = useRef(false);
  const statusRef = useRef<RocketStatus>("ready");
  const launchRef = useRef<() => void>(() => {});
  const bossRef = useRef(false);
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

  useEffect(() => {
    try {
      tutorialSeen.current = localStorage.getItem("shpe-rocket-tutorial") === "1";
    } catch {}
  }, []);
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);
  useEffect(() => {
    if (tutorial !== null) tutorialRef.current?.focus();
  }, [tutorial]);

  // Build the share image when a run ends (game over or new #1)
  useEffect(() => {
    if (status !== "over" && status !== "record") {
      shareBlob.current = null;
      setTimeout(() => setShareMsg(""), 0);
      return;
    }
    const g = game.current;
    if (!g) return;
    let cancelled = false;
    makeShareCard({ ...g.getStats(), isRecord: status === "record" }, g.snapshotRocket(4)).then((b) => {
      if (!cancelled) shareBlob.current = b;
    });
    return () => {
      cancelled = true;
    };
  }, [status]);

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

  // Phones: hide the tab bar + music button while flying, and center the game on screen
  useEffect(() => {
    const active = status === "playing" || status === "cutscene";
    window.dispatchEvent(new CustomEvent("shpe-game-active", { detail: { active } }));
    if (status === "playing" && window.innerWidth < 768) {
      canvasRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [status]);

  useEffect(
    () => () => {
      window.dispatchEvent(new CustomEvent("shpe-game-music", { detail: { playing: false } }));
      window.dispatchEvent(new CustomEvent("shpe-game-active", { detail: { active: false } }));
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
        onSfx: (kind) => {
          audio.current?.sfx(kind);
          // Phone buzz on big moments (Android; iPhones don't allow websites to vibrate)
          const pattern: Record<string, number | number[]> = { crash: [90, 40, 140], boom: 70, pop: 15, powerup: [20, 30, 20], shield: 40, alarm: [60, 60, 60] };
          if (!mutedRef.current && pattern[kind] && typeof navigator !== "undefined" && "vibrate" in navigator) {
            try {
              navigator.vibrate(pattern[kind]);
            } catch {}
          }
        },
        onLanding: (planet) => audio.current?.landing(planet),
        onJingle: (kind, n) => audio.current?.jingle(kind, n),
        onBossMusic: (level) => audio.current?.setBoss(level),
        onBoss: (active) => {
          bossRef.current = active;
          setBossActive(active);
          if (!active) game.current?.setFire(false);
        },
        onScore: setScore,
        onStatus: (s) => {
          statusRef.current = s;
          // Set badges in the same update as the status, so the auto-post includes them
          if (s === "over" || s === "record") setRunBadges(game.current?.getBadges() ?? []);
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
      if (down) audio.current?.unlock();
      if (down && e.key.length === 1) {
        keyBuf.current = (keyBuf.current + e.key.toLowerCase()).slice(-SECRET.length);
        if (keyBuf.current === SECRET) {
          keyBuf.current = "";
          tryPrez();
        }
      }
      if (bossRef.current) {
        const k = e.key.toLowerCase();
        if (k === " " || k === "z" || k === "j") {
          e.preventDefault();
          g.setFire(down);
          return;
        }
        if (k === "x" || k === "k") {
          e.preventDefault();
          if (down && !e.repeat) g.fireMissile();
          return;
        }
      }
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") { g.setLeft(down); e.preventDefault(); }
      else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") { g.setRight(down); e.preventDefault(); }
      else if ((e.key === " " || e.key === "p" || e.key === "P") && down && document.activeElement === canvas) {
        e.preventDefault();
        launchRef.current();
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

  /** Launch (showing the tutorial first on someone's very first launch), or pause/resume/retry */
  function launchOrAction() {
    const g = game.current;
    if (!g) return;
    if (statusRef.current === "ready" && !tutorialSeen.current) {
      setTutorial(0);
      return;
    }
    g.action();
  }

  useEffect(() => {
    launchRef.current = launchOrAction;
  });

  function finishTutorial() {
    tutorialSeen.current = true;
    try {
      localStorage.setItem("shpe-rocket-tutorial", "1");
    } catch {}
    setTutorial(null);
    audio.current?.unlock();
    game.current?.action();
    canvasRef.current?.focus();
  }

  async function shareScore() {
    const g = game.current;
    if (!g) return;
    setShareMsg("Making your card…");
    const blob = shareBlob.current ?? (await makeShareCard({ ...g.getStats(), isRecord: status === "record" }, g.snapshotRocket(4)));
    if (!blob) {
      setShareMsg("Couldn't make the image. Try again.");
      return;
    }
    const r = await shareScoreImage(blob, g.getScore());
    setShareMsg(r === "downloaded" ? "Saved! Check your downloads and post it." : r === "shared" ? "Shared!" : "");
  }

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
        <div className="relative mx-auto" style={{ width: `min(100%, calc(80vh * ${W / H}))` }}>
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
                      ? "Landing cutscene."
                      : ""
            } Steer with the arrow keys.${bossActive ? " Boss fight: hold Z for the blaster, press X for a missile." : ""}`}
            className="block w-full touch-none rounded-2xl bg-[#12002e] shadow-lg"
            // Fills the width, but stays short enough that the whole game fits on screen
            style={{ aspectRatio: `${W} / ${H}` }}
            onPointerMove={(e) => {
              if (e.pointerType !== "mouse" || e.buttons === 1 || status === "playing") game.current?.steerTo(toGameX(e.clientX));
            }}
            onPointerLeave={() => game.current?.steerTo(null)}
            onPointerDown={(e) => {
              audio.current?.unlock(); // phones only allow sound that starts during a tap
              canvasRef.current?.focus();
              if (status !== "playing" && !inEnding && tutorial === null) launchOrAction();
              game.current?.steerTo(toGameX(e.clientX));
            }}
          />

          {/* First-time tutorial */}
          {tutorial !== null && (
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-[#0a0020]/80 p-4">
              <div
                ref={tutorialRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="rocket-tut-title"
                tabIndex={-1}
                onKeyDown={(e) => {
                  if (e.key === "Escape") finishTutorial();
                }}
                className="w-full max-w-sm rounded-2xl border-2 border-[#ff3dbb] bg-[#12002e] p-5 text-white shadow-2xl outline-none"
              >
                <p className="text-xs font-bold uppercase tracking-wider text-[#ff9be6]">
                  How to play · {tutorial + 1} of 3
                </p>
                {tutorial === 0 && (
                  <>
                    <h3 id="rocket-tut-title" className="mt-2 text-xl font-bold">
                      <span aria-hidden="true">🕹️ </span>Steer
                    </h3>
                    <p className="mt-2 text-sm text-white/90">
                      Drag your finger, move your mouse, or use the ← → keys to slide left and right. Dodge the rocks!
                    </p>
                  </>
                )}
                {tutorial === 1 && (
                  <>
                    <h3 id="rocket-tut-title" className="mt-2 text-xl font-bold">
                      <span aria-hidden="true">🪙 </span>Grab stuff
                    </h3>
                    <p className="mt-2 text-sm text-white/90">
                      Gold SHPE coins are +50. The blue S is a shield that blocks one hit. Every 1,000 points is a checkpoint,
                      and every 5,000 you land on a new planet.
                    </p>
                  </>
                )}
                {tutorial === 2 && (
                  <>
                    <h3 id="rocket-tut-title" className="mt-2 text-xl font-bold">
                      <span aria-hidden="true">⚡ </span>Power-ups unlock as you score
                    </h3>
                    <ul className="mt-2 flex flex-col gap-1 text-sm text-white/90">
                      <li><span aria-hidden="true">⚡ </span>3,000: speed boost that smashes rocks</li>
                      <li><span aria-hidden="true">🎯 </span>10,000: blaster that auto-fires</li>
                      <li><span aria-hidden="true">❤️ </span>15,000: extra lives</li>
                      <li><span aria-hidden="true">🛸 </span>40,000: a boss fight. Good luck.</li>
                    </ul>
                  </>
                )}
                <div className="mt-4 flex items-center justify-between gap-3">
                  <button type="button" onClick={finishTutorial} className="text-sm font-semibold text-white/80 underline underline-offset-2">
                    Skip
                  </button>
                  <button
                    type="button"
                    onClick={() => (tutorial < 2 ? setTutorial(tutorial + 1) : finishTutorial())}
                    className="rounded-full bg-orange px-5 py-2 text-sm font-bold text-white hover:opacity-90"
                  >
                    {tutorial < 2 ? "Next" : "🚀 Let's fly"}
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Boss fight: hold-to-fire blaster on the left, missile on the right.
              Drag anywhere else on the game to slide back and forth. */}
          {bossActive && status === "playing" && (
            <>
              <button
                type="button"
                aria-label="Blaster (hold to fire)"
                className="absolute bottom-3 left-3 flex h-20 w-20 touch-none select-none flex-col items-center justify-center rounded-full border-2 border-[#33e1ff] bg-[#0a0020]/60 text-[10px] font-bold text-white shadow-lg active:scale-95 active:bg-[#33e1ff]/40"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  audio.current?.unlock();
                  game.current?.setFire(true);
                }}
                onPointerUp={() => game.current?.setFire(false)}
                onPointerCancel={() => game.current?.setFire(false)}
                onLostPointerCapture={() => game.current?.setFire(false)}
                onContextMenu={(e) => e.preventDefault()}
              >
                <span aria-hidden="true" className="text-2xl">🔫</span>
                BLASTER
              </button>
              <button
                type="button"
                aria-label="Fire missile"
                className="absolute bottom-3 right-3 flex h-20 w-20 touch-none select-none flex-col items-center justify-center rounded-full border-2 border-orange bg-[#0a0020]/60 text-[10px] font-bold text-white shadow-lg active:scale-95 active:bg-orange/40"
                onPointerDown={(e) => {
                  e.preventDefault();
                  audio.current?.unlock();
                  game.current?.fireMissile();
                }}
                onContextMenu={(e) => e.preventDefault()}
              >
                <span aria-hidden="true" className="text-2xl">🚀</span>
                MISSILE
              </button>
            </>
          )}
        </div>
        <div className="mx-auto mt-3 flex flex-wrap items-center gap-3" style={{ maxWidth: `calc(80vh * ${W / H})` }}>
          {!inEnding && (
            <button
              type="button"
              onClick={() => {
                audio.current?.unlock();
                launchOrAction();
                canvasRef.current?.focus();
              }}
              className="rounded-full bg-orange px-5 py-2 text-sm font-bold text-white hover:opacity-90"
            >
              {status === "ready" ? "🚀 Launch" : status === "playing" ? "Pause" : status === "paused" ? "Resume" : "Fly again"}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              audio.current?.unlock();
              setMuted((m) => !m);
            }}
            aria-pressed={!muted}
            className="rounded-full border-2 border-navy px-4 py-1.5 text-sm font-bold text-navy hover:bg-navy hover:text-white"
          >
            <span aria-hidden="true">{muted ? "🔇" : "🔊"} </span>
            Sound
          </button>
          <p className="text-xs text-navy/70">
            Steer with your mouse, finger, or ← → keys. Grab SHPE coins (+50) and the blue S shield. Power-ups unlock as you score: ⚡ boost at 3,000, 🎯 blaster at 10,000, ❤️ extra lives at 15,000. Beat the mothership at 40,000 to unlock WEMS blasts.
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
              badges={runBadges}
              onSubmitted={() => {
                setRecordPosted(true);
                setRefresh((r) => r + 1);
              }}
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={shareScore}
                className="rounded-full border-2 border-navy px-4 py-1.5 text-sm font-bold text-navy hover:bg-navy hover:text-white"
              >
                <span aria-hidden="true">📸 </span>Share my score
              </button>
              <p role="status" className="text-xs text-navy/70">{shareMsg}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                audio.current?.unlock();
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
            <ScoreSubmit
              game="rocket"
              score={score}
              badges={runBadges}
              onSubmitted={() => setRefresh((r) => r + 1)}
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={shareScore}
                className="rounded-full border-2 border-navy px-4 py-1.5 text-sm font-bold text-navy hover:bg-navy hover:text-white"
              >
                <span aria-hidden="true">📸 </span>Share my score
              </button>
              <p role="status" className="text-xs text-navy/70">{shareMsg}</p>
            </div>
          </div>
        )}
      </div>

      <div className="mx-auto w-full max-w-xl">
        <Leaderboard game="rocket" refreshKey={refresh} />
      </div>
    </div>
  );
}
