// Drums, and how the keys and bass sit on the beat. A bar is 16 steps (sixteenth notes). Each section type gets one
// two-bar drum pattern, fixed once and looped, so the beat is a groove rather than a new roll of dice every bar;
// only bars 4 and 8 vary, and a section's last bar can carry a fill.

// Drum families: the backbone of the beat.
export const FAMILIES = {
  boom: { snare: [4, 12], kicks: { 10: 4, 11: 2, 7: 2, 14: 1.5, 3: 1, 8: 1 }, extra: [1, 2] }, // the classic boom-bap
  lazy: { snare: [4, 12], kicks: { 6: 3, 7: 2, 10: 3, 13: 1 }, extra: [1, 2] }, // kicks that lean late
  half: { snare: [8], kicks: { 3: 1, 10: 3, 11: 2, 14: 1.5, 6: 1 }, extra: [1, 2] }, // snare only on beat 3: slow, heavy
  skip: { snare: [4, 12], kicks: { 5: 2, 9: 2, 11: 2, 14: 1 }, extra: [1, 3] }, // off-beat kicks that trip forward
};

// Swing: every part goes through this one map, so the bass lands with the kick and the keys with the hats.
// grid 16 swings sixteenth notes (pairs half a beat long); grid 8 swings eighth notes (pairs a beat long).
// Within each pair the first half stretches to `amount` and the second half shrinks to fit; 0.5 is straight.
export function swingBeat(beat, amount, grid) {
  const u = grid === 8 ? 1 : 0.5;
  const q = Math.floor(beat / u + 1e-9) * u, f = (beat - q) / u;
  return q + u * (f < 0.5 ? f * 2 * amount : amount + (f - 0.5) * 2 * (1 - amount));
}

// A track's kick pattern: two bars, the second a variation of the first. Shared by every section.
export function kickPattern(R, family) {
  const F = FAMILIES[family], pool = { ...F.kicks };
  const bar = [0];
  const n = R.int(F.extra);
  for (let i = 0; i < n; i++) {
    const s = Number(R.weighted(pool));
    delete pool[s];
    if (!bar.some((k) => Math.abs(k - s) === 1) || R.chance(0.25)) bar.push(s);
  }
  const second = bar.filter((s) => s < 8 || R.chance(0.6));
  if (R.chance(0.6)) second.push(Number(R.weighted({ 10: 2, 11: 2, 14: 2, 15: 1 })));
  const clean = (b) => [...new Set(b)].filter((s) => !F.snare.includes(s)).sort((a, b) => a - b);
  return [clean(bar), clean(second)];
}

// One section type's drum part: two bars of [step, drum, velocity], plus the variation used on bars 4 and 8.
// energy 0–1 sets how busy the hats and ghost notes are. grid decides where the swing is heard: on a 16th grid the
// odd sixteenths carry it, so the hats play some of them; on an 8th grid the off-beat eighths carry it.
// backbeat: 'snare' or 'rim' (a cross-stick, softer, for intros and quiet sections).
export function drumPattern(R, { family, kicks, energy, grid, backbeat, shaker }) {
  const F = FAMILIES[family];
  const ghostPool = [3, 7, 9, 11, 15].filter((s) => !F.snare.includes(s));
  const ghosts = [0, 1].map(() => ghostPool.filter(() => R.chance(0.12 + energy * 0.3)));
  const skip = R.chance(0.35) ? [2, 6, 10, 14].filter(() => R.chance(0.4)) : [];
  // hats: quarter notes when quiet; otherwise eighths, or on a 16th grid sometimes every sixteenth
  const style = energy < 0.35 ? 'quarters' : grid === 16 && R.chance(0.2 + energy * 0.4) ? 'sixteenths' : 'eighths';
  const soft = grid !== 16 || style === 'quarters' ? []
    : style === 'sixteenths' ? [1, 3, 5, 7, 9, 11, 13, 15].filter(() => R.chance(0.85))
    : [3, 7, 11, 15].filter(() => R.chance(0.35 + energy * 0.4));
  if (grid === 16 && style === 'eighths' && !soft.length) soft.push(R.pick([7, 15]));
  const openAt = energy >= 0.6 && R.chance(0.6) ? R.pick([6, 14]) : null;

  const bars = [0, 1].map((b) => {
    const hits = [];
    for (const s of kicks[b]) hits.push([s, 'kick', s === 0 ? 1 : 0.82]);
    for (const s of F.snare) hits.push([s, backbeat, 0.9]);
    for (const s of ghosts[b]) hits.push([s, 'snare', 0.2 + 0.03 * (s % 4)]);
    const hatSteps = style === 'quarters' ? [0, 4, 8, 12] : [0, 2, 4, 6, 8, 10, 12, 14];
    for (const s of hatSteps) if (!skip.includes(s) && !(b === 1 && s === openAt)) hits.push([s, 'hat', s % 4 === 0 ? 0.55 : 0.4]);
    for (const s of soft) hits.push([s, 'hat', style === 'sixteenths' ? 0.2 + 0.02 * (s % 3) : 0.24]);
    if (b === 1 && openAt !== null) hits.push([openAt, 'open', 0.38]);
    if (shaker) for (const s of [2, 6, 10, 14]) hits.push([s, 'shaker', s === 6 || s === 14 ? 0.42 : 0.32]);
    return hits;
  });
  // bars 4 and 8 repeat bar 2 with one small change, the same change each time
  const change = R.pick(['pickup', 'ghost', 'open', 'drop']);
  const variation = {
    pickup: () => [...bars[1], [15, 'kick', 0.7]],
    ghost: () => [...bars[1], [13, 'snare', 0.26], [15, 'snare', 0.3]],
    open: () => [...bars[1].filter(([s, d]) => !(d === 'hat' && s === 14)), [14, 'open', 0.4]],
    drop: () => bars[1].filter(([s, d]) => !(d === 'kick' && s >= 8)),
  }[change]();
  return { bars, variation, grid };
}

// The same pattern with more going on, for a later section of the same type that carries more energy: quarter-note
// hats become eighths, and on a 16th grid two soft sixteenths join. Nothing else changes, so the groove is the same.
export function busier(pattern) {
  const add = (hits) => {
    const has = (s) => hits.some(([x, d]) => x === s && (d === 'hat' || d === 'open'));
    const extra = [];
    for (const s of [2, 6, 10, 14]) if (!has(s)) extra.push([s, 'hat', 0.36]);
    if (pattern.grid === 16) for (const s of [7, 15]) if (!has(s)) extra.push([s, 'hat', 0.22]);
    return [...hits, ...extra];
  };
  return { ...pattern, bars: pattern.bars.map(add), variation: add(pattern.variation) };
}

// The drums for one bar of a section, from its pattern. fill: the kind of fill on this bar, or null.
export function drumBar(pattern, bar, fill) {
  const hits = bar % 4 === 3 ? pattern.variation : pattern.bars[bar % 2];
  return fill ? applyFill(hits, fill) : hits;
}

// The last bar before a new section: something breaks the pattern so the ear knows a change is coming.
export const FILLS = ['drop', 'roll', 'stop', 'lift'];
function applyFill(hits, fill) {
  if (fill === 'drop') return hits.filter(([s, d]) => !(d === 'kick' && s >= 8)); // the kick leaves for beats 3 and 4
  if (fill === 'stop') return hits.filter(([s]) => s < 12); // everything stops on beat 4
  if (fill === 'roll') return [...hits.filter(([s, d]) => !(d === 'snare' && s >= 12)), ...[12, 13, 14, 15].map((s, i) => [s, 'snare', 0.3 + i * 0.15])];
  return [...hits, [14, 'open', 0.45]]; // lift: an open hat into the next bar
}

// Keys: how the chords are played. Each returns [beat offset in the chord, length in beats, velocity] hits.
export const COMPS = {
  hold: (beats) => [[0, beats, 0.8]],
  push: (beats) => [[-0.5, beats, 0.8]], // lands an eighth early, the way a player leans into the next chord
  pulse: (beats) => Array.from({ length: Math.max(1, beats / 4) }, (_, b) => [[b * 4, 1.2, 0.8], [b * 4 + 1.5, 0.9, 0.62], [b * 4 + 3, 0.7, 0.5]]).flat(),
  strum: (beats) => [[0, beats, 0.78]], // held, with the notes rolled from the bottom up (see spread)
};

// Guitar strum patterns: [beat in the bar, up stroke] (GUITAR.md §3).
export const STRUMS = {
  folk: [[0, false], [1, false], [1.5, true], [2.5, true], [3, false], [3.5, true]],
  slow: [[0, false], [1.5, true], [2, false], [3.5, true]],
};

// The guitar's strokes over one chord, from the comp the track drew: [beat offset in the chord, length, velocity, up].
// at: where the chord starts in its bar. A ring lets one stroke sound; chops damp the pulse's hits; a strum plays the
// pattern. A pushed strum lands each chord an eighth early and lets that stroke ring over the chord's first beat, so a
// chord's strokes run from an eighth before it to an eighth before the next. Every chord comes in on a downstroke,
// added where the pattern has no stroke.
export function strokes(comp, pattern, at, beats) {
  if (comp === 'hold') return [[0, beats, 0.8, false]];
  if (comp === 'pulse') return COMPS.pulse(beats).map(([off, l, ve]) => [off, l * 0.35, ve, off % 1 !== 0]);
  const from = comp === 'push' ? -0.5 : 0, to = beats + from, out = [];
  for (let bar = Math.floor((at + from) / 4) * 4; bar < at + to; bar += 4) {
    for (const [p, up] of STRUMS[pattern]) { const off = bar + p - at; if (off >= from && off < to && !(from && off === 0)) out.push([off, up]); }
  }
  if (out[0]?.[0] === from) out[0][1] = false;
  else out.unshift([from, false]);
  return out.map(([off, up], i) => [off, (out[i + 1]?.[0] ?? to) - off, up ? 0.55 : i === 0 ? 0.8 : 0.72, up]);
}

// Bass: [beat offset in the chord, length, velocity, which note: 'root' | 'fifth' | 'octave' | 'approach'].
// 'kick' plays with the kick drum: kicks lists the kick positions inside the chord, in beats from its start. Each
// note holds until the next kick; if the chord arrives between kicks, the bass still marks the change.
export const BASSLINES = {
  root: (beats) => [[0, beats * 0.9, 0.9, 'root']],
  kick: (beats, kicks) => {
    const at = kicks.filter((k) => k >= 0 && k < beats);
    if (!at.includes(0)) at.unshift(0);
    return at.map((k, i) => [k, Math.min(1.5, (at[i + 1] ?? beats) - k) * 0.9, k === 0 ? 0.9 : 0.75, 'root']);
  },
  walk: (beats) => beats >= 4
    ? [[0, 1.8, 0.9, 'root'], [2, 1.3, 0.7, beats > 4 ? 'octave' : 'fifth'], [beats - 0.5, 0.45, 0.6, 'approach']]
    : [[0, beats * 0.9, 0.9, 'root']],
  // Groovy's syncopated bass (MOODS.md §3), each bar: the root, a soft root a sixteenth before 2, the octave on the and
  // of 2, the root on the and of 3; then an approach on the chord's last sixteenth
  groove: (beats) => {
    const out = [];
    for (let b = 0; b < beats; b += 4) {
      for (const [o, ...rest] of [[0, 0.65, 0.9, 'root'], [0.75, 0.2, 0.5, 'root'], [1.5, 0.45, 0.75, 'octave'], [2.5, 0.45, 0.72, 'root']]) {
        if (b + o < beats) out.push([b + o, ...rest]);
      }
    }
    if (beats >= 4) out.push([beats - 0.25, 0.2, 0.6, 'approach']);
    return out;
  },
};
