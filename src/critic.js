// Checks a planned track before any sound is made. A plan that fails is re-rolled, so a weak or repeated track is
// never heard. Every check reads the plan's data; none needs audio.
import { MODES, QUALITIES, chordPcs, chordTones, mod12 } from './theory.js';
import { rubs } from './melody.js';
import { plan } from './plan.js';
import { deriveSeed } from './rand.js';

const chordAt = (p, beat) => p.chords.findLast((c) => c.start <= beat + 1e-9) ?? p.chords[0];

// Three measures of the melody (MELODY.md §1): how surprising its notes are, how well they sit on the chords, and how
// much of it repeats. They report; review() rejects nothing on them until ratings show where the bands belong.

// Key profiles in three levels, after Temperley's (2008): the home triad, the mode's other notes, everything else.
// Built for each mode, so a Dorian 6th is not marked as wrong the way a folk-song minor profile would mark it.
const PROFILES = Object.fromEntries(Object.entries(MODES).map(([mode, s]) => [mode,
  Array.from({ length: 12 }, (_, pc) => ([s[0], s[2], s[4]].includes(pc) ? 0.19 : s.includes(pc) ? 0.1 : 0.006))]));
const normal = (x, mean, variance) => Math.exp(-((x - mean) ** 2) / (2 * variance));

// Bits per note: how unexpected each note is given the key, the line's centre and the note before (Temperley's
// range × proximity × key model, with his Essen variances 29.0 and 7.2). notes: [{ midi }] in order.
export function surprisal(notes, key, mode) {
  const K = PROFILES[mode], centre = notes.reduce((s, n) => s + n.midi, 0) / notes.length;
  return notes.map((n, i) => {
    let all = 0, mine = 0;
    for (let q = 21; q <= 108; q++) {
      const w = normal(q, centre, 29) * (i ? normal(q, notes[i - 1].midi, 7.2) : 1) * K[mod12(q - key)];
      all += w;
      if (q === n.midi) mine = w;
    }
    return -Math.log2(mine / all);
  });
}

// The chord a note is heard against: the one under it, or the next one if the note starts within an eighth of the
// change and is held across it (an anticipation).
function heardOver(p, n) {
  const next = p.chords.find((c) => c.start > n.beat + 1e-9);
  return next && next.start - n.beat <= 0.5 + 1e-9 && n.beat + n.len > next.start + 1e-9 ? next : chordAt(p, n.beat);
}
// 'chord' (root, 3rd or sus 4th, 5th, 7th or 6th), 'colour' (9th, 11th, 13th) or 'other'.
function role(p, n) {
  const c = heardOver(p, n), t = chordTones(c.q), pc = mod12(n.midi - c.key - c.root);
  if ([0, t.third, t.fifth, t.seventh].some((x) => x != null && mod12(x) === pc)) return 'chord';
  return QUALITIES[c.q].some((x) => mod12(x) === pc) ? 'colour' : 'other';
}

// Each bar's notes as onset/pitch pairs; `from` makes the pitches relative to the bar's first note (its shape).
const barKeys = (notes, start, bars, from) => Array.from({ length: bars }, (_, b) => {
  const bar = notes.filter((n) => n.beat >= start + b * 4 - 1e-9 && n.beat < start + b * 4 + 4 - 1e-9);
  return bar.length ? bar.map((n) => `${(n.beat - start - b * 4).toFixed(3)}/${n.midi - (from ? bar[0].midi : 0)}`).join(' ') : null;
});
const leadIn = (p, s) => p.events.lead.filter((n) => n.beat >= s.start - 1e-9 && n.beat < s.start + s.bars * 4 - 1e-9);

// A track's scores, or null if it has no melody. Each section type's first statement is scored (the intro only
// previews A); `fresh` covers the whole track as heard.
export function scores(p) {
  const done = new Set();
  let bits = [], counts = { chord: 0, colour: 0, other: 0 }, stepping = 0, anchored = 0, later = 0, hook = 0, exact = 0;
  for (const s of p.sections) {
    const notes = leadIn(p, s);
    if (s.kind === 'intro' || done.has(s.kind) || notes.length < 2) continue;
    done.add(s.kind);
    bits.push(...surprisal(notes, s.key, s.mode));
    notes.forEach((n, i) => {
      const r = role(p, n), next = notes[i + 1];
      counts[r]++;
      if (r !== 'chord' && next && Math.abs(next.midi - n.midi) <= 2) {
        stepping++;
        if (role(p, next) === 'chord') anchored++;
      }
    });
    const shapes = barKeys(notes, s.start, s.bars, true).filter(Boolean), pitches = barKeys(notes, s.start, s.bars, false).filter(Boolean);
    for (let i = 1; i < shapes.length; i++) {
      later++;
      if (shapes.slice(0, i).includes(shapes[i])) hook++;
      if (pitches.slice(0, i).includes(pitches[i])) exact++;
    }
  }
  if (!bits.length) return null;
  const heard = new Set(), bars = p.sections.filter((s) => s.layers.includes('lead')).flatMap((s) => barKeys(leadIn(p, s), s.start, s.bars, false)).filter(Boolean);
  const fresh = bars.filter((k) => !heard.has(k) && heard.add(k)).length;
  const mean = bits.reduce((a, b) => a + b, 0) / bits.length, notes = bits.length, outside = counts.colour + counts.other;
  return {
    surprise: mean, surpriseSpread: Math.sqrt(bits.reduce((a, b) => a + (b - mean) ** 2, 0) / notes),
    fit: (counts.chord + stepping) / notes, colour: counts.colour / notes, anchoring: outside ? anchored / outside : null,
    hook: later ? hook / later : null, exact: later ? exact / later : null, fresh: fresh / bars.length,
  };
}

// recent: plans heard just before, newest first.
export function review(p, station, recent = []) {
  const problems = [], M = station.music, t = p.traits;

  // Music
  const lead = p.events.lead.map((n) => n.midi);
  if (lead.length && Math.max(...lead) - Math.min(...lead) > 19) problems.push('melody spans more than a twelfth');
  for (const n of p.events.lead) {
    const k = p.events.keys.find((k) => k.beat <= n.beat + 1e-9 && n.beat < k.beat + k.len);
    if (!k) continue;
    if (n.midi <= Math.max(...k.midis)) { problems.push(`melody sinks into the chord at beat ${n.beat.toFixed(2)}`); break; }
    if (rubs(n.midi, k.midis)) { problems.push(`melody note grinds against the keys at beat ${n.beat.toFixed(2)}`); break; }
  }
  for (const n of p.events.lead) {
    if (n.beat % 2 !== 0) continue; // beats 1 and 3 of the bar
    const c = chordAt(p, n.beat);
    if (!chordPcs(c.key + c.root, c.q).includes(mod12(n.midi))) { problems.push(`melody leaves ${c.roman}${c.q} on a strong beat (${n.beat})`); break; }
  }
  // the riff sits between the chords and the lead (RIFF.md §5)
  const sounding = (list, t) => list.filter((e) => e.beat <= t + 1e-9 && t < e.beat + e.len - 1e-9);
  for (const n of p.events.riff ?? []) {
    if (sounding(p.events.keys, n.beat).some((k) => rubs(n.midi, k.midis))) { problems.push(`the riff grinds against the keys at beat ${n.beat.toFixed(2)}`); break; }
  }
  for (const n of p.events.lead) {
    if (sounding(p.events.riff ?? [], n.beat).some((r) => r.midi >= n.midi)) { problems.push(`melody dips under the riff at beat ${n.beat.toFixed(2)}`); break; }
  }
  for (const k of p.events.keys) {
    if (k.midis.some((m, i) => i && m <= k.midis[i - 1])) { problems.push('a voicing has crossed or doubled notes'); break; }
    const under = p.events.bass.find((b) => b.beat <= k.beat && b.beat + b.len > k.beat);
    if (under && under.midi >= k.midis[0]) { problems.push('the bass climbs above the chord'); break; }
  }
  let flat = 0;
  for (let i = 0; i < p.sections.length; i++) {
    flat = i && p.sections[i].energy === p.sections[i - 1].energy ? flat + p.sections[i].bars : p.sections[i].bars;
    if (flat > 16) { problems.push('energy stays flat for more than 16 bars'); break; }
  }

  // Fit to the station
  if (p.bpm < M.bpm[0] || p.bpm > M.bpm[1]) problems.push('tempo outside the station');
  if (!M.modes[t.mode]) problems.push('mode outside the station');
  if (!M.intros[t.intro]) problems.push('intro outside the station');

  // Sameness: too close to what was just played
  const last = recent[0]?.traits;
  if (last) {
    const shared = [t.shape === last.shape, t.kit === last.kit, t.keysVoice === last.keysVoice, t.intro === last.intro, Math.abs(t.bpm - last.bpm) <= 5]
      .filter(Boolean).length;
    if (shared > 3) problems.push(`shares ${shared} main traits with the last track`);
  }
  if (recent.slice(0, 2).some((r) => r.traits.intro === t.intro)) problems.push(`opens the same way (${t.intro}) as a recent track`);

  return { ok: problems.length === 0, problems, scores: scores(p) };
}

// The next track for a station: the seed's own plan if it passes, else re-rolls from it. opts go to plan().
export function nextTrack(seed, station, recent = [], opts = {}, maxTries = 40) {
  let p, r;
  for (let i = 0; i < maxTries; i++) {
    p = plan(i ? deriveSeed(seed, i) : seed, station, opts);
    r = review(p, station, recent);
    if (r.ok) return { plan: p, rerolls: i, problems: [], scores: r.scores };
  }
  return { plan: p, rerolls: maxTries, problems: r.problems, scores: r.scores };
}
