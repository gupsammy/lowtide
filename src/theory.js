// Notes, scales and chords. Pitches are MIDI numbers (60 = middle C); pitch classes are 0–11 (C = 0).

export const NOTE_NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
export const mod12 = (n) => ((n % 12) + 12) % 12;
export const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

export const MODES = {
  ionian: [0, 2, 4, 5, 7, 9, 11],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
};
export const isMinor = (mode) => mode === 'dorian' || mode === 'aeolian';

// Chord qualities as intervals above the root. Upper notes (9, 11, 13) are written above the octave.
export const QUALITIES = {
  maj7: [0, 4, 7, 11], maj9: [0, 4, 7, 11, 14], '6/9': [0, 4, 7, 9, 14], 'maj7#11': [0, 4, 7, 11, 18],
  m7: [0, 3, 7, 10], m9: [0, 3, 7, 10, 14], m11: [0, 3, 7, 10, 14, 17], m6: [0, 3, 7, 9, 14],
  7: [0, 4, 7, 10], 9: [0, 4, 7, 10, 14], 13: [0, 4, 7, 10, 14, 21], '7b9': [0, 4, 7, 10, 13], '9sus': [0, 5, 7, 10, 14],
  '7#11': [0, 4, 7, 10, 14, 18], m7b5: [0, 3, 6, 10], maj: [0, 4, 7], min: [0, 3, 7],
};

// The chord's notes that carry its colour, by role: the third (or the sus fourth), the seventh (or sixth), and the
// upper notes. Voicings are built from these; the root belongs to the bass.
export function chordTones(q) {
  const iv = QUALITIES[q];
  const third = iv.find((x) => x === 3 || x === 4 || x === 5);
  const seventh = iv.find((x) => x === 9 || x === 10 || x === 11) ?? null;
  const fifth = iv.find((x) => x === 6 || x === 7);
  const upper = iv.filter((x) => x > 12);
  return { third, fifth, seventh, upper };
}

export const chordPcs = (root, q) => QUALITIES[q].map((x) => mod12(root + x));

// Notes a melody may rest on over a chord: its own notes. The scale's other notes may pass between them.
export const restPcs = (key, ch) => new Set(chordPcs(key + ch.root, ch.q));

export const scalePcs = (key, mode) => MODES[mode].map((x) => mod12(key + x));

export const noteName = (m) => NOTE_NAMES[mod12(m)] + (Math.floor(m / 12) - 1);
