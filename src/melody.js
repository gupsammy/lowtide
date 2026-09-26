// A melody, built skeleton first and decorated after, the way a songwriter settles the long notes before the quick ones.
// 1. The idea: one bar of two to four notes on eighth-note slots, with a shape in scale steps.
// 2. The phrase form, one per song: which bars state the idea, which answer it, where it comes to rest.
// 3. The skeleton: each bar's first note (its target) is a note of the chord under it. A small search picks the
//    targets for the whole section at once, preferring steps, an arch, the new chord's 3rd or 7th, a proper cadence.
// 4. The decoration: the idea's other notes follow its shape from the target. Beats 1 and 3 land on chord notes;
//    no note sits a semitone above a note the keys are holding.
import { MODES, QUALITIES, chordPcs, mod12 } from './theory.js';

// A one-bar idea: [{ slot 0–7, len in eighths, step }], step in scale steps from the first note. Pass `rhythm` (an
// earlier idea) to keep its rhythm and draw only a new shape.
export function idea(R, rhythm) {
  const notes = rhythm ? rhythm.map(({ slot, len }) => ({ slot, len })) : ideaRhythm(R);
  let step = 0, last = 0, lo = 0, hi = 0;
  notes.forEach((n, i) => {
    if (i === 0) { n.step = 0; return; }
    // mostly steps, falling a little more often than rising; after a leap, turn back
    let move = Math.abs(last) >= 2 ? -Math.sign(last) : Number(R.weighted({ '-1': 4, 1: 3, '-2': 1.2, 2: 1, 0: 0.8, 3: 0.4, '-3': 0.5 }));
    if (Math.max(hi, step + move) - Math.min(lo, step + move) > 4) move = -move; // the shape spans at most 4 steps
    step += move; last = move; lo = Math.min(lo, step); hi = Math.max(hi, step);
    n.step = step;
  });
  return notes;
}

function ideaRhythm(R) {
  for (;;) {
    const count = Number(R.weighted({ 2: 2, 3: 3, 4: 2 })), slots = [];
    let slot = Number(R.weighted({ 0: 6, 1: 1, 2: 1.5 })); // mostly on the downbeat
    while (slots.length < count && slot < 8) { slots.push(slot); slot += Number(R.weighted({ 1: 2, 2: 4, 3: 2 })); }
    if (slots.length < 2) continue;
    return slots.map((s, i) => ({ slot: s, len: (slots[i + 1] ?? Math.min(8, s + R.pick([2, 3, 4]))) - s }));
  }
}

// Phrase forms, bar by bar, four bars to a phrase. 'half' ends the first half of a period on an open note.
export const FORMS = {
  sentence: ['idea', 'idea', 'fragment', 'cadence'],
  period: ['idea', 'half', 'idea', 'cadence'],
  aaba: ['idea', 'idea', 'contrast', 'cadence'],
  call: ['idea', 'rest', 'idea', 'cadence'],
};
// Scale degrees a cadence may end on: open ones leave the phrase hanging, closed ones bring it home.
const CADENCE = { open: [2, 5, 7], closed: [1, 3] };

// A note a semitone above a note the keys hold grinds against it (a minor 9th).
export const rubs = (midi, voicing) => voicing.some((v) => mod12(midi - v) === 1);

const moveCost = (d) => (d === 0 ? 0.7 : d <= 2 ? 0.15 * d : d <= 4 ? 0.45 * d : d <= 7 ? 0.8 * d : 1.5 * d);
// The phrase rises to a peak about two thirds through and falls faster than it rose.
const arch = (x) => (x <= 0.62 ? Math.sin((Math.PI / 2) * (x / 0.62)) : Math.cos((Math.PI / 2) * Math.min(1, (x - 0.62) / 0.38)));

// The notes of one bar before any pitch is chosen: [{ slot, len, step }], step counted from the bar's target.
function barShape(role, I) {
  if (role === 'rest') return [];
  if (role === 'cadence' || role === 'half') return [{ slot: 0, len: 6, step: 0, cadence: true }];
  if (role === 'contrast') return I.map((n) => ({ ...n, step: -n.step }));
  if (role === 'fragment') {
    // the idea's first half, then again a step lower: the quickening in the third bar of a sentence
    const half = I.filter((n) => n.slot < 4).map((n) => ({ ...n, len: Math.min(n.len, 4 - n.slot) }));
    const h = half.length ? half : [{ slot: 0, len: 2, step: 0 }];
    return [...h, ...h.map((n) => ({ ...n, slot: n.slot + 4, step: n.step - 1 }))];
  }
  return I.map((n) => ({ ...n }));
}

// idea: from idea(); form: a FORMS key; band: [lo, hi] MIDI notes the melody may use; chordAt(beat) and
// voicingAt(beat): what sounds under a beat of the section. Returns [{ beat (from the section's start), len, midi, vel }].
export function writeMelody(R, { idea: I, form, bars, key, mode, band: [lo, hi], chordAt, voicingAt }) {
  const phrases = Math.ceil(bars / 4);
  const plan = Array.from({ length: bars }, (_, b) => {
    const role = FORMS[form][b % 4], phrase = Math.floor(b / 4);
    const cadence = role === 'half' ? 'open' : role === 'cadence' ? (phrase === phrases - 1 ? 'closed' : 'open') : null;
    return { b, role, cadence, notes: barShape(role, I), phrase };
  });
  const scaleNotes = (ch) => {
    const pcs = (ch.scale ?? QUALITIES[ch.q]).map((x) => mod12(key + ch.root + x));
    const out = [];
    for (let m = lo - 14; m <= hi + 14; m++) if (pcs.includes(mod12(m))) out.push(m);
    return out;
  };
  // k scale steps from a note, along the scale of the chord in force (a chromatic note steps from its neighbours)
  const stepFrom = (m, k, ch) => {
    if (!k) return m;
    const s = scaleNotes(ch);
    let i = s.indexOf(m);
    if (i < 0) i = k > 0 ? s.findLastIndex((x) => x < m) : s.findIndex((x) => x > m);
    return s[Math.max(0, Math.min(s.length - 1, i + k))];
  };
  const tonesOf = (ch) => chordPcs(key + ch.root, ch.q);
  const inBand = (m) => m >= lo && m <= hi;
  const degreeIn = (m) => { const i = MODES[mode].indexOf(mod12(m - key)); return i < 0 ? null : i + 1; }; // 1–7 in the mode

  // Decorate one bar from a target: the other notes follow the shape; strong beats move to chord notes along their
  // own direction of motion; weak notes that rub move a step.
  const realise = (P, T) => {
    const out = [];
    let prev = T;
    P.notes.forEach((n, i) => {
      const beat = P.b * 4 + n.slot / 2, ch = chordAt(beat), v = voicingAt(beat), tones = tonesOf(ch);
      let m = i === 0 ? T : stepFrom(T, n.step, ch);
      if (!inBand(m)) m = stepFrom(T, -n.step, ch); // a shape that would leave the band turns the other way
      if (!inBand(m)) m = T;
      if (i > 0) {
        const dir = Math.sign(m - prev) || (m > (lo + hi) / 2 ? -1 : 1);
        const strong = n.slot === 0 || n.slot === 4;
        const ok = (x) => inBand(x) && !rubs(x, v) && (!strong || tones.includes(mod12(x)));
        if (!ok(m)) {
          const along = [1, 2, 3, 4].map((d) => m + dir * d), back = [1, 2, 3, 4].map((d) => m - dir * d);
          const pool = strong ? [...along, ...back] : [stepFrom(m, dir, ch), stepFrom(m, -dir, ch), ...along, ...back];
          m = pool.find(ok) ?? m;
        }
      }
      out.push({ ...n, midi: m });
      prev = m;
    });
    return out;
  };

  // The skeleton: a shortest path through each bar's candidate targets.
  const bars_ = plan.filter((P) => P.notes.length);
  const states = bars_.map((P) => {
    const first = P.notes[0], beat = P.b * 4 + first.slot / 2, ch = chordAt(beat), v = voicingAt(beat);
    const tones = tonesOf(ch), ivs = QUALITIES[ch.q];
    let cands = [];
    for (let m = lo; m <= hi; m++) if (tones.includes(mod12(m)) && !rubs(m, v)) cands.push(m);
    if (!cands.length) for (let m = lo; m <= hi; m++) if (tones.includes(mod12(m))) cands.push(m);
    const inPhrase = (P.b % 4 + first.slot / 8) / 4, lastPhrase = phrases > 1 && P.phrase === phrases - 1;
    const aim = lo + 3 + 0.5 * (hi - lo) * (lastPhrase ? 1.15 : 1) * arch(inPhrase);
    return cands.map((m) => {
      const iv = ivs.find((x) => mod12(key + ch.root + x) === mod12(m));
      let cost = 0.18 * Math.abs(m - aim) + R.next() * 0.3;
      if (iv > 12) cost += 0.25; // a 9th, 11th or 13th as the long note: lovely, but not every time
      if (P.cadence && !CADENCE[P.cadence].includes(degreeIn(m))) cost += 1.5;
      return { m, cost, notes: realise(P, m), ch, guide: [3, 4, 10, 11].includes(mod12(iv)) };
    });
  });
  const best = states.map((S) => S.map(() => ({ total: Infinity, from: -1 })));
  states[0]?.forEach((s, j) => (best[0][j] = { total: s.cost, from: -1 }));
  for (let i = 1; i < states.length; i++) {
    const gap = bars_[i].b - bars_[i - 1].b; // a rest between two bars loosens the join
    states[i].forEach((s, j) => {
      const changed = s.ch !== states[i - 1][0]?.ch;
      const own = s.cost - (changed && s.guide ? 0.35 : 0);
      states[i - 1].forEach((p, k) => {
        const join = moveCost(Math.abs(s.m - p.notes[p.notes.length - 1].midi)) * (gap > 1 ? 0.5 : 1);
        const total = best[i - 1][k].total + join + own;
        if (total < best[i][j].total) best[i][j] = { total, from: k };
      });
    });
  }
  const path = [];
  if (states.length) {
    let j = best[best.length - 1].reduce((bi, x, k, a) => (x.total < a[bi].total ? k : bi), 0);
    for (let i = states.length - 1; i >= 0; i--) { path[i] = states[i][j]; j = best[i][j].from; }
  }

  // Out to notes. A cadence bar with another bar after it gets a pickup: a step next to the next target.
  const out = [];
  path.forEach((s, i) => {
    const P = bars_[i], next = path[i + 1];
    for (const n of s.notes) {
      const pos = (n.midi - lo) / Math.max(1, hi - lo);
      out.push({ beat: P.b * 4 + n.slot / 2, len: (n.len / 2) * 0.92, midi: n.midi, vel: n.cadence ? 0.7 : 0.62 + 0.22 * pos + (n === s.notes[0] ? 0.06 : 0) });
    }
    if (s.notes[0].cadence && next && bars_[i + 1].b === P.b + 1) {
      const beat = P.b * 4 + 3.5, ch = chordAt(beat);
      const side = next.m >= s.m ? -1 : 1, m = stepFrom(next.m, side, ch);
      if (inBand(m) && !rubs(m, voicingAt(beat)) && m !== next.m) {
        out[out.length - 1].len = Math.min(out[out.length - 1].len, 3 * 0.92);
        out.push({ beat, len: 0.46, midi: m, vel: 0.6 });
      }
    }
  });
  return out;
}
