// A melody grows from one small idea (a motif): two to four notes in one bar. A four-bar phrase states it, repeats it
// changed (moved up or down, shifted in time, turned upside down) and ends on a note that rests. Notes on the beat
// land on the chord's own notes; notes between beats may pass through the scale. Positions are in eighth notes.
import { MODES, chordPcs, mod12 } from './theory.js';

export function motif(R) {
  const notes = [];
  let slot = Number(R.weighted({ 0: 3, 1: 2, 2: 2, 3: 1 })), step = 0, lastMove = 0;
  const count = R.int([2, 4]);
  while (notes.length < count && slot < 8) {
    notes.push({ slot, step });
    slot += Number(R.weighted({ 1: 3, 2: 4, 3: 2 }));
    // mostly steps; after a leap, step back the other way, as singers do
    const move = Math.abs(lastMove) >= 2 ? -Math.sign(lastMove) : Number(R.weighted({ '-1': 3, 1: 3, '-2': 1.5, 2: 1.5, 0: 1, 3: 0.7, '-3': 0.7 }));
    step += move; lastMove = move;
  }
  for (let i = 0; i < notes.length; i++) notes[i].len = Math.max(1, (notes[i + 1]?.slot ?? Math.max(8, notes[i].slot + 2)) - notes[i].slot);
  return notes;
}

// Ways to restate a motif.
const DEVELOP = {
  same: (m) => m,
  up: (m) => m.map((n) => ({ ...n, step: n.step + 1 })),
  down: (m) => m.map((n) => ({ ...n, step: n.step - 2 })),
  late: (m) => m.filter((n) => n.slot < 7).map((n) => ({ ...n, slot: n.slot + 1 })),
  invert: (m) => m.map((n) => ({ ...n, step: -n.step })),
  short: (m) => m.slice(0, Math.max(1, m.length - 1)).map((n, i, a) => (i === a.length - 1 ? { ...n, len: 8 - n.slot } : n)),
};

// A four-bar phrase: the idea, an answer to it, the idea changed, and an ending. Returns notes with bar numbers.
function phrase(R, m, dev) {
  const answer = R.chance(0.5) ? [] : DEVELOP[R.pick(['short', 'late'])](m);
  const bars = [m, answer, DEVELOP[dev](m), DEVELOP[R.pick(['short', 'same', 'down'])](m)];
  return bars.flatMap((notes, bar) => notes.map((n) => ({ ...n, bar })));
}

// Turn scale steps into MIDI notes over the chords. anchor: the MIDI note that step 0 starts from.
function realise(notes, { key, mode, anchor, chordAt }) {
  const scale = MODES[mode];
  const degreeOf = (m) => scale.indexOf(mod12(m - key));
  // step 0 sits on the scale note nearest the anchor
  let base = anchor;
  while (degreeOf(base) < 0) base--;
  const baseDeg = degreeOf(base), baseOct = Math.floor((base - key) / 12);
  const fromStep = (s) => {
    const d = baseDeg + s, o = Math.floor(d / 7);
    return key + (baseOct + o) * 12 + scale[((d % 7) + 7) % 7];
  };
  return notes.map((n, i) => {
    const beat = n.bar * 4 + n.slot / 2, ch = chordAt(beat);
    const tones = chordPcs(key + ch.root, ch.q).map(mod12);
    let midi = fromStep(n.step);
    const onBeat = n.slot % 2 === 0, last = i === notes.length - 1;
    const clash = clashes(midi, tones, ch.q);
    if (onBeat || last || clash) midi = nearestIn(midi, last ? restingTones(ch, key) : tones);
    return { beat, len: n.len / 2, midi, vel: onBeat ? 0.8 : 0.65 };
  });
}

// A note a semitone above a chord note, and not in the chord itself, grinds against it (a minor ninth). The 7♭9
// chord is built on exactly that sound, so it's allowed there.
export const clashes = (midi, tones, q) => q !== '7b9' && !tones.includes(mod12(midi)) && tones.some((t) => mod12(midi - t) === 1);

// The notes a phrase may end on: the chord's colour notes (9th, 7th) and its third.
function restingTones(ch, key) {
  const iv = chordPcs(0, ch.q);
  const keep = iv.filter((x) => [2, 3, 4, 10, 11].includes(mod12(x)));
  return (keep.length ? keep : iv).map((x) => mod12(key + ch.root + x));
}

function nearestIn(midi, pcs) {
  for (let d = 0; d <= 6; d++) for (const m of [midi + d, midi - d]) if (pcs.includes(mod12(m))) return m;
  return midi;
}

// A melody over a stretch of bars: phrases of four bars, each restating the motif with a development.
export function melodyLine(R, { m, bars, key, mode, anchor, chordAt, devs }) {
  const out = [];
  for (let b = 0; b < bars; b += 4) {
    const notes = phrase(R, m, devs[(b / 4) % devs.length]).filter((n) => n.bar + b < bars).map((n) => ({ ...n, bar: n.bar + b }));
    out.push(...realise(notes, { key, mode, anchor, chordAt }));
  }
  return out;
}

export const DEVELOPMENTS = Object.keys(DEVELOP);
