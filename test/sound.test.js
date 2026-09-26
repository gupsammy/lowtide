import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STATIONS } from '../src/stations.js';
import { plan } from '../src/plan.js';
import { nextTrack } from '../src/critic.js';
import { renderSection, renderOpening } from '../src/render.js';

const sr = 22050;

test('a section renders to the same samples every time', () => {
  const p = plan(31, STATIONS[1]);
  const a = renderSection(p, 1, sr), b = renderSection(p, 1, sr);
  assert.deepEqual(a.L, b.L);
});

test('openings never clip', () => {
  for (const st of STATIONS) for (const seed of [3, 44]) {
    const a = renderOpening(plan(seed, st), 10, sr);
    let peak = 0;
    for (let i = 0; i < a.L.length; i++) peak = Math.max(peak, Math.abs(a.L[i]), Math.abs(a.R[i]));
    assert.ok(peak < 0.98, `${st.id} ${seed}: peak ${peak.toFixed(3)}`);
    assert.ok(peak > 0.05, `${st.id} ${seed}: nearly silent`);
  }
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
    prints.push(fingerprint(renderOpening(p, 6, sr)));
  }
  for (let i = 1; i < prints.length; i++) {
    const a = prints[i - 1], b = prints[i];
    const alike = corr(a.env, b.env) > 0.9 && Math.abs(a.bright / b.bright - 1) < 0.1;
    assert.ok(!alike, `tracks ${i - 1} and ${i} open alike`);
  }
});
