/**
 * "Share your score" card for Rocket SHPE: a 1080×1920 image (Instagram Story size)
 * in the game's synthwave style, with the player's rocket, score, planets, and badges.
 */

const FONT = '"Press Start 2P", ui-monospace, monospace';
const SHPE = ["#D33A02", "#FD652F", "#72A9BE", "#0070C0"];
const PLANETS = ["MERCURY", "VENUS", "EARTH", "MARS", "JUPITER", "SATURN", "URANUS", "NEPTUNE", "PLUTO"];

export type ShareStats = { score: number; planets: number; bossDone: boolean; wemsUsed: number; isRecord?: boolean };

function loadImage(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function makeShareCard(stats: ShareStats, rocket: HTMLCanvasElement): Promise<Blob | null> {
  const W = 1080;
  const H = 1920;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  try {
    await document.fonts.load(`40px "Press Start 2P"`);
  } catch {}
  const symbol = await loadImage("/images/symbol.png");

  const text = (t: string, x: number, y: number, size: number, color: string, shadow = "#2a0040") => {
    g.font = `${size}px ${FONT}`;
    g.textAlign = "center";
    g.textBaseline = "alphabetic";
    g.fillStyle = shadow;
    g.fillText(t, x + size * 0.1, y + size * 0.1);
    g.fillStyle = color;
    g.fillText(t, x, y);
  };

  // Sky
  const horizon = 1250;
  const sky = g.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, "#03010a");
  sky.addColorStop(0.55, "#1b0640");
  sky.addColorStop(0.85, "#4a0f5c");
  sky.addColorStop(1, "#b3186a");
  g.fillStyle = sky;
  g.fillRect(0, 0, W, horizon);
  for (let i = 0; i < 260; i++) {
    g.fillStyle = `rgba(255,255,255,${0.2 + Math.random() * 0.7})`;
    const sz = Math.random() < 0.15 ? 4 : 2;
    g.fillRect(Math.random() * W, Math.random() * (horizon - 200), sz, sz);
  }
  for (const [nx, ny, r, col] of [
    [200, 520, 420, "rgba(180,77,255,0.22)"],
    [880, 300, 360, "rgba(51,225,255,0.14)"],
  ] as const) {
    const n = g.createRadialGradient(nx, ny, 0, nx, ny, r);
    n.addColorStop(0, col);
    n.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = n;
    g.fillRect(nx - r, ny - r, r * 2, r * 2);
  }

  // Striped synthwave sun
  const sunR = 300;
  g.save();
  g.beginPath();
  g.rect(0, 0, W, horizon);
  g.clip();
  const sun = g.createLinearGradient(0, horizon - sunR, 0, horizon);
  sun.addColorStop(0, "#FFD166");
  sun.addColorStop(0.55, "#FD652F");
  sun.addColorStop(1, "#D33A02");
  g.shadowColor = "#FD652F";
  g.shadowBlur = 80;
  g.fillStyle = sun;
  g.beginPath();
  g.arc(W / 2, horizon, sunR, Math.PI, 0);
  g.fill();
  g.shadowBlur = 0;
  // Stripes painted with the sky itself (cutting holes would leave the image see-through)
  g.fillStyle = sky;
  for (let i = 0; i < 7; i++) g.fillRect(W / 2 - sunR, horizon - sunR * 0.5 + i * 22, sunR * 2, 4 + i * 3);
  g.restore();

  // Neon grid floor
  const floor = g.createLinearGradient(0, horizon, 0, H);
  floor.addColorStop(0, "#1a0533");
  floor.addColorStop(1, "#05010d");
  g.fillStyle = floor;
  g.fillRect(0, horizon, W, H - horizon);
  g.strokeStyle = "#ff3dbb";
  g.lineWidth = 3;
  g.shadowColor = "#ff3dbb";
  g.shadowBlur = 12;
  for (let i = -14; i <= 14; i++) {
    g.globalAlpha = 0.55;
    g.beginPath(); g.moveTo(W / 2 + i * 22, horizon); g.lineTo(W / 2 + i * 160, H); g.stroke();
  }
  for (let i = 1; i < 10; i++) {
    const y = horizon + Math.pow(i / 10, 2) * (H - horizon);
    g.globalAlpha = 0.2 + 0.6 * (i / 10);
    g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
  }
  g.globalAlpha = 1;
  g.shadowBlur = 0;

  // Title
  g.font = `92px ${FONT}`;
  g.textAlign = "center";
  const tg = g.createLinearGradient(0, 160, 0, 250);
  tg.addColorStop(0, "#ffffff");
  tg.addColorStop(0.45, "#9ff3ff");
  tg.addColorStop(0.5, "#2b5fbf");
  tg.addColorStop(0.75, "#ff9be6");
  tg.addColorStop(1, "#ffffff");
  g.fillStyle = "#2a0040";
  g.fillText("ROCKET", W / 2 + 8, 258);
  g.shadowColor = "#ff3dbb";
  g.shadowBlur = 30;
  g.fillStyle = tg;
  g.fillText("ROCKET", W / 2, 250);
  g.shadowBlur = 0;
  const lw = g.measureText("SHPE").width / 4;
  ["S", "H", "P", "E"].forEach((ch, i) => text(ch, W / 2 - lw * 1.5 + i * lw, 370, 92, SHPE[i]));

  // Score
  text(stats.isRecord ? "NEW #1 SCORE" : "I SCORED", W / 2, 520, 44, stats.isRecord ? "#FFD166" : "#ffffff");
  g.save();
  g.shadowColor = "#FFD166";
  g.shadowBlur = 40;
  text(stats.score.toLocaleString(), W / 2, 660, Math.min(120, Math.floor(980 / String(stats.score.toLocaleString()).length)), "#FFD166");
  g.restore();

  // Stats
  const lines: [string, string][] = [];
  lines.push([
    stats.planets > 0 ? `REACHED ${PLANETS[stats.planets - 1]}` : "STILL NEAR EARTH ORBIT",
    "#33e1ff",
  ]);
  lines.push([`PLANETS ${stats.planets}/9`, "#ff9be6"]);
  if (stats.bossDone) lines.push(["MOTHERSHIP DESTROYED", "#7dff9b"]);
  if (stats.wemsUsed > 0) lines.push([`${stats.wemsUsed} WEMS BLAST${stats.wemsUsed > 1 ? "S" : ""}`, "#b39ddb"]);
  lines.forEach(([t, col], i) => text(t, W / 2, 760 + i * 62, 34, col));

  // Rocket with a glow, standing over the sun
  const rw = rocket.width;
  const rh = rocket.height;
  const scale = Math.min(290 / rh, 240 / rw);
  const rx = W / 2 - (rw * scale) / 2;
  const ry = horizon + 70 - rh * scale; // stands on the horizon, below the stats
  g.save();
  g.shadowColor = "#ff3dbb";
  g.shadowBlur = 60;
  g.drawImage(rocket, rx, ry, rw * scale, rh * scale);
  g.restore();

  // Call to action + site
  text("CAN YOU BEAT ME?", W / 2, 1500, 52, "#ffffff");
  if (symbol) g.drawImage(symbol, W / 2 - 330, 1620, 90, 90);
  text("SHPE LAMC", W / 2 + 50, 1665, 40, "#ffffff");
  text("LOS ANGELES MISSION COLLEGE", W / 2 + 50, 1712, 20, "#ff9be6");
  text("shpelamc.netlify.app/games/rocket", W / 2, 1820, 26, "#FFD166");

  return new Promise((resolve) => c.toBlob((b) => resolve(b), "image/png"));
}

/** Opens the phone's share sheet with the image (Instagram, Messages...), or downloads it on computers */
export async function shareScoreImage(blob: Blob, score: number) {
  const file = new File([blob], "rocket-shpe-score.png", { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({
        files: [file],
        title: "Rocket SHPE",
        text: `I scored ${score.toLocaleString()} in Rocket SHPE! Can you beat me? shpelamc.netlify.app/games/rocket`,
      });
      return "shared" as const;
    } catch (e) {
      if ((e as Error).name === "AbortError") return "cancelled" as const;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "rocket-shpe-score.png";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return "downloaded" as const;
}
