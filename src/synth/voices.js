// Synth voices (partly from loop-band): a few copies of one wave, a little out of tune with each other, through a
// resonant low-pass filter; FM bells and an FM electric piano, where one sine wave bends the pitch of another; a felt
// piano from a few stiff-string harmonics; and two basses, one round and one a plucked string.
import { TAU, rng, clamp, SVF } from './dsp.js';
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
  soft: { unison: 1, sine: 1.1, attack: 0.03, decay: 0.6, sustain: 0.6, release: 0.2, cutoff: 700, env: 500, envDecay: 0.2, q: 0.7, detune: 0, width: 0, level: 0.26, vibrato: 0.12 },
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

// The keys' sines and fades are stepped on from one sample to the next rather than worked out afresh, which is
// several times faster: a sine at a fixed pitch is a point (cos, sin) turned round a circle by the same small angle
// every sample, a fade is multiplied by the same factor. Rounding in those steps would build up over a long note, so
// every SYNC samples each is reset from its exact formula, and the sound stays the same to within rounding.
const SYNC = 4096;
class Phasor {
  constructor(w) { this.cw = Math.cos(w); this.sw = Math.sin(w); this.c = 1; this.s = 0; }
  set(ph) { this.c = Math.cos(ph); this.s = Math.sin(ph); }
  step() { const c = this.c; this.c = c * this.cw - this.s * this.sw; this.s = this.s * this.cw + c * this.sw; }
}

// Electric piano, by FM as in the Rhodes-like DX7 patches: a sine whose phase is pushed by a second sine at the same
// pitch (the warm "body", bright at the strike and mellowing), plus a short high tine at 14× the pitch. Hit hard, it
// barks: the tone saturates. Each note sits a few cents off true (o.detune), as the tines of a real one do. A slow
// tremolo swings the sound between the speakers. patch: { bright 0–1, tremRate Hz, tremDepth 0–1 }.
export function ep(L, R, sr, o, patch) {
  const f = mtof(o.midi) * Math.pow(2, (o.detune ?? 0) / 1200), i0 = Math.round(o.t * sr), n = Math.round((o.len + 0.35) * sr);
  const bark = 1 + 1.6 * o.vel * o.vel * patch.bright;
  const decay = 0.9 + 1.8 * Math.exp(-(o.midi - 48) / 18), cut = 1400 + 3000 * patch.bright, a = Math.exp((-TAU * cut) / sr);
  // the pushing sine starts with the carrier and keeps its pitch, so the two share one phase (pc)
  const mod = new Phasor(TAU * (f / sr)), tn = new Phasor(TAU * ((14 * f) / sr)), sway = new Phasor((TAU * patch.tremRate) / sr);
  const kIdx = Math.exp(-1 / (0.3 * sr)), kTine = Math.exp(-1 / (0.025 * sr)), kAmp = Math.exp(-1 / (decay * sr)), kRel = Math.exp(-1 / (0.09 * sr));
  let pc = 0, pt = 0, lp = 0, eIdx = 0, eTine = 0, eAmp = 0, rel = 0;
  for (let i = 0; i < n && i0 + i < L.length; i++) {
    const t = i / sr, sync = i % SYNC === 0;
    pc += f / sr; pt += (14 * f) / sr;
    if (sync) {
      mod.set(TAU * pc); tn.set(TAU * pt); sway.set(TAU * patch.tremRate * (o.t + t));
      eIdx = Math.exp(-t / 0.3); eTine = Math.exp(-t / 0.025); eAmp = Math.exp(-t / decay);
    } else { mod.step(); tn.step(); sway.step(); eIdx *= kIdx; eTine *= kTine; eAmp *= kAmp; }
    // once the key is let go, the fade starts from its exact value (rel is still 0), then steps on
    if (t > o.len) rel = rel && !sync ? rel * kRel : Math.exp(-(t - o.len) / 0.09);
    const index = (0.25 + 1.3 * patch.bright * o.vel) * eIdx + 0.25;
    const tine = tn.s * 0.22 * patch.bright * eTine;
    const amp = Math.min(1, t / 0.002) * eAmp * (t > o.len ? rel : 1);
    // the carrier's phase is pushed about every sample, so it is no fixed sine and keeps its Math.sin
    lp = (1 - a) * (Math.sin(TAU * pc + index * mod.s) + tine) + a * lp;
    const trem = sway.s * patch.tremDepth;
    const v = (Math.tanh(lp * bark) / bark) * amp * o.vel * 0.3;
    L[i0 + i] += v * (1 - trem); R[i0 + i] += v * (1 + trem);
  }
}

// Felt piano: a few harmonics, each a touch sharp (real strings are stiff) and each dying faster the higher it is.
// Every note is two strings a cent or two apart, so it shimmers as a piano's unison strings beat against each other.
// The felt between hammer and string softens the attack and the tone, more so on soft notes; the hammer itself
// adds a short thud of noise.
export function felt(L, R, sr, o, patch) {
  const f = mtof(o.midi), i0 = Math.round(o.t * sr), n = Math.round((o.len + 0.5) * sr), r = rng(o.seed ?? 1);
  const body = 1.2 + 2.5 * Math.exp(-(o.midi - 48) / 16), cut = 600 + (1200 + 2000 * patch.bright) * o.vel * o.vel, a = Math.exp((-TAU * cut) / sr);
  const split = Math.pow(2, (0.8 + 1.2 * r()) / 1200);
  const H = [1, 2, 3, 4, 5, 6].flatMap((k) => [1, split].map((s) => ({ f: f * s * k * Math.sqrt(1 + 0.0004 * k * k), g: 0.5 / Math.pow(k, 1.4), d: body / (1 + 0.6 * (k - 1)), p: r() })));
  for (const h of H) { h.osc = new Phasor(TAU * (h.f / sr)); h.k = Math.exp(-1 / (h.d * sr)); h.e = 0; } // see SYNC
  const pan = Math.max(-0.5, Math.min(0.5, (o.midi - 62) / 30)), gl = 1 - Math.max(0, pan), gr = 1 + Math.min(0, pan);
  const thud = Math.exp((-TAU * 1800) / sr), kThud = Math.exp(-1 / (0.012 * sr)), kRel = Math.exp(-1 / (0.12 * sr));
  let lp = 0, hn = 0, eThud = 0, rel = 0;
  for (let i = 0; i < n && i0 + i < L.length; i++) {
    const t = i / sr, sync = i % SYNC === 0;
    let x = 0;
    for (const h of H) {
      h.p += h.f / sr;
      if (sync) { h.osc.set(TAU * h.p); h.e = Math.exp(-t / h.d); } else { h.osc.step(); h.e *= h.k; }
      x += h.osc.s * h.g * h.e;
    }
    if (t > o.len) rel = rel && !sync ? rel * kRel : Math.exp(-(t - o.len) / 0.12); // as in ep
    const amp = Math.min(1, t / 0.008) * (t > o.len ? rel : 1);
    hn = (1 - thud) * (r() * 2 - 1) + thud * hn;
    eThud = sync ? Math.exp(-t / 0.012) : eThud * kThud;
    x += hn * 0.5 * o.vel * eThud;
    lp = (1 - a) * x + a * lp;
    const v = lp * amp * o.vel * 0.234;
    L[i0 + i] += v * gl; R[i0 + i] += v * gr;
  }
}

// Round bass: a sine with a little triangle for edge, gently driven, so it's felt more than heard.
export function roundBass(L, R, sr, o) {
  const f = mtof(o.midi), i0 = Math.round(o.t * sr), n = Math.round((o.len + 0.08) * sr);
  let ph = 0, level = 0;
  for (let i = 0; i < n && i0 + i < L.length; i++) {
    const t = i / sr;
    ph += f / sr; if (ph >= 1) ph -= 1;
    if (t < o.len) level = t < 0.006 ? t / 0.006 : 0.7 + 0.3 * Math.exp(-(t - 0.006) / 0.4);
    else level *= Math.exp(-1 / (0.025 * sr));
    const tri = 1 - 4 * Math.abs(ph - 0.5);
    const v = (Math.tanh(1.4 * (Math.sin(TAU * ph) + 0.25 * tri)) / 1.4) * level * o.vel * 0.44;
    if (i0 + i >= 0) { L[i0 + i] += v; R[i0 + i] += v; }
  }
}

// One plucked string (Karplus–Strong, from loop-band): a buffer one period long, read, gently low-pass filtered and
// written back, so each trip round the loop dulls the sound a little, as a real string loses its high overtones first.
// What starts in the buffer is the shape of a string pulled aside at the pick point.
//   o: { t, f, len, vel, pick (0–1 along the string), damp, ring (seconds to fade 60 dB), seed }
function pluck(out, sr, o) {
  const r = rng(o.seed), i0 = Math.round(o.t * sr), f = o.f, vel = o.vel ?? 1;
  const damp = clamp(o.damp ?? 0.12, 0, 0.9), g = Math.pow(10, -3 / (o.ring * f));
  // the loop is N whole samples plus a fraction (an allpass filter), minus the delay the low-pass filter adds
  const Pd = sr / f, w = (TAU * f) / sr, pd = Math.atan2(damp * Math.sin(w), 1 - damp * Math.cos(w)) / w;
  const N = Math.max(2, Math.floor(Pd - pd - 0.2)), frac = Pd - pd - N, apc = (1 - frac) / (1 + frac);
  const d = new Float32Array(N), apex = clamp(Math.round((o.pick ?? 0.14) * N), 1, N - 1);
  const soft = 1 - Math.exp((-TAU * (500 + 9000 * vel * vel * 0.3)) / sr);
  let s = 0, mean = 0;
  for (let k = 0; k < N; k++) {
    const tri = k < apex ? k / apex : (N - k) / (N - apex);
    s += soft * (tri + (r() - 0.5) * 0.3 - s);
    d[k] = s; mean += s;
  }
  mean /= N;
  for (let k = 0; k < N; k++) d[k] = (d[k] - mean) * vel;
  const nLen = Math.round(o.len * sr), rel = Math.round(0.03 * sr);
  let p = 0, lp = 0, apx = 0, apy = 0;
  for (let i = 0; i < nLen + rel; i++) {
    const j = i0 + i;
    if (j >= out.length) break;
    const y = d[p];
    lp += (1 - damp) * (y - lp);
    const ap = apc * lp + apx - apc * apy; apx = lp; apy = ap;
    d[p] = ap * g;
    if (++p === N) p = 0;
    if (j >= 0) out[j] += i >= nLen ? y * (1 - (i - nLen) / rel) : y; // the fingers lift: a quick fade
  }
}

// Upright bass: a plucked string, dark and quick to fade, with a sine under it for the weight a body gives.
export function uprightBass(L, R, sr, o) {
  const f = mtof(o.midi), n = Math.round((o.len + 0.03) * sr), i0 = Math.round(o.t * sr), x = new Float32Array(n);
  pluck(x, sr, { t: 0, f, len: o.len, vel: o.vel, pick: 0.22, damp: 0.45, ring: 1.4, seed: o.seed });
  let ph = 0;
  for (let i = 0; i < n && i0 + i < L.length; i++) {
    const t = i / sr;
    ph += f / sr;
    const env = Math.min(1, t / 0.01) * Math.exp(-t / 0.9) * (t > o.len ? Math.max(0, 1 - (t - o.len) / 0.03) : 1);
    const v = (x[i] * 0.9 + Math.sin(TAU * ph) * 0.45 * env) * o.vel * 0.75;
    if (i0 + i >= 0) { L[i0 + i] += v; R[i0 + i] += v; }
  }
}
