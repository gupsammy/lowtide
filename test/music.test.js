import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STATIONS } from '../src/stations.js';
import { plan } from '../src/plan.js';
import { progression } from '../src/harmony.js';
import { stream } from '../src/rand.js';
import { MODES, chordPcs, mod12 } from '../src/theory.js';

const SEEDS = Array.from({ length: 60 }, (_, i) => 7 + i * 13);
const plans = STATIONS.flatMap((st) => SEEDS.map((s) => plan(s, st)));

test('a seed plans the same track every time', () => {
  for (const st of STATIONS) assert.deepEqual(plan(4242, st), plan(4242, st));
});

test('each part has its own random stream: changing the sounds leaves the chords and drums alone', () => {
  const st = STATIONS[0];
  const other = { ...st, music: { ...st.music, keys: { felt: 1 }, leads: { soft: 1 }, kits: { tight: 1 } } };
  for (const s of SEEDS.slice(0, 10)) {
    const a = plan(s, st), b = plan(s, other);
    assert.deepEqual(a.chords, b.chords);
    assert.deepEqual(a.events.drums, b.events.drums);
  }
});

test("a section's chords cover every beat once, with no gaps or overlaps", () => {
  for (const p of plans) for (const sec of p.sections) {
    const here = p.chords.filter((c) => c.start >= sec.start && c.start < sec.start + sec.bars * 4);
    let t = sec.start;
    for (const c of here) { assert.equal(c.start, t, `${p.station} ${p.seed}`); t += c.beats; }
    assert.equal(t, sec.start + sec.bars * 4);
  }
});

test('chords stay in the mode, apart from the named borrowings and substitutions', () => {
  for (const mode of Object.keys(MODES)) {
    const R = stream(1, mode), scale = MODES[mode];
    for (let i = 0; i < 300; i++) {
      const p = progression(R, { mode, colour: 'plain', shapes: { '4x1': 1, '8x1': 1 }, grammar: { borrowedIv: 0.3, tritoneSub: 0.3, backdoor: 0.3, secondary: 0.3, turnaround: 0.3 } });
      for (const c of p.chords) {
        if (c.borrowed || c.sub || p.vamp) continue;
        if (c.roman === 'V' && (mode === 'aeolian' || mode === 'dorian')) continue; // the harmonic-minor dominant
        if (c.roman === 'IV' && mode === 'dorian') continue; // dorian's major IV is the mode's colour
        assert.ok(scale.includes(c.root), `${mode}: ${c.roman} root ${c.root} outside the mode`);
      }
    }
  }
});

test("section B never reuses section A's progression", () => {
  for (const p of plans) assert.notEqual(p.traits.shape, p.traits.shapeB, `${p.station} ${p.seed}`);
});

// Measured against the same engine with the movement cost switched off: its top note moves 2.3 semitones per change
// on average and leaps more than a third 14% of the time; with the cost on, 1.2 and 2%.
test('voicings move smoothly: each voice moves little, and the top note rarely leaps', () => {
  let changes = 0, leaps = 0, move = 0, topMove = 0;
  for (const p of plans) {
    const vs = p.events.keys.map((k) => k.midis).filter((v, i, a) => i === 0 || v.join() !== a[i - 1].join());
    for (let i = 1; i < vs.length; i++) {
      const a = vs[i - 1], b = vs[i], d = Math.abs(b[b.length - 1] - a[a.length - 1]);
      changes++; topMove += d; if (d > 4) leaps++;
      move += b.reduce((s, m) => s + Math.min(...a.map((x) => Math.abs(x - m))), 0) / b.length;
    }
  }
  assert.ok(move / changes < 1.1, `each voice moves ${(move / changes).toFixed(2)} semitones per change`);
  assert.ok(topMove / changes < 1.6, `the top note moves ${(topMove / changes).toFixed(2)} semitones per change`);
  assert.ok(leaps / changes < 0.05, `${leaps} of ${changes} changes leap the top note more than a third`);
});

test('voicings sit in range, climb upward, and never hold a minor ninth', () => {
  for (const p of plans) for (const k of p.events.keys) {
    for (let i = 1; i < k.midis.length; i++) assert.ok(k.midis[i] > k.midis[i - 1]);
    assert.ok(k.midis[0] >= 50 && k.midis[k.midis.length - 1] <= 80, `${k.midis}`);
    for (const a of k.midis) for (const b of k.midis) assert.notEqual(b - a, 13);
  }
});

// Beats 2 and 4 may pass through the scale; beats 1 and 3 carry the harmony.
test('melody notes on beats 1 and 3 are notes of the chord under them', () => {
  for (const p of plans) for (const n of p.events.lead) {
    if (n.beat % 2 !== 0) continue;
    const c = p.chords.findLast((x) => x.start <= n.beat);
    assert.ok(chordPcs(c.key + c.root, c.q).map(mod12).includes(mod12(n.midi)), `${p.station} ${p.seed} beat ${n.beat}`);
  }
});

test('the outro comes home: the last chord is the tonic', () => {
  for (const p of plans) {
    const last = p.chords[p.chords.length - 1];
    assert.equal(last.root, 0);
    assert.equal(last.key, p.traits.key);
  }
});
