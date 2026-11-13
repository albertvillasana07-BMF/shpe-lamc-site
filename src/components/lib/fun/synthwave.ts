/**
 * Original synthwave soundtrack + arcade sound effects for Rocket SHPE,
 * played live with the Web Audio API (nothing to license).
 * 112 BPM: driving 16th-note bass, four-on-the-floor drums, gated pads,
 * and a lead melody with echo. Two 8-bar sections.
 */

import { unlockAudio } from "@/lib/fun/mobileAudio";

const BPM = 112;
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

// Am  F  C  G | Am F  G  E
const ROOTS = [45, 41, 48, 43, 45, 41, 43, 40, 45, 41, 48, 43, 50, 48, 43, 40];
const PADS = [
  [57, 60, 64], [53, 57, 60], [55, 60, 64], [55, 59, 62],
  [57, 60, 64], [53, 57, 60], [55, 59, 62], [56, 59, 64],
  [57, 60, 64], [53, 57, 60], [55, 60, 64], [55, 59, 62],
  [57, 62, 65], [55, 60, 64], [55, 59, 62], [56, 59, 64],
];
// Lead: one note per 8th (16 per 2 bars). null = rest
const LEAD: (number | null)[] = [
  76, null, 76, 79, null, 81, 79, null,  77, null, 76, 74, null, 72, null, null,
  72, null, 72, 74, null, 76, 79, null,  74, null, null, 71, null, 74, null, null,
  76, null, 76, 79, null, 81, 84, null,  83, null, 81, 79, null, 77, null, null,
  76, null, 74, 72, null, 71, 72, null,  68, null, null, 71, null, null, null, null,
  81, null, 84, null, 81, 79, null, 76,  77, null, 81, null, 77, 76, null, 72,
  79, null, 84, null, 83, 79, null, 76,  74, null, 79, null, 76, 74, null, 71,
  81, null, 84, null, 86, 84, null, 81,  84, null, 79, null, 76, 79, null, 81,
  83, null, 79, null, 76, 74, null, 71,  76, null, null, null, null, null, null, null,
];

/**
 * Boss track (alien mothership): 150 BPM, D minor with a flat 2nd for menace.
 * Builds with the fight: level 1 = bass + drums + stabs, 2 = + arpeggio lead,
 * 3 = + siren, fast hats, crashes.
 */
const BOSS_BPM = 150;
// Dm  Dm  Eb  C  |  Dm  Bb  A   A
const BOSS_ROOTS = [38, 38, 39, 36, 38, 34, 33, 33];
const BOSS_CHORDS = [
  [62, 65, 69], [62, 65, 69], [63, 67, 70], [60, 64, 67],
  [62, 65, 69], [58, 62, 65], [57, 61, 64], [57, 61, 64],
];

export type Sfx = "coin" | "shield" | "crash" | "zone" | "launch" | "laser" | "pop" | "powerup" | "alarm" | "missile" | "enemy" | "boom";

/**
 * A short original fanfare for each planet landing (Mercury → Pluto).
 * root = MIDI note, notes = semitones above root (null = rest), chord = final held chord.
 */
const LANDINGS: { root: number; wave: OscillatorType; step: number; notes: (number | null)[]; chord: number[]; boom?: boolean }[] = [
  { root: 72, wave: "square", step: 0.09, notes: [0, 4, 7, 12, 7, 12, 16, 19], chord: [0, 4, 7, 12] }, // Mercury: quick and bright
  { root: 65, wave: "triangle", step: 0.16, notes: [0, 4, 7, 11, null, 7, 11, 14], chord: [0, 4, 7, 11] }, // Venus: dreamy
  { root: 67, wave: "square", step: 0.13, notes: [0, 0, 4, 7, null, 4, 7, 12], chord: [0, 4, 7, 12], boom: true }, // Earth: triumphant
  { root: 62, wave: "sawtooth", step: 0.14, notes: [0, null, 0, 3, 7, null, 5, 3, 7], chord: [0, 3, 7, 10], boom: true }, // Mars: march
  { root: 55, wave: "sawtooth", step: 0.18, notes: [0, 7, 12, null, 10, 12, 16, 19], chord: [0, 4, 7, 12, 16], boom: true }, // Jupiter: big brass
  { root: 70, wave: "triangle", step: 0.1, notes: [0, 7, 12, 16, 12, 7, 12, 19, 24], chord: [0, 7, 12, 16] }, // Saturn: shimmering rings
  { root: 76, wave: "sine", step: 0.12, notes: [0, 4, 6, 11, 6, 4, 6, 11, 16], chord: [0, 6, 11] }, // Uranus: glassy
  { root: 58, wave: "triangle", step: 0.2, notes: [0, 3, 7, null, 8, 7, 3, 10], chord: [0, 3, 7, 10], boom: true }, // Neptune: deep sea
  { root: 84, wave: "sine", step: 0.14, notes: [0, 2, 4, 7, 9, 7, 4, 12], chord: [0, 4, 7] }, // Pluto: tiny music box
];

export function createSynthwave() {
  let ctx: AudioContext | null = null;
  let musicBus: GainNode | null = null;
  let sfxBus: GainNode | null = null;
  let delay: DelayNode | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;
  let step = 0;
  let nextTime = 0;
  let muted = false;
  const sixteenth = 60 / BPM / 4;
  const bossSixteenth = 60 / BOSS_BPM / 4;
  let bossLevel = 0; // 0 = normal soundtrack, 1–3 = boss track intensity

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
    const master = ctx.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(ctx.destination);
    musicBus = ctx.createGain();
    musicBus.gain.value = 0.55;
    musicBus.connect(master);
    sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.7;
    sfxBus.connect(master);
    // Echo for the lead
    delay = ctx.createDelay(1);
    delay.delayTime.value = sixteenth * 3;
    const fb = ctx.createGain();
    fb.gain.value = 0.32;
    const wet = ctx.createGain();
    wet.gain.value = 0.35;
    delay.connect(fb);
    fb.connect(delay);
    delay.connect(wet);
    wet.connect(musicBus);
    (ctx as AudioContext & { _master?: GainNode })._master = master;
    return ctx;
  }

  function osc(dest: AudioNode, type: OscillatorType, freq: number, t: number, dur: number, vol: number, opts: { cutoff?: number; detune?: number; glideTo?: number } = {}) {
    const c = ctx!;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (opts.glideTo) o.frequency.exponentialRampToValueAtTime(opts.glideTo, t + dur);
    if (opts.detune) o.detune.value = opts.detune;
    let node: AudioNode = o;
    if (opts.cutoff) {
      const f = c.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = opts.cutoff;
      o.connect(f);
      node = f;
    }
    node.connect(g);
    g.connect(dest);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t);
    o.stop(t + dur + 0.05);
    return g;
  }

  function noise(dest: AudioNode, t: number, dur: number, vol: number, type: BiquadFilterType, freq: number) {
    const c = ctx!;
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = c.createBufferSource();
    const f = c.createBiquadFilter();
    const g = c.createGain();
    f.type = type;
    f.frequency.value = freq;
    g.gain.value = vol;
    s.buffer = buf;
    s.connect(f);
    f.connect(g);
    g.connect(dest);
    s.start(t);
  }

  function kick(t: number) {
    const c = ctx!;
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    o.connect(g);
    g.connect(musicBus!);
    o.start(t);
    o.stop(t + 0.3);
  }

  function bossStep(t: number) {
    const s16 = step % 16;
    const bar = Math.floor(step / 16) % 8;
    const bus = musicBus!;
    const root = BOSS_ROOTS[bar];

    // Galloping bass: root, root, octave, root
    const gallop = [0, 0, 12, 0][s16 % 4];
    osc(bus, "sawtooth", midi(root + gallop), t, bossSixteenth * 0.85, 0.13, { cutoff: 1300 });
    osc(bus, "square", midi(root - 12), t, bossSixteenth * 0.8, 0.05, { cutoff: 400 });

    // Drums: double kick, big snare on 2 and 4
    if (s16 % 4 === 0 || s16 === 3 || s16 === 11 || (bossLevel >= 3 && s16 === 7)) kick(t);
    if (s16 === 4 || s16 === 12) {
      noise(bus, t, 0.22, 0.42, "bandpass", 1800);
      noise(bus, t, 0.12, 0.2, "highpass", 5000);
    }
    if (bossLevel >= 3 ? true : s16 % 2 === 0) noise(bus, t, 0.03, bossLevel >= 3 ? 0.1 : 0.12, "highpass", 9000);
    if (bossLevel >= 3 && s16 === 0) noise(bus, t, 1.2, 0.18, "highpass", 4000); // crash every bar

    // Dark chord stabs on the off-beats
    if (s16 === 2 || s16 === 6 || s16 === 10 || s16 === 14) {
      BOSS_CHORDS[bar].forEach((n) => osc(bus, "square", midi(n), t, bossSixteenth * 1.2, 0.03, { cutoff: 2600, detune: 10 }));
    }

    // Level 2+: fast menacing arpeggio lead with echo
    if (bossLevel >= 2) {
      const ch = BOSS_CHORDS[bar];
      const arp = [ch[0], ch[1], ch[2], ch[1] + 12, ch[2], ch[1], ch[0] + 12, ch[2]];
      const g = osc(bus, "sawtooth", midi(arp[s16 % 8] + 12), t, bossSixteenth * 0.9, 0.035, { cutoff: 3800 });
      g.connect(delay!);
    }

    // Level 3: siren sweep every 2 bars
    if (bossLevel >= 3 && s16 === 0 && bar % 2 === 0) {
      osc(bus, "sawtooth", midi(74), t, bossSixteenth * 8, 0.035, { glideTo: midi(86), cutoff: 3000 });
      osc(bus, "sawtooth", midi(86), t + bossSixteenth * 8, bossSixteenth * 8, 0.035, { glideTo: midi(74), cutoff: 3000 });
    }
  }

  function schedule() {
    const c = ctx!;
    while (nextTime < c.currentTime + 0.15) {
      if (bossLevel > 0) {
        bossStep(nextTime);
        nextTime += bossSixteenth;
        step++;
        continue;
      }
      const t = nextTime;
      const s16 = step % 16;
      const bar = Math.floor(step / 16) % 16;
      const bus = musicBus!;

      // Driving octave bass on every 16th
      const root = ROOTS[bar];
      osc(bus, "sawtooth", midi(root + (s16 % 2 ? 12 : 0)), t, sixteenth * 0.9, 0.11, { cutoff: 900 });

      // Drums: four on the floor, snare on 2 and 4, hats on off-beats
      if (s16 % 4 === 0) kick(t);
      if (s16 === 4 || s16 === 12) noise(bus, t, 0.18, 0.3, "bandpass", 1500);
      if (s16 % 4 === 2) noise(bus, t, 0.04, 0.12, "highpass", 8000);

      // Gated pad chord on 8ths
      if (s16 % 2 === 0) {
        PADS[bar].forEach((n) => osc(bus, "sawtooth", midi(n), t, sixteenth * 1.6, 0.025, { cutoff: 2200, detune: 8 }));
      }

      // Lead on 8ths with echo
      if (s16 % 2 === 0) {
        const note = LEAD[(bar >= 8 ? 64 : 0) + ((bar % 8) % 8) * 8 + s16 / 2];
        if (note) {
          const g = osc(bus, "square", midi(note), t, sixteenth * 2.6, 0.06, { cutoff: 3200 });
          g.connect(delay!);
        }
      }

      nextTime += sixteenth;
      step++;
    }
  }

  return {
    /** Call inside a tap/click so phones allow sound */
    unlock() {
      unlockAudio(ensure());
    },
    start() {
      const c = ensure();
      void c.resume();
      if (timer) return;
      step = 0;
      nextTime = c.currentTime + 0.05;
      timer = setInterval(schedule, 25);
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
    },
    /** 0 = normal soundtrack, 1–3 = boss track, getting more intense */
    setBoss(level: number) {
      const was = bossLevel;
      bossLevel = Math.max(0, Math.min(3, level));
      // Switching tracks: restart on the downbeat so it lands cleanly
      if ((was === 0) !== (bossLevel === 0) && ctx) {
        step = 0;
        nextTime = Math.max(nextTime, ctx.currentTime + 0.05);
      }
    },
    setMuted(m: boolean) {
      muted = m;
      const master = (ctx as (AudioContext & { _master?: GainNode }) | null)?._master;
      if (master) master.gain.value = m ? 0 : 1;
    },
    sfx(kind: Sfx) {
      if (muted) return;
      const c = ensure();
      const t = c.currentTime + 0.01;
      const bus = sfxBus!;
      if (kind === "coin") {
        osc(bus, "square", 988, t, 0.07, 0.18);
        osc(bus, "square", 1319, t + 0.07, 0.16, 0.18);
      } else if (kind === "shield") {
        osc(bus, "triangle", 300, t, 0.35, 0.25, { glideTo: 1200 });
        osc(bus, "square", 600, t, 0.35, 0.06, { glideTo: 2400 });
      } else if (kind === "crash") {
        noise(bus, t, 0.6, 0.6, "lowpass", 1200);
        osc(bus, "sawtooth", 220, t, 0.7, 0.25, { glideTo: 40 });
      } else if (kind === "zone") {
        [0, 4, 7, 12].forEach((s, i) => osc(bus, "square", midi(72 + s), t + i * 0.08, 0.12, 0.12));
      } else if (kind === "alarm") {
        osc(bus, "square", 880, t, 0.22, 0.12);
        osc(bus, "square", 660, t + 0.24, 0.22, 0.12);
      } else if (kind === "missile") {
        noise(bus, t, 0.5, 0.25, "bandpass", 1200);
        osc(bus, "sawtooth", 180, t, 0.4, 0.1, { glideTo: 600 });
      } else if (kind === "enemy") {
        osc(bus, "sine", 520, t, 0.18, 0.08, { glideTo: 180 });
      } else if (kind === "boom") {
        noise(bus, t, 0.8, 0.5, "lowpass", 600);
        osc(bus, "sine", 110, t, 0.6, 0.35, { glideTo: 35 });
      } else if (kind === "laser") {
        osc(bus, "square", 1400, t, 0.09, 0.05, { glideTo: 350 });
      } else if (kind === "pop") {
        noise(bus, t, 0.18, 0.3, "bandpass", 900);
        osc(bus, "triangle", 260, t, 0.15, 0.12, { glideTo: 80 });
      } else if (kind === "powerup") {
        [0, 4, 7, 12, 16, 19, 24].forEach((st, i) => osc(bus, "square", midi(64 + st), t + i * 0.045, 0.1, 0.1));
      } else if (kind === "launch") {
        noise(bus, t, 0.5, 0.25, "bandpass", 600);
        osc(bus, "sawtooth", 110, t, 0.5, 0.15, { glideTo: 440 });
      }
    },
    /**
     * Checkpoint music: a short tune every 1,000 points. Each one is different —
     * the key climbs as you go and the melody/sound cycles through 6 styles.
     */
    jingle(kind: "checkpoint" | "wow" | "top5", n: number) {
      if (muted) return;
      const c = ensure();
      void c.resume();
      const t0 = c.currentTime + 0.02;
      const bus = sfxBus!;
      const play = (notes: number[], root: number, wave: OscillatorType, step: number, vol = 0.11) =>
        notes.forEach((st, k) => osc(bus, wave, midi(root + st), t0 + k * step, step * 1.8, vol, { cutoff: 4500 }));
      if (kind === "wow") {
        // Big "wow": rising run + held chord + cymbal
        play([0, 4, 7, 11, 12, 16, 19, 24], 64, "square", 0.07);
        [0, 4, 7, 11].forEach((st) => osc(bus, "sawtooth", midi(76 + st), t0 + 0.56, 1.1, 0.06, { cutoff: 3000, detune: 7 }));
        noise(bus, t0 + 0.56, 0.9, 0.12, "highpass", 6000);
        return;
      }
      if (kind === "top5") {
        // Suspense then resolve: "you're close"
        play([0, 3, 7, 10, 12, 15], 62, "triangle", 0.11, 0.13);
        [0, 4, 7, 12].forEach((st) => osc(bus, "square", midi(74 + st), t0 + 0.7, 0.9, 0.05));
        return;
      }
      const PATTERNS: { notes: number[]; wave: OscillatorType; step: number }[] = [
        { notes: [0, 4, 7, 12], wave: "square", step: 0.08 },
        { notes: [0, 7, 4, 12, 7], wave: "triangle", step: 0.09 },
        { notes: [12, 7, 4, 7, 12], wave: "square", step: 0.07 },
        { notes: [0, 2, 4, 7, 9, 12], wave: "triangle", step: 0.06 },
        { notes: [0, 5, 7, 12, 14], wave: "sawtooth", step: 0.08 },
        { notes: [0, 4, 7, 11, 14], wave: "sine", step: 0.1 },
      ];
      const pat = PATTERNS[(Math.max(1, n) - 1) % PATTERNS.length];
      const root = 60 + ((Math.max(1, n) - 1) % 12); // key climbs a half step each checkpoint
      play(pat.notes, root, pat.wave, pat.step);
      // Little bass hit under it
      osc(bus, "triangle", midi(root - 12), t0, 0.25, 0.12);
    },
    /** Planet landing jingle (0 = Mercury ... 8 = Pluto) */
    landing(i: number) {
      if (muted) return;
      const L = LANDINGS[Math.max(0, Math.min(LANDINGS.length - 1, i))];
      const c = ensure();
      void c.resume();
      const t0 = c.currentTime + 0.02;
      const bus = sfxBus!;
      L.notes.forEach((n, k) => {
        if (n === null) return;
        const t = t0 + k * L.step;
        osc(bus, L.wave, midi(L.root + n), t, L.step * 1.6, 0.14, { cutoff: 4000 });
        osc(bus, L.wave, midi(L.root + n - 12), t, L.step * 1.4, 0.05, { cutoff: 2000 });
      });
      const end = t0 + L.notes.length * L.step;
      L.chord.forEach((n) => osc(bus, L.wave, midi(L.root + n), end, 1.4, 0.07, { cutoff: 3000, detune: 6 }));
      if (L.boom) {
        // Low drum hit under the final chord
        const o = c.createOscillator();
        const g = c.createGain();
        o.frequency.setValueAtTime(140, end);
        o.frequency.exponentialRampToValueAtTime(40, end + 0.3);
        g.gain.setValueAtTime(0.7, end);
        g.gain.exponentialRampToValueAtTime(0.0001, end + 0.5);
        o.connect(g);
        g.connect(bus);
        o.start(end);
        o.stop(end + 0.55);
      }
      noise(bus, end, 0.9, 0.12, "highpass", 6000); // cymbal shimmer
    },
    destroy() {
      if (timer) clearInterval(timer);
      timer = null;
      void ctx?.close();
      ctx = null;
    },
  };
}
