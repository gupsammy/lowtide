// The riff: a short figure played on every pass of the chord loop, the way the tune lives in the loop of a hit
// (RIFF.md). A one-bar cell, a rhythm and a shape, is drawn once per track and fitted to any loop's chords: each note
// is one the keys are voicing (or the root), walked through in the cell's shape. The same cell fitted to B's chords is
// still recognisably the same riff.
import { mod12 } from './theory.js';

// Eighth-note slots: the downbeat most, then the other beats, then the off-beats.
const SLOTS = { 0: 6, 2: 3, 4: 3, 6: 3, 1: 2, 3: 2, 5: 2, 7: 2 };

// R: the riff stream; notes: [lo, hi] notes a bar; span: how many arpeggio steps the shape may cover (the guitar's
// riff reaches wider, GUITAR.md §4). Returns { rhythm: [{ slot, len }] in eighths, shape: arpeggio
// steps from the bar's first note, breath: every second bar drops its last note, variant: how A′ differs }.
export function riffCell(R, notes, span = 4) {
  const count = R.int(notes), pool = { ...SLOTS }, slots = [];
  while (slots.length < count) { const s = Number(R.weighted(pool)); delete pool[s]; slots.push(s); }
  slots.sort((a, b) => a - b);
  const rhythm = slots.map((s, i) => ({ slot: s, len: (slots[i + 1] ?? Math.min(8, s + R.pick([2, 3]))) - s }));
  // mostly single steps along the arpeggio; after a jump of two, turn back; the shape spans at most `span` steps
  let step = 0, last = 0, lo = 0, hi = 0;
  const shape = rhythm.map((_, i) => {
    if (i === 0) return 0;
    let move = Math.abs(last) >= 2 ? -Math.sign(last) : Number(R.weighted({ 1: 4, '-1': 3, 2: 1.5, '-2': 1, 0: 0.7 }));
    if (Math.max(hi, step + move) - Math.min(lo, step + move) > span) move = -move;
    step += move; last = move; lo = Math.min(lo, step); hi = Math.max(hi, step);
    return step;
  });
  // a breath only where the bar can spare a note and still carry four
  return { rhythm, shape, breath: count > 4 && R.chance(0.5), variant: { kind: R.pick(['up', 'down', 'hold']), notes: R.pick([1, 2]) } };
}

// The notes the riff may use over a chord, within the band: the pitch classes the keys voice and the root, less any
// a semitone above a note the keys are holding (`held`, which may include the chord before), which would grind.
function arpeggio(chord, voicing, held, key, [lo, hi]) {
  const voiced = [...new Set([...voicing.map(mod12), mod12(key + chord.root)])];
  const ok = voiced.filter((pc) => !held.some((v) => mod12(pc - v) === 1));
  const pcs = ok.length ? ok : voicing.map(mod12);
  const out = [];
  for (let m = lo; m <= hi; m++) if (pcs.includes(mod12(m))) out.push(m);
  return out;
}

const nearest = (list, m) => list.reduce((bi, x, i) => (Math.abs(x - m) < Math.abs(list[bi] - m) ? i : bi), 0);

// One pass of the loop: [{ beat, len, midi, vel }], beats from the loop's start. alt: the A′ take, which changes the
// last bar only. chordAt(beat), voicingAt(beat): the chord a beat of the loop is heard over; heldAt(beat): every note
// the keys hold there, when that is more than the voicing.
export function fitRiff(cell, { bars, band, key, chordAt, voicingAt, heldAt = voicingAt }, alt = false) {
  const arpAt = (beat) => arpeggio(chordAt(beat), voicingAt(beat), heldAt(beat), key, band);
  const lowS = Math.min(...cell.shape), highS = Math.max(...cell.shape);
  const out = [];
  let anchor = band[0] + (band[1] - band[0]) / 3;
  for (let b = 0; b < bars; b++) {
    let notes = cell.rhythm.map((n, i) => ({ ...n, step: cell.shape[i] }));
    if (cell.breath && b % 2 === 1) notes = notes.slice(0, -1);
    // the bar's first note: the one nearest the last bar's, leaving room for the shape on both sides if it can
    const first = arpAt(b * 4 + notes[0].slot / 2);
    const room = first.map((m, i) => i).filter((i) => i + lowS >= 0 && i + highS < first.length);
    anchor = first[(room.length ? room : first.map((m, i) => i)).reduce((bi, i) => (Math.abs(first[i] - anchor) < Math.abs(first[bi] - anchor) ? i : bi))];
    for (const n of notes) {
      const beat = b * 4 + n.slot / 2, arp = arpAt(beat);
      const i = Math.max(0, Math.min(arp.length - 1, nearest(arp, anchor) + n.step));
      out.push({ beat, len: (n.len / 2) * 0.92, midi: arp[i], vel: n.slot === 0 ? 0.78 : n.slot % 2 ? 0.6 : 0.7 });
    }
  }
  return alt ? vary(cell.variant, out, bars, arpAt) : out;
}

// A′: the last bar's last notes move a step along the arpeggio, or its last note drops and the one before it holds.
function vary({ kind, notes: k }, riff, bars, arpAt) {
  const out = riff.map((n) => ({ ...n })), end = bars * 4, lastBar = out.filter((n) => n.beat >= end - 4);
  if (kind === 'hold') {
    const gone = lastBar[lastBar.length - 1];
    out.splice(out.indexOf(gone), 1);
    const held = out[out.length - 1];
    if (held) held.len = Math.max(held.len, (end - held.beat) * 0.92);
    return out;
  }
  for (const n of lastBar.slice(-k)) {
    const arp = arpAt(n.beat), i = arp.indexOf(n.midi), d = kind === 'up' ? 1 : -1;
    const j = arp[i + d] !== undefined ? i + d : i - d; // at the edge of the band, the other way
    if (arp[j] !== undefined) n.midi = arp[j];
  }
  return out;
}
