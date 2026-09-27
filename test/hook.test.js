// The lead's hook, the pushed bass and the bass off beat 1 (HOOK.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STATIONS } from '../src/stations.js';
import { plan } from '../src/plan.js';

const SEEDS = Array.from({ length: 30 }, (_, i) => 17 + i * 41);
const PLANS = STATIONS.flatMap((st) => SEEDS.map((s) => plan(s, st)));
const barOf = (notes, t) => notes.filter((n) => n.beat >= t - 1e-9 && n.beat < t + 4 - 1e-9).map((n) => [+(n.beat - t).toFixed(6), +n.len.toFixed(6), n.midi]);

test('the lead replays a hook of whole loops, at least four bars, note for note', () => {
  let pairs = 0;
  for (const p of PLANS) {
    const T = p.traits, loopBars = (kind) => Number((kind === 'B' ? T.loopB : T.loop).split('×')[0]);
    for (const sec of p.sections) {
      if (sec.kind === 'intro' || !sec.layers.includes('lead')) continue;
      const hook = Math.min(sec.bars, Math.max(4, loopBars(sec.kind)));
      for (let b = hook; b < sec.bars; b++) {
        const now = barOf(p.events.lead, sec.start + b * 4), then = barOf(p.events.lead, sec.start + (b - hook) * 4);
        if (!now.length || !then.length) continue; // a move left the lead out of one of them
        pairs++;
        // the section's last bar leaves out the pickup back into the hook, on the last half beat
        const cut = (bar) => (b === sec.bars - 1 ? bar.filter(([at]) => at < 3.5 - 1e-6) : bar);
        assert.deepEqual(cut(now), cut(then), `${p.station} ${p.seed} ${sec.kind} bar ${b + 1}`);
        if (b === sec.bars - 1) assert.ok(now.every(([at]) => at < 3.5 - 1e-6), `${p.station} ${p.seed}: a pickup at the section's end`);
      }
    }
  }
  assert.ok(pairs > 500, `only ${pairs} bar pairs`);
});

test('the pushed bass lands before each chord but a section\'s first, and stays under every chord it sounds over', () => {
  let pushed = 0;
  for (const p of PLANS) {
    if (p.traits.bassline !== 'push') continue;
    const firsts = new Set(p.sections.map((s) => s.start));
    for (const c of p.chords) {
      const on = p.events.bass.some((b) => Math.abs(b.beat - c.start) < 1e-9);
      if (!firsts.has(c.start)) assert.ok(!on, `${p.station} ${p.seed}: a bass note on the chord at ${c.start}`);
    }
    for (const b of p.events.bass.filter((x) => x.lands !== undefined)) {
      pushed++;
      assert.ok(b.beat < b.lands, `${p.station} ${p.seed}: pushed note at ${b.beat} after its chord at ${b.lands}`);
      for (const k of p.events.keys) {
        if (k.beat < b.beat + b.len - 1e-9 && b.beat < k.beat + k.len - 1e-9) assert.ok(b.midi < k.midis[0], `${p.station} ${p.seed} beat ${b.beat}: bass ${b.midi} over ${k.midis[0]}`);
      }
    }
  }
  assert.ok(pushed > 500, `only ${pushed} pushed notes`);
});

test('at most 30% of bass notes start a bar, as in the references', () => {
  let notes = 0, one = 0;
  for (const p of PLANS) for (const b of p.events.bass) { notes++; if (Math.abs(b.beat - Math.round(b.beat / 4) * 4) < 1e-9) one++; }
  assert.ok(one / notes <= 0.3, `${Math.round((100 * one) / notes)}% of bass notes on beat 1`);
});
