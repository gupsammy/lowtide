// The critic's melody measures (MELODY.md §1), on hand-written melodies whose answers are known.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scores, surprisal } from '../src/critic.js';

// A plan with just what the measures read. sections: [{ kind, bars, key, mode }], laid end to end with the lead in
// each; chords: [start, beats, root, q, key?] (key defaults to 0); lead: [beat, len, midi].
function track(sections, chords, lead) {
  let t = 0;
  const secs = sections.map((s) => { const x = { layers: ['lead'], key: 0, mode: 'ionian', ...s, start: t }; t += s.bars * 4; return x; });
  return {
    sections: secs,
    chords: chords.map(([start, beats, root, q, key = 0]) => ({ start, beats, root, q, key })),
    events: { lead: lead.map(([beat, len, midi]) => ({ beat, len, midi })) },
  };
}
const quarters = (midis, from = 0) => midis.map((m, i) => [from + i, 1, m]);
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const cmaj = (bars) => [[0, bars * 4, 0, 'maj7']];

test('surprise: steps in key are expected; the same notes in a leaping order less so; notes outside the key least', () => {
  // the leaping line has the same notes, so only nearness to the note before can tell the two apart
  const at = (midis) => scores(track([{ kind: 'A', bars: 2 }], cmaj(2), quarters(midis))).surprise;
  const steps = at([60, 62, 64, 65, 67, 65, 64, 62]), leaps = at([60, 67, 62, 65, 64, 67, 62, 65]);
  const outside = at([60, 61, 63, 66, 68, 66, 63, 61]);
  assert.ok(steps < leaps - 0.5, `${steps} vs ${leaps}`);
  assert.ok(steps < outside, `${steps} vs ${outside}`);
});

test('surprise: a note outside the mode costs far more than an in-key note in its place', () => {
  const inKey = surprisal([60, 62, 64, 65, 64].map((midi) => ({ midi })), 0, 'ionian')[3];
  const outside = surprisal([60, 62, 64, 66, 64].map((midi) => ({ midi })), 0, 'ionian')[3];
  assert.ok(outside - inKey > 3, `${inKey.toFixed(2)} → ${outside.toFixed(2)} bits`);
});

test("surprise: a Dorian 6th is in the mode, not a wrong note", () => {
  // D dorian's B natural against D aeolian's B flat: the same line scores as expected in its own mode
  const line = [62, 64, 65, 67, 69, 71, 69, 67].map((midi) => ({ midi }));
  assert.ok(mean(surprisal(line, 2, 'dorian')) < mean(surprisal(line, 2, 'aeolian')) - 0.3);
});

test('surprise: a section in a new key is scored in its own key', () => {
  const line = [0, 2, 4, 5, 7, 5, 4, 2];
  const inC = scores(track([{ kind: 'B', bars: 2 }], cmaj(2), quarters(line.map((x) => 60 + x)))).surprise;
  const inEb = scores(track([{ kind: 'B', bars: 2, key: 3 }], [[0, 8, 0, 'maj7', 3]], quarters(line.map((x) => 63 + x)))).surprise;
  assert.ok(Math.abs(inC - inEb) < 1e-6, `${inC} vs ${inEb}`);
});

test('fit: chord notes alone fit fully', () => {
  const s = scores(track([{ kind: 'A', bars: 1 }], cmaj(1), quarters([60, 64, 67, 71])));
  assert.equal(s.fit, 1);
  assert.equal(s.colour, 0);
});

test('fit: a note off the chord counts against the fit only when it leaps away', () => {
  // D (the 9th of Cmaj9) then a leap to B, or then a step down to C
  const leaps = scores(track([{ kind: 'A', bars: 1 }], [[0, 4, 0, 'maj9']], quarters([60, 64, 62, 71])));
  const steps = scores(track([{ kind: 'A', bars: 1 }], [[0, 4, 0, 'maj9']], quarters([60, 64, 62, 60])));
  assert.equal(leaps.fit, 0.75);
  assert.equal(steps.fit, 1);
  assert.equal(steps.colour, 0.25);
  assert.equal(steps.anchoring, 1);
});

test('fit: a note an eighth early, held over the change, is judged against the chord it anticipates', () => {
  // Cmaj7 then Fmaj7; A (not in Cmaj7) lands on the "and" of 4 and is a leap from what follows
  const chords = [[0, 4, 0, 'maj7'], [4, 4, 5, 'maj7']];
  const held = scores(track([{ kind: 'A', bars: 2 }], chords, [[0, 1, 60], [1, 1, 64], [2, 1, 67], [3.5, 1.5, 69], [5, 1, 60]]));
  const short = scores(track([{ kind: 'A', bars: 2 }], chords, [[0, 1, 60], [1, 1, 64], [2, 1, 67], [3.5, 0.4, 69], [5, 1, 60]]));
  assert.equal(held.fit, 1);
  assert.equal(short.fit, 0.8);
});

// Eight bars, each with its own rhythm so no two share a shape by accident.
const RHYTHMS = [[0, 2], [0, 1, 2], [0, 3], [0.5, 2], [0, 1.5, 3], [1, 2], [0, 2.5], [0, 1, 3]];
const bar = (b, rhythm, midis) => rhythm.map((t, i) => [b * 4 + t, 0.5, midis[i]]);
function eightBars(copy) {
  const notes = [];
  for (let b = 0; b < 8; b++) {
    const src = copy(b), r = RHYTHMS[src.bar];
    notes.push(...bar(b, r, r.map((_, i) => 64 + src.shift + (i % 2 ? 3 : 0))));
  }
  return notes;
}

test('repetition: a hook returning in bars 5–6 counts as exact; a step higher counts toward the hook only', () => {
  const exact = scores(track([{ kind: 'A', bars: 8 }], cmaj(8), eightBars((b) => ({ bar: b === 4 || b === 5 ? b - 4 : b, shift: 0 }))));
  const moved = scores(track([{ kind: 'A', bars: 8 }], cmaj(8), eightBars((b) => (b === 4 || b === 5 ? { bar: b - 4, shift: 2 } : { bar: b, shift: 0 }))));
  assert.equal(exact.exact, 2 / 7);
  assert.equal(exact.hook, 2 / 7);
  assert.equal(moved.exact, 0);
  assert.equal(moved.hook, 2 / 7);
});

test('repetition: a second A that copies the first halves the fresh share', () => {
  const once = eightBars((b) => ({ bar: b, shift: 0 }));
  const p = track([{ kind: 'A', bars: 8 }, { kind: 'A', bars: 8 }], cmaj(16), [...once, ...once.map(([t, l, m]) => [t + 32, l, m])]);
  assert.equal(scores(p).fresh, 0.5);
});

test('a track with no melody has no scores', () => {
  assert.equal(scores(track([{ kind: 'A', bars: 2 }], cmaj(2), [])), null);
});
