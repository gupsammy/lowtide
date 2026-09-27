// Who plays the riff, its double, and the moves that take parts out over the loop (ARRANGE.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STATIONS } from '../src/stations.js';
import { plan } from '../src/plan.js';
import { playing } from '../src/form.js';

const SEEDS = Array.from({ length: 40 }, (_, i) => 17 + i * 53);
const PLANS = STATIONS.flatMap((st) => SEEDS.map((s) => [st, s, plan(s, st)]));
const sectionAt = (p, beat) => p.sections.find((x) => beat >= x.start - 1e-9 && beat < x.start + x.bars * 4 - 1e-9);
const key = (e) => JSON.stringify(e);

test('a drawn role fits the sounds: the lead only on vibes or kalimba, the kalimba never over the electric piano', () => {
  const seen = new Set();
  for (const [st, s, p] of PLANS) {
    const T = p.traits;
    seen.add(T.riff);
    if (T.riff === 'lead') assert.ok(['vibes', 'kalimba'].includes(T.riffVoice), `${st.id} ${s}: lead riff on ${T.riffVoice}`);
    if (T.riff === 'signature') assert.notEqual(T.keysVoice, 'ep', `${st.id} ${s}`);
  }
  assert.deepEqual([...seen].sort(), ['keys', 'lead', 'signature']);
});

test('the double plays the riff an octave up in the final A, on a sound of its own, while the lead rests', () => {
  let seen = 0;
  for (const [st, s, p] of PLANS) {
    const T = p.traits, last = p.sections.findLast((x) => x.kind === 'A'), end = last.start + last.bars * 4;
    if (!T.double) { assert.equal(p.events.double.length, 0); continue; }
    seen++;
    assert.notEqual(T.riff, 'lead');
    assert.notEqual(T.double, T.riff === 'keys' ? T.keysVoice : T.riffVoice);
    if (T.double === 'kalimba') assert.notEqual(T.keysVoice, 'ep');
    const riff = new Map(p.events.riff.map((n) => [n.beat, n.midi]));
    for (const n of p.events.double) {
      assert.ok(n.beat >= last.start && n.beat < end, `${st.id} ${s}: double outside the final A at ${n.beat}`);
      assert.equal(n.midi, riff.get(n.beat) + 12);
    }
    assert.equal(p.events.double.length, p.events.riff.filter((n) => n.beat >= last.start && n.beat < end).length);
    assert.equal(p.events.lead.filter((n) => n.beat >= last.start && n.beat < end).length, 0);
  }
  assert.ok(seen > 30);
});

test('moves change who plays, never what: every note left out falls where a move put its part out', () => {
  let cut = 0;
  for (const [st, s, p] of PLANS) {
    const q = plan(s, st, { moves: [] });
    assert.deepEqual(p.chords, q.chords);
    assert.deepEqual(p.events.riff, q.events.riff);
    for (const part of ['drums', 'bass', 'lead']) {
      const kept = new Set(p.events[part].map(key));
      assert.ok(p.events[part].every((e) => q.events[part].some((f) => key(f) === key(e))), `${st.id} ${s}: ${part} changed`);
      for (const e of q.events[part]) if (!kept.has(key(e))) {
        const sec = sectionAt(p, e.beat);
        assert.ok(!playing(sec, part, e.beat - sec.start), `${st.id} ${s}: ${part} at ${e.beat} left out where it plays`);
        cut++;
      }
    }
  }
  assert.ok(cut > 1000);
});

test('the loop never stops: every bar the keys play in A, B and the break has the riff', () => {
  for (const [st, s, p] of PLANS) for (const x of p.sections) {
    if (!['A', 'B', 'break'].includes(x.kind) || !x.layers.includes('keys')) continue;
    for (let b = 0; b < x.bars; b++) {
      const at = x.start + b * 4;
      assert.ok(p.events.riff.some((n) => n.beat >= at - 1e-9 && n.beat < at + 4 - 1e-9), `${st.id} ${s}: no riff in ${x.kind} bar ${b}`);
    }
  }
});

test('moves sit at phrase edges, one to a section, the band returns on a first beat, and the drums play half the song', () => {
  for (const [st, s, p] of PLANS) {
    let quiet = 0, all = 0;
    p.sections.forEach((x, i) => {
      assert.ok((x.cuts ?? []).length <= 1, `${st.id} ${s}: two moves in one ${x.kind}`);
      for (const c of x.cuts ?? []) {
        assert.ok((c.from === 0 && c.to === 4) || (c.to === x.bars && [x.bars - 4, x.bars - 1].includes(c.from)), `${st.id} ${s}: ${c.move} at bars ${c.from}–${c.to}`);
        if (c.to === x.bars && c.move !== 'ending') assert.ok(playing(p.sections[i + 1], 'drums', 0), `${st.id} ${s}: no band after the ${c.move}`);
      }
      if (x.kind === 'A' || x.kind === 'B') for (let b = 0; b < x.bars; b++) { all++; if (!playing(x, 'drums', b * 4)) quiet++; }
    });
    assert.ok(quiet / all <= 0.5, `${st.id} ${s}: drums out of ${quiet} of ${all} bars`);
  }
});
