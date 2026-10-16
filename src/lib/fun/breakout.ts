/**
 * Discipline Breakout: a small canvas game hidden in the footer.
 * Each column of bricks is an engineering discipline.
 * Plain TypeScript (no React) so it's easy to test and change.
 */

export const DISCIPLINES = [
  "Civil", "Mechanical", "Electrical", "Computer", "Chemical",
  "Aerospace", "Biomedical", "Environmental", "Industrial",
];
const SHORT = ["CIV", "MECH", "ELEC", "COMP", "CHEM", "AERO", "BIO", "ENV", "IND"];
const COLORS = ["#D33A02", "#FD652F", "#72A9BE", "#0070C0"];

export const W = 480;
export const H = 360;
const ROWS = 4;
const COLS = 9;
const BRICK_TOP = 44;
const BRICK_H = 18;
const GAP = 3;
const PADDLE_W = 76;
const PADDLE_H = 10;
const BALL_R = 6;

export type GameEvents = {
  onScore: (score: number) => void;
  onLives: (lives: number) => void;
  onMessage: (msg: string) => void;
  onStatus: (status: "ready" | "playing" | "paused" | "won" | "lost") => void;
};

export function startBreakout(canvas: HTMLCanvasElement, ev: GameEvents) {
  const ctx = canvas.getContext("2d")!;
  const brickW = (W - GAP * (COLS + 1)) / COLS;

  let bricks: boolean[][] = [];
  let paddleX = W / 2 - PADDLE_W / 2;
  let ball = { x: W / 2, y: H - 40, vx: 0, vy: 0 };
  let score = 0;
  let lives = 3;
  let status: "ready" | "playing" | "paused" | "won" | "lost" = "ready";
  let left = false;
  let right = false;
  let speed = 4.2;
  let raf = 0;
  let flash = { text: "", until: 0 };

  function reset(full: boolean) {
    if (full) {
      bricks = Array.from({ length: ROWS }, () => Array(COLS).fill(true));
      score = 0;
      lives = 3;
      speed = 4.2;
      ev.onScore(score);
      ev.onLives(lives);
    }
    paddleX = W / 2 - PADDLE_W / 2;
    ball = { x: W / 2, y: H - 30 - BALL_R, vx: 0, vy: 0 };
    setStatus("ready");
  }

  function setStatus(s: typeof status) {
    status = s;
    ev.onStatus(s);
  }

  function launch() {
    if (status === "won" || status === "lost") {
      reset(true);
      return;
    }
    if (status === "ready") {
      const angle = (-Math.PI / 2) + (Math.random() * 0.8 - 0.4);
      ball.vx = Math.cos(angle) * speed;
      ball.vy = Math.sin(angle) * speed;
      setStatus("playing");
    } else if (status === "playing") {
      setStatus("paused");
    } else if (status === "paused") {
      setStatus("playing");
    }
  }

  function columnCleared(c: number) {
    return bricks.every((row) => !row[c]);
  }

  function update() {
    if (left) paddleX -= 7;
    if (right) paddleX += 7;
    paddleX = Math.max(0, Math.min(W - PADDLE_W, paddleX));

    if (status === "ready") {
      ball.x = paddleX + PADDLE_W / 2;
      return;
    }
    if (status !== "playing") return;

    ball.x += ball.vx;
    ball.y += ball.vy;

    // Walls
    if (ball.x < BALL_R) { ball.x = BALL_R; ball.vx = Math.abs(ball.vx); }
    if (ball.x > W - BALL_R) { ball.x = W - BALL_R; ball.vx = -Math.abs(ball.vx); }
    if (ball.y < BALL_R) { ball.y = BALL_R; ball.vy = Math.abs(ball.vy); }

    // Paddle: where it hits changes the bounce angle
    const py = H - 24;
    if (ball.vy > 0 && ball.y + BALL_R >= py && ball.y + BALL_R <= py + PADDLE_H + 6 &&
        ball.x >= paddleX - BALL_R && ball.x <= paddleX + PADDLE_W + BALL_R) {
      const hit = (ball.x - (paddleX + PADDLE_W / 2)) / (PADDLE_W / 2);
      const angle = -Math.PI / 2 + hit * 1.05;
      ball.vx = Math.cos(angle) * speed;
      ball.vy = Math.sin(angle) * speed;
      ball.y = py - BALL_R;
    }

    // Bricks
    outer: for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!bricks[r][c]) continue;
        const bx = GAP + c * (brickW + GAP);
        const by = BRICK_TOP + r * (BRICK_H + GAP);
        if (ball.x + BALL_R > bx && ball.x - BALL_R < bx + brickW &&
            ball.y + BALL_R > by && ball.y - BALL_R < by + BRICK_H) {
          bricks[r][c] = false;
          const overlapX = Math.min(ball.x + BALL_R - bx, bx + brickW - (ball.x - BALL_R));
          const overlapY = Math.min(ball.y + BALL_R - by, by + BRICK_H - (ball.y - BALL_R));
          if (overlapX < overlapY) ball.vx = -ball.vx; else ball.vy = -ball.vy;
          score += 10 * (ROWS - r);
          ev.onScore(score);
          // Speed up a little with every brick
          speed = Math.min(7.5, speed + 0.06);
          const mag = Math.hypot(ball.vx, ball.vy);
          ball.vx = (ball.vx / mag) * speed;
          ball.vy = (ball.vy / mag) * speed;
          if (columnCleared(c)) {
            score += 100;
            ev.onScore(score);
            flash = { text: `${DISCIPLINES[c]} cleared! +100`, until: performance.now() + 1500 };
            ev.onMessage(`${DISCIPLINES[c]} engineering cleared, 100 bonus points`);
          }
          break outer;
        }
      }
    }

    if (bricks.every((row) => row.every((b) => !b))) {
      setStatus("won");
      ev.onMessage("You cleared every discipline. You win!");
      return;
    }

    // Missed the ball
    if (ball.y > H + BALL_R) {
      lives -= 1;
      ev.onLives(lives);
      if (lives <= 0) {
        setStatus("lost");
        ev.onMessage(`Game over. Final score ${score}.`);
      } else {
        ev.onMessage(`Ball lost. ${lives} ${lives === 1 ? "life" : "lives"} left.`);
        ball = { x: paddleX + PADDLE_W / 2, y: H - 30 - BALL_R, vx: 0, vy: 0 };
        setStatus("ready");
      }
    }
  }

  function draw() {
    // Blueprint background
    ctx.fillStyle = "#001F5B";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 16) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); ctx.stroke(); }
    for (let y = 0; y <= H; y += 16) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); ctx.stroke(); }

    // Discipline labels above each column
    ctx.font = "bold 10px system-ui, sans-serif";
    ctx.textAlign = "center";
    for (let c = 0; c < COLS; c++) {
      const cx = GAP + c * (brickW + GAP) + brickW / 2;
      ctx.fillStyle = columnCleared(c) ? "#FFD166" : "rgba(255,255,255,0.75)";
      ctx.fillText(columnCleared(c) ? "✓" : SHORT[c], cx, BRICK_TOP - 10);
    }

    // Bricks
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!bricks[r][c]) continue;
        const bx = GAP + c * (brickW + GAP);
        const by = BRICK_TOP + r * (BRICK_H + GAP);
        ctx.fillStyle = COLORS[(r + c) % COLORS.length];
        ctx.fillRect(bx, by, brickW, BRICK_H);
        ctx.fillStyle = "rgba(255,255,255,0.18)";
        ctx.fillRect(bx, by, brickW, 3);
      }
    }

    // Paddle
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.roundRect(paddleX, H - 24, PADDLE_W, PADDLE_H, 5);
    ctx.fill();

    // Ball
    ctx.fillStyle = "#FFD166";
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
    ctx.fill();

    // Flash message
    if (flash.text && performance.now() < flash.until) {
      ctx.fillStyle = "#FFD166";
      ctx.font = "bold 16px system-ui, sans-serif";
      ctx.fillText(flash.text, W / 2, H / 2 + 30);
    }

    // Overlays
    if (status !== "playing") {
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(0, H / 2 - 34, W, 60);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 18px system-ui, sans-serif";
      const line =
        status === "ready" ? "Press Space or tap to launch" :
        status === "paused" ? "Paused. Space or tap to resume" :
        status === "won" ? "You graduated! Space or tap to replay" :
        "Game over. Space or tap to try again";
      ctx.fillText(line, W / 2, H / 2 + 2);
    }
  }

  function loop() {
    update();
    draw();
    raf = requestAnimationFrame(loop);
  }

  reset(true);
  raf = requestAnimationFrame(loop);

  return {
    launch,
    pause() {
      if (status === "playing") setStatus("paused");
    },
    /** x in game units (0 to W) */
    movePaddleTo(x: number) {
      paddleX = Math.max(0, Math.min(W - PADDLE_W, x - PADDLE_W / 2));
    },
    setLeft(v: boolean) { left = v; },
    setRight(v: boolean) { right = v; },
    destroy() { cancelAnimationFrame(raf); },
  };
}
