/**
 * Phones are strict about sound:
 *  - The audio has to be "unlocked" during a real tap/click, not a moment later.
 *  - iPhones mute web audio when the ringer switch is on silent, unless the page
 *    says it's playing media (like a video does).
 * Call unlockAudio(ctx) inside a tap/click handler before playing anything.
 */

let keepAlive: HTMLAudioElement | null = null;

/** A tiny silent WAV, made in code (nothing to download) */
function silentWavUrl() {
  const rate = 8000;
  const samples = rate; // 1 second of silence
  const buf = new ArrayBuffer(44 + samples);
  const v = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF");
  v.setUint32(4, 36 + samples, true);
  str(8, "WAVE");
  str(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, rate, true);
  v.setUint32(28, rate, true);
  v.setUint16(32, 1, true);
  v.setUint16(34, 8, true); // 8-bit
  str(36, "data");
  v.setUint32(40, samples, true);
  for (let i = 0; i < samples; i++) v.setUint8(44 + i, 128); // 128 = silence in 8-bit audio
  return URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
}

export function unlockAudio(ctx: AudioContext | null) {
  if (typeof window === "undefined") return;

  // Newer iPhones (iOS 17+): treat this page as media so the silent switch doesn't mute it
  try {
    const nav = navigator as Navigator & { audioSession?: { type: string } };
    if (nav.audioSession && nav.audioSession.type !== "playback") nav.audioSession.type = "playback";
  } catch {}

  // Older iPhones: a looping silent <audio> element does the same job
  try {
    if (!keepAlive) {
      keepAlive = new Audio(silentWavUrl());
      keepAlive.loop = true;
      keepAlive.setAttribute("playsinline", "");
      keepAlive.volume = 0;
    }
    if (keepAlive.paused) void keepAlive.play().catch(() => {});
  } catch {}

  if (!ctx) return;
  // Resume the audio engine and play one silent sample, inside the tap
  if (ctx.state !== "running") void ctx.resume().catch(() => {});
  try {
    const b = ctx.createBuffer(1, 1, 22050);
    const s = ctx.createBufferSource();
    s.buffer = b;
    s.connect(ctx.destination);
    s.start(0);
  } catch {}
}
