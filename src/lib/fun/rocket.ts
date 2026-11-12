/**
 * Rocket SHPE: retro synthwave edition with a pseudo-3D view.
 * Things spawn at the horizon and rush toward you, growing as they get closer.
 * Game logic runs in "world" coordinates; drawing and collisions use the
 * projected (on-screen) positions so what you see is what hits you.
 *
 * The playfield size is picked per device (see pickSize) so phones and
 * computers both get a wider, zoomed-out view.
 */

const FONT = '"Press Start 2P", ui-monospace, monospace';
const WOW_AT = 3000; // distance readout that triggers the "wow" message
// Speed tuning: slower, gentler ramp so players survive longer and see bigger numbers
const START_SPEED = 2.6;
const MAX_SPEED = 7; // was 9
const SPEED_RAMP = 4000; // distance per +1 speed (was 2300, higher = slower ramp)
const DISTANCE_RATE = 1.3; // readout climbs a bit faster than the rocket visibly moves
const CHECKPOINT = 1000; // a new quote every 1,000 on the readout
// Checkpoint quotes in order (3,000 is the "wow" easter egg). Past 5,000 they cycle.
const QUOTES: Record<number, string> = {
  1: "YOU ON YOUR WAY",
  2: "YOU AIN'T EVEN CLOSE THO",
  4: "YOU THINK YOU'RE GOATED",
  5: "YOU AIN'T EVEN HALFWAY BRUH",
};
const CYCLE = [QUOTES[1], QUOTES[2], QUOTES[4], QUOTES[5]];
const CUT_LEN = 10500; // length of the secret ending, in ms

export type RocketStatus = "ready" | "playing" | "paused" | "over" | "cutscene" | "record";

type Crater = { a: number; d: number; r: number };
type Speck = { a: number; d: number; s: number; light: boolean };
type Rock = {
  x: number; y: number; r: number; vy: number; vx: number; rot: number; vr: number;
  pts: number[]; craters: Crater[]; specks: Speck[]; tint: number;
};
type Item = { x: number; y: number; vy: number; kind: "coin" | "shield"; t: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number };
type Star = { x: number; y: number; tw: number };

export type RocketEvents = {
  onScore: (score: number) => void;
  onStatus: (s: RocketStatus) => void;
  onMessage: (m: string) => void;
  onSfx?: (kind: "coin" | "shield" | "crash" | "zone" | "launch") => void;
};

// Each zone shifts the synthwave palette
const ZONES = [
  { at: 0, name: "Launch Pad", sky: ["#12002e", "#3d0b5c", "#b3186a"], sun: ["#FFD166", "#FD652F", "#D33A02"], grid: "#ff3dbb" },
  { at: 1500, name: "Upper Atmosphere", sky: ["#0a0030", "#2a0a6b", "#d33a7a"], sun: ["#ffe08a", "#ff7a59", "#d1245f"], grid: "#ff4fd8" },
  { at: 4000, name: "Low Earth Orbit", sky: ["#020024", "#1b0b5e", "#0070C0"], sun: ["#9ff3ff", "#72A9BE", "#0070C0"], grid: "#33e1ff" },
  { at: 8000, name: "Asteroid Belt", sky: ["#14000a", "#4a0a2a", "#D33A02"], sun: ["#ffd166", "#ff5a1f", "#a3195b"], grid: "#ff7a1a" },
  { at: 14000, name: "Deep Space", sky: ["#000000", "#10002b", "#3d0b5c"], sun: ["#f0b3ff", "#b44dff", "#5b1aa8"], grid: "#b44dff" },
];

const SHPE = ["#D33A02", "#FD652F", "#72A9BE", "#0070C0"];
const LIGHT = { x: -0.6, y: -0.8 }; // light from the top-left

/* ---------------- Rocket hangar (colors + styles) ---------------- */

type Palette = {
  body: [string, string, string, string, string]; // dark edge, mid, highlight, mid, dark edge
  nose: [string, string, string];
  fin: [string, string]; // shadow side, lit side
  trail: [string, string];
};

export const ROCKET_COLORS: { id: string; name: string; swatch: string; p: Palette }[] = [
  { id: "classic", name: "Classic", swatch: "#c9d4ea",
    p: { body: ["#5c6b8a", "#c9d4ea", "#ffffff", "#9aa8c4", "#3b4763"], nose: ["#a12a00", "#ffb38a", "#7a1f00"], fin: ["#a12a00", "#ff7a3d"], trail: ["#ff3dbb", "#FFD166"] } },
  { id: "navy", name: "SHPE Navy", swatch: "#1f4a9a",
    p: { body: ["#000c26", "#1f4a9a", "#6fa3ff", "#16367a", "#000a1f"], nose: ["#a12a00", "#ffb38a", "#7a1f00"], fin: ["#0a3a7a", "#0070C0"], trail: ["#33e1ff", "#FD652F"] } },
  { id: "neon", name: "Neon", swatch: "#ff5ccf",
    p: { body: ["#5a0040", "#ff5ccf", "#ffd6f3", "#d12ea8", "#3a0029"], nose: ["#2a0a6b", "#b44dff", "#1a0540"], fin: ["#7a00a8", "#b44dff"], trail: ["#ff3dbb", "#b44dff"] } },
  { id: "teal", name: "Teal", swatch: "#72A9BE",
    p: { body: ["#0b3a46", "#72A9BE", "#e6fbff", "#4f8ea3", "#082a33"], nose: ["#a12a00", "#ffb38a", "#7a1f00"], fin: ["#0b5a6b", "#33e1ff"], trail: ["#33e1ff", "#ffffff"] } },
  { id: "gold", name: "Gold", swatch: "#e8b84a",
    p: { body: ["#5a3d00", "#e8b84a", "#fff3c4", "#c9931f", "#3d2900"], nose: ["#001F5B", "#4a7fd6", "#000c26"], fin: ["#001F5B", "#0070C0"], trail: ["#FFD166", "#ff7a1a"] } },
  { id: "stealth", name: "Stealth", swatch: "#2a2a36",
    p: { body: ["#0a0a0f", "#3a3a48", "#7a7a90", "#2a2a36", "#050508"], nose: ["#4a0000", "#ff3d3d", "#2a0000"], fin: ["#1a1a22", "#3a3a48"], trail: ["#ff3d3d", "#ffffff"] } },
];

export const ROCKET_STYLES: { id: string; name: string; emoji: string }[] = [
  { id: "classic", name: "Classic", emoji: "🚀" },
  { id: "retro", name: "Retro", emoji: "🛸" },
  { id: "shuttle", name: "Shuttle", emoji: "🛫" },
  { id: "arrow", name: "Arrow", emoji: "🏹" },
];

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const ease = (v: number) => {
  const t = clamp01(v);
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Pick the playfield size for this screen.
 * Wider world = objects look smaller = you see more around you.
 */
export function pickSize(viewW: number, viewH: number) {
  const mobile = viewW < 768;
  if (mobile) {
    const W = 460;
    const displayW = Math.max(280, viewW - 40);
    const displayH = viewH * 0.8;
    const H = Math.round(Math.max(640, Math.min(900, W * (displayH / displayW))));
    return { W, H };
  }
  return { W: 760, H: 620 };
}

export function startRocket(canvas: HTMLCanvasElement, ev: RocketEvents, size: { W: number; H: number }) {
  const ctx = canvas.getContext("2d")!;
  const W = size.W;
  const H = size.H;
  const dpr = Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);

  // Playfield geometry scales with the size
  const HORIZON = Math.round(H * 0.33);
  const WORLD_TOP = -40;
  const WORLD_BOTTOM = H + 80;
  const ROCKET_WY = H - 90;
  const widthFactor = W / 400; // keeps the same rock density on a wider field
  const T_ROCKET = Math.pow((ROCKET_WY - WORLD_TOP) / (WORLD_BOTTOM - WORLD_TOP), 2);

  // Perspective projection: world y -> screen y and scale (scale = 1 at the rocket)
  function project(wx: number, wy: number) {
    const t = Math.max(0, Math.min(1.15, (wy - WORLD_TOP) / (WORLD_BOTTOM - WORLD_TOP)));
    const p = t * t;
    const sy = HORIZON + p * (H + 30 - HORIZON);
    const s = 0.12 + 0.88 * (p / T_ROCKET);
    const sx = W / 2 + (wx - W / 2) * s;
    return { sx, sy, s };
  }

  let status: RocketStatus = "ready";
  let x = W / 2;
  let targetX: number | null = null;
  let vx = 0;
  let left = false;
  let right = false;
  let distance = 0;
  let bonus = 0;
  let speed = START_SPEED;
  let shield = 0;
  let invuln = 0;
  let zoneIdx = 0;
  let zoneBanner = { text: "", until: 0 };
  let nextCheckpoint = CHECKPOINT;
  let top5 = 0; // 5th place score on the all-time board
  let top5Shown = false;
  let callout: { big: string; small: string; color: string; until: number } | null = null;
  const symbolImg = typeof Image !== "undefined" ? new Image() : null;
  if (symbolImg) symbolImg.src = "/images/symbol.png";
  let record = 0; // current #1 on the all-time board
  let recordBeaten = false;
  let cutT = 0;
  let landed = false;
  let planted = false;
  let prez = false;
  let palette: Palette = ROCKET_COLORS[0].p;
  let rocketStyle = "classic";
  let prezFlash = 0;
  let rocks: Rock[] = [];
  let items: Item[] = [];
  let parts: Particle[] = [];
  let spawnRock = 0;
  let spawnItem = 0;
  let gridScroll = 0;
  let last = performance.now();
  let raf = 0;
  let lastReportedScore = -1;

  const stars: Star[] = Array.from({ length: Math.round(70 * widthFactor) }, () => ({
    x: Math.random() * W,
    y: Math.random() * (HORIZON - 40),
    tw: Math.random() * Math.PI * 2,
  }));
  const cutStars: Star[] = Array.from({ length: Math.round(140 * widthFactor) }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    tw: Math.random() * Math.PI * 2,
  }));
  // Wireframe mountain range along the horizon
  const mCount = Math.round(14 * Math.sqrt(widthFactor));
  const mountains = Array.from({ length: mCount }, (_, i) => {
    const mid = (mCount - 1) / 2;
    return { x: (i / (mCount - 1)) * W, h: 18 + Math.random() * 46 * (Math.abs(i - mid) / mid + 0.3) };
  });

  const score = () => Math.floor(distance / 10) + bonus;
  const rocketScreen = () => project(x, ROCKET_WY);

  function setStatus(s: RocketStatus) {
    status = s;
    ev.onStatus(s);
  }

  function reset() {
    x = W / 2;
    targetX = null;
    vx = 0;
    distance = 0;
    bonus = 0;
    speed = START_SPEED;
    shield = 0;
    invuln = 0;
    zoneIdx = 0;
    nextCheckpoint = CHECKPOINT;
    top5Shown = false;
    callout = null;
    recordBeaten = false;
    rocks = [];
    items = [];
    parts = [];
    spawnRock = 90;
    spawnItem = 260;
    lastReportedScore = -1;
    ev.onScore(0);
    setStatus("ready");
  }

  function makeRock(): Rock {
    const r = 13 + Math.random() * (14 + Math.min(14, distance / 1500));
    return {
      x: 30 + Math.random() * (W - 60),
      y: WORLD_TOP,
      r,
      vy: speed * (0.75 + Math.random() * 0.6),
      vx: (Math.random() - 0.5) * (distance > 4000 ? 1.2 : 0.4),
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.05,
      pts: Array.from({ length: 14 }, () => 0.78 + Math.random() * 0.3),
      craters: Array.from({ length: 2 + Math.floor(Math.random() * 3) }, () => ({
        a: Math.random() * Math.PI * 2,
        d: Math.random() * 0.55,
        r: 0.12 + Math.random() * 0.16,
      })),
      specks: Array.from({ length: 10 }, () => ({
        a: Math.random() * Math.PI * 2,
        d: Math.random() * 0.8,
        s: 0.6 + Math.random() * 1.2,
        light: Math.random() < 0.5,
      })),
      tint: Math.random(),
    };
  }

  function burst(px: number, py: number, colors: string[], n: number, power: number) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = Math.random() * power;
      parts.push({
        x: px, y: py, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: 0, max: 28 + Math.random() * 30,
        color: colors[i % colors.length], size: 1.5 + Math.random() * 2.5,
      });
    }
  }

  /* ---------------- Secret ending timeline ---------------- */

  const earthR = W * 1.15;
  const earthCyEnd = H * 0.7 + earthR;
  const earthCyStart = H + earthR + 40;
  const earthCy = (t: number) => lerp(earthCyStart, earthCyEnd, ease(t / 3));
  const groundY = (gx: number, cy: number) => cy - Math.sqrt(Math.max(0, earthR * earthR - (gx - W / 2) ** 2));
  const rocketLandY = () => groundY(W / 2, earthCyEnd) - 28;
  const rocketCutY = (t: number) => lerp(-70, rocketLandY(), ease((t - 2) / 2.6));
  const flagX = W / 2 + 74;

  function startCutscene() {
    cutT = 0;
    landed = false;
    planted = false;
    parts = [];
    setStatus("cutscene");
    ev.onMessage("New number one! Rocket SHPE made it home.");
    ev.onSfx?.("zone");
  }

  function stepCutscene(dt: number) {
    cutT += dt;
    const t = cutT / 1000;
    for (const s of cutStars) s.tw += 0.04 * (dt / 16.67);
    if (!landed && t >= 4.6) {
      landed = true;
      burst(W / 2, rocketLandY() + 28, ["#c9b8a3", "#ffffff", "#9aa8c4"], 40, 3);
      ev.onSfx?.("coin");
    }
    if (!planted && t >= 7.2) {
      planted = true;
      burst(flagX, groundY(flagX, earthCyEnd), ["#c9b8a3", "#ffffff"], 18, 2);
      ev.onSfx?.("shield");
    }
    if (cutT >= CUT_LEN && status === "cutscene") setStatus("record");
  }

  function step(dt: number) {
    const f = dt / 16.67;
    gridScroll = (gridScroll + (status === "playing" ? speed : 0.8) * 0.012 * f) % 1;
    for (const s of stars) s.tw += 0.05 * f;
    if (prezFlash > 0) prezFlash -= f;

    parts = parts.filter((p) => {
      p.x += p.vx * f; p.y += p.vy * f; p.life += f;
      return p.life < p.max;
    });

    if (status === "cutscene" || status === "record") {
      if (status === "cutscene") stepCutscene(dt);
      return;
    }

    const rs = rocketScreen();
    if (status !== "over") {
      for (let i = 0; i < 2; i++) {
        parts.push({
          x: rs.sx + (Math.random() - 0.5) * 6, y: rs.sy + 30,
          vx: (Math.random() - 0.5) * 0.6, vy: 2 + Math.random() * 2,
          life: 0, max: 16 + Math.random() * 10,
          color: prez ? (Math.random() < 0.5 ? "#00ffd0" : "#ff00ff") : Math.random() < 0.5 ? palette.trail[0] : palette.trail[1],
          size: 2 + Math.random() * 2.5,
        });
      }
    }

    if (status !== "playing") return;

    if (left) vx -= 0.9 * f;
    if (right) vx += 0.9 * f;
    if (targetX !== null && !left && !right) vx += (targetX - x) * 0.04 * f;
    vx *= Math.pow(0.82, f);
    x = Math.max(22, Math.min(W - 22, x + vx * f));

    distance += speed * DISTANCE_RATE * f;
    speed = Math.min(MAX_SPEED, START_SPEED + distance / SPEED_RAMP);
    if (invuln > 0) invuln -= f;

    const nextZone = ZONES.findLastIndex((z) => distance >= z.at);
    if (nextZone > zoneIdx) {
      zoneIdx = nextZone;
      zoneBanner = { text: ZONES[zoneIdx].name, until: performance.now() + 2200 };
      ev.onMessage(`Entering ${ZONES[zoneIdx].name}`);
      ev.onSfx?.("zone");
    }

    // Checkpoints every 1,000 with a quote (3,000 = the wow easter egg)
    if (distance / 10 >= nextCheckpoint) {
      const n = nextCheckpoint / CHECKPOINT;
      const until = performance.now() + 3800;
      if (nextCheckpoint === WOW_AT) {
        callout = {
          big: "WOW, YOU'RE GOOD",
          small: recordBeaten ? "...AND YEAH, THE BEST" : "...BUT NOT THE BEST",
          color: "#FFD166",
          until,
        };
      } else {
        const quote = QUOTES[n] ?? CYCLE[(n - 6) % CYCLE.length];
        callout = { big: quote, small: `CHECKPOINT ${nextCheckpoint.toLocaleString()} KM`, color: "#33e1ff", until };
      }
      ev.onMessage(`${callout.big.toLowerCase()}. ${callout.small.toLowerCase()}`);
      ev.onSfx?.("zone");
      nextCheckpoint += CHECKPOINT;
    }

    spawnRock -= speed * f;
    if (spawnRock <= 0) {
      rocks.push(makeRock());
      spawnRock = (Math.max(118, 165 - distance / 300) * (0.7 + Math.random() * 0.6)) / widthFactor;
    }
    spawnItem -= speed * f;
    if (spawnItem <= 0) {
      items.push({
        x: 40 + Math.random() * (W - 80), y: WORLD_TOP, vy: speed * 0.85,
        kind: Math.random() < 0.12 && shield === 0 ? "shield" : "coin", t: 0,
      });
      spawnItem = (170 + Math.random() * 190) / widthFactor;
    }

    // Collisions use on-screen positions, so the hitbox matches the picture
    for (const r of rocks) {
      r.y += r.vy * f; r.x += r.vx * f; r.rot += r.vr * f;
      if (r.x < r.r || r.x > W - r.r) r.vx = -r.vx;
      const pr = project(r.x, r.y);
      if (invuln <= 0 && Math.hypot(pr.sx - rs.sx, pr.sy - rs.sy) < r.r * pr.s * 0.82 + 12) {
        if (prez) {
          // Prezzy mode: rocks glitch out of existence and pay out
          r.y = WORLD_BOTTOM + 100;
          bonus += 100;
          burst(pr.sx, pr.sy, ["#00ffd0", "#ff00ff", "#ffffff", "#FFD166"], 26, 4.5);
          ev.onSfx?.("coin");
        } else if (shield > 0) {
          shield = 0;
          invuln = 60;
          r.y = WORLD_BOTTOM + 100;
          burst(rs.sx, rs.sy, ["#33e1ff", "#ffffff"], 30, 4);
          ev.onMessage("Shield absorbed the hit");
          ev.onSfx?.("shield");
        } else {
          burst(rs.sx, rs.sy, ["#ff3dbb", "#FFD166", "#FD652F", "#ffffff"], 80, 5);
          ev.onSfx?.("crash");
          setStatus("over");
          ev.onScore(score());
          ev.onMessage(`Crashed. Final score ${score()}.`);
          return;
        }
      }
    }
    rocks = rocks.filter((r) => r.y < WORLD_BOTTOM + 40);

    for (const it of items) {
      it.y += it.vy * f; it.t += f;
      const pi = project(it.x, it.y);
      if (it.kind === "coin" && pi.sy > HORIZON + 20 && Math.random() < 0.18 * f) {
        // Little glints that drift off the coin
        parts.push({
          x: pi.sx + (Math.random() - 0.5) * 22 * pi.s, y: pi.sy + (Math.random() - 0.5) * 22 * pi.s,
          vx: (Math.random() - 0.5) * 0.4, vy: -0.3 - Math.random() * 0.5,
          life: 0, max: 18 + Math.random() * 12, color: Math.random() < 0.6 ? "#fff3b0" : "#ffffff", size: 1.5 + Math.random() * 1.5,
        });
      }
      if (Math.hypot(pi.sx - rs.sx, pi.sy - rs.sy) < 24 * Math.max(0.6, pi.s)) {
        it.y = WORLD_BOTTOM + 100;
        if (it.kind === "coin") {
          bonus += 50;
          burst(pi.sx, pi.sy, SHPE, 18, 2.8);
          ev.onSfx?.("coin");
        } else {
          shield = 1;
          burst(rs.sx, rs.sy, ["#33e1ff", "#ffffff"], 20, 3);
          ev.onMessage("Shield on");
          ev.onSfx?.("shield");
        }
      }
    }
    items = items.filter((it) => it.y < WORLD_BOTTOM + 40);

    const sc = score();
    if (Math.floor(sc / 10) !== Math.floor(lastReportedScore / 10)) {
      lastReportedScore = sc;
      ev.onScore(sc);
    }

    // Cracked the all-time top 5
    if (!top5Shown && top5 > 0 && sc > top5 && !(record > 0 && sc > record)) {
      top5Shown = true;
      callout = { big: "YOU NEAR THE TOP", small: "TOP 5 TERRITORY", color: "#ff9be6", until: performance.now() + 3800 };
      ev.onMessage("You near the top. Top 5 territory.");
      ev.onSfx?.("zone");
    }

    // Secret ending: passed the current #1
    if (!recordBeaten && record > 0 && sc > record) {
      recordBeaten = true;
      ev.onScore(sc);
      startCutscene();
    }
  }

  /* ---------------- Drawing ---------------- */

  function drawBackground() {
    const z = ZONES[zoneIdx];
    const sky = ctx.createLinearGradient(0, 0, 0, HORIZON);
    sky.addColorStop(0, z.sky[0]);
    sky.addColorStop(0.6, z.sky[1]);
    sky.addColorStop(1, z.sky[2]);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, HORIZON);

    for (const s of stars) {
      ctx.fillStyle = `rgba(255,255,255,${0.35 + 0.35 * Math.sin(s.tw)})`;
      ctx.fillRect(s.x, s.y, 2, 2);
    }

    // Striped retro sun
    const cx = W / 2;
    const cy = HORIZON - 6;
    const R = 78 * Math.sqrt(widthFactor);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, HORIZON);
    ctx.clip();
    ctx.shadowColor = z.sun[1];
    ctx.shadowBlur = 40;
    const sun = ctx.createLinearGradient(0, cy - R, 0, cy);
    sun.addColorStop(0, z.sun[0]);
    sun.addColorStop(0.55, z.sun[1]);
    sun.addColorStop(1, z.sun[2]);
    ctx.fillStyle = sun;
    ctx.beginPath();
    ctx.arc(cx, cy, R, Math.PI, 0);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = "destination-out";
    for (let i = 0; i < 6; i++) {
      const y = cy - R * 0.44 + i * R * 0.096;
      ctx.fillRect(cx - R, y, R * 2, 1 + i * 0.9);
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();

    // Wireframe mountains
    ctx.beginPath();
    ctx.moveTo(0, HORIZON);
    for (const m of mountains) ctx.lineTo(m.x, HORIZON - m.h);
    ctx.lineTo(W, HORIZON);
    ctx.closePath();
    ctx.fillStyle = "#0d0221";
    ctx.fill();
    ctx.strokeStyle = z.grid;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.7;
    ctx.stroke();
    ctx.globalAlpha = 1;

    const floor = ctx.createLinearGradient(0, HORIZON, 0, H);
    floor.addColorStop(0, "#1a0533");
    floor.addColorStop(1, "#05010d");
    ctx.fillStyle = floor;
    ctx.fillRect(0, HORIZON, W, H - HORIZON);

    // Neon perspective grid rushing toward you
    ctx.save();
    ctx.strokeStyle = z.grid;
    ctx.shadowColor = z.grid;
    ctx.shadowBlur = 6;
    ctx.lineWidth = 1.2;
    const n = Math.ceil(W / 2 / 70) + 4;
    for (let i = -n; i <= n; i++) {
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.moveTo(W / 2 + i * 6, HORIZON);
      ctx.lineTo(W / 2 + i * 70, H);
      ctx.stroke();
    }
    for (let i = 0; i < 12; i++) {
      const t = (i + gridScroll) / 12;
      const y = HORIZON + Math.pow(t, 2.2) * (H - HORIZON);
      ctx.globalAlpha = 0.15 + 0.6 * t;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = 1;

    ctx.fillStyle = z.grid;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, HORIZON - 1, W, 2);
    ctx.globalAlpha = 1;
  }

  // Realistic asteroid: lumpy outline, lit from the top-left, craters and speckles
  function drawRock(r: Rock) {
    const p = project(r.x, r.y);
    if (p.sy < HORIZON - 4) return;
    const rad = r.r * p.s;
    ctx.save();
    ctx.globalAlpha = Math.min(1, (p.sy - HORIZON) / 40);

    // Soft ground shadow on the grid
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.ellipse(p.sx + rad * 0.35, p.sy + rad * 0.95, rad * 0.95, rad * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();

    const pts = r.pts.map((m, i) => {
      const a = r.rot + (i / r.pts.length) * Math.PI * 2;
      return { x: p.sx + Math.cos(a) * rad * m, y: p.sy + Math.sin(a) * rad * m };
    });
    const outline = () => {
      ctx.beginPath();
      // Smooth lumpy edge through the midpoints
      const n = pts.length;
      const mid = (i: number) => ({ x: (pts[i % n].x + pts[(i + 1) % n].x) / 2, y: (pts[i % n].y + pts[(i + 1) % n].y) / 2 });
      const m0 = mid(n - 1);
      ctx.moveTo(m0.x, m0.y);
      for (let i = 0; i < n; i++) {
        const m = mid(i);
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, m.x, m.y);
      }
      ctx.closePath();
    };

    // Base rock color: grey-brown, each rock a little different
    const warm = Math.round(r.tint * 18);
    const g = ctx.createRadialGradient(
      p.sx + LIGHT.x * rad * 0.45, p.sy + LIGHT.y * rad * 0.45, rad * 0.1,
      p.sx, p.sy, rad * 1.15
    );
    g.addColorStop(0, `rgb(${168 + warm},${156 + warm / 2},${142})`);
    g.addColorStop(0.45, `rgb(${112 + warm},${100 + warm / 2},${90})`);
    g.addColorStop(1, `rgb(${38 + warm / 2},${32},${30})`);
    outline();
    ctx.fillStyle = g;
    ctx.fill();

    ctx.save();
    outline();
    ctx.clip();
    // Speckles (tiny bumps and pits)
    for (const sp of r.specks) {
      const a = r.rot + sp.a;
      ctx.fillStyle = sp.light ? "rgba(255,240,220,0.18)" : "rgba(0,0,0,0.28)";
      ctx.fillRect(p.sx + Math.cos(a) * rad * sp.d, p.sy + Math.sin(a) * rad * sp.d, sp.s * p.s, sp.s * p.s);
    }
    // Craters: dark bowl, lit lower-right wall, bright upper rim
    for (const c of r.craters) {
      const a = r.rot + c.a;
      const cx = p.sx + Math.cos(a) * rad * c.d;
      const cy = p.sy + Math.sin(a) * rad * c.d;
      const cr = rad * c.r;
      const bowl = ctx.createRadialGradient(cx - cr * 0.3, cy - cr * 0.3, cr * 0.1, cx, cy, cr);
      bowl.addColorStop(0, "rgba(0,0,0,0.5)");
      bowl.addColorStop(1, "rgba(0,0,0,0.15)");
      ctx.fillStyle = bowl;
      ctx.beginPath();
      ctx.ellipse(cx, cy, cr, cr * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,235,210,0.28)";
      ctx.lineWidth = Math.max(0.8, cr * 0.22);
      ctx.beginPath();
      ctx.ellipse(cx, cy, cr * 0.9, cr * 0.75, 0, -0.2, Math.PI / 2 + 0.3);
      ctx.stroke();
    }
    // Night side: darken the bottom-right
    const night = ctx.createLinearGradient(p.sx - rad, p.sy - rad, p.sx + rad, p.sy + rad);
    night.addColorStop(0.45, "rgba(0,0,0,0)");
    night.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = night;
    ctx.fillRect(p.sx - rad * 1.3, p.sy - rad * 1.3, rad * 2.6, rad * 2.6);
    ctx.restore();

    // Faint neon bounce light from the grid, so it still fits the synthwave scene
    outline();
    ctx.strokeStyle = "rgba(255,61,187,0.22)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  // Shiny gold SHPE coin: glowing halo, thick rim, real logo, moving shine + twinkle
  function drawCoin(it: Item) {
    const p = project(it.x, it.y);
    if (p.sy < HORIZON - 4) return;
    const r = 14 * p.s;
    const spin = Math.cos(it.t * 0.07);
    const w = Math.max(0.1, Math.abs(spin));
    const now = performance.now();
    ctx.save();
    ctx.globalAlpha = Math.min(1, (p.sy - HORIZON) / 40);
    ctx.translate(p.sx, p.sy);

    // Pulsing gold halo: the big tell that this is a coin, not a rock
    const pulse = 0.55 + 0.25 * Math.sin(now / 180 + it.x);
    const halo = ctx.createRadialGradient(0, 0, r * 0.6, 0, 0, r * 2.6);
    halo.addColorStop(0, `rgba(255,209,102,${0.55 * pulse})`);
    halo.addColorStop(1, "rgba(255,209,102,0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, r * 2.6, 0, Math.PI * 2);
    ctx.fill();

    // Thick rim/edge (visible while it spins)
    const edgeOff = (spin > 0 ? 1 : -1) * 3 * p.s * (1 - w);
    const edge = ctx.createLinearGradient(-r, 0, r, 0);
    edge.addColorStop(0, "#5a3a00");
    edge.addColorStop(0.5, "#c99a2e");
    edge.addColorStop(1, "#5a3a00");
    ctx.fillStyle = edge;
    ctx.beginPath();
    ctx.ellipse(edgeOff, 0, r * w + Math.abs(edgeOff), r, 0, 0, Math.PI * 2);
    ctx.fill();

    // Face: polished gold
    ctx.save();
    ctx.scale(w, 1);
    const face = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
    face.addColorStop(0, "#fff8d6");
    face.addColorStop(0.35, "#ffd65c");
    face.addColorStop(0.75, "#e0a400");
    face.addColorStop(1, "#8a5a00");
    ctx.fillStyle = face;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    // Raised inner ring
    ctx.strokeStyle = "rgba(255,248,214,0.75)";
    ctx.lineWidth = Math.max(0.8, 1.3 * p.s);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.82, Math.PI * 0.9, Math.PI * 1.9);
    ctx.stroke();
    ctx.strokeStyle = "rgba(90,58,0,0.6)";
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.82, Math.PI * 1.9, Math.PI * 2.9);
    ctx.stroke();

    // Real SHPE symbol stamped in the middle
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.74, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fill();
    if (symbolImg && symbolImg.complete && symbolImg.naturalWidth > 0) {
      const s = r * 1.25;
      ctx.drawImage(symbolImg, -s / 2, -s / 2, s, s);
    } else {
      ctx.lineWidth = 2.6 * p.s;
      ctx.lineCap = "round";
      SHPE.forEach((c, i) => {
        ctx.strokeStyle = c;
        const a = (i * Math.PI) / 2;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * 3 * p.s, Math.sin(a) * 3 * p.s, 5.5 * p.s, a + 0.6, a + 2.6);
        ctx.stroke();
      });
    }
    ctx.restore();

    // Moving shine sweep across the face
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.clip();
    const sweep = ((now / 900 + it.x * 0.01) % 1) * r * 4 - r * 2;
    const shine = ctx.createLinearGradient(sweep - r * 0.5, -r, sweep + r * 0.5, r);
    shine.addColorStop(0, "rgba(255,255,255,0)");
    shine.addColorStop(0.5, "rgba(255,255,255,0.7)");
    shine.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = shine;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.restore();

    // Twinkle star on the top edge
    const tw = Math.max(0, Math.sin(now / 260 + it.x * 0.3));
    if (tw > 0.2) {
      const sx = r * 0.55 * w;
      const sy = -r * 0.6;
      const L = r * 0.9 * tw;
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "#ffffff";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(sx, sy - L);
      ctx.lineTo(sx + L * 0.15, sy - L * 0.15);
      ctx.lineTo(sx + L, sy);
      ctx.lineTo(sx + L * 0.15, sy + L * 0.15);
      ctx.lineTo(sx, sy + L);
      ctx.lineTo(sx - L * 0.15, sy + L * 0.15);
      ctx.lineTo(sx - L, sy);
      ctx.lineTo(sx - L * 0.15, sy - L * 0.15);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawShieldItem(it: Item) {
    const p = project(it.x, it.y);
    if (p.sy < HORIZON - 4) return;
    const r = 12 * p.s;
    ctx.save();
    ctx.globalAlpha = Math.min(1, (p.sy - HORIZON) / 40);
    ctx.shadowColor = "#33e1ff";
    ctx.shadowBlur = 16;
    ctx.strokeStyle = "#33e1ff";
    ctx.lineWidth = 3 * p.s;
    ctx.beginPath();
    ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ffffff";
    ctx.font = `${Math.round(10 * p.s)}px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("S", p.sx, p.sy + 1);
    ctx.restore();
  }

  /* ---- Realistic ship rendering: brushed metal, panel lines, nozzles, layered flame ---- */

  function metal(halfW: number, roll: number, cols: readonly string[]) {
    const g = ctx.createLinearGradient(-halfW, 0, halfW, 0);
    const hi = 0.32 - roll * 0.2;
    g.addColorStop(0, cols[4]);
    g.addColorStop(Math.max(0.04, hi - 0.2), cols[3]);
    g.addColorStop(Math.max(0.06, hi - 0.06), cols[1]);
    g.addColorStop(Math.max(0.08, hi), cols[2]);
    g.addColorStop(Math.min(0.9, hi + 0.12), cols[1]);
    g.addColorStop(Math.min(0.95, hi + 0.4), cols[3]);
    g.addColorStop(1, cols[0]);
    return g;
  }

  /** Fill a hull path with metal, then add specular, panel seams, rivets, and shading inside it */
  function shadeHull(path: () => void, halfW: number, top: number, bottom: number, roll: number, seams: number[], stripeY: number) {
    path();
    ctx.fillStyle = metal(halfW, roll, palette.body);
    ctx.fill();

    ctx.save();
    path();
    ctx.clip();
    // Brushed-metal streaks
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 0.6;
    for (let x = -halfW; x < halfW; x += 2.2) {
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      ctx.stroke();
    }
    // Sharp specular highlight down the lit side
    const hx = -halfW * (0.36 + roll * 0.4);
    const spec = ctx.createLinearGradient(hx - 2.5, 0, hx + 2.5, 0);
    spec.addColorStop(0, "rgba(255,255,255,0)");
    spec.addColorStop(0.5, "rgba(255,255,255,0.75)");
    spec.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = spec;
    ctx.fillRect(hx - 3, top, 6, bottom - top);
    // Panel seams: dark groove + light bevel, with rivets
    for (const y of seams) {
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(-halfW, y, halfW * 2, 0.8);
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fillRect(-halfW, y + 0.8, halfW * 2, 0.6);
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      for (let x = -halfW + 2.5; x < halfW - 1; x += 4) ctx.fillRect(x, y + 2, 0.9, 0.9);
    }
    // SHPE stripe (painted, so it gets shaded too)
    SHPE.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(-halfW + (i * halfW * 2) / 4, stripeY, (halfW * 2) / 4 + 0.3, 3.5);
    });
    // Ambient occlusion: darker toward the engines, and a cool rim light on the shadow side
    const ao = ctx.createLinearGradient(0, top, 0, bottom);
    ao.addColorStop(0, "rgba(0,0,0,0)");
    ao.addColorStop(0.7, "rgba(0,0,0,0.05)");
    ao.addColorStop(1, "rgba(0,0,0,0.4)");
    ctx.fillStyle = ao;
    ctx.fillRect(-halfW, top, halfW * 2, bottom - top);
    const rim = ctx.createLinearGradient(halfW - 3, 0, halfW, 0);
    rim.addColorStop(0, "rgba(120,200,255,0)");
    rim.addColorStop(1, "rgba(120,200,255,0.35)");
    ctx.fillStyle = rim;
    ctx.fillRect(halfW - 3, top, 3, bottom - top);
    ctx.restore();

    // Crisp outline
    path();
    ctx.strokeStyle = "rgba(0,0,0,0.45)";
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  function shadeNose(path: () => void, halfW: number, roll: number) {
    path();
    ctx.fillStyle = metal(halfW, roll, [palette.nose[2], palette.nose[0], palette.nose[1], palette.nose[0], palette.nose[2]]);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  function shadeFin(path: () => void, lit: boolean, x0: number, x1: number) {
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, lit ? palette.fin[1] : palette.fin[0]);
    g.addColorStop(1, lit ? palette.fin[0] : "#000000");
    path();
    ctx.fillStyle = g;
    ctx.fill();
    ctx.save();
    path();
    ctx.clip();
    ctx.fillStyle = lit ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.25)";
    ctx.fillRect(Math.min(x0, x1), -40, Math.abs(x1 - x0), 80);
    ctx.restore();
    path();
    ctx.strokeStyle = "rgba(0,0,0,0.45)";
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  function drawWindow(cx: number, cy: number, r: number) {
    // Metal bezel
    const bez = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    bez.addColorStop(0, "#e8edf5");
    bez.addColorStop(1, "#4a5568");
    ctx.fillStyle = bez;
    ctx.beginPath(); ctx.arc(cx, cy, r + 1.6, 0, Math.PI * 2); ctx.fill();
    // Glass with depth
    const w = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, 0.5, cx, cy, r * 1.1);
    w.addColorStop(0, "#d6f7ff");
    w.addColorStop(0.3, "#4fb3ff");
    w.addColorStop(0.8, "#0a3a7a");
    w.addColorStop(1, "#021430");
    ctx.fillStyle = w;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    // Reflections
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.beginPath(); ctx.ellipse(cx - r * 0.35, cy - r * 0.4, r * 0.32, r * 0.18, -0.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.beginPath(); ctx.arc(cx + r * 0.35, cy + r * 0.35, r * 0.12, 0, Math.PI * 2); ctx.fill();
  }

  function drawNozzle(cx: number, y: number, w: number) {
    const g = ctx.createLinearGradient(cx - w, 0, cx + w, 0);
    g.addColorStop(0, "#1c2230");
    g.addColorStop(0.35, "#8a94a8");
    g.addColorStop(0.55, "#3a4255");
    g.addColorStop(1, "#11151f");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.6, y);
    ctx.lineTo(cx + w * 0.6, y);
    ctx.lineTo(cx + w, y + 5);
    ctx.lineTo(cx - w, y + 5);
    ctx.closePath();
    ctx.fill();
    // Hot glow inside the bell
    ctx.shadowColor = palette.trail[0];
    ctx.shadowBlur = 16;
    ctx.fillStyle = palette.trail[1];
    ctx.beginPath();
    ctx.ellipse(cx, y + 5, w * 0.85, 1.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  function drawFlame(cx: number, y: number, spread: number, big = 1) {
    const flick = 0.85 + Math.random() * 0.3;
    const layers: [number, number, string, string][] = [
      [1.0, 1.0, palette.trail[0], "rgba(0,0,0,0)"],
      [0.7, 0.75, palette.trail[1], "rgba(0,0,0,0)"],
      [0.4, 0.45, "#ffffff", "rgba(255,255,255,0)"],
    ];
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const [ws, ls, c0, c1] of layers) {
      const len = (22 + Math.random() * 10) * ls * big * flick;
      const g = ctx.createLinearGradient(0, y, 0, y + len);
      g.addColorStop(0, c0);
      g.addColorStop(1, c1);
      ctx.fillStyle = g;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.moveTo(cx - spread * ws, y);
      ctx.quadraticCurveTo(cx - spread * ws * 0.6, y + len * 0.6, cx, y + len);
      ctx.quadraticCurveTo(cx + spread * ws * 0.6, y + len * 0.6, cx + spread * ws, y);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  /** The rocket itself, centered at (sx, sy). roll = -1..1 banking. Uses the picked color + style. */
  function drawRocketBody(sx: number, sy: number, roll: number, flame = true) {
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(roll * 0.25);
    ctx.scale(1 - Math.abs(roll) * 0.28, 1);
    const leftLit = roll <= 0; // light comes from the top-left

    if (rocketStyle === "retro") {
      if (flame) drawFlame(0, 28, 7);
      drawNozzle(0, 23, 7);
      shadeFin(() => { ctx.beginPath(); ctx.moveTo(-12, 0); ctx.quadraticCurveTo(-30, 12, -26, 30); ctx.quadraticCurveTo(-18, 22, -10, 22); ctx.closePath(); }, leftLit, -28, -10);
      shadeFin(() => { ctx.beginPath(); ctx.moveTo(12, 0); ctx.quadraticCurveTo(30, 12, 26, 30); ctx.quadraticCurveTo(18, 22, 10, 22); ctx.closePath(); }, !leftLit, 28, 10);
      shadeHull(() => { ctx.beginPath(); ctx.ellipse(0, -2, 15, 26, 0, 0, Math.PI * 2); }, 15, -28, 24, roll, [-14, 4, 16], 9);
      shadeNose(() => { ctx.beginPath(); ctx.ellipse(0, -24, 7, 6, 0, Math.PI, 0); ctx.closePath(); }, 7, roll);
      // Center fin seen edge-on
      const cf = ctx.createLinearGradient(-2, 0, 2, 0);
      cf.addColorStop(0, palette.fin[1]);
      cf.addColorStop(1, palette.fin[0]);
      ctx.fillStyle = cf;
      ctx.fillRect(-2, 8, 4, 20);
      drawWindow(0, -7, 7);
    } else if (rocketStyle === "shuttle") {
      if (flame) { drawFlame(-6, 29, 4.5); drawFlame(6, 29, 4.5); }
      drawNozzle(-6, 24, 4.5);
      drawNozzle(6, 24, 4.5);
      shadeFin(() => { ctx.beginPath(); ctx.moveTo(-8, -6); ctx.lineTo(-31, 22); ctx.lineTo(-8, 24); ctx.closePath(); }, leftLit, -30, -8);
      shadeFin(() => { ctx.beginPath(); ctx.moveTo(8, -6); ctx.lineTo(31, 22); ctx.lineTo(8, 24); ctx.closePath(); }, !leftLit, 30, 8);
      // Heat-shield tiles along the wing edges
      ctx.fillStyle = "rgba(20,20,28,0.7)";
      ctx.beginPath(); ctx.moveTo(-31, 22); ctx.lineTo(-27, 22); ctx.lineTo(-8, 0); ctx.lineTo(-8, -6); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(31, 22); ctx.lineTo(27, 22); ctx.lineTo(8, 0); ctx.lineTo(8, -6); ctx.closePath(); ctx.fill();
      shadeHull(() => {
        ctx.beginPath();
        ctx.moveTo(-10, 24); ctx.lineTo(-10, -18);
        ctx.quadraticCurveTo(-10, -32, 0, -33);
        ctx.quadraticCurveTo(10, -32, 10, -18);
        ctx.lineTo(10, 24); ctx.closePath();
      }, 10, -33, 24, roll, [-6, 6, 17], 10);
      shadeNose(() => { ctx.beginPath(); ctx.moveTo(-8, -25); ctx.quadraticCurveTo(0, -37, 8, -25); ctx.quadraticCurveTo(0, -28, -8, -25); ctx.closePath(); }, 8, roll);
      // Cockpit glass
      const cg = ctx.createLinearGradient(0, -19, 0, -12);
      cg.addColorStop(0, "#4fb3ff");
      cg.addColorStop(1, "#021430");
      ctx.fillStyle = cg;
      ctx.beginPath(); ctx.moveTo(-6.5, -18); ctx.lineTo(6.5, -18); ctx.lineTo(4.5, -12); ctx.lineTo(-4.5, -12); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.fillRect(-4.5, -17, 3, 1.2);
    } else if (rocketStyle === "arrow") {
      if (flame) drawFlame(0, 30, 5.5, 1.2);
      drawNozzle(0, 25, 5.5);
      shadeFin(() => { ctx.beginPath(); ctx.moveTo(-7, 8); ctx.lineTo(-23, 31); ctx.lineTo(-7, 24); ctx.closePath(); }, leftLit, -22, -7);
      shadeFin(() => { ctx.beginPath(); ctx.moveTo(7, 8); ctx.lineTo(23, 31); ctx.lineTo(7, 24); ctx.closePath(); }, !leftLit, 22, 7);
      shadeHull(() => {
        ctx.beginPath();
        ctx.moveTo(0, -43);
        ctx.quadraticCurveTo(10, -14, 8, 25);
        ctx.lineTo(-8, 25);
        ctx.quadraticCurveTo(-10, -14, 0, -43);
        ctx.closePath();
      }, 9, -43, 25, roll, [6, 18], 12);
      shadeNose(() => { ctx.beginPath(); ctx.moveTo(0, -43); ctx.quadraticCurveTo(3.6, -35, 4.5, -29); ctx.lineTo(-4.5, -29); ctx.quadraticCurveTo(-3.6, -35, 0, -43); ctx.closePath(); }, 4.5, roll);
      // Long canopy
      const c = ctx.createLinearGradient(-3, -20, 3, 2);
      c.addColorStop(0, "#d6f7ff");
      c.addColorStop(0.35, "#4fb3ff");
      c.addColorStop(1, "#021430");
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.ellipse(0, -9, 3.6, 11, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(220,230,245,0.8)";
      ctx.lineWidth = 0.9;
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.fillRect(-2, -17, 1.2, 6);
    } else {
      // Classic
      if (flame) drawFlame(0, 28, 7);
      drawNozzle(0, 22, 7);
      shadeFin(() => { ctx.beginPath(); ctx.moveTo(-12, 6); ctx.lineTo(-25, 29); ctx.lineTo(-9, 22); ctx.closePath(); }, leftLit, -24, -9);
      shadeFin(() => { ctx.beginPath(); ctx.moveTo(12, 6); ctx.lineTo(25, 29); ctx.lineTo(9, 22); ctx.closePath(); }, !leftLit, 24, 9);
      shadeHull(() => {
        ctx.beginPath();
        ctx.moveTo(0, -32);
        ctx.quadraticCurveTo(15, -12, 12, 22);
        ctx.lineTo(-12, 22);
        ctx.quadraticCurveTo(-15, -12, 0, -32);
        ctx.closePath();
      }, 13, -32, 22, roll, [-12, 5, 16], 9);
      shadeNose(() => { ctx.beginPath(); ctx.moveTo(0, -32); ctx.quadraticCurveTo(8, -24, 9, -17); ctx.lineTo(-9, -17); ctx.quadraticCurveTo(-8, -24, 0, -32); ctx.closePath(); }, 9, roll);
      drawWindow(0, -4, 5.5);
    }
    ctx.restore();
  }

  function drawRocket() {
    const { sx, sy } = rocketScreen();
    const roll = Math.max(-1, Math.min(1, vx / 8));

    if (prez) {
      // Glitch: color-split ghosts + jitter
      const jx = (Math.random() - 0.5) * 3;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.35;
      drawRocketBody(sx - 4 + jx, sy, roll, status === "playing");
      drawRocketBody(sx + 4 + jx, sy + 1, roll, status === "playing");
      ctx.restore();
      drawRocketBody(sx + jx, sy, roll, status === "playing");
    } else {
      drawRocketBody(sx, sy, roll, status === "playing");
    }

    if (shield > 0 || invuln > 0) {
      ctx.save();
      ctx.shadowColor = "#33e1ff";
      ctx.shadowBlur = 18;
      ctx.strokeStyle = invuln > 0 ? `rgba(255,255,255,${0.3 + 0.3 * Math.sin(performance.now() / 60)})` : "rgba(51,225,255,0.9)";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(sx, sy, 32, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  }

  function retroText(text: string, x0: number, y0: number, size: number, color: string, align: CanvasTextAlign = "center") {
    ctx.font = `${size}px ${FONT}`;
    ctx.textAlign = align;
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#2a0040";
    ctx.fillText(text, x0 + 2, y0 + 2);
    ctx.fillStyle = color;
    ctx.fillText(text, x0, y0);
  }

  function drawGlitchTears() {
    if (!(prez && Math.random() < 0.18) && prezFlash <= 0) return;
    const bars = prezFlash > 0 ? 6 : 2;
    for (let i = 0; i < bars; i++) {
      const y = Math.random() * H;
      const h = 4 + Math.random() * 18;
      const dx = (Math.random() - 0.5) * 30;
      ctx.drawImage(canvas, 0, y * dpr, W * dpr, h * dpr, dx, y, W, h);
      ctx.fillStyle = Math.random() < 0.5 ? "rgba(0,255,208,0.18)" : "rgba(255,0,255,0.18)";
      ctx.fillRect(0, y, W, h);
    }
  }

  /* ---------------- Secret ending drawing ---------------- */

  function drawEarth(cy: number, t: number) {
    const cx = W / 2;
    ctx.save();
    ctx.shadowColor = "#7fd6ff";
    ctx.shadowBlur = 50;
    const ocean = ctx.createRadialGradient(cx - earthR * 0.3, cy - earthR * 0.6, earthR * 0.1, cx, cy, earthR);
    ocean.addColorStop(0, "#7fd6ff");
    ocean.addColorStop(0.45, "#0070C0");
    ocean.addColorStop(1, "#001F5B");
    ctx.fillStyle = ocean;
    ctx.beginPath();
    ctx.arc(cx, cy, earthR, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.arc(cx, cy, earthR, 0, Math.PI * 2);
    ctx.clip();
    // Land masses drift slowly as the planet turns
    const drift = (t * 8) % (W * 1.6);
    const land = [
      { x: -0.35, y: 0.06, rx: 0.22, ry: 0.05 },
      { x: 0.05, y: 0.02, rx: 0.16, ry: 0.035 },
      { x: 0.45, y: 0.1, rx: 0.25, ry: 0.07 },
      { x: 0.9, y: 0.04, rx: 0.18, ry: 0.04 },
      { x: -0.8, y: 0.12, rx: 0.2, ry: 0.06 },
    ];
    for (const l of land) {
      const lx = cx + ((l.x * W + drift + W * 0.8) % (W * 1.6)) - W * 0.8;
      const ly = cy - earthR + l.y * H;
      ctx.fillStyle = "#3fae5a";
      ctx.beginPath();
      ctx.ellipse(lx, ly, l.rx * W, l.ry * H, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2f8f47";
      ctx.beginPath();
      ctx.ellipse(lx + l.rx * W * 0.2, ly + 3, l.rx * W * 0.5, l.ry * H * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    for (let i = 0; i < 5; i++) {
      const lx = cx + (((i * 0.37 * W - drift * 1.4) % (W * 1.6)) + W * 1.6) % (W * 1.6) - W * 0.8;
      ctx.beginPath();
      ctx.ellipse(lx, cy - earthR + 18 + i * 9, W * 0.12, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Thin atmosphere ring
    ctx.strokeStyle = "rgba(127,214,255,0.6)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, earthR + 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Real SHPE flag: navy cloth, official symbol + white wordmark, color stripe
  const FLAG_W = 76;
  const FLAG_H = 46;
  const FLAG_RES = 4; // draw the cloth at 4x so the logo stays crisp
  const flagSymbol = new Image();
  const flagWordmark = new Image();
  flagSymbol.src = "/images/symbol.png";
  flagWordmark.src = "/images/shpe-wordmark-white.png";
  let flagCloth: HTMLCanvasElement | null = null;

  function buildFlagCloth() {
    if (flagCloth) return flagCloth;
    const c = document.createElement("canvas");
    c.width = FLAG_W * FLAG_RES;
    c.height = FLAG_H * FLAG_RES;
    const g = c.getContext("2d")!;
    g.scale(FLAG_RES, FLAG_RES);
    g.fillStyle = "#001F5B";
    g.fillRect(0, 0, FLAG_W, FLAG_H);
    // SHPE color stripe along the bottom
    SHPE.forEach((col, i) => {
      g.fillStyle = col;
      g.fillRect((i * FLAG_W) / 4, FLAG_H - 6, FLAG_W / 4 + 0.5, 6);
    });
    const ready = flagSymbol.complete && flagSymbol.naturalWidth > 0 && flagWordmark.complete && flagWordmark.naturalWidth > 0;
    if (ready) {
      const symS = 28;
      g.drawImage(flagSymbol, 5, (FLAG_H - 6 - symS) / 2, symS, symS);
      const wmW = 36;
      const wmH = wmW * (flagWordmark.naturalHeight / flagWordmark.naturalWidth);
      g.drawImage(flagWordmark, 36, (FLAG_H - 6 - wmH) / 2, wmW, wmH);
      flagCloth = c; // only cache once the logos have loaded
    } else {
      g.fillStyle = "#ffffff";
      g.font = `9px ${FONT}`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText("SHPE", FLAG_W / 2, (FLAG_H - 6) / 2);
    }
    return c;
  }

  function drawFlag(fx: number, gy: number, t: number) {
    // Pole drops from the astronaut's hand into the ground
    const drop = ease((t - 6.8) / 0.4);
    const bottom = lerp(gy - 30, gy + 4, drop);
    const poleH = 84;
    const top = bottom - poleH;
    ctx.strokeStyle = "#d9dde6";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(fx, bottom);
    ctx.lineTo(fx, top);
    ctx.stroke();
    ctx.fillStyle = "#FFD166";
    ctx.beginPath();
    ctx.arc(fx, top - 2, 3, 0, Math.PI * 2);
    ctx.fill();

    const unfurl = ease((t - 7.3) / 0.7);
    if (unfurl <= 0) return;
    const cloth = buildFlagCloth();
    const fw = FLAG_W * unfurl;
    const N = 24;
    // Draw the cloth in thin vertical strips, each nudged by a wave
    for (let i = 0; i < N; i++) {
      const k = i / N;
      const wave = Math.sin(t * 6 - i * 0.45) * 3 * k;
      const shade = 0.85 + 0.15 * Math.cos(t * 6 - i * 0.45);
      ctx.drawImage(
        cloth,
        k * cloth.width, 0, cloth.width / N + 1, cloth.height,
        fx + k * fw, top + wave, fw / N + 0.6, FLAG_H
      );
      // Folds: darken the troughs a little
      ctx.fillStyle = `rgba(0,0,0,${(1 - shade) * 1.6})`;
      ctx.fillRect(fx + k * fw, top + wave, fw / N + 0.6, FLAG_H);
    }
  }

  function drawAstronaut(ax: number, gy: number, walk: number, armUp: number) {
    ctx.save();
    ctx.translate(ax, gy);
    // Legs
    const swing = Math.sin(walk) * 4;
    ctx.fillStyle = "#e9edf5";
    ctx.fillRect(-5 + swing * 0.5, -12, 4, 12);
    ctx.fillRect(1 - swing * 0.5, -12, 4, 12);
    ctx.fillStyle = "#9aa8c4";
    ctx.fillRect(-6 + swing * 0.5, -2, 6, 2);
    ctx.fillRect(1 - swing * 0.5, -2, 6, 2);
    // Backpack
    ctx.fillStyle = "#b9c2d4";
    ctx.fillRect(-11, -26, 6, 13);
    // Body
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.roundRect(-7, -27, 14, 16, 4);
    ctx.fill();
    // SHPE patch
    SHPE.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(-4 + i * 2, -22, 2, 3);
    });
    // Arm (raises when planting)
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(4, -23);
    ctx.lineTo(4 + 8, -23 + lerp(8, -6, armUp));
    ctx.stroke();
    // Helmet + gold visor
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(0, -34, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#c9d4ea";
    ctx.lineWidth = 1;
    ctx.stroke();
    const v = ctx.createLinearGradient(0, -40, 8, -30);
    v.addColorStop(0, "#FFD166");
    v.addColorStop(0.6, "#FD652F");
    v.addColorStop(1, "#7a1f00");
    ctx.fillStyle = v;
    ctx.beginPath();
    ctx.ellipse(3, -34, 5.5, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillRect(1, -37, 2, 2);
    ctx.restore();
  }

  function drawCutscene() {
    const t = Math.min(cutT, CUT_LEN) / 1000;
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#000000");
    bg.addColorStop(1, "#10002b");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    for (const s of cutStars) {
      ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.4 * Math.sin(s.tw)})`;
      ctx.fillRect(s.x, s.y, 2, 2);
    }

    const cy = earthCy(t);
    drawEarth(cy, t);

    // Rocket descends and lands
    const ry = rocketCutY(t);
    drawRocketBody(W / 2, ry, 0, t > 1.8 && t < 4.6);

    // Astronaut climbs out and walks to the flag spot
    if (t >= 5) {
      const startX = W / 2 + 16;
      const endX = flagX - 12;
      const k = ease((t - 5) / 1.5);
      const ax = lerp(startX, endX, k);
      const gy = groundY(ax, earthCyEnd);
      const walking = k > 0 && k < 1;
      const armUp = ease((t - 6.6) / 0.25) * (1 - ease((t - 7.4) / 0.3));
      if (t >= 6.6) drawFlag(flagX, groundY(flagX, earthCyEnd), t);
      drawAstronaut(ax, gy, walking ? t * 12 : 0, armUp);
    }

    for (const p of parts) {
      ctx.globalAlpha = 1 - p.life / p.max;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    // Titles
    if (t < 2.2) {
      const a = Math.sin(clamp01(t / 2.2) * Math.PI);
      ctx.globalAlpha = a;
      retroText("RECORD BROKEN", W / 2, H * 0.2, 16, "#ff3dbb");
      retroText("HEADING HOME...", W / 2, H * 0.2 + 26, 9, "#ffffff");
      ctx.globalAlpha = 1;
    }
    if (t >= 7.8) {
      ctx.globalAlpha = clamp01((t - 7.8) / 0.6);
      retroText("NEW #1", W / 2, H * 0.16, 28, "#FFD166");
      retroText("ROCKET SHPE MADE IT HOME", W / 2, H * 0.16 + 30, 9, "#ffffff");
      retroText(`SCORE ${score().toLocaleString()}`, W / 2, H * 0.16 + 52, 10, "#33e1ff");
      ctx.globalAlpha = 1;
    }
    if (status === "record" && Math.floor(performance.now() / 500) % 2 === 0) {
      retroText("POST YOUR NAME BELOW", W / 2, H * 0.16 + 80, 8, "#ff9be6");
      retroText("THEN KEEP FLYING", W / 2, H * 0.16 + 96, 8, "#ff9be6");
    }
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (status === "cutscene" || status === "record") {
      drawCutscene();
    } else {
      drawBackground();

      const drawables: { y: number; fn: () => void }[] = [];
      for (const r of rocks) drawables.push({ y: r.y, fn: () => drawRock(r) });
      for (const it of items) drawables.push({ y: it.y, fn: () => (it.kind === "coin" ? drawCoin(it) : drawShieldItem(it)) });
      drawables.sort((a, b) => a.y - b.y).forEach((d) => d.fn());

      for (const p of parts) {
        ctx.globalAlpha = 1 - p.life / p.max;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
      ctx.globalAlpha = 1;

      if (status !== "over") drawRocket();

      // HUD
      retroText(score().toLocaleString(), 14, 28, 14, "#FFD166", "left");
      retroText(`${(distance / 10).toFixed(0)} KM`, 14, 46, 8, "#ffffff", "left");
      retroText(ZONES[zoneIdx].name.toUpperCase(), W - 14, 28, 8, "#ff9be6", "right");
      if (prez && Math.random() > 0.08) retroText("PREZ.EXE", 14, H - 14, 7, "#00ffd0", "left");

      if (zoneBanner.text && performance.now() < zoneBanner.until && status === "playing") {
        retroText("ENTERING", W / 2, HORIZON + 50, 10, "#ffffff");
        retroText(zoneBanner.text.toUpperCase(), W / 2, HORIZON + 72, 12, "#FFD166");
      }

      // Checkpoint / easter egg / top-5 callouts
      if (callout && performance.now() < callout.until && status === "playing") {
        const boxW = Math.min(W - 24, 440);
        const boxY = HORIZON + 100;
        const big = Math.min(13, Math.floor((boxW - 24) / callout.big.length));
        ctx.fillStyle = "rgba(10,0,30,0.78)";
        ctx.fillRect(W / 2 - boxW / 2, boxY, boxW, 64);
        ctx.fillStyle = callout.color;
        ctx.fillRect(W / 2 - boxW / 2, boxY, boxW, 2);
        ctx.fillRect(W / 2 - boxW / 2, boxY + 62, boxW, 2);
        retroText(callout.big, W / 2, boxY + 29, big, callout.color);
        retroText(callout.small, W / 2, boxY + 50, 8, "#ffffff");
      }

      if (status !== "playing") {
        ctx.fillStyle = "rgba(10,0,30,0.7)";
        ctx.fillRect(0, H / 2 - 60, W, 120);
        ctx.fillStyle = "#ff3dbb";
        ctx.fillRect(0, H / 2 - 60, W, 2);
        ctx.fillRect(0, H / 2 + 58, W, 2);
        if (status === "over") {
          retroText("GAME OVER", W / 2, H / 2 - 20, 22, "#ff3dbb");
          retroText("TRY AGAIN CUH", W / 2, H / 2 + 4, 11, "#33e1ff");
          retroText(`SCORE ${score().toLocaleString()}`, W / 2, H / 2 + 26, 10, "#FFD166");
          retroText("TAP OR SPACE TO RETRY", W / 2, H / 2 + 46, 8, "#ffffff");
        } else if (status === "paused") {
          retroText("PAUSED", W / 2, H / 2 - 4, 22, "#33e1ff");
          retroText("TAP OR SPACE TO RESUME", W / 2, H / 2 + 28, 8, "#ffffff");
        } else {
          retroText("ROCKET SHPE", W / 2, H / 2 - 10, 22, "#FFD166");
          retroText("INSERT COIN", W / 2, H / 2 + 18, 10, "#ff3dbb");
          retroText("TAP OR SPACE TO LAUNCH", W / 2, H / 2 + 40, 8, "#ffffff");
        }
      }
    }

    drawGlitchTears();

    // CRT scanlines and a soft vignette
    ctx.fillStyle = "rgba(0,0,0,0.13)";
    for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
    const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.75);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(0,0,0,0.45)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }

  function loop(now: number) {
    const dt = Math.min(50, now - last);
    last = now;
    step(dt);
    draw();
    raf = requestAnimationFrame(loop);
  }

  reset();
  raf = requestAnimationFrame((t) => { last = t; loop(t); });

  return {
    width: W,
    height: H,
    action() {
      if (status === "ready") { ev.onSfx?.("launch"); setStatus("playing"); }
      else if (status === "playing") setStatus("paused");
      else if (status === "paused") { last = performance.now(); setStatus("playing"); }
      else if (status === "over") reset();
      // cutscene / record: ignore taps
    },
    pause() { if (status === "playing") setStatus("paused"); },
    /** x in game units; the rocket follows the pointer on screen */
    steerTo(px: number | null) { targetX = px; },
    setLeft(v: boolean) { left = v; },
    setRight(v: boolean) { right = v; },
    /** Current all-time #1 score, used for the secret ending */
    setRecord(n: number) { record = n; },
    /** 5th place score on the all-time board, for the "near the top" callout */
    setTop5(n: number) { top5 = n; },
    /** After the secret ending: clear the area and keep flying */
    continueRun() {
      if (status !== "record" && status !== "cutscene") return;
      rocks = [];
      items = [];
      parts = [];
      invuln = 120;
      zoneBanner = { text: "", until: 0 };
      last = performance.now();
      setStatus("playing");
      ev.onMessage("Back in the air. Keep going.");
    },
    /** Rocket color + style from the hangar picker */
    setSkin(colorId: string, styleId: string) {
      palette = (ROCKET_COLORS.find((c) => c.id === colorId) ?? ROCKET_COLORS[0]).p;
      rocketStyle = ROCKET_STYLES.some((st) => st.id === styleId) ? styleId : "classic";
    },
    togglePrez() {
      prez = !prez;
      prezFlash = 20;
      ev.onSfx?.(prez ? "shield" : "zone");
      return prez;
    },
    getScore: score,
    destroy() { cancelAnimationFrame(raf); },
  };
}
