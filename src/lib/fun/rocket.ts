/**
 * Rocket SHPE: retro synthwave edition with a pseudo-3D view.
 * Things spawn at the horizon and rush toward you, growing as they get closer.
 * Game logic runs in "world" coordinates; drawing and collisions use the
 * projected (on-screen) positions so what you see is what hits you.
 */

export const RW = 400;
export const RH = 600;

const HORIZON = 210; // screen y of the horizon line
const WORLD_TOP = -40;
const WORLD_BOTTOM = RH + 80;
const ROCKET_WY = RH - 90; // rocket's world y
const FONT = '"Press Start 2P", ui-monospace, monospace';

type Rock = { x: number; y: number; r: number; vy: number; vx: number; rot: number; vr: number; pts: number[] };
type Item = { x: number; y: number; vy: number; kind: "coin" | "shield"; t: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number };
type Star = { x: number; y: number; tw: number };

export type RocketEvents = {
  onScore: (score: number) => void;
  onStatus: (s: "ready" | "playing" | "paused" | "over") => void;
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

// Perspective projection: world y -> screen y and scale (scale = 1 at the rocket)
const T_ROCKET = Math.pow((ROCKET_WY - WORLD_TOP) / (WORLD_BOTTOM - WORLD_TOP), 2);
function project(wx: number, wy: number) {
  const t = Math.max(0, Math.min(1.15, (wy - WORLD_TOP) / (WORLD_BOTTOM - WORLD_TOP)));
  const p = t * t;
  const sy = HORIZON + p * (RH + 30 - HORIZON);
  const s = 0.12 + 0.88 * (p / T_ROCKET);
  const sx = RW / 2 + (wx - RW / 2) * s;
  return { sx, sy, s };
}

export function startRocket(canvas: HTMLCanvasElement, ev: RocketEvents) {
  const ctx = canvas.getContext("2d")!;
  let status: "ready" | "playing" | "paused" | "over" = "ready";
  let x = RW / 2;
  let targetX: number | null = null;
  let vx = 0;
  let left = false;
  let right = false;
  let distance = 0;
  let bonus = 0;
  let speed = 3;
  let shield = 0;
  let invuln = 0;
  let zoneIdx = 0;
  let zoneBanner = { text: "", until: 0 };
  let rocks: Rock[] = [];
  let items: Item[] = [];
  let parts: Particle[] = [];
  let spawnRock = 0;
  let spawnItem = 0;
  let gridScroll = 0;
  let last = performance.now();
  let raf = 0;
  let lastReportedScore = -1;
  const stars: Star[] = Array.from({ length: 70 }, () => ({
    x: Math.random() * RW,
    y: Math.random() * (HORIZON - 40),
    tw: Math.random() * Math.PI * 2,
  }));
  // Wireframe mountain range along the horizon
  const mountains = Array.from({ length: 14 }, (_, i) => ({
    x: (i / 13) * RW,
    h: 18 + Math.random() * 46 * (Math.abs(i - 6.5) / 6.5 + 0.3),
  }));

  const score = () => Math.floor(distance / 10) + bonus;
  const rocketScreen = () => project(x, ROCKET_WY);

  function setStatus(s: typeof status) {
    status = s;
    ev.onStatus(s);
  }

  function reset() {
    x = RW / 2;
    targetX = null;
    vx = 0;
    distance = 0;
    bonus = 0;
    speed = 3;
    shield = 0;
    invuln = 0;
    zoneIdx = 0;
    rocks = [];
    items = [];
    parts = [];
    spawnRock = 30;
    spawnItem = 100;
    lastReportedScore = -1;
    ev.onScore(0);
    setStatus("ready");
  }

  function makeRock(): Rock {
    const r = 13 + Math.random() * (14 + Math.min(16, distance / 900));
    return {
      x: 30 + Math.random() * (RW - 60),
      y: WORLD_TOP,
      r,
      vy: speed * (0.75 + Math.random() * 0.6),
      vx: (Math.random() - 0.5) * (distance > 4000 ? 1.2 : 0.4),
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.05,
      pts: Array.from({ length: 8 }, () => 0.72 + Math.random() * 0.38),
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

  function step(dt: number) {
    const f = dt / 16.67;
    gridScroll = (gridScroll + (status === "playing" ? speed : 0.8) * 0.012 * f) % 1;
    for (const s of stars) s.tw += 0.05 * f;

    const rs = rocketScreen();
    if (status !== "over") {
      for (let i = 0; i < 2; i++) {
        parts.push({
          x: rs.sx + (Math.random() - 0.5) * 6, y: rs.sy + 30,
          vx: (Math.random() - 0.5) * 0.6, vy: 2 + Math.random() * 2,
          life: 0, max: 16 + Math.random() * 10,
          color: Math.random() < 0.5 ? "#ff3dbb" : "#FFD166", size: 2 + Math.random() * 2.5,
        });
      }
    }
    parts = parts.filter((p) => {
      p.x += p.vx * f; p.y += p.vy * f; p.life += f;
      return p.life < p.max;
    });

    if (status !== "playing") return;

    if (left) vx -= 0.9 * f;
    if (right) vx += 0.9 * f;
    if (targetX !== null && !left && !right) vx += (targetX - x) * 0.04 * f;
    vx *= Math.pow(0.82, f);
    x = Math.max(22, Math.min(RW - 22, x + vx * f));

    distance += speed * f;
    speed = Math.min(9, 3 + distance / 2300);
    if (invuln > 0) invuln -= f;

    const nextZone = ZONES.findLastIndex((z) => distance >= z.at);
    if (nextZone > zoneIdx) {
      zoneIdx = nextZone;
      zoneBanner = { text: ZONES[zoneIdx].name, until: performance.now() + 2200 };
      ev.onMessage(`Entering ${ZONES[zoneIdx].name}`);
      ev.onSfx?.("zone");
    }

    spawnRock -= f;
    if (spawnRock <= 0) {
      rocks.push(makeRock());
      spawnRock = Math.max(13, 50 - distance / 320) * (0.7 + Math.random() * 0.6);
    }
    spawnItem -= f;
    if (spawnItem <= 0) {
      items.push({
        x: 40 + Math.random() * (RW - 80), y: WORLD_TOP, vy: speed * 0.85,
        kind: Math.random() < 0.12 && shield === 0 ? "shield" : "coin", t: 0,
      });
      spawnItem = 60 + Math.random() * 70;
    }

    // Collisions use on-screen positions, so the hitbox matches the picture
    for (const r of rocks) {
      r.y += r.vy * f; r.x += r.vx * f; r.rot += r.vr * f;
      if (r.x < r.r || r.x > RW - r.r) r.vx = -r.vx;
      const pr = project(r.x, r.y);
      if (invuln <= 0 && Math.hypot(pr.sx - rs.sx, pr.sy - rs.sy) < r.r * pr.s * 0.82 + 12) {
        if (shield > 0) {
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
  }

  /* ---------------- Drawing ---------------- */

  function drawBackground() {
    const z = ZONES[zoneIdx];
    // Sky
    const sky = ctx.createLinearGradient(0, 0, 0, HORIZON);
    sky.addColorStop(0, z.sky[0]);
    sky.addColorStop(0.6, z.sky[1]);
    sky.addColorStop(1, z.sky[2]);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, RW, HORIZON);

    // Twinkling stars
    for (const s of stars) {
      ctx.fillStyle = `rgba(255,255,255,${0.35 + 0.35 * Math.sin(s.tw)})`;
      ctx.fillRect(s.x, s.y, 2, 2);
    }

    // Striped retro sun
    const cx = RW / 2;
    const cy = HORIZON - 6;
    const R = 78;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, RW, HORIZON);
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
    // Gaps in the sun get thicker toward the bottom
    ctx.globalCompositeOperation = "destination-out";
    for (let i = 0; i < 6; i++) {
      const y = cy - 34 + i * 7.5;
      ctx.fillRect(cx - R, y, R * 2, 1 + i * 0.9);
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();

    // Wireframe mountains
    ctx.beginPath();
    ctx.moveTo(0, HORIZON);
    for (const m of mountains) ctx.lineTo(m.x, HORIZON - m.h);
    ctx.lineTo(RW, HORIZON);
    ctx.closePath();
    ctx.fillStyle = "#0d0221";
    ctx.fill();
    ctx.strokeStyle = z.grid;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.7;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Floor
    const floor = ctx.createLinearGradient(0, HORIZON, 0, RH);
    floor.addColorStop(0, "#1a0533");
    floor.addColorStop(1, "#05010d");
    ctx.fillStyle = floor;
    ctx.fillRect(0, HORIZON, RW, RH - HORIZON);

    // Neon perspective grid rushing toward you
    ctx.save();
    ctx.strokeStyle = z.grid;
    ctx.shadowColor = z.grid;
    ctx.shadowBlur = 6;
    ctx.lineWidth = 1.2;
    for (let i = -10; i <= 10; i++) {
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.moveTo(RW / 2 + i * 6, HORIZON);
      ctx.lineTo(RW / 2 + i * 70, RH);
      ctx.stroke();
    }
    for (let i = 0; i < 12; i++) {
      const t = (i + gridScroll) / 12;
      const y = HORIZON + Math.pow(t, 2.2) * (RH - HORIZON);
      ctx.globalAlpha = 0.15 + 0.6 * t;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(RW, y);
      ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = 1;

    // Horizon glow line
    ctx.fillStyle = z.grid;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, HORIZON - 1, RW, 2);
    ctx.globalAlpha = 1;
  }

  // Shaded, faceted asteroid so it reads as a solid 3D rock
  function drawRock(r: Rock) {
    const p = project(r.x, r.y);
    if (p.sy < HORIZON - 4) return;
    const rad = r.r * p.s;
    // Fade in from the horizon haze
    ctx.globalAlpha = Math.min(1, (p.sy - HORIZON) / 40);
    // Ground shadow
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(p.sx + rad * 0.3, p.sy + rad * 0.9, rad * 0.9, rad * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();

    const pts = r.pts.map((m, i) => {
      const a = r.rot + (i / r.pts.length) * Math.PI * 2;
      return { x: p.sx + Math.cos(a) * rad * m, y: p.sy + Math.sin(a) * rad * m };
    });
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      const nx = (a.x + b.x) / 2 - p.sx;
      const ny = (a.y + b.y) / 2 - p.sy;
      const len = Math.hypot(nx, ny) || 1;
      const lit = Math.max(0, -(nx / len) * LIGHT.x - (ny / len) * LIGHT.y);
      const shade = Math.round(60 + lit * 110);
      ctx.fillStyle = `rgb(${shade + 15},${shade},${shade + 30})`;
      ctx.beginPath();
      ctx.moveTo(p.sx - rad * 0.15, p.sy - rad * 0.15);
      ctx.lineTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(255,61,187,0.55)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    pts.forEach((pt, i) => (i ? ctx.lineTo(pt.x, pt.y) : ctx.moveTo(pt.x, pt.y)));
    ctx.closePath();
    ctx.stroke();
    // Crater
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(p.sx + rad * 0.25, p.sy + rad * 0.1, rad * 0.22, rad * 0.16, r.rot, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Spinning 3D SHPE coin with a visible edge
  function drawCoin(it: Item) {
    const p = project(it.x, it.y);
    if (p.sy < HORIZON - 4) return;
    const r = 12 * p.s;
    const spin = Math.cos(it.t * 0.08);
    const w = Math.max(0.12, Math.abs(spin));
    ctx.save();
    ctx.globalAlpha = Math.min(1, (p.sy - HORIZON) / 40);
    ctx.translate(p.sx, p.sy);
    ctx.shadowColor = "#FFD166";
    ctx.shadowBlur = 14;
    ctx.fillStyle = "#b8860b";
    ctx.beginPath();
    ctx.ellipse(spin > 0 ? 2 * p.s : -2 * p.s, 0, r * w, r, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(0, 0, r * w, r, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.scale(w, 1);
    ctx.lineWidth = 3 * p.s;
    ctx.lineCap = "round";
    SHPE.forEach((c, i) => {
      ctx.strokeStyle = c;
      const a = (i * Math.PI) / 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 3 * p.s, Math.sin(a) * 3 * p.s, 5.5 * p.s, a + 0.6, a + 2.6);
      ctx.stroke();
    });
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

  // Shaded rocket that banks (rolls) when you steer
  function drawRocket() {
    const { sx, sy } = rocketScreen();
    const roll = Math.max(-1, Math.min(1, vx / 8));
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(roll * 0.25);
    ctx.scale(1 - Math.abs(roll) * 0.28, 1);

    // Engine glow
    ctx.shadowColor = "#ff3dbb";
    ctx.shadowBlur = 22;
    ctx.fillStyle = "#ff7ad1";
    ctx.beginPath();
    ctx.ellipse(0, 26, 7, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Fins: the side away from the light is darker
    const finNear = roll > 0 ? "#a12a00" : "#ff7a3d";
    const finFar = roll > 0 ? "#ff7a3d" : "#a12a00";
    ctx.fillStyle = finNear;
    ctx.beginPath(); ctx.moveTo(-12, 8); ctx.lineTo(-24, 28); ctx.lineTo(-9, 22); ctx.closePath(); ctx.fill();
    ctx.fillStyle = finFar;
    ctx.beginPath(); ctx.moveTo(12, 8); ctx.lineTo(24, 28); ctx.lineTo(9, 22); ctx.closePath(); ctx.fill();

    // Body: cylinder shading with a moving highlight
    const g = ctx.createLinearGradient(-13, 0, 13, 0);
    const hi = 0.35 - roll * 0.2;
    g.addColorStop(0, "#5c6b8a");
    g.addColorStop(Math.max(0.05, hi - 0.15), "#c9d4ea");
    g.addColorStop(Math.max(0.1, hi), "#ffffff");
    g.addColorStop(Math.min(0.95, hi + 0.25), "#9aa8c4");
    g.addColorStop(1, "#3b4763");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -32);
    ctx.quadraticCurveTo(15, -12, 12, 22);
    ctx.lineTo(-12, 22);
    ctx.quadraticCurveTo(-15, -12, 0, -32);
    ctx.fill();

    // Nose cone
    const n = ctx.createLinearGradient(-9, 0, 9, 0);
    n.addColorStop(0, "#a12a00");
    n.addColorStop(Math.max(0.1, hi), "#ffb38a");
    n.addColorStop(1, "#7a1f00");
    ctx.fillStyle = n;
    ctx.beginPath();
    ctx.moveTo(0, -32); ctx.quadraticCurveTo(8, -24, 9, -17); ctx.lineTo(-9, -17); ctx.quadraticCurveTo(-8, -24, 0, -32);
    ctx.fill();

    // Glass window with a reflection
    const w = ctx.createRadialGradient(-2, -6, 1, 0, -3, 6.5);
    w.addColorStop(0, "#bff3ff");
    w.addColorStop(0.4, "#33a8ff");
    w.addColorStop(1, "#003a7a");
    ctx.fillStyle = w;
    ctx.beginPath(); ctx.arc(0, -3, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#001F5B"; ctx.lineWidth = 2; ctx.stroke();

    // SHPE color stripe
    SHPE.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(-11 + i * 5.5, 11, 5.5, 4);
    });
    ctx.restore();

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

  function draw() {
    drawBackground();

    // Draw far things first so near things cover them
    const drawables: { y: number; fn: () => void }[] = [];
    for (const r of rocks) drawables.push({ y: r.y, fn: () => drawRock(r) });
    for (const it of items) drawables.push({ y: it.y, fn: () => (it.kind === "coin" ? drawCoin(it) : drawShieldItem(it)) });
    drawables.sort((a, b) => a.y - b.y).forEach((d) => d.fn());

    for (const p of parts) {
      ctx.globalAlpha = 1 - p.life / p.max;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); // square = pixel-art look
    }
    ctx.globalAlpha = 1;

    if (status !== "over") drawRocket();

    // HUD
    retroText(score().toLocaleString(), 14, 28, 14, "#FFD166", "left");
    retroText(`${(distance / 10).toFixed(0)} KM`, 14, 46, 8, "#ffffff", "left");
    retroText(ZONES[zoneIdx].name.toUpperCase(), RW - 14, 28, 8, "#ff9be6", "right");

    if (zoneBanner.text && performance.now() < zoneBanner.until && status === "playing") {
      retroText("ENTERING", RW / 2, HORIZON + 50, 10, "#ffffff");
      retroText(zoneBanner.text.toUpperCase(), RW / 2, HORIZON + 72, 12, "#FFD166");
    }

    if (status !== "playing") {
      ctx.fillStyle = "rgba(10,0,30,0.7)";
      ctx.fillRect(0, RH / 2 - 60, RW, 120);
      ctx.fillStyle = "#ff3dbb";
      ctx.fillRect(0, RH / 2 - 60, RW, 2);
      ctx.fillRect(0, RH / 2 + 58, RW, 2);
      if (status === "over") {
        retroText("GAME OVER", RW / 2, RH / 2 - 12, 22, "#ff3dbb");
        retroText(`SCORE ${score().toLocaleString()}`, RW / 2, RH / 2 + 16, 10, "#FFD166");
        retroText("TAP OR SPACE TO RETRY", RW / 2, RH / 2 + 38, 8, "#ffffff");
      } else if (status === "paused") {
        retroText("PAUSED", RW / 2, RH / 2 - 4, 22, "#33e1ff");
        retroText("TAP OR SPACE TO RESUME", RW / 2, RH / 2 + 28, 8, "#ffffff");
      } else {
        retroText("ROCKET SHPE", RW / 2, RH / 2 - 10, 22, "#FFD166");
        retroText("INSERT COIN", RW / 2, RH / 2 + 18, 10, "#ff3dbb");
        retroText("TAP OR SPACE TO LAUNCH", RW / 2, RH / 2 + 40, 8, "#ffffff");
      }
    }

    // CRT scanlines and a soft vignette for the old-arcade look
    ctx.fillStyle = "rgba(0,0,0,0.13)";
    for (let y = 0; y < RH; y += 3) ctx.fillRect(0, y, RW, 1);
    const v = ctx.createRadialGradient(RW / 2, RH / 2, RH * 0.35, RW / 2, RH / 2, RH * 0.75);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(0,0,0,0.45)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, RW, RH);
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
    action() {
      if (status === "ready") { ev.onSfx?.("launch"); setStatus("playing"); }
      else if (status === "playing") setStatus("paused");
      else if (status === "paused") { last = performance.now(); setStatus("playing"); }
      else reset();
    },
    pause() { if (status === "playing") setStatus("paused"); },
    /** x in game units; converted so the rocket follows the pointer on screen */
    steerTo(px: number | null) { targetX = px; },
    setLeft(v: boolean) { left = v; },
    setRight(v: boolean) { right = v; },
    getScore: score,
    destroy() { cancelAnimationFrame(raf); },
  };
}
