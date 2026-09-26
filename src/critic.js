// Checks a planned track before any sound is made. A plan that fails is re-rolled, so a weak or repeated track is
// never heard. Every check reads the plan's data; none needs audio.
import { chordPcs, mod12 } from './theory.js';
import { rubs } from './melody.js';
import { plan } from './plan.js';
import { deriveSeed } from './rand.js';

const chordAt = (p, beat) => p.chords.findLast((c) => c.start <= beat + 1e-9) ?? p.chords[0];

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

  return { ok: problems.length === 0, problems };
}

// The next track for a station: the seed's own plan if it passes, else re-rolls from it.
export function nextTrack(seed, station, recent = [], maxTries = 40) {
  let p, r;
  for (let i = 0; i < maxTries; i++) {
    p = plan(i ? deriveSeed(seed, i) : seed, station);
    r = review(p, station, recent);
    if (r.ok) return { plan: p, rerolls: i, problems: [] };
  }
  return { plan: p, rerolls: maxTries, problems: r.problems };
}
