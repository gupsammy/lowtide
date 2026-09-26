// Drums, and how the keys and bass sit on the beat. A bar is 16 steps (sixteenth notes). Patterns grow from a
// backbone (where the kick and snare live) plus layers that thicken as a section's energy rises, rather than coming
// from a fixed list of grids.

// Drum families: the backbone of the beat.
export const FAMILIES = {
  boom: { snare: [4, 12], kicks: { 10: 4, 11: 2, 7: 2, 14: 1.5, 3: 1, 8: 1 }, extra: [1, 2] }, // the classic boom-bap
  lazy: { snare: [4, 12], kicks: { 6: 3, 7: 2, 10: 3, 13: 1 }, extra: [1, 2] }, // kicks that lean late
  half: { snare: [8], kicks: { 3: 1, 10: 3, 11: 2, 14: 1.5, 6: 1 }, extra: [1, 2] }, // snare only on beat 3: slow, heavy
  skip: { snare: [4, 12], kicks: { 5: 2, 9: 2, 11: 2, 14: 1 }, extra: [1, 3] }, // off-beat kicks that trip forward
};

// A track's kick pattern: two bars, the second a variation of the first.
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

// One bar of drums as [step, drum, velocity]. energy 0–1 sets how busy the hats and ghost notes are.
export function drumBar(R, { family, kicks, energy, bar, fill, hatStyle }) {
  const F = FAMILIES[family], hits = [];
  const k = kicks[bar % 2];
  for (const s of k) hits.push([s, 'kick', s === 0 ? 1 : 0.8 + 0.1 * R.next()]);
  for (const s of F.snare) hits.push([s, 'snare', 0.9]);
  // hats: quarters when calm, eighths in the middle, eighths with some sixteenths when busy
  const hatSteps = energy < 0.35 ? [0, 4, 8, 12] : [0, 2, 4, 6, 8, 10, 12, 14];
  for (const s of hatSteps) {
    if (hatStyle === 'skip' && s % 4 === 2 && R.chance(0.35)) continue;
    hits.push([s, 'hat', s % 4 === 0 ? 0.55 : 0.38]);
  }
  if (energy >= 0.6) for (const s of [3, 7, 11, 15]) if (R.chance(0.3)) hits.push([s, 'hat', 0.25]);
  if (energy >= 0.6 && bar % 4 === 3 && R.chance(0.5)) hits.push([14, 'open', 0.35]);
  // ghost notes: very quiet snares just before or after the backbeat
  for (const s of [3, 7, 9, 11, 15]) if (!F.snare.includes(s) && R.chance(energy * 0.3)) hits.push([s, 'snare', 0.18 + 0.12 * R.next()]);
  return fill ? applyFill(R, hits, fill) : hits;
}

// The last bar before a new section: something breaks the pattern so the ear knows a change is coming.
export const FILLS = ['drop', 'roll', 'stop', 'lift'];
function applyFill(R, hits, fill) {
  if (fill === 'drop') return hits.filter(([s, d]) => !(d === 'kick' && s >= 8)); // the kick leaves for beats 3 and 4
  if (fill === 'stop') return hits.filter(([s]) => s < 12); // everything stops on beat 4
  if (fill === 'roll') return [...hits.filter(([s, d]) => !(d === 'snare' && s >= 12)), ...[12, 13, 14, 15].map((s, i) => [s, 'snare', 0.3 + i * 0.15])];
  return [...hits, [14, 'open', 0.45]]; // lift: an open hat into the next bar
}

// Where a step falls, in beats from the bar line. Swing delays the second sixteenth of each pair: at 0.5 it's
// straight, at 0.66 it's a triplet feel.
export const stepBeat = (s, swing) => Math.floor(s / 2) * 0.5 + (s % 2 ? swing * 0.5 : 0);

// Keys: how the chords are played. Each returns [beat offset in the chord, length in beats, velocity] hits.
export const COMPS = {
  hold: (beats) => [[0, beats, 0.8]],
  push: (beats) => [[-0.5, beats, 0.8]], // lands an eighth early, the way a player leans into the next chord
  pulse: (beats) => Array.from({ length: Math.max(1, beats / 4) }, (_, b) => [[b * 4, 1.2, 0.8], [b * 4 + 1.5, 0.9, 0.62], [b * 4 + 3, 0.7, 0.5]]).flat(),
  strum: (beats) => [[0, beats, 0.78]], // held, with the notes rolled from the bottom up (see spread)
};

// Bass: [beat offset in the chord, length, velocity, which note: 'root' | 'fifth' | 'octave' | 'approach'].
export const BASSLINES = {
  root: (beats) => [[0, beats * 0.9, 0.9, 'root']],
  kick: (beats, kicks) => kicks.filter((s) => s / 4 < beats).map((s) => [s / 4, 0.8, s === 0 ? 0.9 : 0.75, 'root']),
  walk: (beats) => beats >= 4
    ? [[0, 1.8, 0.9, 'root'], [2, 1.3, 0.7, beats > 4 ? 'octave' : 'fifth'], [beats - 0.5, 0.45, 0.6, 'approach']]
    : [[0, beats * 0.9, 0.9, 'root']],
};
