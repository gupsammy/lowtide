// Synth voices (from loop-band): a few copies of one wave, a little out of tune with each other, through a resonant low-pass filter.
// Plus FM bells, where one sine wave bends the pitch of another.
import { TAU, rng, SVF } from './dsp.js';
import { mtof } from '../theory.js';

// A saw wave with its sharp jump smoothed (polyBLEP), so high notes don't make buzzy aliasing noise.
function blep(t, dt) {
  if (t < dt) { t /= dt; return t + t - t * t - 1; }
  if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; }
  return 0;
}
const saw = (p, dt) => 2 * p - 1 - blep(p, dt);
// A square wave is a saw minus the same saw half a cycle later.
const WAVES = { saw, square: (p, dt) => saw(p, dt) - saw((p + 0.5) % 1, dt), sine: (p) => Math.sin(TAU * p) };

// wave: saw | square | sine; unison: how many copies, spread over `detune` cents and across the stereo field by
// `width` (0 mono … 1 one copy per side); sine: a pure sine at the same pitch, unfiltered, for weight.
// attack/decay/release in seconds, sustain 0–1. The filter sits at `cutoff` and moves by `env` Hz on each note over
// `envDecay` seconds: closing (a pluck) or, with rise, opening (a swell).
const BASE = { wave: 'saw', unison: 2, sine: 0, rise: false };
export const VOICES = {
  pad: { unison: 3, rise: true, attack: 0.6, decay: 1, sustain: 1, release: 1.2, cutoff: 300, env: 900, envDecay: 1.5, q: 0.7, detune: 14, width: 1, level: 0.28 },
  bass: { unison: 1, sine: 1.6, attack: 0.006, decay: 0.5, sustain: 0.55, release: 0.08, cutoff: 110, env: 420, envDecay: 0.08, q: 0.8, detune: 0, width: 0, level: 0.42 },
  soft: { unison: 1, sine: 1.1, attack: 0.03, decay: 0.6, sustain: 0.6, release: 0.2, cutoff: 700, env: 500, envDecay: 0.2, q: 0.7, detune: 0, width: 0, level: 0.38, vibrato: 0.12 },
  bell: { fm: true, ratio: 4, index: 1.4, ring: 1.1, release: 0.3, level: 0.32 },
};

// One note into stereo buffers L, R.
export function note(L, R, sr, o) {
  const V = { ...BASE, ...VOICES[o.voice] };
  if (V.fm) return bell(L, R, sr, o, V);
  const r = rng(o.seed), f = mtof(o.midi), wave = WAVES[V.wave], n0 = V.unison;
  const i0 = Math.round(o.t * sr), n = Math.round((o.len + V.release) * sr), relAt = o.len;
  // copy k: its detune in cents, its place across the stereo field, its own filter and starting phase
  const cents = Array.from({ length: n0 }, (_, k) => (n0 === 1 ? 0 : (k / (n0 - 1) - 0.5) * V.detune));
  const pan = cents.map((_, k) => (n0 === 1 ? 0 : (2 * k) / (n0 - 1) - 1));
  const gl = pan.map((p) => (p <= 0 ? 1 : 1 - p * V.width)), gr = pan.map((p) => (p >= 0 ? 1 : 1 + p * V.width));
  const filt = cents.map(() => new SVF()), ph = cents.map(() => r()), step = cents.map((c) => Math.pow(2, c / 1200));
  let level = 0, sp = 0;
  for (let i = 0; i < n && i0 + i < L.length; i++) {
    const tt = i / sr;
    if (i % 16 === 0) { // retune the filters every 16 samples: often enough to sound smooth, rare enough to be cheap
      const sweep = V.rise ? 1 - Math.exp(-tt / V.envDecay) : Math.exp(-tt / V.envDecay);
      for (const flt of filt) flt.set(V.cutoff + V.env * sweep + f, V.q, sr);
    }
    // envelope: rise, fall to the sustain level, and fade once the key is let go
    if (tt < relAt) level = tt < V.attack ? tt / V.attack : V.sustain + (1 - V.sustain) * Math.exp(-(tt - V.attack) / V.decay);
    else level *= 1 - (1 - Math.exp(-1 / (V.release * 0.3 * sr)));
    const vib = V.vibrato && tt > 0.25 ? Math.pow(2, (V.vibrato * Math.sin(TAU * 5.5 * tt) * Math.min(1, (tt - 0.25) * 3)) / 12) : 1;
    let l = 0, rr = 0;
    for (let k = 0; k < n0; k++) {
      const dt = (f * step[k] * vib) / sr;
      ph[k] += dt; if (ph[k] >= 1) ph[k] -= 1;
      const v = filt[k].lp(wave(ph[k], dt));
      l += v * gl[k]; rr += v * gr[k];
    }
    if (V.sine) { sp += (f * vib) / sr; if (sp >= 1) sp -= 1; const s = Math.sin(TAU * sp) * V.sine; l += s; rr += s; }
    const g = level * o.vel * V.level;
    L[i0 + i] += g * l;
    R[i0 + i] += g * rr;
  }
}

// FM bell: a sine (the carrier) whose phase is pushed around by a second sine (the modulator) at `ratio` times its
// pitch. The push (`index`) starts strong and fades, so the tone starts bright and clangy and mellows as it rings.
function bell(L, R, sr, o, V) {
  const f = mtof(o.midi), i0 = Math.round(o.t * sr), n = Math.round((o.len + V.ring) * sr);
  let pc = 0, pm = 0;
  for (let i = 0; i < n && i0 + i < L.length; i++) {
    const t = i / sr;
    pc += f / sr; pm += (f * V.ratio) / sr;
    const index = V.index * Math.exp(-t / 0.25) + 0.3;
    const amp = Math.min(1, t / 0.003) * Math.exp(-t / V.ring) * (t > o.len ? Math.exp(-(t - o.len) / V.release) : 1);
    const v = Math.sin(TAU * pc + index * Math.sin(TAU * pm)) * amp * o.vel * V.level;
    L[i0 + i] += v; R[i0 + i] += v;
  }
}

// Electric piano, by FM as in the Rhodes-like DX7 patches: a sine whose phase is pushed by a second sine at the same
// pitch (the warm "body", bright at the strike and mellowing), plus a short high tine at 14× the pitch for the bark.
// A slow tremolo swings the sound between the speakers. patch: { bright 0–1, tremRate Hz, tremDepth 0–1 }.
export function ep(L, R, sr, o, patch) {
  const f = mtof(o.midi), i0 = Math.round(o.t * sr), n = Math.round((o.len + 0.35) * sr);
  const decay = 0.9 + 1.8 * Math.exp(-(o.midi - 48) / 18), cut = 1400 + 3000 * patch.bright, a = Math.exp((-TAU * cut) / sr);
  let pc = 0, pm = 0, pt = 0, lp = 0;
  for (let i = 0; i < n && i0 + i < L.length; i++) {
    const t = i / sr;
    pc += f / sr; pm += f / sr; pt += (14 * f) / sr;
    const index = (0.25 + 1.3 * patch.bright * o.vel) * Math.exp(-t / 0.3) + 0.25;
    const tine = Math.sin(TAU * pt) * 0.22 * patch.bright * Math.exp(-t / 0.025);
    const amp = Math.min(1, t / 0.002) * Math.exp(-t / decay) * (t > o.len ? Math.exp(-(t - o.len) / 0.09) : 1);
    lp = (1 - a) * (Math.sin(TAU * pc + index * Math.sin(TAU * pm)) + tine) + a * lp;
    const trem = Math.sin(TAU * patch.tremRate * (o.t + t)) * patch.tremDepth;
    const v = lp * amp * o.vel * 0.3;
    L[i0 + i] += v * (1 - trem); R[i0 + i] += v * (1 + trem);
  }
}

// Felt piano: a few harmonics, each a touch sharp (real strings are stiff) and each dying faster the higher it is,
// with a soft hammer (slow attack) and a low-pass for the felt laid between hammer and string.
export function felt(L, R, sr, o, patch) {
  const f = mtof(o.midi), i0 = Math.round(o.t * sr), n = Math.round((o.len + 0.5) * sr);
  const body = 1.2 + 2.5 * Math.exp(-(o.midi - 48) / 16), cut = 900 + 1800 * patch.bright, a = Math.exp((-TAU * cut) / sr);
  const H = [1, 2, 3, 4, 5, 6].map((k) => ({ f: f * k * Math.sqrt(1 + 0.0004 * k * k), g: 1 / Math.pow(k, 1.4), d: body / (1 + 0.6 * (k - 1)), p: 0 }));
  const pan = Math.max(-0.5, Math.min(0.5, (o.midi - 62) / 30)), gl = 1 - Math.max(0, pan), gr = 1 + Math.min(0, pan);
  let lp = 0;
  for (let i = 0; i < n && i0 + i < L.length; i++) {
    const t = i / sr;
    let x = 0;
    for (const h of H) { h.p += h.f / sr; x += Math.sin(TAU * h.p) * h.g * Math.exp(-t / h.d); }
    const amp = Math.min(1, t / 0.008) * (t > o.len ? Math.exp(-(t - o.len) / 0.12) : 1);
    lp = (1 - a) * x + a * lp;
    const v = lp * amp * o.vel * 0.26;
    L[i0 + i] += v * gl; R[i0 + i] += v * gr;
  }
}
