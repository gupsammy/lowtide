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

// A track's versions (ARRANGE.md §3): the layers each leaves out.
export const VERSIONS = { full: [], beat: ['lead'] };

// Leave parts out of a whole section. `left` names them, so choices that depend on a part being there are drawn the
// same either way. A section left with nothing to play (an intro of drums alone) plays the keys instead.
export function leaveOut(s, parts) {
  const gone = s.layers.filter((l) => parts.includes(l));
  s.layers = s.layers.filter((l) => !parts.includes(l));
  if (!s.layers.length) s.layers = ['keys'];
  if (gone.length) s.left = [...(s.left ?? []), ...gone];
}

// Whether a part plays t beats into a section: it's one of the section's layers, and no move has it sitting out.
export const playing = (s, part, t) => s.layers.includes(part) && !s.cuts?.some((c) => c.out.includes(part) && t >= c.from * 4 - 1e-9 && t < c.to * 4 - 1e-9);

// Build the list of sections, with the full band. loopBars: the progression's length, so sections hold whole loops.
// sameB: B replays A's loop with the drums out, unless the station is steady (MOODS.md §3) and its beat never stops.
export function sections(R, { form, intro, loopBars, leadFrom, softB, sameB = false, steady = false }) {
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
  // a B that replays A's loop leaves out its drums
  for (const s of out) if (sameB && !steady && s.kind === 'B') leaveOut(s, ['drums']);
  return out;
}

// Moves (ARRANGE.md §2): a part leaves and comes back at a phrase edge while the loop plays on. Each finds its place
// in the sections or doesn't fit the track: a list of [section index, first bar, bar after the last, parts out].
const finalA = (S) => S.findLastIndex((s) => s.kind === 'A'), firstB = (S) => S.findIndex((s) => s.kind === 'B');
export const MOVES = {
  // the band drops out for the last four bars before the final A and comes back on its first beat
  drop: { weight: 3, place(S) { const i = finalA(S) - 1, s = S[i]; return s && s.kind !== 'intro' && s.layers.includes('drums') ? [[i, s.bars - 4, s.bars, ['drums', 'bass']]] : null; } },
  // the band falls away halfway through the final A, and the loop rings out alone
  ending: { weight: 3, place(S) { const i = finalA(S), o = S.findIndex((s) => s.kind === 'outro'); return [[i, S[i].bars - 4, S[i].bars, ['drums', 'bass']], [o, 0, S[o].bars, ['bass']]]; } },
  // the drums come in four bars into the first A
  late: { weight: 2, place(S) { const i = S.findIndex((s) => s.kind === 'A'); return S[0].kind === 'intro' && S[0].layers.includes('drums') ? null : [[i, 0, 4, ['drums']]]; } },
  // B opens on the loop alone, and the band joins four bars in
  breakdown: { weight: 2, not: ['stop'], place(S) { const i = firstB(S); return S[i].layers.includes('drums') ? [[i, 0, 4, ['drums', 'bass']]] : null; } },
  // the band stops for the last bar of the A before B, and comes back on B's first beat, so B can't open bare
  stop: { weight: 1.5, not: ['breakdown'], place(S) { const i = firstB(S) - 1; return S[i].kind === 'A' && S[i + 1].layers.includes('drums') ? [[i, S[i].bars - 1, S[i].bars, ['drums', 'bass']]] : null; } },
  // the break goes to the keys alone
  bareBreak: { weight: 2, place(S) { const i = S.findIndex((s) => s.kind === 'break'); return i >= 0 && S[i].layers.includes('lead') ? [[i, 0, S[i].bars, ['lead']]] : null; } },
};

// The share of A and B bars without drums.
function quiet(S) {
  let n = 0, all = 0;
  for (const s of S) if (s.kind === 'A' || s.kind === 'B') for (let b = 0; b < s.bars; b++) { all++; if (!playing(s, 'drums', b * 4)) n++; }
  return n / all;
}

function apply(S, move, edits) {
  for (const [i, from, to, out] of edits) {
    if (from === 0 && to === S[i].bars) leaveOut(S[i], out);
    else (S[i].cuts ??= []).push({ move, from, to, out });
  }
}

// Draw a track's moves and apply them to its sections: one to three, at most one to a section, none with a move it
// rules out (`not`), keeping the drums in at least half the A and B bars. only: the moves to apply instead, those of them that fit. On a steady
// station no move takes the drums out. Returns the moves' names.
export function arrange(R, S, only, steady = false) {
  const count = only ? Infinity : R.weighted({ 1: 1, 2: 3, 3: 2 }), used = new Set(), chosen = [];
  const copy = () => S.map((s) => ({ ...s, layers: [...s.layers], cuts: s.cuts && [...s.cuts] }));
  while (chosen.length < count) {
    const fits = Object.entries(MOVES).filter(([name, m]) => {
      if (chosen.includes(name) || m.not?.some((k) => chosen.includes(k)) || (only && !only.includes(name))) return false;
      const edits = m.place(S);
      if (!edits || edits.some(([i]) => used.has(i)) || (steady && edits.some(([, , , out]) => out.includes('drums')))) return false;
      const T = copy();
      apply(T, name, edits);
      return quiet(T) <= 0.5;
    });
    if (!fits.length) break;
    const name = only ? fits[0][0] : R.weighted(fits.map(([k, m]) => [k, m.weight])), edits = MOVES[name].place(S);
    apply(S, name, edits);
    for (const [i] of edits) used.add(i);
    chosen.push(name);
  }
  return chosen;
}
