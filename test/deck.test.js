// The deck's stages, each measured on a plain test signal against what it was asked to do.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDeck } from '../src/deck.js';
import { stereo, rng } from '../src/synth/dsp.js';

const sr = 22050;
const space = {
  t60: 2, size: 1, predelayMs: 20, damp: 0.4, wet: 0.25, echo: { beats: 0.75, feedback: 0.4, send: 0.3 },
  wowCents: 8, wowHz: 0.5, flutterCents: 1.5, flutterHz: 8, bumpDb: 2, grit: { bits: 12, rate: 16000 }, vinyl: 0.6, pump: 0.2, texture: 0.15,
};
const ocean = Float32Array.from({ length: sr * 4 }, (_, i) => Math.sin(i * 0.37) * 0.2);
const deck = (o = {}) => createDeck({ bpm: 80, tape: 0.6, seed: 7, space, ocean, gain: 1, vinylBoostUntil: 1, ...o }, sr);
const silent = (n) => stereo(n);

test('the deck gives the same samples whether fed in one pass or in chunks of any size', () => {
  const n = sr * 3, r = rng(3), make = () => { const s = stereo(n); for (let i = 0; i < n; i++) { s.L[i] = (r() - 0.5) * 0.6; s.R[i] = (r() - 0.5) * 0.6; } return s; };
  const dry = make(), verb = make(), echo = make();
  const whole = deck().process(dry, verb, echo);
  const d = deck(), L = [], R = [], cut = rng(9);
  for (let i = 0; i < n;) {
    const k = Math.min(n - i, 1 + Math.floor(cut() * 3000)), part = (s) => ({ L: s.L.subarray(i, i + k), R: s.R.subarray(i, i + k) });
    const out = d.process(part(dry), part(verb), part(echo));
    L.push(...out.L); R.push(...out.R);
    i += k;
  }
  // the first sample where the two differ, if any (a whole-array diff of 66,000 samples takes minutes to print)
  const differ = (a, b) => a.findIndex((v, i) => v !== b[i]);
  assert.equal(differ(Float32Array.from(L), whole.L), -1, 'left channel departs from one pass');
  assert.equal(differ(Float32Array.from(R), whole.R), -1, 'right channel departs from one pass');
});

// Frequency from zero crossings, cycle by cycle; the largest departure from the input's pitch, in cents.
function swingCents(x, f0, from) {
  const cross = [];
  for (let i = from + 1; i < x.length; i++) if (x[i - 1] < 0 && x[i] >= 0) cross.push(i - 1 + -x[i - 1] / (x[i] - x[i - 1]));
  let most = 0;
  for (let k = 10; k < cross.length; k++) most = Math.max(most, Math.abs(1200 * Math.log2(sr / ((cross[k] - cross[k - 10]) / 10) / f0)));
  return most;
}

test('wow bends a steady tone by the cents it was set to', () => {
  for (const cents of [4, 10]) {
    const n = sr * 5, x = stereo(n);
    for (let i = 0; i < n; i++) x.L[i] = x.R[i] = 0.3 * Math.sin((2 * Math.PI * 441 * i) / sr);
    const out = deck({ only: ['wow'], space: { ...space, wowCents: cents } }).process(x, silent(n), silent(n));
    const got = swingCents(out.L, 441, sr / 10);
    assert.ok(Math.abs(got - cents) / cents < 0.15, `asked for ${cents} cents, measured ${got.toFixed(2)}`);
  }
});

test('the reverb dies away in the time it was given', () => {
  for (const t60 of [1.2, 2.5]) {
    const n = Math.round(sr * (t60 + 1.5)), imp = stereo(n);
    imp.L[0] = imp.R[0] = 1;
    const out = deck({ only: ['reverb'], space: { ...space, t60, damp: 0 } }).process(silent(n), imp, silent(n));
    // Schroeder's backward integral: the energy still to come, in dB; its slope from -5 to -25 dB gives T60
    const e = out.L.map((v, i) => v * v + out.R[i] * out.R[i]), tail = new Float64Array(n);
    for (let i = n - 1, s = 0; i >= 0; i--) tail[i] = s += e[i];
    const db = (i) => 10 * Math.log10(tail[i] / tail[0]), at = (lvl) => { let i = 0; while (db(i) > lvl) i++; return i / sr; };
    const got = 3 * (at(-25) - at(-5));
    assert.ok(Math.abs(got - t60) / t60 < 0.15, `asked for ${t60} s, measured ${got.toFixed(2)} s`);
  }
});

test('the echo repeats on the beat, crosses sides, and fades by its feedback', () => {
  const n = sr * 3, burst = stereo(n), beats = 0.75, bpm = 80, fb = 0.4, D = Math.round(((beats * 60) / bpm) * sr);
  for (let i = 0; i < Math.round(0.03 * sr); i++) burst.L[i] = burst.R[i] = 0.5 * Math.sin((2 * Math.PI * 1000 * i) / sr);
  const out = deck({ only: ['echo'], bpm, space: { ...space, echo: { beats, feedback: fb, send: 1 } } }).process(silent(n), silent(n), burst);
  const onset = (x, from) => { for (let i = from; i < n; i++) if (Math.abs(x[i]) > 0.02) return i; return -1; };
  const rms = (x, a) => Math.sqrt(x.subarray(a, a + Math.round(0.03 * sr)).reduce((s, v) => s + v * v, 0) / (0.03 * sr));
  const first = onset(out.L, 0), second = onset(out.R, 0);
  assert.ok(Math.abs(first - D) <= sr * 0.001, `first echo at ${first}, expected ${D}`);
  assert.ok(Math.abs(second - 2 * D) <= sr * 0.001, `second echo at ${second}, expected ${2 * D}`);
  const ratio = rms(out.R, second) / rms(out.L, first);
  assert.ok(ratio > 0.8 * fb && ratio < fb, `second echo is ${ratio.toFixed(3)} of the first; feedback ${fb}`);
});

test('the soft clip holds peaks under -0.9 dBFS however hard it is driven', () => {
  const n = sr, x = stereo(n);
  for (let i = 0; i < n; i++) x.L[i] = x.R[i] = 8 * Math.sin((2 * Math.PI * 220 * i) / sr);
  const out = deck({ only: [] }).process(x, silent(n), silent(n));
  const peak = out.L.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  assert.ok(20 * Math.log10(peak) < -0.9, `peak ${(20 * Math.log10(peak)).toFixed(2)} dBFS`);
});
