// The guitar: its chords, its strokes, its riff, and the tracks it leaves alone (GUITAR.md). The samples' pitch is
// checked with the other sampled instruments in test/sound.test.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STATIONS, stationById } from '../src/stations.js';
import { plan, GUITARS } from '../src/plan.js';
import { STRUMS, strokes, COMPS } from '../src/groove.js';
import { mod12 } from '../src/theory.js';

const SEEDS = Array.from({ length: 60 }, (_, i) => 7 + i * 13);
const PLANS = STATIONS.flatMap((st) => SEEDS.map((s) => plan(s, st)));
const strummed = PLANS.filter((p) => GUITARS.includes(p.traits.keysVoice));

test('a guitar chord has its root at the bottom, reaches no lower than E2 and spans at most 19 semitones', () => {
  let chords = 0, rooted = 0;
  for (const p of strummed) {
    for (const e of p.events.keys) {
      assert.ok(e.midis[0] >= 40, `${p.station} ${p.seed}: ${e.midis}`);
      assert.ok(e.midis[e.midis.length - 1] - e.midis[0] <= 19, `${p.station} ${p.seed}: ${e.midis}`);
    }
    // each chord's first downstroke: on the chord, or an eighth ahead of it when the strum is pushed
    for (const c of p.chords) {
      const e = p.events.keys.find((k) => !k.up && k.beat >= c.start - 0.5 - 1e-9);
      if (!e || e.beat >= c.start + c.beats) continue;
      chords++;
      if (mod12(e.midis[0]) === mod12(c.key + c.root)) rooted++;
    }
  }
  assert.ok(strummed.length >= 40, `only ${strummed.length} tracks strum`);
  // under a low ceiling a chord may find no shape with its root at the bottom; it then plays rootless over the bass
  assert.ok(rooted / chords > 0.98, `${chords - rooted} of ${chords} guitar chords lost their root`);
});

test('the bass plays under the guitar', () => {
  for (const p of strummed) for (const b of p.events.bass) {
    const low = p.events.keys.filter((k) => k.beat <= b.beat + 1e-9 && b.beat < k.beat + k.len - 1e-9).map((k) => k.midis[0]);
    for (const m of low) assert.ok(b.midi < m, `${p.station} ${p.seed} beat ${b.beat}: bass ${b.midi} over ${m}`);
  }
});

test('strokes tile the chord, enter on a downstroke, and go up only on off-beats', () => {
  for (const comp of Object.keys(COMPS)) for (const pattern of Object.keys(STRUMS)) for (const [at, beats] of [[0, 4], [0, 8], [2, 2], [0, 2], [0, 16]]) {
    const s = strokes(comp, pattern, at, beats), from = comp === 'push' ? -0.5 : 0, where = `${comp} ${pattern} at ${at} for ${beats}`;
    assert.equal(s[0][0], from, where);
    assert.equal(s[0][3], false, `${where}: enters on an upstroke`);
    for (const [off, , , up] of s) if (up) assert.equal((at + off) % 1, 0.5, `${where}: upstroke on a beat at ${off}`);
    if (comp === 'hold') assert.deepEqual(s, [[0, beats, 0.8, false]]);
    if (comp === 'pulse') assert.equal(s.length, COMPS.pulse(beats).length);
    if (comp === 'strum' || comp === 'push') {
      // no gaps, no overlaps, and every stroke after the first on the pattern
      for (let i = 1; i < s.length; i++) assert.equal(s[i - 1][0] + s[i - 1][1], s[i][0], where);
      assert.equal(s[s.length - 1][0] + s[s.length - 1][1], beats + from, where);
      const on = new Map(STRUMS[pattern]);
      for (const [off, , , up] of s.slice(1)) assert.equal(on.get((at + off + 4) % 4), up, `${where}: ${off} is off the pattern`);
    }
  }
});

test('a downstroke plays the whole chord, an upstroke its top three', () => {
  for (const p of strummed) {
    let down = null;
    for (const e of p.events.keys) {
      if (!e.up) { down = e.midis; continue; }
      assert.deepEqual(e.midis, down.slice(-3), `${p.station} ${p.seed} beat ${e.beat}`);
    }
  }
});

test('the guitar riff is busier and wider than the keys\' riff and carries the tune alone', () => {
  const st = stationById('sunday-porch');
  let guitarRange = 0, keysRange = 0;
  for (const s of SEEDS.slice(0, 30)) {
    const g = plan(s, st, { riff: 'guitar', moves: [] }), k = plan(s, st, { riff: 'keys', moves: [] });
    assert.ok(g.traits.riffNotes >= 6 && g.traits.riffNotes <= 8, `${s}: ${g.traits.riffNotes} a bar`);
    assert.ok(GUITARS.includes(g.traits.riffVoice));
    assert.equal(g.events.lead.length, 0, `${s}: the lead plays under a guitar riff`);
    assert.equal(g.events.double.length, 0);
    const range = (q) => Math.max(...q.events.riff.map((n) => n.midi)) - Math.min(...q.events.riff.map((n) => n.midi));
    guitarRange += range(g); keysRange += range(k);
  }
  assert.ok(guitarRange > keysRange + 30 * 3, `guitar riffs span ${guitarRange / 30} semitones, the keys' ${keysRange / 30}`);
});
