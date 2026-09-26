// How a chord is spread across the keyboard. The root goes to the bass; the hands play the colour notes. Each next
// voicing is the one that moves the fewest semitones from the last, with a penalty when the top note leaps, because
// the top note is what the ear follows as a melody.
import { chordTones, mod12 } from './theory.js';

// Styles: which chord notes to use (as intervals above the root) and how far the hand may stretch.
export const VOICINGS = {
  // 3-7-9 with the 5th or 13th: the jazz pianist's left hand
  rootless: { span: [7, 12], notes: (t) => [t.third, t.seventh ?? t.fifth + 2, t.upper[0] ?? t.fifth, t.upper[1] ?? t.fifth] },
  // a close four-note chord with its second note from the top dropped an octave: open, even, piano-like
  drop2: { span: [13, 19], notes: (t) => [t.third, t.fifth, t.seventh ?? 9, t.upper[0] ?? 12] },
  // stacked fourths: modern, open, a little unresolved
  quartal: { span: [10, 17], fourths: true, notes: (t) => [t.third, t.seventh ?? t.fifth, t.upper[0] ?? 12, (t.upper[1] ?? t.fifth + 12)] },
  // a tight cluster with seconds in it: soft, blurry
  cluster: { span: [5, 10], notes: (t) => [t.third, t.fifth, t.seventh ?? 9, t.upper[0] ?? 14] },
};

const LOW = 50, HIGH = 80;

function candidates(pcs, lo, hi) {
  const options = pcs.map((pc) => {
    const out = [];
    for (let m = lo; m <= hi; m++) if (mod12(m) === pc) out.push(m);
    return out;
  });
  const res = [];
  const walk = (i, acc) => {
    if (i === options.length) { res.push([...acc].sort((a, b) => a - b)); return; }
    for (const m of options[i]) { acc.push(m); walk(i + 1, acc); acc.pop(); }
  };
  walk(0, []);
  return res;
}

// Rules every voicing must pass: no doubled notes, no minor second at the bottom (mud), no minor ninth between two
// voices (the harshest interval in a chord), nothing too close together low down.
function playable(v) {
  for (let i = 1; i < v.length; i++) if (v[i] === v[i - 1]) return false;
  if (v[1] - v[0] === 1) return false;
  for (let i = 0; i < v.length; i++) for (let j = i + 1; j < v.length; j++) if (v[j] - v[i] === 13) return false;
  for (let i = 1; i < v.length; i++) if (v[i] < 55 && v[i] - v[i - 1] < 3) return false;
  return true;
}

const mean = (v) => v.reduce((s, x) => s + x, 0) / v.length;

function movement(v, prev) {
  let cost = 0;
  for (const m of v) cost += Math.min(...prev.map((p) => Math.abs(m - p)));
  const leap = Math.abs(v[v.length - 1] - prev[prev.length - 1]);
  return cost + 2 * Math.max(0, leap - 5);
}

// chord: { root (from the key), q }; key: tonic pitch class; center: the register the hands lean towards.
export function voice(chord, key, style, prev, center) {
  const V = VOICINGS[style], t = chordTones(chord.q);
  const ivs = [...new Set(V.notes(t).map((x) => mod12(x)))];
  const pcs = ivs.map((x) => mod12(key + chord.root + x));
  const lo = Math.max(LOW, Math.round(center) - 12), hi = Math.min(HIGH, Math.round(center) + 12);
  let best = null, bestCost = Infinity;
  for (const v of candidates(pcs, lo, hi)) {
    const span = v[v.length - 1] - v[0];
    if (span < V.span[0] || span > V.span[1] || !playable(v)) continue;
    let cost = prev ? movement(v, prev) + 0.3 * Math.abs(mean(v) - center) : 1.5 * Math.abs(mean(v) - center);
    if (V.fourths) for (let i = 1; i < v.length; i++) cost += Math.abs(v[i] - v[i - 1] - 5) * 0.4;
    if (cost < bestCost) { bestCost = cost; best = v; }
  }
  // A style may not fit a chord in range (a cluster over a sus chord, say); a plain close voicing always does.
  if (!best && style !== 'rootless') return voice(chord, key, 'rootless', prev, center);
  if (!best) { let m = lo - 1; best = pcs.map((pc) => { m++; while (mod12(m) !== pc) m++; return m; }).sort((a, b) => a - b); }
  return best;
}

// The bass plays the root, in the octave nearest the last bass note.
export function bassNote(chord, key, prev = 40) {
  const pc = mod12(key + chord.root);
  let best = null;
  for (let m = 33; m <= 50; m++) if (mod12(m) === pc && (best === null || Math.abs(m - prev) < Math.abs(best - prev))) best = m;
  return best;
}
