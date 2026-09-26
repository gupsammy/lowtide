// A melody, built skeleton first and decorated after, the way a songwriter settles the long notes before the quick
// ones (MELODY.md §3).
// 1. The hook: two bars, an idea and an answer that carries the ending, drawn in the track's character (how many
//    notes and how long, how often a note repeats, one signature leap).
// 2. Phrases in 4-bar units: the lead plays the unit's first 1–3 bars and rests to its end. The first unit states the
//    hook and ends open; later units bring its idea bars back note for note where the chords repeat, and the last
//    one closes on degree 1 or 3, over a home chord where the loop reaches one.
// 3. The skeleton: each bar has a target (the idea's first note, or the answer's last) on a note of the chord under
//    it. A small search picks a unit's targets at once, preferring steps within and between bars, the phrase's
//    contour, the new chord's 3rd or 7th, and a proper ending.
// 4. The decoration: the other notes follow the shape, each from its neighbour. Beats 1 and 3 land on chord notes; no
//    note sits a semitone above a note the keys are holding.
// 5. One peak: the section's top note sounds once, in its second half, on the note whose lift there moves least.
import { MODES, QUALITIES, chordPcs, mod12 } from './theory.js';

// How each character phrases (MELODY.md §2–3). play: bars played per 4-bar unit (weights); notes: [fewest, most] in
// the two-bar hook; motif: the hook is a one-bar motif stated twice; lens: note lengths in eighths (weights); repeat:
// how often a note repeats the one before (weight among the moves); leap: the hook's signature leap; contours: the
// phrase shapes (weights); returns: odds a section brings its idea bars back note for note; lift: semitones B's band
// sits above A's.
export const CHARACTERS = {
  sparse: { play: { 1: 1, 2: 4, 3: 1 }, notes: [2, 4], lens: { 3: 2, 4: 3, 6: 2 }, repeat: 0.8, leap: null, contours: { fall: 1, arch: 1 }, returns: 0.8, lift: 2 },
  singable: { play: { 2: 3, 3: 1 }, notes: [4, 8], lens: { 1: 2, 2: 3, 3: 1 }, repeat: 3, leap: 'up', contours: { arch: 3, ramp: 1, terrace: 1 }, returns: 0.9, lift: 3 },
  soloist: { play: { 2: 2, 3: 1 }, notes: [5, 8], lens: { 1: 3, 2: 2 }, repeat: 0.4, leap: 'any', contours: { arch: 2, ramp: 1, terrace: 1 }, returns: 0.6, lift: 2 },
  drifting: { play: { 2: 1, 3: 1 }, notes: [3, 5], motif: true, lens: { 2: 3, 3: 2 }, repeat: 1.8, leap: 'fourths', contours: { hover: 2, arch: 1 }, returns: 0.9, lift: 2 },
};

// Phrase shapes: where the line aims, 0 (the band's floor) to 1, at x, 0–1 through the bars a unit plays.
const arch = (x) => (x <= 0.62 ? Math.sin((Math.PI / 2) * (x / 0.62)) : Math.cos((Math.PI / 2) * Math.min(1, (x - 0.62) / 0.38)));
const CONTOURS = {
  arch, // rises to a peak about two thirds through and falls faster than it rose
  fall: (x) => 0.9 - 0.7 * x, // starts high and comes down
  ramp: (x) => 0.2 + 0.7 * x, // climbs
  terrace: (x) => 0.25 + 0.5 * ((2 * x) % 1), // climbs, drops back, climbs again
  hover: () => 0.5, // stays near the middle
};

// Notes packed from slot `from` to `to` (eighths within a bar), lengths drawn from `lens`, now and then an eighth's
// breath between them.
function fill(R, count, lens, from, to) {
  const out = [];
  for (let slot = from; out.length < count && slot < to;) {
    const len = Math.min(Number(R.weighted(lens)), to - slot);
    out.push({ slot, len });
    slot += len + (R.chance(0.15) ? 1 : 0);
  }
  return out;
}

// The idea's shape in scale steps from its first note: mostly steps, falling a little more often than rising; a
// leap turns back; the shape spans at most 4 steps, apart from the character's one signature leap.
function shape(R, C, count) {
  const moves = { '-1': 4, 1: 3, '-2': 0.6, 2: 0.5, 0: C.repeat, 3: C.leap === 'fourths' ? 1.2 : 0.4, '-3': C.leap === 'fourths' ? 1.2 : 0.5 };
  const leapAt = C.leap && C.leap !== 'fourths' && count >= 3 ? R.int([1, count - 1]) : -1;
  const steps = [0];
  let last = 0, lo = 0, hi = 0;
  for (let i = 1; i < count; i++) {
    const at = steps[i - 1];
    let move;
    if (i === leapAt) move = C.leap === 'up' ? R.int([3, 5]) : R.pick([-4, -3, 3, 4]); // a 4th to a 6th
    else {
      move = Math.abs(last) >= 2 ? -Math.sign(last) : Number(R.weighted(moves));
      if (Math.max(hi, at + move) - Math.min(lo, at + move) > 4 + (leapAt > 0 ? 5 : 0)) move = -move;
    }
    steps.push(at + move);
    last = move; lo = Math.min(lo, at + move); hi = Math.max(hi, at + move);
  }
  return steps;
}

// The hook: { idea, answer }, each one bar of [{ slot, len, step }] with slot and len in eighths. The idea's steps
// count from its first note; the answer's lead into its last note, the ending, mostly stepping down onto it.
// longer: B's hook, a little slower.
export function hook(R, C, { longer = false } = {}) {
  const lens = longer ? Object.fromEntries(Object.entries(C.lens).map(([l, w]) => [Number(l) + 1, w])) : C.lens;
  const n = R.int(C.notes), start = Number(R.weighted({ 0: 6, 1: 1, 2: 1.5 }));
  const ideaCount = C.motif ? n : Math.ceil(n / 2);
  const rhythm = fill(R, ideaCount, lens, start, 8), steps = shape(R, C, rhythm.length);
  const idea = rhythm.map((x, i) => ({ ...x, step: steps[i] }));
  if (C.motif) { // the motif again, its last note held to the bar's end as the ending
    const last = idea[idea.length - 1];
    return { idea, answer: idea.map((x) => ({ ...x, step: x.step - last.step, ...(x === last ? { len: 8 - x.slot, end: true } : {}) })) };
  }
  const count = Math.max(1, n - idea.length), end = count === 1 ? Number(R.weighted({ 0: 2, 2: 1 })) : count === 2 ? Number(R.weighted({ 2: 1, 4: 3 })) : 4;
  const before = fill(R, count - 1, lens, 0, end), steps2 = [0];
  for (let i = 0; i < before.length; i++) steps2.unshift(steps2[0] + Number(R.weighted({ 1: 4, 2: 0.6, '-1': 1.5, 0: C.repeat * 0.5 })));
  const answer = [...before, { slot: end, len: 8 - end, end: true }].map((x, i) => ({ ...x, step: steps2[i] }));
  return { idea, answer };
}

// Scale degrees an ending may rest on: an open one leaves the phrase hanging, a closed one brings it home.
const ENDINGS = { open: [2, 5, 7], closed: [1, 3] };

// A note a semitone above a note the keys hold grinds against it (a minor 9th).
export const rubs = (midi, voicing) => voicing.some((v) => mod12(midi - v) === 1);

const moveCost = (d) => (d === 0 ? 0.7 : d <= 2 ? 0.15 * d : d <= 4 ? 0.45 * d : d <= 7 ? 0.8 * d : 1.5 * d);

// character: from CHARACTERS; hook: from hook(); bars: the section's length; band: [lo, hi] MIDI notes the melody
// may use; chordAt(beat) and voicingAt(beat): what sounds under a beat of the section; maxPlay: most bars played per
// unit. Returns [{ beat (from the section's start), len, midi, vel, end }], end marking each phrase's last note.
export function writeMelody(R, { character: C, hook: H, bars, key, mode, band: [lo, hi], chordAt, voicingAt, maxPlay = 3 }) {
  const units = Math.ceil(bars / 4), play = Math.min(maxPlay, Number(R.weighted(C.play)));
  const returns = R.chance(C.returns);
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
  const home = (b, slot) => chordAt(b * 4 + slot / 2).root === 0;
  const tonicFn = (b, slot) => chordAt(b * 4 + slot / 2).fn === 'T';

  // The bars of each unit. The last unit closes where a home chord sounds, if one comes within its first 3 bars.
  const plan = [];
  for (let u = 0; u < units; u++) {
    const base = u * 4, last = u === units - 1, room = Math.min(4, bars - base);
    let k = Math.min(play, room);
    if (last) {
      const at = (test) => [k - 1, ...[1, 2, 3].filter((j) => j !== k - 1)].find((j) => j >= 1 && j < Math.min(room, maxPlay + 1)
        && [0, 4].some((s) => test(base + j, s)));
      k = (at(home) ?? at(tonicFn) ?? k - 1) + 1;
    }
    for (let j = 0; j < k; j++) {
      const answer = j === k - 1, notes = answer ? H.answer : H.idea;
      plan.push({ b: base + j, u, j, answer, ending: answer ? (last ? 'closed' : 'open') : null, contour: null, played: k, notes });
    }
  }
  const contours = Array.from({ length: units }, () => CONTOURS[R.weighted(C.contours)]);

  // The closing bar needs room for the peak before its ending, and its ending on the home chord if the bar has one.
  const closing = plan[plan.length - 1];
  if (closing.ending === 'closed') {
    let notes = closing.notes;
    if (notes.length < 2) { const e = notes[0]; notes = [{ slot: 0, len: 2, step: 2 }, { ...e, slot: Math.max(2, e.slot), len: 8 - Math.max(2, e.slot) }]; }
    const end = notes[notes.length - 1];
    const slot = [end.slot, 4, 2, 0].find((s) => s >= notes.length - 1 && home(closing.b, s)) ?? end.slot;
    if (slot !== end.slot) {
      const before = notes.slice(0, -1).filter((x) => x.slot < slot).map((x) => ({ ...x, len: Math.min(x.len, slot - x.slot) }));
      notes = [...(before.length ? before : [{ slot: 0, len: slot, step: 2 }]), { ...end, slot, len: 8 - slot }];
    }
    closing.notes = notes;
  }

  // Decorate one bar from its target T, the anchor: each other note moves from its neighbour nearer the anchor by
  // the shape's step, so a note nudged to fit shifts the notes beyond it too and every move keeps its size. Strong
  // beats move to the nearest chord note; weak notes that rub move a step.
  const anchorOf = (P) => (P.answer ? P.notes.length - 1 : 0);
  const realise = (P, T) => {
    const a = anchorOf(P), out = [];
    out[a] = { ...P.notes[a], midi: T };
    const place = (i, j) => {
      const n = P.notes[i], beat = P.b * 4 + n.slot / 2, ch = chordAt(beat), v = voicingAt(beat), tones = tonesOf(ch);
      const from = out[j].midi, k = n.step - P.notes[j].step;
      let m = stepFrom(from, k, ch);
      if (!inBand(m)) m = stepFrom(from, -k, ch); // a move that would leave the band turns the other way
      if (!inBand(m)) m = from;
      const dir = Math.sign(m - from) || (m > (lo + hi) / 2 ? -1 : 1), strong = n.slot === 0 || n.slot === 4;
      const ok = (x) => inBand(x) && !rubs(x, v) && (!strong || tones.includes(mod12(x)));
      if (!ok(m)) {
        const near = [1, 2, 3, 4].flatMap((d) => [m + dir * d, m - dir * d]);
        m = (strong ? near : [stepFrom(m, dir, ch), stepFrom(m, -dir, ch), ...near]).find(ok) ?? m;
      }
      out[i] = { ...n, midi: m };
    };
    for (let i = a + 1; i < P.notes.length; i++) place(i, i - 1);
    for (let i = a - 1; i >= 0; i--) place(i, i + 1);
    return out;
  };

  // A bar's candidate targets: chord notes in the band, free of rubs, each costed by its distance from the phrase's
  // aim, its colour, for an ending its degree, and the moves of the bar it decorates into.
  const candidates = (P, contour) => {
    const t = P.notes[anchorOf(P)], beat = P.b * 4 + t.slot / 2, ch = chordAt(beat), v = voicingAt(beat), tones = tonesOf(ch), ivs = QUALITIES[ch.q];
    let ms = [];
    for (let m = lo; m <= hi; m++) if (tones.includes(mod12(m)) && !rubs(m, v)) ms.push(m);
    if (!ms.length) for (let m = lo; m <= hi; m++) if (tones.includes(mod12(m))) ms.push(m);
    const x = (P.j + t.slot / 8) / P.played, aim = lo + 2 + 0.6 * (hi - lo) * contour(x) * (P.u === units - 1 && units > 1 ? 1.1 : 1);
    const pull = contour === CONTOURS.hover ? 0.45 : 0.18;
    return ms.map((m) => {
      const iv = ivs.find((x) => mod12(key + ch.root + x) === mod12(m));
      let cost = pull * Math.abs(m - aim) + R.next() * 0.3;
      if (iv > 12) cost += 0.25; // a 9th, 11th or 13th as the long note: lovely, but not every time
      if (P.ending && !ENDINGS[P.ending].includes(degreeIn(m)) && !(P.ending === 'open' && iv > 12)) cost += 1.5;
      const notes = realise(P, m);
      for (let i = 1; i < notes.length; i++) cost += moveCost(Math.abs(notes[i].midi - notes[i - 1].midi)); // the bar's own moves
      return { cost, notes, ch, guide: [3, 4, 10, 11].includes(mod12(iv)) };
    });
  };

  // The skeleton for one unit: a shortest path through its bars' targets, joined smoothly to the note before. Bars
  // given as `fixed` (a returning idea) keep their notes.
  const solve = (Ps, fixed, prev) => {
    const states = Ps.map((P, i) => (fixed[i] ? [{ cost: 0, notes: fixed[i], ch: chordAt(P.b * 4 + P.notes[0].slot / 2), guide: false }] : candidates(P, contours[P.u])));
    const best = states.map((S) => S.map(() => ({ total: Infinity, from: -1 })));
    const join = (s, last, gap) => (last === null ? 0 : moveCost(Math.abs(s.notes[0].midi - last)) * (gap > 1 ? 0.5 : 1));
    states[0].forEach((s, j) => (best[0][j] = { total: s.cost + join(s, prev?.midi ?? null, prev ? Ps[0].b - prev.b : 1), from: -1 }));
    for (let i = 1; i < states.length; i++) states[i].forEach((s, j) => {
      const own = s.cost - (s.ch !== states[i - 1][0].ch && s.guide ? 0.35 : 0);
      states[i - 1].forEach((p, k) => {
        const total = best[i - 1][k].total + join(s, p.notes[p.notes.length - 1].midi, Ps[i].b - Ps[i - 1].b) + own;
        if (total < best[i][j].total) best[i][j] = { total, from: k };
      });
    });
    const path = [];
    let j = best[best.length - 1].reduce((bi, x, k, a) => (x.total < a[bi].total ? k : bi), 0);
    for (let i = states.length - 1; i >= 0; i--) { path[i] = states[i][j].notes; j = best[i][j].from; }
    return path;
  };

  // The hook first, then each later unit, bringing back the hook's idea bars where the chords under them repeat.
  const written = new Map(), returned = new Set(), sameUnder = (P, Q) => P.notes.every((n) => {
    const s = n.slot / 2;
    return chordAt(P.b * 4 + s) === chordAt(Q.b * 4 + s) && voicingAt(P.b * 4 + s) === voicingAt(Q.b * 4 + s);
  });
  let prev = null;
  for (let u = 0; u < units; u++) {
    const Ps = plan.filter((P) => P.u === u);
    const fixed = Ps.map((P) => {
      const first = u > 0 && returns && !P.answer && plan.find((Q) => Q.u === 0 && Q.j === P.j && !Q.answer);
      return first && sameUnder(first, P) ? written.get(first) : null;
    });
    Ps.forEach((P, i) => fixed[i] && returned.add(P));
    solve(Ps, fixed, prev).forEach((notes, i) => written.set(Ps[i], notes));
    const lastBar = Ps[Ps.length - 1], n = written.get(lastBar);
    prev = { midi: n[n.length - 1].midi, b: lastBar.b };
  }

  // One peak: the section's top note sounds once, in its second half. Of the notes there that may move (not an
  // ending, not in a returning idea bar), the one whose lift to it adds the least motion to its neighbours rises to
  // the lowest chord note above everything else, if the band leaves room.
  if (closing.ending === 'closed') {
    const line = plan.flatMap((P) => written.get(P).map((n, i) => ({ n, P, end: P.answer && i === P.notes.length - 1 })));
    let best = null;
    line.forEach((x, i) => {
      const beat = x.P.b * 4 + x.n.slot / 2;
      if (beat < bars * 2 || x.end || returned.has(x.P)) return;
      const others = Math.max(...line.filter((y) => y !== x).map((y) => y.n.midi)), v = voicingAt(beat), tones = tonesOf(chordAt(beat));
      let m = x.n.midi > others ? x.n.midi : null;
      for (let c = others + 1; m === null && c <= hi + 2; c++) if (tones.includes(mod12(c)) && !rubs(c, v)) m = c;
      if (m === null) return;
      const cost = [line[i - 1], line[i + 1]].filter(Boolean).reduce((s, y) => s + moveCost(Math.abs(m - y.n.midi)) - moveCost(Math.abs(x.n.midi - y.n.midi)), 0);
      if (!best || cost < best.cost) best = { cost, x, m };
    });
    if (best) best.x.n.midi = best.m;
  }

  // Out to notes.
  const out = [];
  for (const P of plan) {
    const notes = written.get(P);
    notes.forEach((n, i) => {
      const pos = (n.midi - lo) / Math.max(1, hi - lo);
      out.push({ beat: P.b * 4 + n.slot / 2, len: (n.len / 2) * 0.92, midi: n.midi, vel: n.end ? 0.7 : 0.62 + 0.22 * pos + (i === 0 ? 0.06 : 0), end: P.answer && i === notes.length - 1 });
    });
  }
  return out;
}

// A later statement that changes one thing: its last note becomes the other closed degree, is held on into the
// bar after, or arrives an eighth early. Each is tried in a random order; one that won't fit is skipped.
export function vary(R, notes, { key, mode, band: [lo, hi], chordAt, voicingAt, bars }) {
  const out = notes.map((n) => ({ ...n })), last = out[out.length - 1], before = out[out.length - 2];
  const fits = (m, beat) => m >= lo && m <= hi && !rubs(m, voicingAt(beat));
  const ways = {
    other: () => {
      const want = MODES[mode].indexOf(mod12(last.midi - key)) === 0 ? 2 : 0; // degree 1 ↔ 3
      const pc = mod12(key + MODES[mode][want]), ch = chordAt(last.beat);
      const m = [0, -1, 1, -2, 2, -3, 3, -4, 4].map((d) => last.midi + d).find((x) => mod12(x) === pc && x !== last.midi);
      if (m === undefined || !fits(m, last.beat) || !chordPcs(key + ch.root, ch.q).includes(pc)) return false;
      last.midi = m;
      return true;
    },
    hold: () => {
      const end = last.beat + last.len + 4;
      if (end > bars * 4 - 0.5) return false;
      last.len += 4 * 0.92;
      return true;
    },
    early: () => {
      const beat = last.beat - 0.5;
      if (!before || before.beat + before.len > beat || !fits(last.midi, beat)) return false;
      last.beat = beat; last.len += 0.5;
      return true;
    },
  };
  const pool = Object.keys(ways);
  while (pool.length) if (ways[pool.splice(Math.floor(R.next() * pool.length), 1)[0]]()) break;
  return out;
}

// Two eighths on the last beat before a section, stepping onto its melody's first note: a pickup into the lead's
// entrance. Returns [] if they won't fit the chord under them.
export function pickupInto(first, { key, band: [lo, hi], chord, voicing, from }) {
  const pcs = (chord.scale ?? QUALITIES[chord.q]).map((x) => mod12(key + chord.root + x));
  const scale = [];
  for (let m = lo - 3; m <= hi + 3; m++) if (pcs.includes(mod12(m))) scale.push(m);
  const i = scale.findIndex((m) => m >= first), side = first - lo > hi - first ? -1 : 1; // from below near the top of the band
  const notes = [scale[i + 2 * side], scale[i + side]];
  if (notes.some((m) => m === undefined || m < lo || m > hi || rubs(m, voicing))) return [];
  return notes.map((midi, k) => ({ beat: from + k * 0.5, len: 0.46, midi, vel: 0.58 }));
}
