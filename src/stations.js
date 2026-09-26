// A station is a set of limits. It fixes some traits so its tracks feel related, and leaves the rest to the seed so
// they differ. Numbers in braces are weights: how often each option comes up relative to the others; a lone number
// (echo, grit, texture, shaker) is the share of tracks that get it. Picture limits are here already; the drawing
// arrives in a later milestone.

const LOFI_SHAPES = { '2x1': 1, '2x2': 1, '4x0.5': 1.5, '4x1': 4, '8x0.5': 1.5, '8x1': 1.5 };

export const STATIONS = [
  {
    id: 'rain-study', genre: 'lofi', name: 'Rain Study',
    music: {
      bpm: [70, 78], modes: { dorian: 3, aeolian: 3, ionian: 1 }, colour: { plain: 1, lush: 3, airy: 2 },
      grammar: { borrowedIv: 0.4, tritoneSub: 0.15, backdoor: 0.1, secondary: 0.25, turnaround: 0.3, vamp: 0.2 },
      shapes: LOFI_SHAPES, grids: { 16: 3, 8: 2 }, swing: [0.56, 0.62], swing8: [0.58, 0.64], families: { boom: 2, lazy: 3, half: 2, skip: 1 },
      voicings: { rootless: 3, drop2: 2, cluster: 2, quartal: 1 }, register: [55, 62], lead: [71, 77],
      comps: { hold: 3, push: 2, strum: 2, pulse: 1 }, basslines: { root: 3, kick: 2, walk: 1 },
      keys: { ep: 3, felt: 2, upright: 2 }, leads: { vibes: 3, soft: 2, bell: 1, kalimba: 1, none: 1 }, basses: { round: 3, upright: 1 },
      kits: { dusty: 3, tight: 1 }, perc: { shaker: 0.3 },
      intros: { filtered: 2, bed: 2, phone: 1, drumsFirst: 1, pickup: 1, cold: 1 }, tape: [0.3, 0.7],
      space: { t60: [1.8, 3], wet: [0.2, 0.32] }, echo: 0.5, grit: 0.3, vinyl: [0.3, 0.7], pump: [0.1, 0.25], texture: 0.45,
    },
    picture: { style: 'ink', inks: ['blue', 'pink'], scene: 'harbour', weather: ['rain', 'drizzle'], hours: [17, 23], motion: 0.3, characters: 'lights' },
  },
  {
    id: 'sunday-porch', genre: 'lofi', name: 'Sunday Porch',
    music: {
      bpm: [82, 88], modes: { ionian: 4, lydian: 1, mixolydian: 1 }, colour: { plain: 1, lush: 3, airy: 2 },
      grammar: { borrowedIv: 0.3, tritoneSub: 0.1, backdoor: 0.2, secondary: 0.35, turnaround: 0.35, vamp: 0.15 },
      shapes: LOFI_SHAPES, grids: { 16: 2, 8: 3 }, swing: [0.54, 0.6], swing8: [0.56, 0.62], families: { boom: 3, lazy: 1, half: 1, skip: 2 },
      voicings: { rootless: 2, drop2: 3, cluster: 1, quartal: 1 }, register: [57, 64], lead: [73, 79],
      comps: { hold: 1, push: 2, strum: 2, pulse: 3 }, basslines: { root: 2, kick: 2, walk: 2 },
      keys: { ep: 2, felt: 2, upright: 3 }, leads: { kalimba: 3, vibes: 2, bell: 2, soft: 1, none: 1 }, basses: { round: 2, upright: 2 },
      kits: { dusty: 1, tight: 2 }, perc: { shaker: 0.5 },
      intros: { filtered: 1, bed: 1, phone: 1, drumsFirst: 2, pickup: 2, cold: 2 }, tape: [0.2, 0.5],
      space: { t60: [1.2, 2], wet: [0.12, 0.22] }, echo: 0.35, grit: 0.2, vinyl: [0.2, 0.5], pump: [0.1, 0.2], texture: 0.15,
    },
    picture: { style: 'ink', inks: ['yellow', 'orange'], scene: 'lake', weather: ['clear', 'mist'], hours: [7, 13], motion: 0.4, characters: 'birds' },
  },
  {
    id: 'last-train', genre: 'lofi', name: 'Last Train',
    music: {
      bpm: [72, 80], modes: { aeolian: 2, dorian: 2, ionian: 2 }, colour: { plain: 1, lush: 3, airy: 1 },
      grammar: { borrowedIv: 0.35, tritoneSub: 0.35, backdoor: 0.15, secondary: 0.4, turnaround: 0.5, vamp: 0.1 },
      shapes: { ...LOFI_SHAPES, '2x2': 2, '4x1': 3 }, grids: { 16: 3, 8: 1 }, swing: [0.58, 0.64], swing8: [0.6, 0.66], families: { boom: 2, lazy: 2, half: 1, skip: 2 },
      voicings: { rootless: 4, drop2: 2, cluster: 1, quartal: 2 }, register: [54, 61], lead: [70, 76],
      comps: { hold: 1, push: 3, strum: 1, pulse: 2 }, basslines: { root: 1, kick: 2, walk: 3 },
      keys: { ep: 4, felt: 1, upright: 2 }, leads: { vibes: 3, bell: 2, soft: 1, none: 1 }, basses: { round: 1, upright: 3 },
      kits: { dusty: 2, tight: 2 }, perc: { shaker: 0.25 },
      intros: { filtered: 2, bed: 1, phone: 2, drumsFirst: 2, pickup: 1, cold: 1 }, tape: [0.3, 0.6],
      space: { t60: [1.6, 2.6], wet: [0.18, 0.3] }, echo: 0.6, grit: 0.35, vinyl: [0.3, 0.6], pump: [0.15, 0.3], texture: 0.35,
    },
    picture: { style: 'ink', inks: ['violet', 'blue'], scene: 'town-edge', weather: ['rain'], hours: [21, 26], motion: 0.4, characters: 'lights' },
  },
  {
    id: 'autumn-field', genre: 'lofi', name: 'Autumn Field',
    music: {
      bpm: [76, 84], modes: { dorian: 4, mixolydian: 2, aeolian: 1 }, colour: { plain: 1, lush: 2, airy: 3 },
      grammar: { borrowedIv: 0.25, tritoneSub: 0.05, backdoor: 0.2, secondary: 0.15, turnaround: 0.2, vamp: 0.35 },
      shapes: { ...LOFI_SHAPES, '8x0.5': 3 }, grids: { 16: 1, 8: 3 }, swing: [0.55, 0.6], swing8: [0.57, 0.63], families: { boom: 1, lazy: 2, half: 3, skip: 1 },
      voicings: { rootless: 1, drop2: 1, cluster: 2, quartal: 3 }, register: [56, 63], lead: [72, 78],
      comps: { hold: 3, push: 1, strum: 3, pulse: 1 }, basslines: { root: 3, kick: 1, walk: 1 },
      keys: { ep: 1, felt: 3, upright: 1 }, leads: { soft: 3, kalimba: 2, vibes: 1, bell: 1, none: 1 }, basses: { round: 3, upright: 1 },
      kits: { dusty: 3, tight: 1 }, perc: { shaker: 0.35 },
      intros: { filtered: 1, bed: 3, phone: 1, drumsFirst: 1, pickup: 2, cold: 1 }, tape: [0.5, 0.9],
      space: { t60: [1.5, 2.5], wet: [0.16, 0.28] }, echo: 0.4, grit: 0.4, vinyl: [0.5, 0.9], pump: [0.08, 0.2], texture: 0.25,
    },
    picture: { style: 'ink', inks: ['orange', 'green'], scene: 'hills', weather: ['wind', 'clear'], hours: [16, 19], motion: 0.35, characters: 'birds' },
  },
];

export const stationById = (id) => STATIONS.find((s) => s.id === id);
