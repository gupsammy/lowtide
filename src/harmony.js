// Chord progressions from rules, not from a list. Every chord has a job: tonic (T, home), predominant (PD, moving
// away) or dominant (D, pulling home). A loop walks between jobs with set odds, fills each job with a chord that can
// do it, then swaps in colour: a borrowed minor iv, a tritone sub for V, a secondary dominant aimed at the next chord.
// Roots are semitones above the section's key.
import { MODES, QUALITIES, mod12 } from './theory.js';

// kind decides which qualities the chord may take: maj, min, dom (dominant 7th family), hdim (half-diminished).
const MAJOR = {
  I: { root: 0, fn: 'T', kind: 'maj' }, iii: { root: 4, fn: 'T', kind: 'min' }, vi: { root: 9, fn: 'T', kind: 'min' },
  ii: { root: 2, fn: 'PD', kind: 'min' }, IV: { root: 5, fn: 'PD', kind: 'maj' }, V: { root: 7, fn: 'D', kind: 'dom' },
};
const MINOR = {
  i: { root: 0, fn: 'T', kind: 'min' }, bIII: { root: 3, fn: 'T', kind: 'maj' },
  iv: { root: 5, fn: 'PD', kind: 'min' }, bVI: { root: 8, fn: 'PD', kind: 'maj' }, ii: { root: 2, fn: 'PD', kind: 'hdim' },
  v: { root: 7, fn: 'D', kind: 'min' }, V: { root: 7, fn: 'D', kind: 'dom' }, bVII: { root: 10, fn: 'D', kind: 'dom' },
};
// Which chord fills each job, and how often.
const FILL = {
  major: { T: { I: 5, vi: 3, iii: 1 }, PD: { ii: 4, IV: 4 }, D: { V: 1 } },
  minor: { T: { i: 6, bIII: 2 }, PD: { iv: 4, bVI: 3, ii: 2 }, D: { v: 2, V: 2, bVII: 3 } },
};
// Where a job tends to go next. D almost always goes home; PD usually goes to D, sometimes straight home (plagal).
const NEXT = { T: { PD: 6, T: 2.5, D: 1.5 }, PD: { D: 5.5, PD: 2.5, T: 2 }, D: { T: 8, PD: 1 } };

// Two-chord modal loops: the colour of the mode carries the track instead of a cadence.
const VAMPS = {
  dorian: [['i', 0, 'min'], ['IV', 5, 'dom']],
  aeolian: [['i', 0, 'min'], ['bVII', 10, 'maj']],
  mixolydian: [['I', 0, 'dom'], ['bVII', 10, 'maj']],
  ionian: [['IV', 5, 'maj'], ['I', 0, 'maj']],
  lydian: [['I', 0, 'maj'], ['II', 2, 'dom']],
};

// Every chord has a governing scale, written as intervals above its root, and may only take colour notes (9ths,
// 11ths, 13ths) that the scale holds. So a colour is in key by construction, never by a list of exceptions.
const PHRYG_DOM = [0, 1, 4, 5, 7, 8, 10]; // the harmonic-minor dominant; also a secondary dominant aimed at a minor chord
const LYDIAN_DOM = [0, 2, 4, 6, 7, 9, 10]; // tritone subs and the backdoor ♭VII7
const MIXO = [0, 2, 4, 5, 7, 9, 10]; // a secondary dominant aimed at a major chord

export function scaleOf(ch, mode, target) {
  if (ch.sub === 'tritone' || ch.roman === 'bVII7') return LYDIAN_DOM;
  if (ch.sub === 'secondary') return target && (target.kind === 'min' || target.kind === 'hdim') ? PHRYG_DOM : MIXO;
  if (ch.roman === 'V' && ch.kind === 'dom' && minorish(mode)) return PHRYG_DOM;
  const parent = ch.borrowed ? MODES.aeolian : MODES[mode]; // borrowed chords come from the parallel minor
  return parent.map((x) => mod12(x - ch.root)).sort((a, b) => a - b);
}

// Qualities to try, in order, by kind and colour: plain = 7ths, lush = 9ths and 13ths, airy = 11ths, 6/9s, #11s and
// sus. A chord takes the first that fits its scale; the fallbacks fit any chord of the kind.
const PALETTE = {
  maj: { plain: ['maj7'], lush: ['maj9', 'maj7'], airy: ['maj7#11', '6/9', 'maj9', 'maj7'] },
  min: { plain: ['m7'], lush: ['m9', 'm7'], airy: ['m11', 'm6', 'm9', 'm7'] },
  dom: { plain: ['9', '7b9', '7'], lush: ['13', '9', '7b9', '7'], airy: ['9sus', '13', '9', '7b9', '7'] },
  hdim: { plain: ['m7b5'], lush: ['m7b5'], airy: ['m7b5'] },
};
const FALLBACK = { maj: ['6/9', 'maj'], min: ['m7', 'min'], dom: ['7'], hdim: ['m7b5'] };
const COLOURS = ['plain', 'lush', 'airy'];
export const fits = (q, scale) => QUALITIES[q].every((x) => scale.includes(mod12(x)));

// One chord's quality. Most chords take the track's colour; some take the colour beside it, so the chords of one
// track differ while still sounding like a family.
export function colourChord(R, ch, colour, scale) {
  const i = COLOURS.indexOf(colour);
  const mine = R.chance(0.65) ? colour : COLOURS[i === 1 ? R.pick([0, 2]) : 1];
  const tries = [...(ch.sub === 'tritone' ? ['7#11'] : []), ...PALETTE[ch.kind][mine], ...FALLBACK[ch.kind]];
  return tries.find((q) => fits(q, scale)) ?? FALLBACK[ch.kind].at(-1);
}

// Loop shapes as bars × chords per bar. Chords per bar below 1 means one chord holds for two bars.
export const SHAPES = { '2x1': [2, 1], '2x2': [2, 2], '4x0.5': [4, 0.5], '4x1': [4, 1], '8x0.5': [8, 0.5], '8x1': [8, 1] };

const minorish = (mode) => mode === 'dorian' || mode === 'aeolian';

// grammar: { borrowedIv, tritoneSub, backdoor, secondary, turnaround, vamp } odds; shapes: weights over SHAPES.
// Options: startFn weights, avoid (a list of shapes' roman strings not to repeat).
export function progression(R, { mode, colour, grammar, shapes, startFn = { T: 5.5, PD: 3.5, D: 1 }, avoid = [] }) {
  for (let attempt = 0; attempt < 24; attempt++) {
    const p = attempt < 20 && R.chance(grammar.vamp ?? 0) ? vamp(R, mode, shapes) : walk(R, mode, grammar, shapes, startFn);
    p.chords.forEach((c, i) => {
      c.scale = scaleOf(c, mode, p.chords[(i + 1) % p.chords.length]);
      c.q = colourChord(R, c, colour, c.scale);
    });
    p.shape = p.chords.map((c) => c.roman).join('–');
    if (!avoid.includes(p.shape)) return p;
  }
  throw new Error('no progression found outside the avoid list');
}

function pickShape(R, shapes, minChords) {
  const ok = Object.fromEntries(Object.entries(shapes).filter(([k]) => SHAPES[k][0] * SHAPES[k][1] >= minChords));
  const [bars, perBar] = SHAPES[R.weighted(ok)];
  return { bars, perBar };
}

function vamp(R, mode, shapes) {
  const { bars, perBar } = pickShape(R, shapes, 2);
  const n = bars * perBar, beats = 4 / perBar;
  const pair = VAMPS[mode];
  const chords = Array.from({ length: n }, (_, i) => {
    const [roman, root, kind] = pair[i % 2];
    return { roman, root, kind, fn: i % 2 ? 'PD' : 'T', beats };
  });
  return { chords, bars, perBar, vamp: true };
}

function walk(R, mode, g, shapes, startFn) {
  const family = minorish(mode) ? 'minor' : 'major', vocab = family === 'minor' ? MINOR : MAJOR;
  const fill = structuredClone(FILL[family]);
  if (mode === 'dorian') { fill.PD = { IV: 4, iv: 1, bVI: 1, ii: 3 }; }
  const { bars, perBar } = pickShape(R, shapes, 2);
  const n = bars * perBar, beats = 4 / perBar;
  const entry = (roman) => {
    if (roman === 'IV' && mode === 'dorian') return { roman, root: 5, fn: 'PD', kind: 'dom' };
    if (roman === 'bVII' && mode === 'dorian') return { roman, root: 10, fn: 'D', kind: 'maj' }; // dorian's 6th is major, so ♭VII has a major 7th
    if (roman === 'I' && mode === 'mixolydian') return { roman, root: 0, fn: 'T', kind: 'dom' }; // mixolydian's own ♭7
    if (roman === 'ii' && mode === 'dorian') return { roman, root: 2, fn: 'PD', kind: 'min' };
    if ((roman === 'iv' || roman === 'bVI') && mode === 'dorian') return { roman, ...vocab[roman], borrowed: true }; // from aeolian
    if (roman === 'V' && mode === 'mixolydian') return { roman: 'v', root: 7, fn: 'D', kind: 'min' };
    if (roman === 'iii' && mode === 'mixolydian') return { roman: 'bVII', root: 10, fn: 'T', kind: 'maj' };
    // lydian's raised fourth rules out IV and ii; its bright II major does their job
    if ((roman === 'IV' || roman === 'ii') && mode === 'lydian') return { roman: 'II', root: 2, fn: 'PD', kind: 'dom' };
    if (roman === 'V' && mode === 'lydian') return { roman: 'V', root: 7, fn: 'D', kind: 'maj' };
    return { roman, ...vocab[roman] };
  };

  let fns;
  for (let tries = 0; ; tries++) {
    fns = [R.weighted(startFn)];
    while (fns.length < n) fns.push(R.weighted(NEXT[fns[fns.length - 1]]));
    // the loop wraps round, so the last job must lead well into the first
    if ((NEXT[fns[n - 1]][fns[0]] ?? 0) >= 1.5 || tries > 30) break;
  }
  const chords = [];
  for (let i = 0; i < n; i++) {
    let roman, guard = 0;
    do roman = R.weighted(fill[fns[i]]);
    while (guard++ < 12 && (roman === chords[i - 1]?.roman || (i === n - 1 && n > 2 && roman === chords[0].roman)));
    chords.push({ ...entry(roman), beats });
  }

  // Colour swaps. Each one has its own odds, set by the station.
  for (let i = 0; i < n; i++) {
    const c = chords[i];
    if (c.roman === 'IV' && family === 'major' && R.chance(g.borrowedIv ?? 0)) Object.assign(c, { roman: 'iv', kind: 'min', borrowed: true });
    else if (c.roman === 'V' && R.chance(g.tritoneSub ?? 0)) Object.assign(c, { roman: 'bII7', root: 1, kind: 'dom', sub: 'tritone' });
    else if (c.fn === 'D' && family === 'major' && R.chance(g.backdoor ?? 0)) Object.assign(c, { roman: 'bVII7', root: 10, kind: 'dom', borrowed: true });
  }
  // A secondary dominant: a chord (not the first) becomes the V7 of the chord after it, if that chord isn't home.
  for (let i = 1; i < n; i++) {
    const t = chords[(i + 1) % n];
    if (t.roman === 'I' || t.roman === 'i' || t.kind === 'dom' || chords[i].kind === 'dom') continue;
    if (R.chance(g.secondary ?? 0)) {
      chords[i] = { roman: `V/${t.roman}`, root: (t.root + 7) % 12, fn: 'D', kind: 'dom', sub: 'secondary', beats };
      break;
    }
  }
  // A turnaround: the last bar's dominant splits into ii–V (or ii–bII7), two chords in one bar.
  // Its ii goes through the same mode mapping as every other chord: minor in dorian, II7 in lydian.
  const last = chords[n - 1], ii = entry('ii');
  if (beats === 4 && last.fn === 'D' && (last.roman === 'V' || last.roman === 'bII7') && chords[n - 2]?.roman !== ii.roman && R.chance(g.turnaround ?? 0)) {
    last.beats = 2;
    chords.splice(n - 1, 0, { ...ii, beats: 2 });
  }
  return { chords, bars, perBar, vamp: false };
}
