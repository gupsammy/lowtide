// A station is a set of limits. It fixes some traits so its tracks feel related, and leaves the rest to the seed so
// they differ. Numbers in braces are weights: how often each option comes up relative to the others; a lone number
// (echo, grit, texture, shaker) is the share of tracks that get it. riff: its notes a bar, who plays it, and how
// often each version of a track comes up (RIFF.md, ARRANGE.md). about: one line for the lab on what the station is and,
// for a mood station, its trait (MOODS.md). guitar: how often a guitar plays the chords or the
// riff, and which guitar (GUITAR.md §2). tuning: which settings a retuned station plays, so a seed's ratings under the
// old settings stay apart (MOODS.md §6). Picture limits are here already; the drawing
// arrives in a later milestone.

// The riff's three roles (RIFF.md), even among those that fit a track's sounds (ARRANGE.md §1).
const RIFF_ROLES = { keys: 1, lead: 1, signature: 1 };
const LOFI_SHAPES = { '2x1': 1, '2x2': 1, '4x0.5': 1.5, '4x1': 4, '8x0.5': 1.5, '8x1': 1.5 };

export const STATIONS = [
  {
    id: 'rain-study', tuning: 2, genre: 'lofi', name: 'Rain Study',
    about: 'Evening rain in minor keys: electric piano and vibes in a long, wet room, often over an ocean bed.',
    music: {
      bpm: [62, 70], modes: { dorian: 3, aeolian: 3, ionian: 1 }, colour: { plain: 1, lush: 3, airy: 2 },
      grammar: { borrowedIv: 0.4, tritoneSub: 0.15, backdoor: 0.1, secondary: 0.25, turnaround: 0.3, vamp: 0.2 },
      shapes: { '4x1': 4, '8x1': 1.5, '2x2': 0.5, '2x1': 1, '4x0.5': 0.5 }, grids: { 16: 3, 8: 2 }, swing: [0.56, 0.62], swing8: [0.51, 0.57], families: { boom: 2, lazy: 3, half: 2, skip: 1 },
      voicings: { rootless: 3, drop2: 2, cluster: 2, quartal: 1 }, register: [55, 62], lead: [71, 77],
      comps: { hold: 3, push: 2, strum: 2, pulse: 1 }, basslines: { push: 3, kick: 2, walk: 1 },
      keys: { ep: 3, felt: 2, upright: 2 }, leads: { vibes: 3, soft: 2, bell: 1, kalimba: 1, none: 1 }, basses: { round: 3, upright: 1 },
      kits: { dusty: 3, tight: 1 }, perc: { shaker: 0.3 },
      intros: { filtered: 2, bed: 2, phone: 1, drumsFirst: 1, pickup: 1, cold: 1 }, tape: [0.3, 0.7],
      space: { t60: [1.8, 3], wet: [0.2, 0.32] }, echo: 0.5, grit: 0.3, vinyl: [0.3, 0.7], pump: [0.1, 0.25], texture: 0.45,
      riff: { notes: [4, 5], roles: RIFF_ROLES, versions: { full: 5, beat: 1 } },
      guitar: { parts: { none: 3, chords: 1, riff: 1 }, sounds: { nylon: 1, jazz: 2 } },
    },
    picture: { style: 'ink', inks: ['blue', 'pink'], scene: 'harbour', weather: ['rain', 'drizzle'], hours: [17, 23], motion: 0.3, characters: 'lights' },
  },
  {
    id: 'sunday-porch', tuning: 2, genre: 'lofi', name: 'Sunday Porch',
    about: 'A bright morning in major keys: upright piano, kalimba, a tight kit and, most days, a nylon guitar.',
    music: {
      bpm: [72, 80], modes: { ionian: 4, lydian: 1, mixolydian: 1 }, colour: { plain: 1, lush: 3, airy: 2 },
      grammar: { borrowedIv: 0.3, tritoneSub: 0.1, backdoor: 0.2, secondary: 0.35, turnaround: 0.35, vamp: 0.15 },
      shapes: { '2x2': 3, '4x1': 3, '8x1': 1, '2x1': 1 }, grids: { 16: 2, 8: 3 }, swing: [0.54, 0.6], swing8: [0.51, 0.57], families: { boom: 3, lazy: 1, half: 1, skip: 2 },
      voicings: { rootless: 2, drop2: 3, cluster: 1, quartal: 1 }, register: [57, 64], lead: [73, 79],
      comps: { hold: 1, push: 2, strum: 2, pulse: 3 }, basslines: { push: 2, kick: 2, walk: 2 },
      keys: { ep: 2, felt: 2, upright: 3 }, leads: { kalimba: 3, vibes: 2, bell: 2, soft: 1, none: 1 }, basses: { round: 2, upright: 2 },
      kits: { dusty: 1, tight: 2 }, perc: { shaker: 0.5 },
      intros: { filtered: 1, bed: 1, phone: 1, drumsFirst: 2, pickup: 2, cold: 2 }, tape: [0.2, 0.5],
      space: { t60: [1.2, 2], wet: [0.12, 0.22] }, echo: 0.35, grit: 0.2, vinyl: [0.2, 0.5], pump: [0.1, 0.2], texture: 0.15,
      riff: { notes: [5, 6], roles: RIFF_ROLES, versions: { full: 6, beat: 2 } },
      guitar: { parts: { none: 1, chords: 2, riff: 2 }, sounds: { nylon: 3, jazz: 1 } },
    },
    picture: { style: 'ink', inks: ['yellow', 'orange'], scene: 'lake', weather: ['clear', 'mist'], hours: [7, 13], motion: 0.4, characters: 'birds' },
  },
  {
    id: 'last-train', tuning: 2, genre: 'lofi', name: 'Last Train',
    about: 'Late and jazzy: electric piano, a walking upright bass, tritone turns and a busy riff, now and then on jazz guitar.',
    music: {
      bpm: [78, 86], modes: { aeolian: 2, dorian: 2, ionian: 2 }, colour: { plain: 1, lush: 3, airy: 1 },
      grammar: { borrowedIv: 0.35, tritoneSub: 0.35, backdoor: 0.15, secondary: 0.4, turnaround: 0.5, vamp: 0.1 },
      shapes: LOFI_SHAPES, grids: { 16: 3, 8: 1 }, swing: [0.58, 0.64], swing8: [0.5, 0.54], families: { boom: 2, lazy: 2, half: 1, skip: 2 },
      voicings: { rootless: 4, drop2: 2, cluster: 1, quartal: 2 }, register: [54, 61], lead: [70, 76],
      comps: { hold: 1, push: 3, strum: 1, pulse: 2 }, basslines: { push: 1, kick: 2, walk: 3 },
      keys: { ep: 4, felt: 1, upright: 2 }, leads: { vibes: 3, bell: 2, soft: 1, none: 1 }, basses: { round: 1, upright: 3 },
      kits: { dusty: 2, tight: 2 }, perc: { shaker: 0.25 },
      intros: { filtered: 2, bed: 1, phone: 2, drumsFirst: 2, pickup: 1, cold: 1 }, tape: [0.3, 0.6],
      space: { t60: [1.6, 2.6], wet: [0.18, 0.3] }, echo: 0.6, grit: 0.35, vinyl: [0.3, 0.6], pump: [0.15, 0.3], texture: 0.35,
      riff: { notes: [6, 8], roles: RIFF_ROLES, versions: { full: 6, beat: 2 } },
      guitar: { parts: { none: 3, chords: 0.5, riff: 0.5 }, sounds: { nylon: 1, jazz: 3 } },
    },
    picture: { style: 'ink', inks: ['violet', 'blue'], scene: 'town-edge', weather: ['rain'], hours: [21, 26], motion: 0.4, characters: 'lights' },
  },
  {
    id: 'autumn-field', tuning: 2, genre: 'lofi', name: 'Autumn Field',
    about: 'Open and folky: felt piano voiced in fourths, strummed chords, half-time drums and heavy tape.',
    music: {
      bpm: [76, 84], modes: { dorian: 4, mixolydian: 2, aeolian: 1 }, colour: { plain: 1, lush: 2, airy: 3 },
      grammar: { borrowedIv: 0.25, tritoneSub: 0.05, backdoor: 0.2, secondary: 0.15, turnaround: 0.2, vamp: 0.35 },
      shapes: { '8x0.5': 3, '4x0.5': 3, '4x1': 2, '8x1': 1, '2x1': 0.5 }, grids: { 16: 1, 8: 3 }, swing: [0.55, 0.6], swing8: [0.5, 0.56], families: { boom: 1, lazy: 2, half: 3, skip: 1 },
      voicings: { rootless: 1, drop2: 1, cluster: 2, quartal: 3 }, register: [56, 63], lead: [72, 78],
      comps: { hold: 3, push: 1, strum: 3, pulse: 1 }, basslines: { push: 3, kick: 1, walk: 1 },
      keys: { ep: 1, felt: 3, upright: 1 }, leads: { soft: 3, kalimba: 2, vibes: 1, bell: 1, none: 1 }, basses: { round: 3, upright: 1 },
      kits: { dusty: 3, tight: 1 }, perc: { shaker: 0.35 },
      intros: { filtered: 1, bed: 3, phone: 1, drumsFirst: 1, pickup: 2, cold: 1 }, tape: [0.5, 0.9],
      space: { t60: [1.5, 2.5], wet: [0.16, 0.28] }, echo: 0.4, grit: 0.4, vinyl: [0.5, 0.9], pump: [0.08, 0.2], texture: 0.25,
      riff: { notes: [5, 6], roles: RIFF_ROLES, versions: { full: 5, beat: 1 } },
      guitar: { parts: { none: 5, chords: 2, riff: 2 }, sounds: { nylon: 3, jazz: 1 } },
    },
    picture: { style: 'ink', inks: ['orange', 'green'], scene: 'hills', weather: ['wind', 'clear'], hours: [16, 19], motion: 0.35, characters: 'birds' },
  },
  // The mood stations (MOODS.md), from the user's reference mixes as research/moods.md measured them, ten tracks from
  // each. Each has one trait its settings alone can't give it.
  {
    // Settle's chillhop: 79 bpm, a chord a bar, guitar in half the bars. Trait: the syncopated `groove` bass.
    id: 'groovy', genre: 'lofi', name: 'Groovy',
    about: "Chillhop, after Settle's mix. Its trait: a syncopated bass that pops off the beat.",
    music: {
      bpm: [74, 82], modes: { dorian: 3, aeolian: 1, ionian: 1, mixolydian: 1 }, colour: { plain: 1, lush: 3, airy: 1 },
      grammar: { borrowedIv: 0.3, tritoneSub: 0.25, backdoor: 0.15, secondary: 0.35, turnaround: 0.4, vamp: 0.2 },
      shapes: { '4x1': 4, '2x1': 2, '8x1': 2, '4x0.5': 1, '2x2': 1 }, grids: { 16: 1 }, swing: [0.58, 0.64], swing8: [0.6, 0.66], families: { skip: 3, boom: 2, lazy: 1 },
      voicings: { rootless: 3, drop2: 2, quartal: 2, cluster: 1 }, register: [55, 62], lead: [71, 77],
      comps: { hold: 1, push: 3, strum: 1, pulse: 3 }, basslines: { groove: 4, kick: 1, walk: 1 },
      keys: { ep: 3, felt: 1, upright: 1 }, leads: { vibes: 2, soft: 2, kalimba: 1, bell: 1, none: 1 }, basses: { round: 3, upright: 1 },
      kits: { tight: 3, dusty: 1 }, perc: { shaker: 0.5 },
      intros: { filtered: 1, bed: 1, phone: 1, drumsFirst: 3, pickup: 1, cold: 2 }, tape: [0.2, 0.5],
      space: { t60: [1.2, 2], wet: [0.14, 0.24] }, echo: 0.4, grit: 0.3, vinyl: [0.2, 0.5], pump: [0.15, 0.3], texture: 0.15,
      riff: { notes: [5, 7], roles: RIFF_ROLES, versions: { full: 5, beat: 2 } },
      guitar: { parts: { none: 2, chords: 1, riff: 1 }, sounds: { nylon: 1, jazz: 3 } },
    },
    picture: { style: 'ink', inks: ['orange', 'pink'], scene: 'town-edge', weather: ['clear'], hours: [18, 22], motion: 0.5, characters: 'lights' },
  },
  {
    // Lofi Girl's 1 A.M. study session: 79 bpm, a chord a bar, drums in every bar. Trait: steady, the beat never stops.
    id: 'chill-beats', tuning: 2, genre: 'lofi', name: 'Chill Beats',
    about: "Late-night study beats, after Lofi Girl's 1 A.M. mix. Its trait: the beat never stops; no move drops the drums.",
    music: {
      bpm: [76, 84], modes: { dorian: 2, ionian: 2, mixolydian: 1, aeolian: 1 }, colour: { plain: 1, lush: 3, airy: 2 },
      grammar: { borrowedIv: 0.4, tritoneSub: 0.15, backdoor: 0.15, secondary: 0.3, turnaround: 0.3, vamp: 0.2 },
      shapes: { '4x1': 4, '8x1': 2, '2x2': 1, '2x1': 1, '4x0.5': 1 }, grids: { 16: 2, 8: 2 }, swing: [0.56, 0.62], swing8: [0.54, 0.6], families: { boom: 3, lazy: 2, half: 1, skip: 1 },
      voicings: { rootless: 3, drop2: 2, cluster: 1, quartal: 1 }, register: [55, 62], lead: [71, 77],
      comps: { hold: 2, push: 2, strum: 1, pulse: 2 }, basslines: { push: 2, kick: 3, walk: 1 },
      keys: { ep: 3, felt: 2, upright: 1 }, leads: { vibes: 2, soft: 2, kalimba: 2, bell: 1, none: 1 }, basses: { round: 3, upright: 1 },
      kits: { dusty: 3, tight: 1 }, perc: { shaker: 0.3 }, steady: true,
      intros: { filtered: 1, bed: 1, phone: 1, drumsFirst: 3, pickup: 1, cold: 2 }, tape: [0.3, 0.6],
      space: { t60: [1.5, 2.5], wet: [0.16, 0.26] }, echo: 0.45, grit: 0.35, vinyl: [0.3, 0.6], pump: [0.15, 0.28], texture: 0.2,
      riff: { notes: [4, 6], roles: RIFF_ROLES, versions: { full: 4, beat: 2 } },
      guitar: { parts: { none: 4, chords: 1, riff: 1 }, sounds: { nylon: 1, jazz: 2 } },
    },
    picture: { style: 'ink', inks: ['blue', 'violet'], scene: 'harbour', weather: ['drizzle', 'clear'], hours: [24, 27], motion: 0.3, characters: 'lights' },
  },
  {
    // The bootleg boy's slow afternoon: mostly major, 80 bpm, about a chord a bar, piano in two bars of five and
    // guitar in one of four. Trait: lazy, every track behind the beat.
    id: 'afternoon-laze', tuning: 2, genre: 'lofi', name: 'Afternoon Laze',
    about: "Bright and unhurried, after the bootleg boy's Slow Afternoon mix. Its trait: every track plays behind the beat.",
    music: {
      bpm: [76, 84], modes: { ionian: 3, lydian: 2, mixolydian: 1 }, colour: { plain: 1, lush: 2, airy: 3 },
      grammar: { borrowedIv: 0.3, tritoneSub: 0.1, backdoor: 0.2, secondary: 0.35, turnaround: 0.35, vamp: 0.15 },
      shapes: { '4x1': 4, '8x1': 2, '2x1': 1, '4x0.5': 1, '2x2': 1 }, grids: { 8: 3, 16: 1 }, swing: [0.56, 0.62], swing8: [0.53, 0.59], families: { lazy: 3, half: 2, boom: 1 },
      voicings: { drop2: 3, rootless: 2, cluster: 1, quartal: 1 }, register: [57, 64], lead: [73, 79],
      comps: { hold: 2, push: 1, strum: 3, pulse: 1 }, basslines: { push: 3, kick: 1, walk: 1 },
      keys: { ep: 1, felt: 3, upright: 3 }, leads: { kalimba: 2, vibes: 2, soft: 1, bell: 1, none: 1 }, basses: { round: 2, upright: 2 },
      kits: { dusty: 2, tight: 1 }, perc: { shaker: 0.4 }, lazy: true,
      intros: { filtered: 1, bed: 2, phone: 1, drumsFirst: 1, pickup: 2, cold: 1 }, tape: [0.3, 0.6],
      space: { t60: [1.4, 2.2], wet: [0.14, 0.24] }, echo: 0.35, grit: 0.2, vinyl: [0.3, 0.6], pump: [0.08, 0.18], texture: 0.2,
      riff: { notes: [5, 6], roles: RIFF_ROLES, versions: { full: 6, beat: 1 } },
      guitar: { parts: { none: 3, chords: 0.5, riff: 0.5 }, sounds: { nylon: 3, jazz: 1 } },
    },
    picture: { style: 'ink', inks: ['yellow', 'green'], scene: 'lake', weather: ['clear'], hours: [13, 17], motion: 0.3, characters: 'birds' },
  },
  {
    // HITO's night lofi: 67 bpm, a chord every bar or so, keys in every bar and almost no guitar. Trait: a piano melody.
    id: 'night-lofi', tuning: 2, genre: 'lofi', name: 'Night Lofi',
    about: "Slow, in long rooms, after HITO's night mix. Its trait: a piano plays the melody.",
    music: {
      bpm: [63, 71], modes: { ionian: 2, dorian: 2, lydian: 1, aeolian: 1 }, colour: { plain: 1, lush: 3, airy: 2 },
      grammar: { borrowedIv: 0.35, tritoneSub: 0.2, backdoor: 0.2, secondary: 0.25, turnaround: 0.25, vamp: 0.3 },
      shapes: { '4x1': 3, '4x0.5': 2, '8x0.5': 1, '8x1': 1, '2x1': 1 }, grids: { 16: 2, 8: 2 }, swing: [0.56, 0.62], swing8: [0.5, 0.55], families: { lazy: 2, half: 3, boom: 1 },
      voicings: { drop2: 2, rootless: 2, quartal: 2, cluster: 1 }, register: [55, 62], lead: [71, 77],
      comps: { hold: 3, push: 1, strum: 2, pulse: 1 }, basslines: { push: 3, kick: 1, walk: 1 },
      keys: { ep: 2, felt: 3, upright: 2 }, leads: { piano: 4, soft: 1, vibes: 1, none: 1 }, basses: { round: 3, upright: 1 },
      kits: { dusty: 3, tight: 1 }, perc: { shaker: 0.2 },
      intros: { filtered: 2, bed: 2, phone: 1, drumsFirst: 1, pickup: 1, cold: 1 }, tape: [0.4, 0.8],
      space: { t60: [2.8, 4.2], wet: [0.26, 0.38] }, echo: 0.6, grit: 0.3, vinyl: [0.3, 0.7], pump: [0.08, 0.2], texture: 0.35,
      riff: { notes: [4, 5], roles: RIFF_ROLES, versions: { full: 5, beat: 1 } },
      guitar: { parts: { none: 9, chords: 0.5, riff: 0.5 }, sounds: { nylon: 2, jazz: 1 } },
    },
    picture: { style: 'ink', inks: ['violet', 'blue'], scene: 'harbour', weather: ['clear', 'mist'], hours: [22, 28], motion: 0.25, characters: 'lights' },
  },
  {
    // The Japanese Town's rainy 90s lofi: 65 bpm, a chord every bar or two, guitar in nine bars of ten, rain under it
    // all. Trait: two guitars, one strumming and one picking the tune.
    id: 'tokyo-lofi', tuning: 2, genre: 'lofi', name: 'Tokyo Lofi',
    about: "Rainy 90s Tokyo, after The Japanese Town's mix. Its trait: two guitars, one strumming and one picking the tune.",
    music: {
      bpm: [62, 70], modes: { dorian: 3, aeolian: 2, ionian: 2 }, colour: { plain: 1, lush: 3, airy: 1 },
      grammar: { borrowedIv: 0.3, tritoneSub: 0.3, backdoor: 0.15, secondary: 0.3, turnaround: 0.3, vamp: 0.3 },
      shapes: { '4x1': 3, '4x0.5': 3, '8x0.5': 1, '2x1': 1 }, grids: { 16: 3, 8: 1 }, swing: [0.58, 0.64], swing8: [0.5, 0.56], families: { lazy: 2, boom: 2, half: 2 },
      voicings: { rootless: 3, drop2: 2, quartal: 1, cluster: 1 }, register: [54, 61], lead: [70, 76],
      comps: { hold: 2, push: 2, strum: 2, pulse: 1 }, basslines: { push: 2, kick: 1, walk: 2 },
      keys: { ep: 2, felt: 2, upright: 1 }, leads: { vibes: 2, soft: 1, kalimba: 1, none: 1 }, basses: { round: 2, upright: 2 },
      kits: { dusty: 3, tight: 1 }, perc: { shaker: 0.2 },
      intros: { filtered: 2, bed: 2, phone: 1, drumsFirst: 1, pickup: 1, cold: 1 }, tape: [0.3, 0.7],
      space: { t60: [2, 3], wet: [0.2, 0.32] }, echo: 0.5, grit: 0.35, vinyl: [0.3, 0.7], pump: [0.1, 0.22], texture: 0.8,
      riff: { notes: [5, 6], roles: RIFF_ROLES, versions: { full: 5, beat: 1 } },
      guitar: { parts: { none: 0.5, chords: 1, riff: 1, both: 3 }, sounds: { nylon: 2, jazz: 2 } },
    },
    picture: { style: 'ink', inks: ['blue', 'pink'], scene: 'town-edge', weather: ['rain', 'drizzle'], hours: [20, 26], motion: 0.35, characters: 'lanterns' },
  },
];

export const stationById = (id) => STATIONS.find((s) => s.id === id);
