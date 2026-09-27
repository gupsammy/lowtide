// The riff, the two kinds of B and the versions (RIFF.md, ARRANGE.md §3). The riff's repetition and density targets
// are in test/measures.test.js with the others; the fit rules, the double and the moves in test/arrange.test.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { STATIONS } from '../src/stations.js';
import { plan } from '../src/plan.js';
import { riffCell, fitRiff } from '../src/riff.js';
import { stream } from '../src/rand.js';
import { mod12 } from '../src/theory.js';

const SEEDS = Array.from({ length: 30 }, (_, i) => 31 + i * 43);
const ROLES = ['keys', 'lead', 'signature'];
const sounding = (list, t) => list.filter((e) => e.beat <= t + 1e-9 && t < e.beat + e.len - 1e-9);

// Taken from round 2's engine before the riff was added: with the riff off, a seed must write that track exactly.
test('with the riff off, every seed writes round 2 note for note', () => {
  const h = createHash('sha256');
  // the four stations round 2 had (MOODS.md §4)
  for (const st of STATIONS.slice(0, 4)) for (const s of [1, 4242, 90210, 123456]) {
    const p = plan(s, st, { riff: null });
    assert.equal(p.events.riff.length + p.events.double.length, 0);
    delete p.events.riff; delete p.events.double;
    for (const k of ['riff', 'riffVoice', 'riffNotes', 'sameB', 'version', 'leadBand', 'loopB', 'moves', 'double', 'fits', 'guitar']) delete p.traits[k];
    h.update(JSON.stringify(p));
  }
  assert.equal(h.digest('hex'), 'ea642468b4ac997bbb817a4587f64777f822bbb93cddf56266a0c6f6d1c98ea6');
});

test('the role changes who plays the riff, not its notes, the chords or the drums', () => {
  for (const st of STATIONS) for (const s of SEEDS.slice(0, 10)) {
    const [k, l, g] = ROLES.map((riff) => plan(s, st, { riff, version: 'full', moves: [], double: false }));
    // same band, other sound; each sits in its own pocket (the keys' or the lead's), so only the lean differs
    const notes = (q) => q.events.riff.map(({ beat, len, midi, vel }) => ({ beat, len, midi, vel }));
    assert.deepEqual(notes(k), notes(g));
    assert.equal(k.traits.riffNotes, l.traits.riffNotes);
    for (const q of [l, g]) { assert.deepEqual(q.chords, k.chords); assert.deepEqual(q.events.drums, k.events.drums); }
    assert.deepEqual([k.traits.riffVoice, g.traits.riffVoice], ['keys', 'kalimba']);
    assert.notEqual(g.traits.leadVoice, 'kalimba');
    assert.equal(l.events.lead.length, 0, 'the lead plays the riff, so it has no melody');
  }
});

test('the beat tape leaves out the lead and nothing else', () => {
  for (const st of STATIONS) for (const s of SEEDS.slice(0, 10)) {
    const [full, beat] = ['full', 'beat'].map((version) => plan(s, st, { riff: 'keys', version }));
    const song = (q) => q.events.riff.map(({ beat, len, midi }) => ({ beat, len, midi }));
    assert.deepEqual(beat.chords, full.chords);
    assert.deepEqual(song(beat), song(full));
    assert.deepEqual(beat.events.drums, full.events.drums);
    assert.deepEqual(beat.events.bass, full.events.bass);
    assert.equal(beat.events.lead.length, 0);
  }
});

test('a B that replays the loop keeps A\'s chords and riff and loses the drums, unless the station is steady', () => {
  let seen = 0;
  for (const st of STATIONS) for (const s of SEEDS) {
    const p = plan(s, st, { riff: 'keys', version: 'full', moves: [] });
    if (!p.traits.sameB) continue;
    seen++;
    const A = p.sections.find((x) => x.kind === 'A'), B = p.sections.find((x) => x.kind === 'B');
    const within = (list, x) => list.filter((e) => e.beat >= x.start && e.beat < x.start + x.bars * 4);
    const rel = (list, x) => within(list, x).map((e) => `${(e.beat - x.start).toFixed(3)}${e.roman ?? e.midi}${e.q ?? ''}`);
    assert.deepEqual(rel(p.chords, B), rel(p.chords, A).slice(0, rel(p.chords, B).length));
    if (st.music.steady) assert.ok(within(p.events.drums, B).length > 0);
    else assert.equal(within(p.events.drums, B).length, 0);
    assert.equal(B.key, A.key);
    assert.ok(B.energy < A.energy);
  }
  assert.ok(seen > 20);
});

test('the riff sits between the chords and the lead, and never grinds against the keys', () => {
  for (const st of STATIONS) for (const s of SEEDS) for (const riff of ROLES) {
    const p = plan(s, st, { riff }), T = p.traits, over = riff !== 'lead';
    const [lo, hi] = over ? [T.lead - 13, T.lead - 2] : [T.lead - 5, T.lead + 7];
    for (const n of p.events.riff) {
      assert.ok(n.midi >= lo && n.midi <= hi, `${st.id} ${s} ${riff}: riff note ${n.midi} outside ${lo}–${hi}`);
      for (const k of sounding(p.events.keys, n.beat)) assert.ok(!k.midis.some((v) => mod12(n.midi - v) === 1), `${st.id} ${s} ${riff} beat ${n.beat}`);
    }
    for (const n of p.events.lead) for (const r of sounding(p.events.riff, n.beat)) assert.ok(n.midi > r.midi, `${st.id} ${s} ${riff}: lead under riff`);
    if (over) for (const k of p.events.keys) assert.ok(Math.max(...k.midis) <= T.lead - 10);
  }
});

// A loop of one chord held two bars: C major 7 voiced E G B D, with a pushed D minor 7 (F A C E) ringing into its
// last half beat. The answers are known: E G B D under C major (C sits over the held B), then A E D.
const loop = (t) => (t >= 7.5 ? { chord: { root: 2, q: 'm7' }, v: [53, 57, 60, 64] } : { chord: { root: 0, q: 'maj7' }, v: [52, 55, 59, 62] });
const fit = (cell, alt) => fitRiff(cell, {
  bars: 2, band: [60, 76], key: 0, chordAt: (t) => loop(t).chord, voicingAt: (t) => loop(t).v,
  heldAt: (t) => [...loop(t).v, ...(t >= 7.5 ? [52, 55, 59, 62] : [])],
}, alt);

test('the riff uses the voiced notes and the root, never a semitone above a held note', () => {
  for (let s = 0; s < 40; s++) {
    for (const n of fit(riffCell(stream(s, 'riff'), [4, 8]), false)) {
      const pc = mod12(n.midi);
      if (n.beat < 7.5) assert.ok([4, 7, 11, 2].includes(pc), `${n.midi} at ${n.beat}`); // C itself sits over the B
      else assert.ok([9, 4, 2].includes(pc), `${n.midi} at ${n.beat}`); // D minor's A, E and root D; F sits over E, C over B
      assert.ok(n.midi >= 60 && n.midi <= 76);
    }
  }
});

test('A′ changes the last bar and leaves the rest of the loop alone', () => {
  for (let s = 0; s < 40; s++) {
    const cell = riffCell(stream(s, 'riff'), [4, 8]), a = fit(cell, false), b = fit(cell, true);
    const bar = (r, k) => JSON.stringify(r.filter((n) => n.beat >= k * 4 && n.beat < k * 4 + 4));
    assert.equal(bar(b, 0), bar(a, 0));
    assert.notEqual(bar(b, 1), bar(a, 1), `seed ${s}: ${cell.variant.kind}`);
  }
});
