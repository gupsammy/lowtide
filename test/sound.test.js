import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STATIONS } from '../src/stations.js';
import { plan } from '../src/plan.js';
import { nextTrack } from '../src/critic.js';
import { renderSection, renderOpening, sectionSpan } from '../src/render.js';
import { sampledNote, buildKit } from '../src/sampler.js';
import { lufs, peakDb } from '../src/meter.js';
import { stereo } from '../src/synth/dsp.js';
import { diskBank } from '../tools/disk.js';

const sr = 22050, bank = await diskBank();

test('a section renders to the same samples every time', () => {
  const p = plan(31, STATIONS[1]);
  const a = renderSection(p, 1, sr, bank), b = renderSection(p, 1, sr, bank);
  assert.equal(a.dry.L.findIndex((v, i) => v !== b.dry.L[i]), -1);
});

test('openings sit between -20 and -12 LUFS, with peaks under -0.5 dBFS', () => {
  for (const st of STATIONS) for (const seed of [3, 44]) {
    const a = renderOpening(plan(seed, st), 12, sr, bank), loud = lufs(a, sr), peak = peakDb(a);
    assert.ok(loud > -20 && loud < -12, `${st.id} ${seed}: ${loud.toFixed(1)} LUFS`);
    assert.ok(peak < -0.5, `${st.id} ${seed}: peak ${peak.toFixed(2)} dBFS`);
  }
});

// The pitch of a rendered note: the strongest spectral peak within half a semitone of the one asked for.
function centsOff(x, midi) {
  const f0 = 440 * Math.pow(2, (midi - 69) / 12), n = x.length;
  let best = -1, at = 0;
  for (let c = -50; c <= 50; c++) {
    const w = (2 * Math.PI * f0 * Math.pow(2, c / 1200)) / sr;
    let re = 0, im = 0;
    for (let i = 0; i < n; i++) { const h = x[i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1))); re += h * Math.cos(w * i); im += h * Math.sin(w * i); }
    if (re * re + im * im > best) { best = re * re + im * im; at = c; }
  }
  return at;
}

// Notes between the recorded ones, below the lowest, and on a kalimba whose tines are 20–40 cents off true.
test('a sampled instrument plays the pitch asked for', () => {
  for (const [inst, midi] of [['upright', 64], ['upright', 46], ['vibes', 70], ['kalimba', 74], ['kalimba', 78]]) {
    const b = stereo(sr * 2);
    sampledNote(b.L, b.R, sr, bank, inst, { t: 0, len: 1.5, midi, vel: 0.8 });
    const off = centsOff(b.L.subarray(Math.round(0.05 * sr), Math.round(0.8 * sr)), midi);
    assert.ok(Math.abs(off) <= 5, `${inst} ${midi}: ${off} cents off`);
  }
});

test('the same seed builds the same kit, and different seeds build different kicks', () => {
  const a = buildKit(bank, 5, 'dusty', sr), b = buildKit(bank, 5, 'dusty', sr), c = buildKit(bank, 6, 'dusty', sr);
  const same = (x, y) => x.length === y.length && x.every((v, i) => v === y[i]);
  assert.ok(same(a.kick[0], b.kick[0]) && same(a.snare[0], b.snare[0]), 'one seed built two different kits');
  assert.ok(a.kick[0].some((v, i) => Math.abs(v - (c.kick[0][i] ?? 0)) > 0.01), 'two seeds gave the same kick');
});

test('the keys dip just after each kick and not before it', () => {
  const p = plan(12, STATIONS[0]), i = p.sections.findIndex((s) => s.kind === 'A' && s.layers.includes('keys'));
  const withPump = structuredClone(p), without = structuredClone(p);
  withPump.traits.space.pump = 0.3; without.traits.space.pump = 0;
  const a = renderSection(withPump, i, sr, bank, { only: ['keys'] }), b = renderSection(without, i, sr, bank, { only: ['keys'] });
  const spb = 60 / p.bpm, t0 = sectionSpan(p, i).start - 0.1, sec = p.sections[i];
  const kicks = p.events.drums.filter((e) => e.drum === 'kick' && e.beat >= sec.start && e.beat < sec.start + sec.bars * 4).map((e) => e.beat * spb + e.ms / 1000);
  const energy = (x, from, to) => { let e = 0; for (let j = Math.round((from - t0) * sr); j < Math.round((to - t0) * sr); j++) e += x.L[j] ** 2; return e; };
  let after = 0, afterRef = 0, before = 0, beforeRef = 0;
  kicks.forEach((k, j) => {
    if (j === 0 || k - kicks[j - 1] < 0.4) return; // the last kick has faded
    after += energy(a.dry, k + 0.01, k + 0.05); afterRef += energy(b.dry, k + 0.01, k + 0.05);
    before += energy(a.dry, k - 0.05, k - 0.01); beforeRef += energy(b.dry, k - 0.05, k - 0.01);
  });
  assert.ok(after / afterRef < 0.8, `after the kick: ${(after / afterRef).toFixed(2)} of the undipped level`);
  assert.ok(before / beforeRef > 0.95, `before the kick: ${(before / beforeRef).toFixed(2)} of the undipped level`);
});

// Measured on the audio, not the plan: the first seconds of consecutive tracks differ in loudness shape or
// brightness. Loudness shape is the energy in each quarter second; brightness is how often the wave crosses zero.
function fingerprint(a) {
  const win = Math.round(sr / 4), env = [];
  let zc = 0;
  for (let w = 0; w + win <= a.L.length; w += win) {
    let e = 0;
    for (let i = w; i < w + win; i++) { const x = a.L[i] + a.R[i]; e += x * x; if (i && Math.sign(x) !== Math.sign(a.L[i - 1] + a.R[i - 1])) zc++; }
    env.push(Math.sqrt(e / win));
  }
  return { env, bright: zc / a.L.length };
}
const corr = (x, y) => {
  const mx = x.reduce((s, v) => s + v, 0) / x.length, my = y.reduce((s, v) => s + v, 0) / y.length;
  let a = 0, b = 0, c = 0;
  for (let i = 0; i < x.length; i++) { a += (x[i] - mx) * (y[i] - my); b += (x[i] - mx) ** 2; c += (y[i] - my) ** 2; }
  return a / Math.sqrt(b * c + 1e-12);
};

test('consecutive openings sound different', () => {
  const st = STATIONS[0], recent = [], prints = [];
  for (let i = 0; i < 8; i++) {
    const { plan: p } = nextTrack(300 + i * 7, st, recent);
    recent.unshift(p);
    prints.push(fingerprint(renderOpening(p, 6, sr, bank)));
  }
  for (let i = 1; i < prints.length; i++) {
    const a = prints[i - 1], b = prints[i];
    const alike = corr(a.env, b.env) > 0.9 && Math.abs(a.bright / b.bright - 1) < 0.1;
    assert.ok(!alike, `tracks ${i - 1} and ${i} open alike`);
  }
});
