// The shape of a track: how it opens, which sections follow, how much energy each carries and which instruments play.

// Ways to open a track. layers: who plays; fx: what happens to the sound while the intro lasts.
export const INTROS = {
  filtered: { bars: [2, 4], layers: ['keys'], fx: { sweep: true } }, // keys alone, as if behind a closed door that opens
  drumsFirst: { bars: [2, 4], layers: ['drums'], fx: {} }, // the beat on its own; chords come in with section A
  bed: { bars: [2, 4], layers: ['pad'], fx: { swell: true } }, // a soft pad rises out of the room noise
  pickup: { bars: [1, 2], layers: ['keys', 'lead'], fx: {} }, // the melody starts first and leads the band in
  phone: { bars: [2, 4], layers: ['keys', 'drums', 'bass'], fx: { phone: true } }, // the song small and far away
  cold: { bars: [0, 0], layers: [], fx: {} }, // no intro: straight into the song
};

export const FORMS = {
  T1: ['intro', 'A', 'A', 'B', 'A', 'outro'],
  T2: ['intro', 'A', 'B', 'A', 'B', 'outro'],
  T3: ['intro', 'A', 'A', 'B', 'break', 'A', 'outro'],
};

// Build the list of sections. loopBars: the progression's length, so sections hold whole loops. The lead never plays
// the first A; when it would have entered there, that A ends with a pickup into the lead's first section. Once the
// lead has played, B sits out half the time; a break has the lead or the keys alone at even odds (MELODY.md §3).
// arrange: the stream for those choices, so the form's own draws stay as they were.
export function sections(R, { form, intro, loopBars, leadFrom, softB, arrange }) {
  const whole = (n) => Math.max(loopBars, Math.ceil(n / loopBars) * loopBars);
  const I = INTROS[intro];
  let aCount = 0;
  const out = [];
  for (const kind of FORMS[form]) {
    if (kind === 'intro') {
      const bars = R.int(I.bars);
      if (bars) out.push({ kind, bars, energy: 0.3, layers: [...I.layers], fx: { ...I.fx } });
    } else if (kind === 'A') {
      aCount++;
      const lead = aCount > 1 && (leadFrom === 'A1' || leadFrom === 'A2' || (leadFrom === 'B' && out.some((s) => s.kind === 'B')));
      out.push({ kind, bars: whole(8), energy: aCount === 1 ? 0.5 : 0.62, layers: ['keys', 'bass', 'drums', ...(lead ? ['lead'] : [])], fx: {}, ...(aCount === 1 && leadFrom === 'A1' ? { pickup: true } : {}) });
    } else if (kind === 'B') {
      const lead = leadFrom && (!out.some((s) => s.kind !== 'intro' && s.layers.includes('lead')) || arrange.chance(0.5));
      out.push({ kind, bars: whole(8), energy: softB ? 0.42 : 0.75, layers: ['keys', 'bass', 'drums', ...(lead ? ['lead'] : [])], fx: {} });
    } else if (kind === 'break') {
      const lead = leadFrom && arrange.chance(0.5);
      out.push({ kind, bars: whole(4), energy: 0.25, layers: ['keys', ...(lead ? ['lead'] : [])], fx: {} });
    } else {
      out.push({ kind, bars: 4, energy: 0.3, layers: ['keys', 'bass'], fx: { fade: true } });
    }
  }
  return out;
}
