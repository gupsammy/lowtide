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

// A track's versions (RIFF.md §4): the layers each leaves out.
export const VERSIONS = { full: [], keys: ['drums', 'bass', 'lead'], nodrums: ['drums'], beat: ['lead'] };

// Build the list of sections. loopBars: the progression's length, so sections hold whole loops. sameB: B replays A's
// loop with the drums out. version: a VERSIONS key.
export function sections(R, { form, intro, loopBars, leadFrom, softB, sameB = false, version = 'full' }) {
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
      const lead = leadFrom === 'A1' || (leadFrom === 'A2' && aCount >= 2) || (leadFrom === 'B' && out.some((s) => s.kind === 'B'));
      out.push({ kind, bars: whole(8), energy: aCount === 1 ? 0.5 : 0.62, layers: ['keys', 'bass', 'drums', ...(lead ? ['lead'] : [])], fx: {} });
    } else if (kind === 'B') {
      out.push({ kind, bars: whole(8), energy: softB || sameB ? 0.42 : 0.75, layers: ['keys', 'bass', 'drums', ...(leadFrom ? ['lead'] : [])], fx: {} });
    } else if (kind === 'break') {
      out.push({ kind, bars: whole(4), energy: 0.25, layers: ['keys', ...(leadFrom ? ['lead'] : [])], fx: {} });
    } else {
      out.push({ kind, bars: 4, energy: 0.3, layers: ['keys', 'bass'], fx: { fade: true } });
    }
  }
  // A version leaves parts out, and a B that replays A's loop leaves out its drums. `left` names them, so choices
  // that depend on a part being there are drawn the same either way. An intro left with nothing to play (the drums,
  // alone) plays the keys instead.
  for (const s of out) {
    const drop = [...VERSIONS[version], ...(sameB && s.kind === 'B' ? ['drums'] : [])], left = s.layers.filter((l) => drop.includes(l));
    s.layers = s.layers.filter((l) => !drop.includes(l));
    if (!s.layers.length) s.layers = ['keys'];
    if (left.length) s.left = left;
  }
  return out;
}
