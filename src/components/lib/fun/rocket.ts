/**
 * Rocket SHPE: retro synthwave edition with a pseudo-3D view.
 * Things spawn at the horizon and rush toward you, growing as they get closer.
 * Game logic runs in "world" coordinates; drawing and collisions use the
 * projected (on-screen) positions so what you see is what hits you.
 *
 * The playfield size is picked per device (see pickSize) so phones and
 * computers both get a wider, zoomed-out view.
 */

import { WEMS_LOGO } from "@/lib/fun/wemsLogo";

const FONT = '"Press Start 2P", ui-monospace, monospace';
const WOW_AT = 3000; // distance readout that triggers the "wow" message
// Speed tuning: slower, gentler ramp so players survive longer and see bigger numbers
const START_SPEED = 2.6;
const MAX_SPEED = 7; // was 9
const MAX_SPEED_AFTER_BOSS = 8.4; // faster once the mothership is down
const SPEED_RAMP = 4000; // distance per +1 speed (was 2300, higher = slower ramp)
const DISTANCE_RATE = 1.3; // readout climbs a bit faster than the rocket visibly moves
const INTERMISSION_MS = 5000; // breather after the secret ending before rocks return
const EASE_BACK_MS = 3500; // after "GO", speed ramps from 60% back to full over this long
const PLANET_EVERY = 5000; // land on the next planet every 5,000 points (Pluto at 45,000)
const PLANET_NAMES = ["MERCURY", "VENUS", "EARTH", "MARS", "JUPITER", "SATURN", "URANUS", "NEPTUNE", "PLUTO"];
// Power-ups (all by points)
const BOOST_FROM = 3000; // speed boost that smashes rocks
const BLASTER_FROM = 10000; // rare auto-fire blaster
const LIFE_FROM = 15000; // extra life coins...
const LIFE_UNTIL = 45000; // ...until the last planet (Pluto)
const MAX_LIFE_COINS = 3; // per game, total
const BOOST_MS = 4500;
const BLASTER_MS = 7000;
const COIN_SPACING = 1 / 0.85; // ~15% fewer coins than before
// Boss fight: alien mothership at 40,000 points
const BOSS_AT = 40000;
const BOSS_HP = 220; // ~28s if you never miss; longer for a real player dodging
const BOSS_BONUS = 5000;
const HULL_MAX = 3; // hits you can take during the boss fight
const MISSILE_CD = 2400; // ms between missiles
// WEMS blast: after the boss, fly through a WEMS logo to blow up every rock nearby
const WEMS_RADIUS = 190; // on-screen pixels
const WEMS_POINTS = 30; // per rock destroyed
const LIFTOFF_MS = 1700; // title-screen liftoff animation before gameplay
const CHECKPOINT = 1000; // a new quote every 1,000 points
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
type ItemKind = "coin" | "shield" | "boost" | "blaster" | "life" | "wems";
type Shock = { x: number; y: number; t: number };
type Item = { x: number; y: number; vy: number; kind: ItemKind; t: number };
type Bolt = { x: number; y: number; dead?: boolean };
type EShot = { x: number; y: number; vx: number; vy: number; r: number; dead?: boolean };
type PShot = { x: number; y: number; vx: number; vy: number; kind: "bolt" | "missile"; dead?: boolean };
type Boss = {
  x: number; y: number; hp: number; t: number;
  phase: "intro" | "fight" | "dying";
  introT: number; dyingT: number;
  aimT: number; fanT: number; beamT: number;
  beam: { x: number; t: number } | null; // t < 900 = warning line, 900–1600 = firing
  hitFlash: number;
};
type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number };
type Star = { x: number; y: number; tw: number };

export type RocketEvents = {
  onScore: (score: number) => void;
  onStatus: (s: RocketStatus) => void;
  onMessage: (m: string) => void;
  onSfx?: (kind: "coin" | "shield" | "crash" | "zone" | "launch" | "laser" | "pop" | "powerup" | "alarm" | "missile" | "enemy" | "boom") => void;
  /** A planet landing jingle should play (0 = Mercury ... 8 = Pluto) */
  onLanding?: (planet: number) => void;
  /** Checkpoint music: n = which 1,000-point checkpoint (1, 2, 3...) */
  onJingle?: (kind: "checkpoint" | "wow" | "top5", n: number) => void;
  /** Boss music intensity: 1–3 as the mothership takes damage, 0 when the fight ends */
  onBossMusic?: (level: number) => void;
  /** Boss fight started (true) or ended (false), so the page can show the fire buttons */
  onBoss?: (active: boolean) => void;
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
  // `let` so drawing code can be pointed at another canvas (share-card snapshot)
  let ctx = canvas.getContext("2d")!;
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
  let countdown = 0; // ms left in the intermission
  let cutKind: "record" | "planet" = "record";
  let cutPlanet = 2; // which planet the cutscene lands on (Earth = home)
  let flags = 0; // planets landed on this run
  let goUntil = 0;
  let speedMul = 1; // < 1 while easing back in after the intermission
  let palette: Palette = ROCKET_COLORS[0].p;
  let rocketStyle = "classic";
  let prezFlash = 0;
  let rocks: Rock[] = [];
  let bolts: Bolt[] = [];
  let boostT = 0; // ms of speed boost left
  let blasterT = 0; // ms of blaster left
  let fireCd = 0;
  let lives = 0; // extra lives held
  let lifeCoinsSpawned = 0;
  let lastBoostAt = -1e9; // score when each power-up last spawned (keeps them spread out)
  let lastBlasterAt = -1e9;
  let lastLifeAt = -1e9;
  let boss: Boss | null = null;
  let bossDone = false;
  let hull = HULL_MAX;
  let firing = false; // blaster button held
  let fireCdB = 0;
  let missileCd = 0;
  let eShots: EShot[] = [];
  let pShots: PShot[] = [];
  let calmUntil = 0; // no checkpoints/planets/boss right after a breather
  let bossMusicLevel = 0;
  let wemsUsed = 0;
  let liftoffT = 0; // ms into the liftoff animation (0 = not lifting off)
  let introFlash = 0; // ms of white flash left as gameplay starts
  type Puff = { x: number; y: number; vx: number; vy: number; r: number; life: number; max: number };
  let puffs: Puff[] = [];
  let shooting: { x: number; y: number; vx: number; vy: number; life: number } | null = null;
  let shocks: Shock[] = []; // WEMS blast rings
  let lastWemsAt = -1e9;
  let flashT = 0; // white screen flash after a blast
  const wemsImg = typeof Image !== "undefined" ? new Image() : null;
  if (wemsImg) wemsImg.src = WEMS_LOGO;
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
    countdown = 0;
    flags = 0;
    goUntil = 0;
    speedMul = 1;
    top5Shown = false;
    callout = null;
    recordBeaten = false;
    rocks = [];
    items = [];
    parts = [];
    bolts = [];
    boostT = 0;
    blasterT = 0;
    lives = 0;
    lifeCoinsSpawned = 0;
    lastBoostAt = lastBlasterAt = lastLifeAt = -1e9;
    if (boss) ev.onBoss?.(false);
    if (bossMusicLevel) ev.onBossMusic?.(0);
    bossMusicLevel = 0;
    boss = null;
    bossDone = false;
    hull = HULL_MAX;
    firing = false;
    missileCd = 0;
    eShots = [];
    pShots = [];
    calmUntil = 0;
    liftoffT = 0;
    wemsUsed = 0;
    introFlash = 0;
    puffs = [];
    shocks = [];
    lastWemsAt = -1e9;
    flashT = 0;
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

  function startCutscene(kind: "record" | "planet" = "record", planet = 2) {
    cutKind = kind;
    cutPlanet = planet;
    cutT = 0;
    landed = false;
    planted = false;
    parts = [];
    callout = null;
    setStatus("cutscene");
    ev.onMessage(
      kind === "record"
        ? "New number one! Rocket SHPE made it home."
        : `Landing on ${PLANET_NAMES[planet].toLowerCase()}. Planet ${planet + 1} of 9.`
    );
    ev.onSfx?.("zone");
  }

  /** 5-second breather, then the speed eases back in */
  function beginIntermission() {
    rocks = [];
    items = [];
    parts = [];
    bolts = [];
    boostT = 0;
    invuln = 0;
    countdown = INTERMISSION_MS;
    speedMul = 0.6;
    speed = Math.min(bossDone ? MAX_SPEED_AFTER_BOSS : MAX_SPEED, START_SPEED + distance / SPEED_RAMP) * speedMul;
    callout = null;
    zoneBanner = { text: "", until: 0 };
    last = performance.now();
    calmUntil = performance.now() + INTERMISSION_MS + 2500;
    setStatus("playing");
    ev.onMessage("Catch your breath. Starting again in 5.");
  }

  /* ---------------- Boss fight ---------------- */

  const bossW = Math.min(260, W * 0.42);
  const bossH = bossW * 0.42;
  const bossBaseY = HORIZON * 0.62;

  function startBoss() {
    boss = {
      x: W / 2, y: -bossH, hp: BOSS_HP, t: 0, phase: "intro", introT: 0, dyingT: 0,
      aimT: 1400, fanT: 2600, beamT: 3500, beam: null, hitFlash: 0,
    };
    rocks = [];
    items = [];
    bolts = [];
    boostT = 0;
    blasterT = 0;
    hull = HULL_MAX;
    eShots = [];
    pShots = [];
    missileCd = 0;
    callout = null;
    ev.onBoss?.(true);
    bossMusicLevel = 1;
    ev.onBossMusic?.(1);
    ev.onMessage(
      "Warning. Alien mothership approaching. Hold Z or the left button for the blaster. Press X or the right button for missiles."
    );
    ev.onSfx?.("alarm");
  }

  function bossPhase() {
    if (!boss) return 1;
    return boss.hp > BOSS_HP * 0.66 ? 1 : boss.hp > BOSS_HP * 0.33 ? 2 : 3;
  }

  function playerHit(px: number, py: number) {
    if (prez || invuln > 0) return;
    if (shield > 0) {
      shield = 0;
      invuln = 60;
      burst(px, py, ["#33e1ff", "#ffffff"], 30, 4);
      ev.onMessage("Shield absorbed the hit");
      ev.onSfx?.("shield");
      return;
    }
    hull--;
    invuln = 70;
    burst(px, py, ["#ff3dbb", "#FFD166", "#ffffff"], 40, 4.5);
    ev.onSfx?.("crash");
    if (hull > 0) {
      ev.onMessage(`Hull hit. ${hull} left.`);
      return;
    }
    if (lives > 0) {
      lives--;
      hull = HULL_MAX;
      invuln = 100;
      callout = { big: "EXTRA LIFE USED", small: "HULL REPAIRED", color: "#ff4d6d", until: performance.now() + 2600 };
      ev.onMessage("Extra life used. Hull repaired.");
      return;
    }
    burst(px, py, ["#ff3dbb", "#FFD166", "#FD652F", "#ffffff"], 80, 5);
    ev.onBoss?.(false);
    bossMusicLevel = 0;
    ev.onBossMusic?.(0);
    setStatus("over");
    ev.onScore(score());
    ev.onMessage(`Destroyed by the mothership. Final score ${score()}.`);
  }

  function stepBoss(dt: number, f: number) {
    const b = boss!;
    b.t += dt;
    if (b.hitFlash > 0) b.hitFlash -= f;
    if (invuln > 0) invuln -= f;
    if (missileCd > 0) missileCd = Math.max(0, missileCd - dt);
    const rs = rocketScreen();
    const px = rs.sx;
    const py = rs.sy;
    const phase = bossPhase();
    if (b.phase === "fight" && phase !== bossMusicLevel) {
      bossMusicLevel = phase;
      ev.onBossMusic?.(phase);
    }

    if (b.phase === "intro") {
      const before = Math.floor(b.introT / 900);
      b.introT += dt;
      if (Math.floor(b.introT / 900) !== before && b.introT < 2700) ev.onSfx?.("alarm");
      b.y = lerp(-bossH, bossBaseY, ease(b.introT / 2600));
      if (b.introT >= 3000) b.phase = "fight";
    } else if (b.phase === "fight") {
      // Movement: sways side to side and leans toward you more in later phases.
      // Holds still while charging/firing the laser beam.
      const beamLock = b.beam !== null;
      if (!beamLock) {
        const spd = [0, 0.0007, 0.001, 0.0014][phase];
        const target = W / 2 + Math.sin(b.t * spd) * W * 0.32 + (px - W / 2) * 0.18 * phase;
        b.x += (Math.max(bossW / 2, Math.min(W - bossW / 2, target)) - b.x) * 0.035 * f;
      }
      b.y = bossBaseY + Math.sin(b.t * 0.002) * 8;
      const gunY = b.y + bossH * 0.35;

      // Aimed plasma shots
      b.aimT -= dt;
      if (b.aimT <= 0) {
        const n = phase;
        const ang = Math.atan2(py - gunY, px - b.x);
        const sp = [0, 4.2, 5, 5.6][phase];
        for (let i = 0; i < n; i++) {
          const a = ang + (i - (n - 1) / 2) * 0.14;
          eShots.push({ x: b.x, y: gunY, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 7 });
        }
        b.aimT = [0, 1500, 1150, 900][phase];
        ev.onSfx?.("enemy");
      }
      // Spread fan (phase 2+)
      if (phase >= 2) {
        b.fanT -= dt;
        if (b.fanT <= 0) {
          const n = phase === 2 ? 5 : 7;
          for (let i = 0; i < n; i++) {
            const a = Math.PI / 2 + (i / (n - 1) - 0.5) * 1.5;
            eShots.push({ x: b.x, y: gunY, vx: Math.cos(a) * 3.6, vy: Math.sin(a) * 3.6, r: 6 });
          }
          b.fanT = phase === 2 ? 3200 : 2600;
          ev.onSfx?.("enemy");
        }
      }
      // Laser beam (phase 3): red warning line, then the beam
      if (phase === 3) {
        if (!b.beam) {
          b.beamT -= dt;
          if (b.beamT <= 0) {
            b.beam = { x: b.x, t: 0 };
            ev.onSfx?.("alarm");
          }
        } else {
          const was = b.beam.t;
          b.beam.t += dt;
          if (was < 900 && b.beam.t >= 900) ev.onSfx?.("boom");
          if (b.beam.t >= 900 && b.beam.t < 1600 && Math.abs(px - b.beam.x) < 26) playerHit(px, py);
          if (b.beam.t >= 1600) {
            b.beam = null;
            b.beamT = 4200;
          }
        }
      }
    } else {
      // Dying: chain explosions, then the big one
      b.dyingT += dt;
      if (Math.random() < 0.35 * f) {
        burst(
          b.x + (Math.random() - 0.5) * bossW, b.y + (Math.random() - 0.5) * bossH,
          ["#FD652F", "#FFD166", "#ffffff", "#7dff9b"], 18, 4
        );
        if (Math.random() < 0.3) ev.onSfx?.("pop");
      }
      if (b.dyingT >= 1900) {
        burst(b.x, b.y, ["#FD652F", "#FFD166", "#ffffff", "#7dff9b", "#33e1ff"], 160, 8);
        ev.onSfx?.("boom");
        bonus += BOSS_BONUS;
        bossDone = true;
        boss = null;
        pShots = [];
        eShots = [];
        firing = false;
        ev.onBoss?.(false);
        ev.onLanding?.(4); // big brass fanfare
        nextCheckpoint = Math.max(nextCheckpoint, Math.floor(score() / CHECKPOINT) * CHECKPOINT + CHECKPOINT);
        ev.onScore(score());
        beginIntermission();
        callout = { big: "MOTHERSHIP DESTROYED", small: `+${BOSS_BONUS.toLocaleString()} POINTS`, color: "#7dff9b", until: performance.now() + 4500 };
        ev.onMessage(`Mothership destroyed! Plus ${BOSS_BONUS} points.`);
        return;
      }
    }

    // Your blaster (hold) — only once the fight starts
    fireCdB -= f;
    if (firing && fireCdB <= 0 && b.phase === "fight") {
      pShots.push({ x: px - 8, y: py - 28, vx: 0, vy: -11, kind: "bolt" }, { x: px + 8, y: py - 28, vx: 0, vy: -11, kind: "bolt" });
      fireCdB = 7;
      ev.onSfx?.("laser");
    }

    // Move your shots and check hits on the mothership
    for (const sh of pShots) {
      if (sh.kind === "missile") {
        sh.vy = Math.max(-10, sh.vy - 0.35 * f);
        sh.vx += Math.max(-0.4, Math.min(0.4, (b.x - sh.x) * 0.004)) * f; // gentle homing
        sh.vx *= 0.96;
        if (Math.random() < 0.6) {
          parts.push({
            x: sh.x, y: sh.y + 10, vx: (Math.random() - 0.5) * 0.6, vy: 1 + Math.random(),
            life: 0, max: 20, color: Math.random() < 0.5 ? "#9aa8c4" : "#FFD166", size: 2.5,
          });
        }
      }
      sh.x += sh.vx * f;
      sh.y += sh.vy * f;
      if (b.phase !== "fight") continue;
      const dx = (sh.x - b.x) / (bossW / 2);
      const dy = (sh.y - b.y) / (bossH / 2);
      if (dx * dx + dy * dy < 1) {
        sh.dead = true;
        const dmg = sh.kind === "missile" ? 10 : 1;
        b.hp = Math.max(0, b.hp - dmg);
        b.hitFlash = sh.kind === "missile" ? 8 : 3;
        if (sh.kind === "missile") {
          burst(sh.x, sh.y, ["#FD652F", "#FFD166", "#ffffff"], 40, 5);
          ev.onSfx?.("boom");
        } else {
          burst(sh.x, sh.y, ["#33e1ff", "#ffffff"], 5, 2);
        }
        if (b.hp <= 0) {
          b.phase = "dying";
          b.beam = null;
          bossMusicLevel = 0;
          ev.onBossMusic?.(0);
          eShots = [];
          ev.onMessage("Mothership going down!");
          ev.onSfx?.("crash");
        }
      }
    }
    pShots = pShots.filter((sh) => !sh.dead && sh.y > -40 && sh.x > -40 && sh.x < W + 40);

    // Enemy shots
    for (const e of eShots) {
      e.x += e.vx * f;
      e.y += e.vy * f;
      if (Math.hypot(e.x - px, e.y - py) < e.r + 11) {
        e.dead = true;
        playerHit(px, py);
      }
    }
    eShots = eShots.filter((e) => !e.dead && e.y < H + 20 && e.y > -20 && e.x > -20 && e.x < W + 20);
  }

  function stepCutscene(dt: number) {
    cutT += dt * (cutKind === "planet" ? 1.35 : 1); // planet stops are a bit quicker
    const t = cutT / 1000;
    for (const s of cutStars) s.tw += 0.04 * (dt / 16.67);
    if (!landed && t >= 4.6) {
      landed = true;
      burst(W / 2, rocketLandY() + 28, ["#c9b8a3", "#ffffff", "#9aa8c4"], 40, 3);
      ev.onLanding?.(cutPlanet);
    }
    if (!planted && t >= 7.2) {
      planted = true;
      burst(flagX, groundY(flagX, earthCyEnd), ["#c9b8a3", "#ffffff"], 18, 2);
      ev.onSfx?.("shield");
    }
    if (cutT >= CUT_LEN && status === "cutscene") {
      if (cutKind === "record") setStatus("record");
      else beginIntermission();
    }
  }

  function step(dt: number) {
    const f = dt / 16.67;
    gridScroll = (gridScroll + (status === "playing" ? speed : 0.8) * 0.012 * f) % 1;
    for (const s of stars) s.tw += 0.05 * f;
    if (prezFlash > 0) prezFlash -= f;

    shocks = shocks.filter((sk) => (sk.t += dt) < 650);
    if (flashT > 0) flashT -= f;
    parts = parts.filter((p) => {
      p.x += p.vx * f; p.y += p.vy * f; p.life += f;
      return p.life < p.max;
    });

    if (status === "cutscene" || status === "record") {
      if (status === "cutscene") stepCutscene(dt);
      return;
    }

    // Title screen + liftoff animation
    stepTitle(dt, f);
    if (liftoffT > 0) {
      liftoffT += dt;
      if (liftoffT >= LIFTOFF_MS) {
        liftoffT = 0;
        introFlash = 450;
        puffs = [];
        last = performance.now();
      }
      return;
    }
    if (introFlash > 0) introFlash -= dt;

    const rs = rocketScreen();
    if (status !== "over" && status !== "ready") {
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

    // Intermission after the secret ending: steer freely, nothing spawns, then GO
    if (countdown > 0) {
      const before = Math.ceil(countdown / 1000);
      countdown -= dt;
      const after = Math.ceil(countdown / 1000);
      if (countdown <= 0) {
        countdown = 0;
        goUntil = performance.now() + 800;
        invuln = 45;
        ev.onMessage("Go!");
        ev.onSfx?.("launch");
      } else if (after !== before) {
        ev.onMessage(String(after));
        ev.onSfx?.("coin");
      }
      return;
    }
    if (boss) {
      stepBoss(dt, f);
      return;
    }
    if (speedMul < 1) speedMul = Math.min(1, speedMul + (0.4 * dt) / EASE_BACK_MS);
    if (boostT > 0) {
      boostT -= dt;
      if (boostT <= 0) {
        boostT = 0;
        invuln = 40; // a moment to re-adjust after the boost
      }
    }
    if (blasterT > 0) blasterT = Math.max(0, blasterT - dt);

    distance += speed * DISTANCE_RATE * f;
    speed = Math.min(bossDone ? MAX_SPEED_AFTER_BOSS : MAX_SPEED, START_SPEED + distance / SPEED_RAMP) * speedMul * (boostT > 0 ? 1.6 : 1);
    if (invuln > 0) invuln -= f;

    const nextZone = ZONES.findLastIndex((z) => distance >= z.at);
    if (nextZone > zoneIdx) {
      zoneIdx = nextZone;
      zoneBanner = { text: ZONES[zoneIdx].name, until: performance.now() + 2200 };
      ev.onMessage(`Entering ${ZONES[zoneIdx].name}`);
      ev.onSfx?.("zone");
    }

    const calm = performance.now() < calmUntil;

    // Boss fight at 40,000
    if (!bossDone && !calm && score() >= BOSS_AT) {
      startBoss();
      return;
    }

    // Planet landings every 7,000 (tracked separately so a big bonus never skips one)
    if (!calm && flags < PLANET_NAMES.length && score() >= (flags + 1) * PLANET_EVERY) {
      flags++;
      nextCheckpoint = Math.max(nextCheckpoint, flags * PLANET_EVERY + CHECKPOINT);
      startCutscene("planet", flags - 1);
      return;
    }

    // Checkpoints every 1,000 points with a quote (3,000 = the wow easter egg)
    if (!calm && score() >= nextCheckpoint && nextCheckpoint % PLANET_EVERY === 0 && nextCheckpoint / PLANET_EVERY <= PLANET_NAMES.length) {
      nextCheckpoint += CHECKPOINT; // that one belongs to a planet landing
    } else if (!calm && score() >= nextCheckpoint) {
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
        callout = { big: quote, small: `${nextCheckpoint.toLocaleString()} POINTS`, color: "#33e1ff", until };
      }
      ev.onMessage(`${callout.big.toLowerCase()}. ${callout.small.toLowerCase()}`);
      ev.onJingle?.(nextCheckpoint === WOW_AT ? "wow" : "checkpoint", n);
      nextCheckpoint += CHECKPOINT;
    }

    spawnRock -= speed * f;
    if (spawnRock <= 0) {
      rocks.push(makeRock());
      spawnRock = (Math.max(118, 165 - distance / 300) * (0.7 + Math.random() * 0.6)) / widthFactor;
    }
    spawnItem -= speed * f;
    if (spawnItem <= 0) {
      const sc0 = score();
      // Each item type gets its own slice of the roll: life 5%, blaster 3%, boost 6%, shield 12%
      const roll = Math.random();
      let kind: ItemKind = "coin";
      if (bossDone && sc0 - lastWemsAt > 1200 && roll >= 0.26 && roll < 0.34) {
        kind = "wems";
        lastWemsAt = sc0;
      } else if (
        sc0 >= LIFE_FROM && sc0 < LIFE_UNTIL && lifeCoinsSpawned < MAX_LIFE_COINS &&
        sc0 - lastLifeAt > 4000 && roll < 0.05
      ) {
        kind = "life";
        lifeCoinsSpawned++;
        lastLifeAt = sc0;
      } else if (sc0 >= BLASTER_FROM && blasterT <= 0 && sc0 - lastBlasterAt > 2500 && roll >= 0.05 && roll < 0.08) {
        kind = "blaster";
        lastBlasterAt = sc0;
      } else if (sc0 >= BOOST_FROM && boostT <= 0 && sc0 - lastBoostAt > 1500 && roll >= 0.08 && roll < 0.14) {
        kind = "boost";
        lastBoostAt = sc0;
      } else if (roll >= 0.14 && roll < 0.26 && shield === 0) {
        kind = "shield";
      }
      items.push({ x: 40 + Math.random() * (W - 80), y: WORLD_TOP, vy: speed * 0.85, kind, t: 0 });
      spawnItem = ((170 + Math.random() * 190) * COIN_SPACING) / widthFactor;
    }

    // Blaster: auto-fire, bolts fly toward the horizon and pop rocks
    if (blasterT > 0) {
      fireCd -= f;
      if (fireCd <= 0) {
        bolts.push({ x: x - 7, y: ROCKET_WY - 30 }, { x: x + 7, y: ROCKET_WY - 30 });
        fireCd = 9;
        ev.onSfx?.("laser");
      }
    }
    for (const b of bolts) {
      b.y -= 16 * f;
      for (const r of rocks) {
        if (r.y > WORLD_BOTTOM) continue;
        if (Math.abs(b.x - r.x) < r.r * 0.9 + 4 && b.y < r.y + r.r && b.y > r.y - r.r - 20) {
          const pr = project(r.x, r.y);
          burst(pr.sx, pr.sy, ["#33e1ff", "#ffffff", "#c9b8a3", "#8f8a84"], 22, 3.5 * pr.s + 1);
          r.y = WORLD_BOTTOM + 100;
          b.dead = true;
          bonus += 25;
          ev.onSfx?.("pop");
          break;
        }
      }
    }
    bolts = bolts.filter((b) => !b.dead && b.y > WORLD_TOP);

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
        } else if (boostT > 0) {
          // Speed boost: smash straight through
          r.y = WORLD_BOTTOM + 100;
          bonus += 50;
          burst(pr.sx, pr.sy, ["#FD652F", "#FFD166", "#ffffff", "#8f8a84"], 30, 4.5);
          ev.onSfx?.("pop");
        } else if (shield > 0) {
          shield = 0;
          invuln = 60;
          r.y = WORLD_BOTTOM + 100;
          burst(rs.sx, rs.sy, ["#33e1ff", "#ffffff"], 30, 4);
          ev.onMessage("Shield absorbed the hit");
          ev.onSfx?.("shield");
        } else if (lives > 0) {
          // Extra life: survive the hit
          lives--;
          invuln = 100;
          r.y = WORLD_BOTTOM + 100;
          burst(rs.sx, rs.sy, ["#ff4d6d", "#ffffff", "#FFD166"], 50, 4.5);
          callout = { big: "EXTRA LIFE USED", small: lives > 0 ? `${lives} LEFT` : "NO MORE LIVES", color: "#ff4d6d", until: performance.now() + 2600 };
          ev.onMessage(`Extra life used. ${lives} left.`);
          ev.onSfx?.("crash");
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
        } else if (it.kind === "boost") {
          boostT = BOOST_MS;
          burst(rs.sx, rs.sy, ["#FD652F", "#FFD166", "#ffffff"], 30, 4);
          callout = { big: "SPEED BOOST", small: "SMASH THROUGH ROCKS", color: "#FD652F", until: performance.now() + 2600 };
          ev.onMessage("Speed boost. Smash through rocks.");
          ev.onSfx?.("powerup");
        } else if (it.kind === "blaster") {
          blasterT = BLASTER_MS;
          fireCd = 0;
          burst(rs.sx, rs.sy, ["#33e1ff", "#ff3dbb", "#ffffff"], 30, 4);
          callout = { big: "BLASTER", small: "AUTO-FIRE ON", color: "#ff3dbb", until: performance.now() + 2600 };
          ev.onMessage("Blaster. Auto-fire on.");
          ev.onSfx?.("powerup");
        } else if (it.kind === "wems") {
          // Blast: every rock within the radius blows up
          let n = 0;
          for (const r of rocks) {
            const pr = project(r.x, r.y);
            if (pr.sy > HORIZON - 4 && Math.hypot(pr.sx - rs.sx, pr.sy - rs.sy) < WEMS_RADIUS) {
              burst(pr.sx, pr.sy, ["#8e79ad", "#47305a", "#ffffff", "#c9b8a3"], 20, 4 * pr.s + 1);
              r.y = WORLD_BOTTOM + 100;
              n++;
            }
          }
          bonus += n * WEMS_POINTS;
          wemsUsed++;
          shocks.push({ x: rs.sx, y: rs.sy, t: 0 });
          flashT = 10;
          invuln = Math.max(invuln, 30);
          burst(rs.sx, rs.sy, ["#8e79ad", "#b39ddb", "#ffffff", "#47305a"], 70, 6);
          callout = { big: "WEMS BLAST!", small: n ? `${n} ROCKS · +${n * WEMS_POINTS}` : "AREA CLEARED", color: "#b39ddb", until: performance.now() + 2600 };
          ev.onMessage(`WEMS blast. ${n} rocks destroyed.`);
          ev.onSfx?.("boom");
        } else if (it.kind === "life") {
          lives = Math.min(MAX_LIFE_COINS, lives + 1);
          burst(pi.sx, pi.sy, ["#ff4d6d", "#ffffff", "#FFD166"], 34, 3.5);
          callout = { big: "EXTRA LIFE", small: `LIVES x${lives}`, color: "#ff4d6d", until: performance.now() + 2600 };
          ev.onMessage(`Extra life. You have ${lives}.`);
          ev.onSfx?.("powerup");
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
      ev.onJingle?.("top5", 0);
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

  function drawItem(it: Item) {
    if (it.kind === "coin") drawCoin(it);
    else if (it.kind === "shield") drawShieldItem(it);
    else if (it.kind === "wems") drawWems(it);
    else drawPowerUp(it);
  }

  /** Boost (orange lightning), Blaster (pink crosshair), Life (red heart coin) */
  function drawPowerUp(it: Item) {
    const p = project(it.x, it.y);
    if (p.sy < HORIZON - 4) return;
    const r = 15 * p.s;
    const now = performance.now();
    const pulse = 0.6 + 0.4 * Math.sin(now / 140 + it.x);
    const col = it.kind === "boost" ? "#FD652F" : it.kind === "blaster" ? "#ff3dbb" : "#ff4d6d";
    ctx.save();
    ctx.globalAlpha = Math.min(1, (p.sy - HORIZON) / 40);
    ctx.translate(p.sx, p.sy);
    // Big pulsing halo so power-ups stand out from coins
    const halo = ctx.createRadialGradient(0, 0, r * 0.5, 0, 0, r * 3);
    halo.addColorStop(0, col + "aa");
    halo.addColorStop(1, col + "00");
    ctx.globalAlpha *= pulse;
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(0, 0, r * 3, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = Math.min(1, (p.sy - HORIZON) / 40);
    // Rotating dashed ring
    ctx.save();
    ctx.rotate(now / 400);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.6 * p.s;
    ctx.setLineDash([4 * p.s, 3 * p.s]);
    ctx.beginPath(); ctx.arc(0, 0, r * 1.25, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    // Glossy orb
    const orb = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
    orb.addColorStop(0, "#ffffff");
    orb.addColorStop(0.35, col);
    orb.addColorStop(1, "#2a0010");
    ctx.fillStyle = orb;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    // Icon
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#ffffff";
    if (it.kind === "boost") {
      ctx.beginPath();
      ctx.moveTo(r * 0.15, -r * 0.7); ctx.lineTo(-r * 0.4, r * 0.1); ctx.lineTo(-r * 0.02, r * 0.1);
      ctx.lineTo(-r * 0.2, r * 0.7); ctx.lineTo(r * 0.42, -r * 0.12); ctx.lineTo(r * 0.04, -r * 0.12);
      ctx.closePath(); ctx.fill();
    } else if (it.kind === "blaster") {
      ctx.lineWidth = 2 * p.s;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.75); ctx.lineTo(0, -r * 0.2); ctx.moveTo(0, r * 0.2); ctx.lineTo(0, r * 0.75);
      ctx.moveTo(-r * 0.75, 0); ctx.lineTo(-r * 0.2, 0); ctx.moveTo(r * 0.2, 0); ctx.lineTo(r * 0.75, 0);
      ctx.stroke();
    } else {
      const hs = r * 0.3;
      ctx.beginPath();
      ctx.arc(-hs * 0.95, -hs * 0.3, hs, 0, Math.PI * 2);
      ctx.arc(hs * 0.95, -hs * 0.3, hs, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-hs * 1.9, 0); ctx.lineTo(hs * 1.9, 0); ctx.lineTo(0, hs * 2.1); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  function drawBoss() {
    const b = boss!;
    const now = performance.now();
    const phase = bossPhase();

    // Laser beam (behind the ship)
    if (b.beam) {
      if (b.beam.t < 900) {
        ctx.save();
        ctx.globalAlpha = 0.4 + 0.4 * Math.sin(now / 60);
        ctx.strokeStyle = "#ff2d55";
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 8]);
        ctx.beginPath(); ctx.moveTo(b.beam.x, b.y); ctx.lineTo(b.beam.x, H); ctx.stroke();
        ctx.restore();
      } else {
        const g = ctx.createLinearGradient(b.beam.x - 30, 0, b.beam.x + 30, 0);
        g.addColorStop(0, "rgba(255,45,85,0)");
        g.addColorStop(0.3, "rgba(255,45,85,0.85)");
        g.addColorStop(0.5, "#ffffff");
        g.addColorStop(0.7, "rgba(255,45,85,0.85)");
        g.addColorStop(1, "rgba(255,45,85,0)");
        ctx.save();
        ctx.shadowColor = "#ff2d55";
        ctx.shadowBlur = 30;
        ctx.fillStyle = g;
        const wob = Math.sin(now / 30) * 3;
        ctx.fillRect(b.beam.x - 30 + wob, b.y, 60, H - b.y);
        ctx.restore();
      }
    }

    ctx.save();
    ctx.translate(b.x, b.y);
    if (b.phase === "dying") ctx.translate((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
    const rw = bossW / 2;
    const rh = bossH / 2;

    // Tractor glow underneath
    const glow = ctx.createRadialGradient(0, rh * 0.6, 4, 0, rh * 0.6, rw * 0.9);
    glow.addColorStop(0, "rgba(125,255,155,0.45)");
    glow.addColorStop(1, "rgba(125,255,155,0)");
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.ellipse(0, rh * 0.7, rw * 0.9, rh * 0.9, 0, 0, Math.PI * 2); ctx.fill();

    // Lower hull
    const lower = ctx.createLinearGradient(0, 0, 0, rh * 0.9);
    lower.addColorStop(0, "#5a6378");
    lower.addColorStop(1, "#141821");
    ctx.fillStyle = lower;
    ctx.beginPath(); ctx.ellipse(0, rh * 0.25, rw * 0.78, rh * 0.62, 0, 0, Math.PI); ctx.fill();

    // Main disc (brushed metal)
    const disc = ctx.createLinearGradient(-rw, -rh * 0.4, rw, rh * 0.4);
    disc.addColorStop(0, "#2b3140");
    disc.addColorStop(0.3, "#c9d4ea");
    disc.addColorStop(0.45, "#ffffff");
    disc.addColorStop(0.6, "#8a94a8");
    disc.addColorStop(1, "#1c2230");
    ctx.fillStyle = disc;
    ctx.beginPath(); ctx.ellipse(0, 0, rw, rh * 0.42, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth = 1;
    ctx.stroke();
    // Panel seams on the disc
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    for (let i = 1; i < 8; i++) {
      const a = (i / 8) * Math.PI;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * rw * 0.45, Math.sin(a) * rh * 0.2);
      ctx.lineTo(Math.cos(a) * rw, Math.sin(a) * rh * 0.42);
      ctx.stroke();
    }

    // Running lights around the rim (chase pattern)
    const N = 12;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI;
      const on = Math.floor(now / 120 + i) % 3 === 0;
      ctx.fillStyle = on ? (phase === 3 ? "#ff2d55" : "#7dff9b") : "rgba(255,255,255,0.25)";
      ctx.beginPath();
      ctx.arc(Math.cos(a) * rw * 0.88, Math.sin(a) * rh * 0.32 + 1, Math.max(2, rw * 0.025), 0, Math.PI * 2);
      ctx.fill();
    }

    // Glass dome with the pilot
    const dome = ctx.createRadialGradient(-rw * 0.08, -rh * 0.75, 2, 0, -rh * 0.35, rw * 0.3);
    dome.addColorStop(0, "rgba(220,255,230,0.9)");
    dome.addColorStop(0.5, "rgba(80,220,140,0.55)");
    dome.addColorStop(1, "rgba(10,60,40,0.85)");
    ctx.fillStyle = dome;
    ctx.beginPath(); ctx.ellipse(0, -rh * 0.25, rw * 0.28, rh * 0.75, 0, Math.PI, 0); ctx.fill();
    // Alien
    ctx.fillStyle = "rgba(20,60,35,0.9)";
    ctx.beginPath(); ctx.ellipse(0, -rh * 0.55, rw * 0.09, rh * 0.28, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#000";
    ctx.beginPath(); ctx.ellipse(-rw * 0.04, -rh * 0.6, rw * 0.03, rh * 0.06, 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(rw * 0.04, -rh * 0.6, rw * 0.03, rh * 0.06, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.beginPath(); ctx.ellipse(-rw * 0.12, -rh * 0.85, rw * 0.05, rh * 0.1, -0.5, 0, Math.PI * 2); ctx.fill();

    // Gun pod: glows brighter right before it fires
    const charge = b.phase === "fight" ? 1 - Math.min(1, b.aimT / 600) : 0;
    ctx.shadowColor = "#ff2d55";
    ctx.shadowBlur = 10 + charge * 20;
    ctx.fillStyle = `rgba(255,${Math.round(80 - charge * 60)},${Math.round(100 - charge * 60)},1)`;
    ctx.beginPath(); ctx.arc(0, rh * 0.7, rw * 0.07 + charge * 3, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Battle damage: scorch marks + smoke as health drops
    if (phase >= 2) {
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.beginPath(); ctx.ellipse(-rw * 0.55, rh * 0.05, rw * 0.12, rh * 0.12, 0.3, 0, Math.PI * 2); ctx.fill();
      if (Math.random() < 0.3) {
        parts.push({ x: b.x - rw * 0.55, y: b.y, vx: (Math.random() - 0.5) * 0.5, vy: -0.6 - Math.random() * 0.6, life: 0, max: 40, color: "rgba(120,120,130,0.8)", size: 4 });
      }
    }
    if (phase >= 3) {
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.beginPath(); ctx.ellipse(rw * 0.5, -rh * 0.05, rw * 0.14, rh * 0.14, -0.3, 0, Math.PI * 2); ctx.fill();
      if (Math.random() < 0.4) {
        parts.push({ x: b.x + rw * 0.5, y: b.y, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2, life: 0, max: 14, color: "#FFD166", size: 2 });
      }
    }

    // White flash when hit
    if (b.hitFlash > 0) {
      ctx.globalAlpha = Math.min(0.6, b.hitFlash / 8);
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.ellipse(0, 0, rw, rh * 0.42, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    // Enemy plasma
    for (const e of eShots) {
      const g = ctx.createRadialGradient(e.x, e.y, 1, e.x, e.y, e.r * 1.8);
      g.addColorStop(0, "#ffffff");
      g.addColorStop(0.35, phase === 3 ? "#ff3dbb" : "#7dff9b");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r * 1.8, 0, Math.PI * 2); ctx.fill();
    }

    // Your shots
    for (const sh of pShots) {
      if (sh.kind === "bolt") {
        ctx.save();
        ctx.shadowColor = "#33e1ff";
        ctx.shadowBlur = 10;
        ctx.strokeStyle = "#33e1ff";
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(sh.x, sh.y); ctx.lineTo(sh.x, sh.y + 14); ctx.stroke();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(sh.x, sh.y); ctx.lineTo(sh.x, sh.y + 14); ctx.stroke();
        ctx.restore();
      } else {
        ctx.save();
        ctx.translate(sh.x, sh.y);
        ctx.rotate(Math.atan2(sh.vy, sh.vx) + Math.PI / 2);
        const fl = 8 + Math.random() * 6;
        ctx.fillStyle = "#FFD166";
        ctx.beginPath(); ctx.moveTo(-3, 8); ctx.lineTo(0, 8 + fl); ctx.lineTo(3, 8); ctx.fill();
        ctx.fillStyle = "#d9dde6";
        ctx.fillRect(-3, -6, 6, 14);
        ctx.fillStyle = "#D33A02";
        ctx.beginPath(); ctx.moveTo(-3, -6); ctx.lineTo(0, -12); ctx.lineTo(3, -6); ctx.fill();
        ctx.fillRect(-6, 4, 3, 5);
        ctx.fillRect(3, 4, 3, 5);
        ctx.restore();
      }
    }
  }

  function drawBossHud() {
    const b = boss!;
    if (b.phase === "intro") {
      const blink = Math.floor(performance.now() / 300) % 2 === 0;
      ctx.fillStyle = "rgba(255,45,85,0.12)";
      ctx.fillRect(0, 0, W, H);
      if (blink) retroText("WARNING", W / 2, H * 0.5, 26, "#ff2d55");
      retroText("ALIEN MOTHERSHIP APPROACHING", W / 2, H * 0.5 + 26, Math.min(9, Math.floor((W - 20) / 28)), "#ffffff");
      retroText("HOLD Z / LEFT BUTTON: BLASTER", W / 2, H * 0.5 + 52, 7, "#33e1ff");
      retroText("X / RIGHT BUTTON: MISSILE", W / 2, H * 0.5 + 66, 7, "#FD652F");
      return;
    }
    // Mothership health bar
    const bw = Math.min(W * 0.42, 280);
    const bx = W / 2 - bw / 2;
    retroText("MOTHERSHIP", W / 2, 22, 7, "#7dff9b");
    ctx.fillStyle = "rgba(10,0,30,0.7)";
    ctx.fillRect(bx, 28, bw, 8);
    const frac = b.hp / BOSS_HP;
    ctx.fillStyle = frac > 0.66 ? "#7dff9b" : frac > 0.33 ? "#FFD166" : "#ff2d55";
    ctx.fillRect(bx, 28, bw * frac, 8);
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.strokeRect(bx, 28, bw, 8);
    // Your hull
    retroText("HULL", 14, H - 70, 6, "#ffffff", "left");
    for (let i = 0; i < HULL_MAX; i++) {
      ctx.fillStyle = i < hull ? "#33e1ff" : "rgba(255,255,255,0.2)";
      ctx.fillRect(48 + i * 14, H - 78, 10, 10);
    }
    // Missile reload, above the right-hand button
    const ready = missileCd <= 0;
    retroText(ready ? "MISSILE READY" : "RELOADING", W - 14, H - 96, 6, ready ? "#FD652F" : "#ffffff", "right");
    ctx.fillStyle = "rgba(10,0,30,0.6)";
    ctx.fillRect(W - 94, H - 90, 80, 5);
    ctx.fillStyle = "#FD652F";
    ctx.fillRect(W - 94, H - 90, 80 * (1 - missileCd / MISSILE_CD), 5);
  }

  /** WEMS logo pickup on a glowing white badge, so it pops on the dark background */
  function drawWems(it: Item) {
    const p = project(it.x, it.y);
    if (p.sy < HORIZON - 4) return;
    const r = 22 * p.s;
    const now = performance.now();
    const bob = Math.sin(now / 250 + it.x) * 3 * p.s;
    ctx.save();
    ctx.globalAlpha = Math.min(1, (p.sy - HORIZON) / 40);
    ctx.translate(p.sx, p.sy + bob);
    // Pulsing purple halo
    const pulse = 0.6 + 0.4 * Math.sin(now / 160 + it.x);
    const halo = ctx.createRadialGradient(0, 0, r * 0.8, 0, 0, r * 2.6);
    halo.addColorStop(0, `rgba(179,157,219,${0.6 * pulse})`);
    halo.addColorStop(1, "rgba(179,157,219,0)");
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(0, 0, r * 2.6, 0, Math.PI * 2); ctx.fill();
    // Badge
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#8e79ad";
    ctx.lineWidth = 3 * p.s;
    ctx.stroke();
    ctx.save();
    ctx.rotate(now / 500);
    ctx.setLineDash([5 * p.s, 4 * p.s]);
    ctx.strokeStyle = "#47305a";
    ctx.lineWidth = 1.5 * p.s;
    ctx.beginPath(); ctx.arc(0, 0, r * 1.18, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    if (wemsImg && wemsImg.complete && wemsImg.naturalWidth > 0) {
      const iw = r * 1.6;
      const ih = iw * (wemsImg.naturalHeight / wemsImg.naturalWidth);
      ctx.drawImage(wemsImg, -iw / 2, -ih / 2, iw, ih);
    } else {
      ctx.fillStyle = "#47305a";
      ctx.font = `${Math.round(8 * p.s)}px ${FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("WEMS", 0, 0);
    }
    ctx.restore();
  }

  function drawShocks() {
    for (const sk of shocks) {
      const k = sk.t / 650;
      ctx.save();
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = "#b39ddb";
      ctx.shadowColor = "#b39ddb";
      ctx.shadowBlur = 20;
      ctx.lineWidth = 8 * (1 - k) + 2;
      ctx.beginPath(); ctx.arc(sk.x, sk.y, WEMS_RADIUS * (0.2 + 0.9 * k), 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(sk.x, sk.y, WEMS_RADIUS * (0.1 + 0.7 * k), 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    if (flashT > 0) {
      ctx.fillStyle = `rgba(255,255,255,${Math.min(0.5, flashT / 20)})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  function drawBolts() {
    if (!bolts.length) return;
    ctx.save();
    ctx.lineCap = "round";
    for (const b of bolts) {
      const a = project(b.x, b.y);
      const c = project(b.x, b.y + 26);
      if (a.sy < HORIZON) continue;
      ctx.shadowColor = "#33e1ff";
      ctx.shadowBlur = 12;
      ctx.strokeStyle = "#33e1ff";
      ctx.lineWidth = 4 * a.s;
      ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(c.sx, c.sy); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5 * a.s;
      ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(c.sx, c.sy); ctx.stroke();
    }
    ctx.restore();
  }

  function drawHeartIcon(x0: number, y0: number, s0: number) {
    ctx.fillStyle = "#ff4d6d";
    ctx.beginPath();
    ctx.arc(x0 - s0 * 0.5, y0, s0 * 0.55, 0, Math.PI * 2);
    ctx.arc(x0 + s0 * 0.5, y0, s0 * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x0 - s0 * 1.05, y0 + s0 * 0.15); ctx.lineTo(x0 + s0 * 1.05, y0 + s0 * 0.15); ctx.lineTo(x0, y0 + s0 * 1.2);
    ctx.closePath(); ctx.fill();
  }

  /** Bottom HUD: lives on the left, active power-up timers in the middle */
  function drawPowerHud() {
    for (let i = 0; i < lives; i++) drawHeartIcon(20 + i * 18, H - 40, 6);
    const bars: { label: string; frac: number; col: string }[] = [];
    if (boostT > 0) bars.push({ label: "BOOST", frac: boostT / BOOST_MS, col: "#FD652F" });
    if (blasterT > 0) bars.push({ label: "BLASTER", frac: blasterT / BLASTER_MS, col: "#ff3dbb" });
    bars.forEach((b, i) => {
      const bw = Math.min(160, W * 0.32);
      const bx = W / 2 - bw / 2;
      const by = H - 22 - i * 18;
      ctx.fillStyle = "rgba(10,0,30,0.55)";
      ctx.fillRect(bx, by, bw, 6);
      ctx.fillStyle = b.col;
      ctx.fillRect(bx, by, bw * b.frac, 6);
      retroText(b.label, W / 2, by - 3, 6, "#ffffff");
    });
    // Speed lines while boosting
    if (boostT > 0) {
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 14; i++) {
        const lx = Math.random() * W;
        const ly = HORIZON + Math.random() * (H - HORIZON);
        ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx, ly + 30 + Math.random() * 40); ctx.stroke();
      }
      ctx.restore();
    }
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
      const len = (22 + Math.random() * 10) * ls * big * flick * (boostT > 0 && status === "playing" ? 2.1 : 1);
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

  // Fixed random layout for surface features, so they don't flicker
  const featureRand = (() => {
    let seed = 7;
    return () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
  })();
  const surfaceSpots = Array.from({ length: 16 }, () => ({ x: featureRand(), y: featureRand(), r: featureRand() }));

  const PLANET_LOOK: { base: [string, string, string]; glow: string }[] = [
    { base: ["#e6e1d9", "#8f8a84", "#2e2b29"], glow: "#cfc8bd" }, // Mercury
    { base: ["#fff1c4", "#e8b65c", "#6b3e0e"], glow: "#ffd98a" }, // Venus
    { base: ["#7fd6ff", "#0070C0", "#001F5B"], glow: "#7fd6ff" }, // Earth (drawn by drawEarth)
    { base: ["#ffb38a", "#c1440e", "#3d1003"], glow: "#ff8a5c" }, // Mars
    { base: ["#f6e6c8", "#c99a6b", "#5a3a1c"], glow: "#f0d2a0" }, // Jupiter
    { base: ["#fff2c9", "#d8b56a", "#5e4419"], glow: "#ffe6a3" }, // Saturn
    { base: ["#e6fbff", "#7fd6e0", "#1a5560"], glow: "#b3f2ff" }, // Uranus
    { base: ["#a8c8ff", "#2f5fd6", "#071552"], glow: "#7fa8ff" }, // Neptune
    { base: ["#f5e8d6", "#b8916a", "#3d2a1b"], glow: "#e8d2b8" }, // Pluto
  ];

  function drawRings(cy: number, faint: boolean) {
    const cx = W / 2;
    const ry = cy - earthR - H * 0.04;
    const bands = faint
      ? [{ r: 1.25, w: 2, c: "rgba(200,245,255,0.35)" }]
      : [
          { r: 1.15, w: 7, c: "rgba(230,205,150,0.55)" },
          { r: 1.25, w: 10, c: "rgba(255,235,190,0.65)" },
          { r: 1.36, w: 5, c: "rgba(200,170,120,0.45)" },
          { r: 1.42, w: 3, c: "rgba(255,240,210,0.35)" },
        ];
    ctx.save();
    for (const b of bands) {
      ctx.strokeStyle = b.c;
      ctx.lineWidth = b.w;
      ctx.beginPath();
      ctx.ellipse(cx, ry, earthR * b.r * 0.9, H * 0.11 * b.r, -0.08, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawPlanet(i: number, cy: number, t: number) {
    if (i === 2) {
      drawEarth(cy, t);
      return;
    }
    const L = PLANET_LOOK[i];
    const cx = W / 2;
    const top = cy - earthR;
    const span = W * 1.6;
    const drift = t * 7;
    const wrapX = (fx: number, speedK = 1) => cx + ((((fx * span + drift * speedK) % span) + span) % span) - span / 2;

    if (i === 5) drawRings(cy, false);
    if (i === 6) drawRings(cy, true);

    ctx.save();
    ctx.shadowColor = L.glow;
    ctx.shadowBlur = 50;
    const g = ctx.createRadialGradient(cx - earthR * 0.3, cy - earthR * 0.6, earthR * 0.1, cx, cy, earthR);
    g.addColorStop(0, L.base[0]);
    g.addColorStop(0.45, L.base[1]);
    g.addColorStop(1, L.base[2]);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, earthR, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(cx, cy, earthR, 0, Math.PI * 2);
    ctx.clip();

    const vis = H * 0.32; // how much of the planet's surface is on screen
    if (i === 0) {
      // Mercury: craters everywhere
      for (const sp of surfaceSpots) {
        const x = wrapX(sp.x);
        const y = top + 8 + sp.y * vis;
        const r = 5 + sp.r * 20;
        ctx.fillStyle = "rgba(40,36,33,0.35)";
        ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.55, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "rgba(255,250,240,0.3)";
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.55, 0, 0.1, Math.PI - 0.1); ctx.stroke();
      }
    } else if (i === 1) {
      // Venus: thick swirling clouds
      ctx.lineWidth = 9;
      for (let k = 0; k < 9; k++) {
        ctx.strokeStyle = k % 2 ? "rgba(255,250,225,0.22)" : "rgba(150,90,20,0.15)";
        ctx.beginPath();
        for (let x = 0; x <= W; x += 12) {
          const y = top + 10 + k * (vis / 9) + Math.sin(x * 0.015 + t * 0.8 + k) * 6;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    } else if (i === 3) {
      // Mars: dark lowlands + white polar ice where the rocket lands
      for (const sp of surfaceSpots.slice(0, 8)) {
        ctx.fillStyle = "rgba(70,15,3,0.35)";
        ctx.beginPath();
        ctx.ellipse(wrapX(sp.x), top + 20 + sp.y * vis, 25 + sp.r * 50, 8 + sp.r * 10, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.beginPath(); ctx.ellipse(cx, top + 4, W * 0.32, 14, 0, 0, Math.PI * 2); ctx.fill();
    } else if (i === 4 || i === 5) {
      // Jupiter / Saturn: cloud bands
      const cols = i === 4
        ? ["rgba(255,245,225,0.35)", "rgba(150,90,45,0.4)", "rgba(230,200,160,0.3)", "rgba(120,70,35,0.35)"]
        : ["rgba(255,250,225,0.25)", "rgba(190,150,80,0.25)"];
      for (let k = 0; k < 12; k++) {
        ctx.fillStyle = cols[k % cols.length];
        const y = top + k * (vis / 10);
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x <= W; x += 16) ctx.lineTo(x, y + Math.sin(x * 0.01 + t + k) * 2);
        ctx.lineTo(W, y + vis / 12);
        ctx.lineTo(0, y + vis / 12);
        ctx.closePath();
        ctx.fill();
      }
      if (i === 4) {
        // Great Red Spot
        const x = wrapX(0.7, 0.8);
        ctx.fillStyle = "rgba(193,68,14,0.75)";
        ctx.beginPath(); ctx.ellipse(x, top + vis * 0.55, 34, 15, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "rgba(255,220,180,0.5)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    } else if (i === 6) {
      // Uranus: smooth with faint bands
      for (let k = 0; k < 6; k++) {
        ctx.fillStyle = `rgba(255,255,255,${0.04 + (k % 2) * 0.05})`;
        ctx.fillRect(0, top + k * (vis / 5), W, vis / 10);
      }
    } else if (i === 7) {
      // Neptune: white cloud streaks + Great Dark Spot
      for (const sp of surfaceSpots.slice(0, 7)) {
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.beginPath();
        ctx.ellipse(wrapX(sp.x, 1.6), top + 12 + sp.y * vis, 30 + sp.r * 40, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "rgba(7,21,82,0.7)";
      ctx.beginPath(); ctx.ellipse(wrapX(0.3), top + vis * 0.6, 30, 13, 0, 0, Math.PI * 2); ctx.fill();
    } else if (i === 8) {
      // Pluto: the famous heart, plus dark patches
      for (const sp of surfaceSpots.slice(0, 6)) {
        ctx.fillStyle = "rgba(60,35,20,0.35)";
        ctx.beginPath();
        ctx.ellipse(wrapX(sp.x), top + 15 + sp.y * vis, 20 + sp.r * 40, 8, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      const hx = wrapX(0.62, 0.6);
      const hy = top + vis * 0.5;
      ctx.fillStyle = "rgba(255,248,235,0.85)";
      ctx.beginPath();
      ctx.arc(hx - 13, hy - 6, 16, 0, Math.PI * 2);
      ctx.arc(hx + 13, hy - 6, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(hx - 28, hy);
      ctx.lineTo(hx + 28, hy);
      ctx.lineTo(hx, hy + 30);
      ctx.closePath();
      ctx.fill();
    }
    // Night-side shading
    const shade = ctx.createLinearGradient(0, top, 0, top + vis * 1.4);
    shade.addColorStop(0, "rgba(0,0,0,0)");
    shade.addColorStop(1, "rgba(0,0,0,0.35)");
    ctx.fillStyle = shade;
    ctx.fillRect(0, top, W, vis * 1.4);
    ctx.restore();

    ctx.strokeStyle = L.glow;
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, earthR + 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
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
    drawPlanet(cutPlanet, cy, t);

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
      if (cutKind === "record") {
        retroText("RECORD BROKEN", W / 2, H * 0.2, 16, "#ff3dbb");
        retroText("HEADING HOME...", W / 2, H * 0.2 + 26, 9, "#ffffff");
      } else {
        retroText(`PLANET ${cutPlanet + 1} OF 9`, W / 2, H * 0.2, 14, "#33e1ff");
        retroText(`APPROACHING ${PLANET_NAMES[cutPlanet]}`, W / 2, H * 0.2 + 24, 9, "#ffffff");
      }
      ctx.globalAlpha = 1;
    }
    if (t >= 7.8 && cutKind === "planet") {
      ctx.globalAlpha = clamp01((t - 7.8) / 0.6);
      retroText(PLANET_NAMES[cutPlanet], W / 2, H * 0.16, 26, "#FFD166");
      retroText("SHPE FLAG PLANTED", W / 2, H * 0.16 + 30, 9, "#ffffff");
      retroText(`FLAGS ${flags}/9`, W / 2, H * 0.16 + 52, 10, "#33e1ff");
      ctx.globalAlpha = 1;
    }
    if (t >= 7.8 && cutKind === "record") {
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


  /* ---------------- Title screen: LAMC launch pad at night ---------------- */

  const titleStars = Array.from({ length: Math.round(150 * widthFactor) }, () => ({
    x: Math.random() * W, y: Math.random() * H * 0.72, z: 0.3 + Math.random() * 0.7, tw: Math.random() * Math.PI * 2,
  }));
  const padY = Math.round(H * 0.78);
  const S = Math.min(1.7, Math.max(1.3, W / 420)); // rocket size on the pad
  const skyline = (() => {
    const out: { x: number; w: number; h: number; win: number[] }[] = [];
    let bx = 0;
    while (bx < W) {
      const w = 18 + Math.random() * 30;
      const edge = Math.abs(bx + w / 2 - W / 2) / (W / 2); // taller toward the sides, clear in the middle
      const h = edge < 0.22 ? 8 + Math.random() * 10 : 22 + Math.random() * 70 * edge;
      out.push({ x: bx, w, h, win: Array.from({ length: 12 }, () => Math.random()) });
      bx += w + 2;
    }
    return out;
  })();

  function stepTitle(dt: number, f: number) {
    if (status !== "ready" && liftoffT === 0) return;
    // Steam venting on the pad; big smoke during liftoff
    const padX = W / 2;
    const rate = liftoffT > 0 ? (liftoffT < 1300 ? 3.2 : 1) : 0.25;
    if (Math.random() < rate * f) {
      const side = Math.random() < 0.5 ? -1 : 1;
      puffs.push({
        x: padX + side * (10 + Math.random() * 20), y: padY - 4,
        vx: side * (0.4 + Math.random() * (liftoffT > 0 ? 2.2 : 0.6)), vy: -0.2 - Math.random() * 0.5,
        r: 6 + Math.random() * 8, life: 0, max: 60 + Math.random() * 60,
      });
    }
    puffs = puffs.filter((p) => {
      p.x += p.vx * f; p.y += p.vy * f; p.r += 0.35 * f; p.life += f; p.vx *= 0.99;
      return p.life < p.max;
    });
    // Occasional shooting star
    if (!shooting && Math.random() < 0.006 * f) {
      shooting = { x: Math.random() * W * 0.7, y: Math.random() * H * 0.3, vx: 7 + Math.random() * 4, vy: 2.5 + Math.random() * 2, life: 0 };
    }
    if (shooting) {
      shooting.x += shooting.vx * f; shooting.y += shooting.vy * f; shooting.life += f;
      if (shooting.life > 40) shooting = null;
    }
    void dt;
  }

  function drawPlanetIcon(px: number, py: number, r: number, c0: string, c1: string, ring: boolean) {
    if (ring) {
      ctx.strokeStyle = "rgba(255,230,180,0.55)";
      ctx.lineWidth = r * 0.18;
      ctx.beginPath(); ctx.ellipse(px, py, r * 1.9, r * 0.5, -0.35, Math.PI, Math.PI * 2); ctx.stroke();
    }
    const g = ctx.createRadialGradient(px - r * 0.4, py - r * 0.4, r * 0.1, px, py, r);
    g.addColorStop(0, c0);
    g.addColorStop(1, c1);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
    if (ring) {
      ctx.strokeStyle = "rgba(255,230,180,0.7)";
      ctx.beginPath(); ctx.ellipse(px, py, r * 1.9, r * 0.5, -0.35, 0, Math.PI); ctx.stroke();
    }
  }

  function drawPalm(px: number, base: number, h: number, lean: number) {
    ctx.strokeStyle = "#07010f";
    ctx.lineWidth = Math.max(3, h * 0.06);
    ctx.beginPath();
    ctx.moveTo(px, base);
    ctx.quadraticCurveTo(px + lean * 0.3, base - h * 0.6, px + lean, base - h);
    ctx.stroke();
    ctx.fillStyle = "#07010f";
    const tx = px + lean;
    const ty = base - h;
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (i - 3) * 0.48;
      const L = h * (0.42 + (i % 2) * 0.1);
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.quadraticCurveTo(tx + Math.cos(a) * L * 0.6, ty + Math.sin(a) * L * 0.6 - L * 0.2, tx + Math.cos(a) * L, ty + Math.sin(a) * L + L * 0.25);
      ctx.quadraticCurveTo(tx + Math.cos(a) * L * 0.5, ty + Math.sin(a) * L * 0.4, tx, ty + 2);
      ctx.fill();
    }
  }

  function chromeText(text: string, x0: number, y0: number, size: number) {
    ctx.font = `${size}px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#2a0040";
    ctx.fillText(text, x0 + 3, y0 + 3);
    const g = ctx.createLinearGradient(0, y0 - size, 0, y0);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.45, "#9ff3ff");
    g.addColorStop(0.5, "#2b5fbf");
    g.addColorStop(0.75, "#ff9be6");
    g.addColorStop(1, "#ffffff");
    ctx.save();
    ctx.shadowColor = "#ff3dbb";
    ctx.shadowBlur = 18;
    ctx.fillStyle = g;
    ctx.fillText(text, x0, y0);
    ctx.restore();
  }

  function drawTitle() {
    const now = performance.now();
    const tsec = now / 1000;
    const lift = liftoffT;
    const shake = lift > 0 && lift < 1300 ? (Math.random() - 0.5) * (lift < 500 ? lift / 120 : 4) : 0;
    ctx.save();
    ctx.translate(shake, shake * 0.6);

    // Sky
    const sky = ctx.createLinearGradient(0, 0, 0, padY);
    sky.addColorStop(0, "#03010a");
    sky.addColorStop(0.55, "#150536");
    sky.addColorStop(0.85, "#45105e");
    sky.addColorStop(1, "#a3195b");
    ctx.fillStyle = sky;
    ctx.fillRect(-10, -10, W + 20, padY + 10);

    // Nebula clouds
    const neb = (nx: number, ny: number, r: number, c: string) => {
      const g = ctx.createRadialGradient(nx, ny, 0, nx, ny, r);
      g.addColorStop(0, c);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(nx - r, ny - r, r * 2, r * 2);
    };
    neb(W * 0.2, H * 0.24, W * 0.38, "rgba(180,77,255,0.20)");
    neb(W * 0.82, H * 0.14, W * 0.32, "rgba(51,225,255,0.13)");
    neb(W * 0.6, H * 0.44, W * 0.28, "rgba(255,61,187,0.13)");

    // Stars (slow drift, twinkle)
    for (const st of titleStars) {
      const sx = (((st.x - tsec * 6 * st.z) % W) + W) % W;
      const a = 0.35 + 0.45 * Math.sin(st.tw + tsec * 2 * st.z);
      ctx.fillStyle = `rgba(255,255,255,${a * st.z})`;
      const sz = st.z > 0.85 ? 2 : 1.4;
      ctx.fillRect(sx, st.y, sz, sz);
    }
    if (shooting) {
      const g = ctx.createLinearGradient(shooting.x - shooting.vx * 8, shooting.y - shooting.vy * 8, shooting.x, shooting.y);
      g.addColorStop(0, "rgba(255,255,255,0)");
      g.addColorStop(1, "rgba(255,255,255,0.9)");
      ctx.strokeStyle = g;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(shooting.x - shooting.vx * 8, shooting.y - shooting.vy * 8);
      ctx.lineTo(shooting.x, shooting.y);
      ctx.stroke();
    }

    // Planets + moon
    const m = Math.min(W, H);
    drawPlanetIcon(W * 0.84, H * 0.3 + Math.sin(tsec * 0.6) * 3, m * 0.05, "#fff2c9", "#a37b2c", true);
    drawPlanetIcon(W * 0.12, H * 0.42 + Math.sin(tsec * 0.5 + 1) * 3, m * 0.028, "#ffb38a", "#7a2408", false);
    ctx.fillStyle = "#f2f2f2";
    ctx.beginPath(); ctx.arc(W * 0.28, H * 0.09, m * 0.022, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#150536";
    ctx.beginPath(); ctx.arc(W * 0.28 + m * 0.009, H * 0.09 - m * 0.004, m * 0.02, 0, Math.PI * 2); ctx.fill();

    // Searchlights sweeping the sky
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const [lx, sp, ph] of [[W * 0.22, 0.7, 0], [W * 0.78, 0.55, 2]] as const) {
      const ang = -Math.PI / 2 + Math.sin(tsec * sp + ph) * 0.5;
      const L = H;
      const spread = 0.07;
      const g = ctx.createLinearGradient(lx, padY, lx + Math.cos(ang) * L, padY + Math.sin(ang) * L);
      g.addColorStop(0, "rgba(180,230,255,0.22)");
      g.addColorStop(1, "rgba(180,230,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(lx, padY);
      ctx.lineTo(lx + Math.cos(ang - spread) * L, padY + Math.sin(ang - spread) * L);
      ctx.lineTo(lx + Math.cos(ang + spread) * L, padY + Math.sin(ang + spread) * L);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Horizon glow + mountains
    const hg = ctx.createRadialGradient(W / 2, padY, 0, W / 2, padY, W * 0.7);
    hg.addColorStop(0, "rgba(255,61,187,0.45)");
    hg.addColorStop(1, "rgba(255,61,187,0)");
    ctx.fillStyle = hg;
    ctx.fillRect(0, padY - W * 0.7, W, W * 0.7);
    ctx.beginPath();
    ctx.moveTo(0, padY);
    for (const mt of mountains) ctx.lineTo(mt.x, padY - 30 - mt.h * 0.9);
    ctx.lineTo(W, padY);
    ctx.closePath();
    ctx.fillStyle = "#1a0533";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,61,187,0.6)";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // City skyline with lit windows
    for (const b of skyline) {
      const top = padY - b.h;
      ctx.fillStyle = "#0b0219";
      ctx.fillRect(b.x, top, b.w, b.h);
      ctx.fillStyle = "rgba(255,61,187,0.7)";
      ctx.fillRect(b.x, top, b.w, 1.5);
      for (let i = 0; i < b.win.length; i++) {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const wy = top + 6 + row * 9;
        if (wy > padY - 5) break;
        const on = b.win[i] > 0.45 && (b.win[i] < 0.95 || Math.sin(tsec * 3 + i) > 0);
        if (!on) continue;
        ctx.fillStyle = b.win[i] > 0.75 ? "rgba(51,225,255,0.75)" : "rgba(255,209,102,0.8)";
        ctx.fillRect(b.x + 4 + col * ((b.w - 8) / 3), wy, 3, 4);
      }
    }
    drawPalm(W * 0.06, padY, H * 0.2, 14);
    drawPalm(W * 0.15, padY, H * 0.15, -8);
    drawPalm(W * 0.93, padY, H * 0.19, -16);

    // Ground: neon grid
    const floor = ctx.createLinearGradient(0, padY, 0, H);
    floor.addColorStop(0, "#1a0533");
    floor.addColorStop(1, "#05010d");
    ctx.fillStyle = floor;
    ctx.fillRect(-10, padY, W + 20, H - padY + 10);
    ctx.save();
    ctx.strokeStyle = "#ff3dbb";
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1;
    for (let i = -12; i <= 12; i++) {
      ctx.beginPath(); ctx.moveTo(W / 2 + i * 14, padY); ctx.lineTo(W / 2 + i * 90, H); ctx.stroke();
    }
    for (let i = 0; i < 6; i++) {
      const k = (i + ((tsec * 0.3) % 1)) / 6;
      const y = padY + Math.pow(k, 2) * (H - padY);
      ctx.globalAlpha = 0.15 + 0.5 * k;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.restore();

    // Launch pad
    ctx.fillStyle = "#2b3140";
    ctx.fillRect(W / 2 - 46 * S * 0.8, padY - 6, 92 * S * 0.8, 8);
    SHPE.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(W / 2 - 46 * S * 0.8 + (i * 92 * S * 0.8) / 4, padY - 6, (92 * S * 0.8) / 4, 2);
    });

    // Rocket (your hangar pick), lifting off when launched
    const rise = lift > 450 ? Math.pow((lift - 450) / 1000, 2.2) * (padY + 120 * S) : 0;
    const rocketY = padY - 8 - 28 * S - rise;

    // Launch tower + support arm (arm swings away at ignition)
    const tx = W / 2 + 34 * S;
    const towerTop = padY - 82 * S;
    ctx.strokeStyle = "#5a6378";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tx, padY); ctx.lineTo(tx, towerTop);
    ctx.moveTo(tx + 12, padY); ctx.lineTo(tx + 12, towerTop);
    for (let y = padY; y > towerTop; y -= 12) {
      ctx.moveTo(tx, y); ctx.lineTo(tx + 12, y - 12);
      ctx.moveTo(tx + 12, y); ctx.lineTo(tx, y - 12);
    }
    ctx.stroke();
    const armSwing = lift > 0 ? Math.min(1, lift / 500) : 0;
    ctx.save();
    ctx.translate(tx, padY - 46 * S);
    ctx.rotate(-armSwing * 1.1);
    ctx.fillStyle = "#8a94a8";
    ctx.fillRect(-20 * S, -2, 20 * S, 4);
    ctx.restore();
    ctx.fillStyle = Math.floor(now / 500) % 2 ? "#ff2d55" : "#5a0010";
    ctx.beginPath(); ctx.arc(tx + 6, towerTop - 3, 3, 0, Math.PI * 2); ctx.fill();

    ctx.save();
    ctx.translate(W / 2, rocketY);
    ctx.scale(S, S);
    drawRocketBody(0, 0, 0, lift > 0);
    ctx.restore();

    // Smoke / steam
    for (const p of puffs) {
      const a = (1 - p.life / p.max) * (lift > 0 ? 0.7 : 0.35);
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      g.addColorStop(0, `rgba(235,230,245,${a})`);
      g.addColorStop(1, "rgba(235,230,245,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }

    // Title: just "ROCKETSHPE" with a little rocket orbiting it (fades out at liftoff)
    const ta = lift > 0 ? Math.max(0, 1 - lift / 400) : 1;
    if (ta > 0) {
      ctx.save();
      ctx.globalAlpha = ta;
      const size = Math.min(44, Math.floor((W * 0.86) / 10));
      const ty = H * 0.2 + Math.sin(tsec * 1.6) * 3;
      ctx.font = `${size}px ${FONT}`;
      const rocketW = ctx.measureText("ROCKET").width;
      const shpeW = ctx.measureText("SHPE").width;
      const total = rocketW + shpeW;
      const left = W / 2 - total / 2;

      // Orbit around the word: back half drawn behind the text, front half in front
      const cx = W / 2;
      const cy = ty - size * 0.45;
      const rx = total / 2 + size * 0.9;
      const ry = size * 1.25;
      const tilt = -0.12;
      const theta = tsec * 1.3;
      const orbitPos = (a: number) => {
        const ex = Math.cos(a) * rx;
        const ey = Math.sin(a) * ry;
        return { x: cx + ex * Math.cos(tilt) - ey * Math.sin(tilt), y: cy + ex * Math.sin(tilt) + ey * Math.cos(tilt) };
      };
      const drawOrbiter = () => {
        // Sparkly exhaust trail along the orbit
        for (let k = 1; k <= 14; k++) {
          const p = orbitPos(theta - k * 0.07);
          ctx.fillStyle = k % 2 ? palette.trail[0] : palette.trail[1];
          ctx.globalAlpha = ta * (1 - k / 15) * 0.8;
          const sz = 3.5 - k * 0.2;
          ctx.fillRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
        }
        ctx.globalAlpha = ta;
        const p = orbitPos(theta);
        const p2 = orbitPos(theta + 0.01);
        const heading = Math.atan2(p2.y - p.y, p2.x - p.x) + Math.PI / 2;
        const depth = 0.75 + 0.25 * Math.sin(theta); // bigger when it passes in front
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(heading);
        ctx.scale(0.55 * depth, 0.55 * depth);
        drawRocketBody(0, 0, 0, true);
        ctx.restore();
      };
      const inFront = Math.sin(theta) > 0;
      if (!inFront) drawOrbiter();
      chromeText("ROCKET", left + rocketW / 2, ty, size);
      ["S", "H", "P", "E"].forEach((ch, i) => {
        retroText(ch, left + rocketW + (shpeW / 4) * (i + 0.5), ty, size, SHPE[i]);
      });
      if (inFront) drawOrbiter();
      ctx.restore();
    }
    ctx.restore();
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (status === "cutscene" || status === "record") {
      drawCutscene();
    } else if (status === "ready" || liftoffT > 0) {
      drawTitle();
    } else {
      drawBackground();

      const drawables: { y: number; fn: () => void }[] = [];
      for (const r of rocks) drawables.push({ y: r.y, fn: () => drawRock(r) });
      for (const it of items) drawables.push({ y: it.y, fn: () => drawItem(it) });
      drawables.sort((a, b) => a.y - b.y).forEach((d) => d.fn());

      for (const p of parts) {
        ctx.globalAlpha = 1 - p.life / p.max;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
      ctx.globalAlpha = 1;

      drawBolts();
      drawShocks();
      if (boss) drawBoss();
      if (status !== "over") drawRocket();

      // HUD
      retroText(score().toLocaleString(), 14, 28, 14, "#FFD166", "left");
      retroText(`${(distance / 10).toFixed(0)} KM`, 14, 46, 8, "#ffffff", "left");
      if (flags > 0) retroText(`FLAGS ${flags}/9`, W - 14, 46, 7, "#33e1ff", "right");
      retroText(ZONES[zoneIdx].name.toUpperCase(), W - 14, 28, 8, "#ff9be6", "right");
      if (prez && Math.random() > 0.08) retroText("PREZ.EXE", 14, H - 14, 7, "#00ffd0", "left");
      drawPowerHud();
      if (boss && status !== "over") drawBossHud();

      // Intermission countdown
      if (status === "playing" && countdown > 0) {
        const n = Math.ceil(countdown / 1000);
        const pulse = 1 + 0.15 * ((countdown % 1000) / 1000); // number shrinks a bit each second
        ctx.fillStyle = "rgba(10,0,30,0.35)";
        ctx.fillRect(0, H / 2 - 70, W, 120);
        retroText("CATCH YOUR BREATH", W / 2, H / 2 - 42, 10, "#33e1ff");
        retroText(String(n), W / 2, H / 2 + 12, Math.round(40 * pulse), "#FFD166");
        retroText("STEER INTO POSITION", W / 2, H / 2 + 38, 7, "#ffffff");
      } else if (status === "playing" && performance.now() < goUntil) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, (goUntil - performance.now()) / 800);
        retroText("GO!", W / 2, H / 2 + 10, 36, "#33e1ff");
        ctx.restore();
      }

      // Messages sit up top under the HUD, small and see-through, and fade in/out
      // so they don't block the rocks the player is dodging.
      const fade = (until: number, dur: number) => {
        const left = until - performance.now();
        return Math.max(0, Math.min(1, (dur - left) / 250, left / 700));
      };

      // Checkpoint / easter egg / top-5 callouts
      if (callout && performance.now() < callout.until && status === "playing") {
        const a = fade(callout.until, 3800) * 0.9;
        const big = Math.min(10, Math.floor((W - 28) / callout.big.length));
        const y0 = 58;
        ctx.save();
        ctx.globalAlpha = a;
        const strip = ctx.createLinearGradient(0, 0, W, 0);
        strip.addColorStop(0, "rgba(10,0,30,0)");
        strip.addColorStop(0.2, "rgba(10,0,30,0.45)");
        strip.addColorStop(0.8, "rgba(10,0,30,0.45)");
        strip.addColorStop(1, "rgba(10,0,30,0)");
        ctx.fillStyle = strip;
        ctx.fillRect(0, y0, W, 34);
        ctx.fillStyle = callout.color;
        ctx.globalAlpha = a * 0.6;
        ctx.fillRect(W * 0.25, y0 + 33, W * 0.5, 1);
        ctx.globalAlpha = a;
        retroText(callout.big, W / 2, y0 + 15, big, callout.color);
        retroText(callout.small, W / 2, y0 + 28, 6, "#ffffff");
        ctx.restore();
      }

      // Zone change: one small line under the callout spot
      if (zoneBanner.text && performance.now() < zoneBanner.until && status === "playing") {
        ctx.save();
        ctx.globalAlpha = fade(zoneBanner.until, 2200) * 0.8;
        retroText(`ENTERING ${zoneBanner.text.toUpperCase()}`, W / 2, 106, 7, "#FFD166");
        ctx.restore();
      }

      if (status === "over" || status === "paused") {
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
        }
      }
    }

    if (introFlash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${Math.min(1, introFlash / 450)})`;
      ctx.fillRect(0, 0, W, H);
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
    const dt = Math.max(0, Math.min(50, now - last));
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
      if (status === "ready") {
        ev.onSfx?.("launch");
        liftoffT = 1;
        setStatus("playing");
      }
      else if (status === "playing" && liftoffT === 0) setStatus("paused");
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
      if (status !== "record") return;
      beginIntermission();
    },
    /** Rocket color + style from the hangar picker */
    setSkin(colorId: string, styleId: string) {
      palette = (ROCKET_COLORS.find((c) => c.id === colorId) ?? ROCKET_COLORS[0]).p;
      rocketStyle = ROCKET_STYLES.some((st) => st.id === styleId) ? styleId : "classic";
    },
    /** Boss fight: hold to fire the blaster */
    setFire(v: boolean) { firing = v && !!boss; },
    /** Boss fight: launch a missile (if reloaded) */
    fireMissile() {
      if (!boss || boss.phase !== "fight" || missileCd > 0 || status !== "playing") return;
      const rs = rocketScreen();
      pShots.push({ x: rs.sx, y: rs.sy - 30, vx: 0, vy: -2, kind: "missile" });
      missileCd = MISSILE_CD;
      ev.onSfx?.("missile");
    },
    togglePrez() {
      prez = !prez;
      prezFlash = 20;
      ev.onSfx?.(prez ? "shield" : "zone");
      return prez;
    },
    getScore: score,
    /** Badges earned this run: earth (3 planets), boss (beat the mothership), pluto (all 9 planets) */
    getBadges() {
      const b: string[] = [];
      if (flags >= 3) b.push("earth");
      if (bossDone) b.push("boss");
      if (flags >= PLANET_NAMES.length) b.push("pluto");
      return b;
    },
    getStats() {
      return { score: score(), planets: flags, bossDone, wemsUsed, planetName: flags > 0 ? PLANET_NAMES[flags - 1] : null };
    },
    /** Draw the current rocket (picked color + style) onto its own canvas, for the share card */
    snapshotRocket(scale: number) {
      const c = document.createElement("canvas");
      c.width = Math.round(70 * scale);
      c.height = Math.round(120 * scale);
      const main = ctx;
      ctx = c.getContext("2d")!;
      ctx.scale(scale, scale);
      drawRocketBody(35, 50, 0, true);
      ctx = main;
      return c;
    },
    destroy() { cancelAnimationFrame(raf); },
  };
}
