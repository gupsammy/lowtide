// Seeded choices. Each part of a track draws from its own stream, named after the part, so adding a choice to one
// part never reshuffles the others: an old seed keeps its chords when the drums learn something new.
import { rng, gauss, hashString } from './synth/dsp.js';

export function stream(seed, name) {
  const r = rng(hashString(`${seed >>> 0}:${name}`));
  return {
    next: r,
    chance: (p) => r() < p,
    range: ([lo, hi]) => lo + (hi - lo) * r(),
    int: ([lo, hi]) => lo + Math.floor(r() * (hi - lo + 1)),
    gauss: () => gauss(r),
    pick: (list) => list[Math.floor(r() * list.length)],
    // weights: { option: weight } or [[option, weight]]; options with zero or missing weight never come up
    weighted(weights) {
      const pairs = Array.isArray(weights) ? weights : Object.entries(weights);
      const total = pairs.reduce((s, [, w]) => s + Math.max(0, w), 0);
      let x = r() * total;
      for (const [k, w] of pairs) if ((x -= Math.max(0, w)) < 0) return k;
      return pairs[pairs.length - 1][0];
    },
  };
}

// A new seed from an old one, for the next track or a re-roll.
export const deriveSeed = (seed, salt) => hashString(`${seed >>> 0}/${salt}`);
