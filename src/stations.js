// A station is a set of limits. It fixes some traits so its tracks feel related, and leaves the rest to the seed so
// they differ. Numbers in braces are weights: how often each option comes up relative to the others.
// Picture limits are here already; the drawing arrives in a later milestone.

const LOFI_SHAPES = { '2x1': 1, '2x2': 1, '4x0.5': 1.5, '4x1': 4, '8x0.5': 1.5, '8x1': 1.5 };

export const STATIONS = [
  {
    id: 'rain-study', genre: 'lofi', name: 'Rain Study',
    music: {
      bpm: [70, 78], modes: { dorian: 3, aeolian: 3, ionian: 1 }, colour: { plain: 1, lush: 3, airy: 2 },
      grammar: { borrowedIv: 0.4, tritoneSub: 0.15, backdoor: 0.1, secondary: 0.25, turnaround: 0.3, vamp: 0.2 },
      shapes: LOFI_SHAPES, swing: [0.56, 0.62], families: { boom: 2, lazy: 3, half: 2, skip: 1 },
      voicings: { rootless: 3, drop2: 2, cluster: 2, quartal: 1 }, register: [56, 64], lead: [67, 76],
      comps: { hold: 3, push: 2, strum: 2, pulse: 1 }, basslines: { root: 3, kick: 2, walk: 1 },
      keys: { ep: 3, felt: 2 }, leads: { bell: 2, soft: 2, none: 1 }, kits: { dusty: 3, tight: 1 },
      intros: { filtered: 2, bed: 2, phone: 1, drumsFirst: 1, pickup: 1, cold: 1 }, tape: [0.3, 0.7],
    },
    picture: { style: 'ink', inks: ['blue', 'pink'], scene: 'harbour', weather: ['rain', 'drizzle'], hours: [17, 23], motion: 0.3, characters: 'lights' },
  },
  {
    id: 'sunday-porch', genre: 'lofi', name: 'Sunday Porch',
    music: {
      bpm: [82, 88], modes: { ionian: 4, lydian: 1, mixolydian: 1 }, colour: { plain: 1, lush: 3, airy: 2 },
      grammar: { borrowedIv: 0.3, tritoneSub: 0.1, backdoor: 0.2, secondary: 0.35, turnaround: 0.35, vamp: 0.15 },
      shapes: LOFI_SHAPES, swing: [0.54, 0.6], families: { boom: 3, lazy: 1, half: 1, skip: 2 },
      voicings: { rootless: 2, drop2: 3, cluster: 1, quartal: 1 }, register: [58, 66], lead: [69, 79],
      comps: { hold: 1, push: 2, strum: 2, pulse: 3 }, basslines: { root: 2, kick: 2, walk: 2 },
      keys: { ep: 2, felt: 3 }, leads: { bell: 3, soft: 2, none: 1 }, kits: { dusty: 1, tight: 2 },
      intros: { filtered: 1, bed: 1, phone: 1, drumsFirst: 2, pickup: 2, cold: 2 }, tape: [0.2, 0.5],
    },
    picture: { style: 'ink', inks: ['yellow', 'orange'], scene: 'lake', weather: ['clear', 'mist'], hours: [7, 13], motion: 0.4, characters: 'birds' },
  },
  {
    id: 'last-train', genre: 'lofi', name: 'Last Train',
    music: {
      bpm: [72, 80], modes: { aeolian: 2, dorian: 2, ionian: 2 }, colour: { plain: 1, lush: 3, airy: 1 },
      grammar: { borrowedIv: 0.35, tritoneSub: 0.35, backdoor: 0.15, secondary: 0.4, turnaround: 0.5, vamp: 0.1 },
      shapes: { ...LOFI_SHAPES, '2x2': 2, '4x1': 3 }, swing: [0.58, 0.64], families: { boom: 2, lazy: 2, half: 1, skip: 2 },
      voicings: { rootless: 4, drop2: 2, cluster: 1, quartal: 2 }, register: [55, 62], lead: [66, 74],
      comps: { hold: 1, push: 3, strum: 1, pulse: 2 }, basslines: { root: 1, kick: 2, walk: 3 },
      keys: { ep: 4, felt: 1 }, leads: { bell: 2, soft: 1, none: 1 }, kits: { dusty: 2, tight: 2 },
      intros: { filtered: 2, bed: 1, phone: 2, drumsFirst: 2, pickup: 1, cold: 1 }, tape: [0.3, 0.6],
    },
    picture: { style: 'ink', inks: ['violet', 'blue'], scene: 'town-edge', weather: ['rain'], hours: [21, 26], motion: 0.4, characters: 'lights' },
  },
  {
    id: 'autumn-field', genre: 'lofi', name: 'Autumn Field',
    music: {
      bpm: [76, 84], modes: { dorian: 4, mixolydian: 2, aeolian: 1 }, colour: { plain: 1, lush: 2, airy: 3 },
      grammar: { borrowedIv: 0.25, tritoneSub: 0.05, backdoor: 0.2, secondary: 0.15, turnaround: 0.2, vamp: 0.35 },
      shapes: { ...LOFI_SHAPES, '8x0.5': 3 }, swing: [0.55, 0.6], families: { boom: 1, lazy: 2, half: 3, skip: 1 },
      voicings: { rootless: 1, drop2: 1, cluster: 2, quartal: 3 }, register: [57, 65], lead: [68, 78],
      comps: { hold: 3, push: 1, strum: 3, pulse: 1 }, basslines: { root: 3, kick: 1, walk: 1 },
      keys: { ep: 1, felt: 3 }, leads: { bell: 1, soft: 3, none: 1 }, kits: { dusty: 3, tight: 1 },
      intros: { filtered: 1, bed: 3, phone: 1, drumsFirst: 1, pickup: 2, cold: 1 }, tape: [0.5, 0.9],
    },
    picture: { style: 'ink', inks: ['orange', 'green'], scene: 'hills', weather: ['wind', 'clear'], hours: [16, 19], motion: 0.35, characters: 'birds' },
  },
];

export const stationById = (id) => STATIONS.find((s) => s.id === id);
