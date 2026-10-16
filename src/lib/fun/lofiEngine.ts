/**
 * Original "Tech lo-fi" track, played live with the Web Audio API.
 * Written for SHPE LAMC, so there's nothing to license.
 * Two 8-bar sections (A and B), soft drums, swing, and vinyl crackle.
 */

const BPM = 88;
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

// Chords (MIDI notes). A: Am9  Fmaj7  Dm9  E7sus   B: Cmaj7  G6  Am9  Fmaj7
const CHORDS = [
  [57, 60, 64, 67, 71], [53, 57, 60, 64, 67], [50, 53, 57, 60, 64], [52, 57, 59, 62, 64],
  [57, 60, 64, 67, 71], [53, 57, 60, 64, 67], [50, 53, 57, 60, 64], [52, 56, 59, 62, 64],
  [48, 52, 55, 59, 62], [55, 59, 62, 64, 67], [57, 60, 64, 67, 71], [53, 57, 60, 64, 69],
  [48, 52, 55, 59, 64], [55, 59, 62, 64, 71], [50, 53, 57, 60, 65], [52, 56, 59, 62, 68],
];
const ARP = [0, 2, 4, 3, 1, 3, 2, 4];
// Melody: one note (or null) per 8th note, 8 per bar, 16 bars
const MELODY: (number | null)[] = [
  null, null, 76, null, 79, null, 76, null,   null, 74, null, 72, null, null, null, null,
  null, null, 74, null, 77, null, 74, null,   null, 71, null, 72, null, 68, null, null,
  null, null, 76, null, 79, null, 81, null,   79, null, 76, null, null, 74, null, null,
  null, null, 74, null, 72, null, 71, null,   null, null, 69, null, null, null, null, null,
  null, 79, null, 76, null, 72, null, 74,     null, null, 76, null, null, null, null, null,
  null, 74, null, 71, null, 67, null, 71,     null, null, 74, null, 72, null, null, null,
  null, 76, null, 79, null, 81, null, 84,     null, 83, null, 81, null, null, 79, null,
  null, 77, null, 76, null, 74, null, 72,     null, null, 71, null, null, null, null, null,
];

export type LofiPlayer = {
  start: () => void;
  stop: () => void;
  setVolume: (v: number) => void;
  isPlaying: () => boolean;
};

export function createLofiPlayer(): LofiPlayer {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let lowpass: BiquadFilterNode | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;
  let step = 0;
  let nextTime = 0;
  let volume = 0.5;

  const eighth = 60 / BPM / 2;

  function tone(freq: number, t: number, dur: number, type: OscillatorType, vol: number, detune = 0) {
    if (!ctx || !lowpass) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    o.detune.value = detune;
    o.connect(g);
    g.connect(lowpass);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  function noise(t: number, dur: number, vol: number, filterType: BiquadFilterType, freq: number) {
    if (!ctx || !master) return;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    f.type = filterType;
    f.frequency.value = freq;
    g.gain.value = vol;
    src.buffer = buf;
    src.connect(f);
    f.connect(g);
    g.connect(master);
    src.start(t);
  }

  function kick(t: number) {
    if (!ctx || !master) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + 0.32);
  }

  function schedule() {
    if (!ctx) return;
    while (nextTime < ctx.currentTime + 0.2) {
      const i = step % 8;
      const bar = Math.floor(step / 8) % 16;
      const chord = CHORDS[bar];
      // Lazy swing on the off-beats
      const t = nextTime + (i % 2 === 1 ? eighth * 0.12 : 0);

      // Electric-piano style chord on beat 1 and the "and" of 2
      if (i === 0 || i === 3) {
        chord.slice(0, 4).forEach((n, k) => tone(midi(n), t + k * 0.012, eighth * 3.2, "triangle", 0.045));
      }
      // Soft synth arpeggio
      tone(midi(chord[ARP[i] % chord.length] + 12), t, eighth * 0.9, "sawtooth", 0.018, 6);
      // Bass
      if (i === 0 || i === 5) tone(midi(chord[0] - 12), t, eighth * 2.4, "sine", 0.2);
      // Melody
      const m = MELODY[(bar * 8 + i) % MELODY.length];
      if (m) tone(midi(m), t, eighth * 2.2, "triangle", 0.07);
      // Drums
      if (i === 0 || (i === 5 && bar % 2 === 1)) kick(t);
      if (i === 2 || i === 6) noise(t, 0.12, 0.06, "bandpass", 1800);
      noise(t, 0.025, i % 2 ? 0.018 : 0.03, "highpass", 8000);
      // Vinyl crackle
      if (Math.random() < 0.35) noise(t + Math.random() * eighth, 0.004, 0.025, "highpass", 3000);

      nextTime += eighth;
      step++;
    }
  }

  return {
    start() {
      if (timer) return;
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!ctx) ctx = new AC();
      void ctx.resume();
      master = ctx.createGain();
      master.gain.value = volume * 0.8;
      master.connect(ctx.destination);
      lowpass = ctx.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.value = 2400;
      lowpass.connect(master);
      step = 0;
      nextTime = ctx.currentTime + 0.08;
      timer = setInterval(schedule, 25);
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
      master?.disconnect();
      master = null;
      lowpass = null;
    },
    setVolume(v: number) {
      volume = v;
      if (master) master.gain.value = v * 0.8;
    },
    isPlaying: () => timer !== null,
  };
}
