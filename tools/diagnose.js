// Measures planned tracks against the targets in DESIGN.md ("What must change, in numbers"), plus a few figures that
// have no target but are worth watching, and each station's melody scores (MELODY.md §1). Reads plans only; no audio.
//   node tools/diagnose.js [tracks per station]
import { STATIONS } from '../src/stations.js';
import { plan } from '../src/plan.js';
import { MODES, chordPcs, mod12, isMinor } from '../src/theory.js';
import { scores } from '../src/critic.js';

// Written out here rather than imported from melody.js, so a mistake there can't hide itself from this measure.
const rubs = (midi, voicing) => voicing.some((v) => mod12(midi - v) === 1);

export function measure(plans) {
  const m = {};
  const jac = (a, b) => { const A = new Set(a), B = new Set(b); let i = 0; for (const x of A) if (B.has(x)) i++; return i / Math.max(1, new Set([...A, ...B]).size); };
  const near = (a, b) => Math.abs(a - b) < 0.02;

  // Swing: a hat is on a swung position when the swing moved it off the straight grid.
  let hats = 0, swung = 0;
  for (const p of plans) {
    const unit = p.traits.feel.grid === 8 ? 1 : 0.5;
    for (const e of p.events.drums) if (e.drum === 'hat' || e.drum === 'open') {
      hats++;
      const f = e.beat % unit;
      if (!near(f, 0) && !near(f, unit) && !near(f, unit / 2)) swung++;
    }
  }
  m.hatsSwung = swung / hats;

  // A bass that plays with the kick lands on the kick's own (swung) time, or marks a chord change.
  let kb = 0, kbOff = 0;
  for (const p of plans) if (p.traits.bassline === 'kick') {
    const kicks = p.events.drums.filter((e) => e.drum === 'kick').map((e) => e.beat);
    const changes = p.chords.map((c) => c.start);
    for (const b of p.events.bass) {
      const sec = p.sections.find((s) => b.beat >= s.start && b.beat < s.start + s.bars * 4);
      if (!sec?.layers.includes('drums')) continue;
      kb++;
      if (!kicks.some((k) => near(k, b.beat)) && !changes.some((c) => near(c, b.beat))) kbOff++;
    }
  }
  m.bassOffKick = kbOff / Math.max(1, kb);

  // The melody against the keys sounding under it.
  let ln = 0, below = 0, onBeat = 0, rubOnBeat = 0, rubAny = 0;
  for (const p of plans) for (const n of p.events.lead) {
    const k = p.events.keys.find((k) => k.beat <= n.beat + 1e-9 && n.beat < k.beat + k.len);
    if (!k) continue;
    ln++;
    if (n.midi <= Math.max(...k.midis)) below++;
    if (rubs(n.midi, k.midis)) { rubAny++; if (near(n.beat, Math.round(n.beat))) rubOnBeat++; }
    if (near(n.beat, Math.round(n.beat))) onBeat++;
  }
  m.leadBelowKeys = below / ln;
  m.rubOnBeat = rubOnBeat / onBeat;
  m.rubAny = rubAny / ln;

  // Repetition: a section's drum bars two apart (outside variation and fill bars).
  let dPairs = 0, dSim = 0;
  for (const p of plans) {
    for (const s of p.sections) if (s.layers.includes('drums')) for (let b = 0; b + 2 < s.bars - 1; b++) {
      if (b % 4 === 3 || (b + 2) % 4 === 3) continue;
      const bar = (k) => p.events.drums.filter((e) => e.beat >= s.start + k * 4 && e.beat < s.start + k * 4 + 4).map((e) => `${(e.beat - s.start - k * 4).toFixed(3)}${e.drum}${e.vel}`);
      dPairs++; dSim += jac(bar(b), bar(b + 2));
    }
  }
  m.drumsShared = dSim / dPairs;

  // Space and hook (MELODY.md §3), over the sections the lead plays apart from the intro. A unit's played bars run
  // from its start to its first empty bar; all but the last are idea bars, and the last is the answer.
  const rest = {};
  let firstPairs = 0, firstSame = 0, ideas = 0, back = 0, peaked = 0, peakable = 0, homes = 0, homeable = 0;
  const at = (p, t) => p.chords.findLast((c) => c.start <= t + 1e-9);
  for (const p of plans) {
    const secs = p.sections.filter((s) => s.kind !== 'intro' && s.layers.includes('lead'));
    const notesIn = (from, beats) => p.events.lead.filter((n) => n.beat >= from - 1e-9 && n.beat < from + beats - 1e-9);
    for (const s of secs) {
      const ns = notesIn(s.start, s.bars * 4), bar = (b) => notesIn(s.start + b * 4, 4);
      const r = (rest[p.traits.melody] ??= [0, 0]);
      for (let b = 0; b < s.bars; b++) { r[0]++; if (!bar(b).length) r[1]++; }
      const played = (u) => { let k = 0; while (k < 4 && u * 4 + k < s.bars && bar(u * 4 + k).length) k++; return k; };
      const chordsIn = (b) => p.chords.filter((c) => c.start < s.start + b * 4 + 4 && c.start + c.beats > s.start + b * 4)
        .map((c) => `${Math.max(0, c.start - s.start - b * 4)}:${c.key}:${c.root}:${c.q}`).join();
      const k0 = played(0);
      for (let u = 1; u * 4 < s.bars; u++) for (let j = 0; j < Math.min(played(u), k0) - 1; j++) {
        if (chordsIn(u * 4 + j) !== chordsIn(j)) continue;
        const a = bar(j), b = bar(u * 4 + j);
        ideas++;
        if (a.length === b.length && a.every((n, i) => near(b[i].beat - n.beat, u * 16) && b[i].midi === n.midi)) back++;
      }
      if (ns.length > 1) { peakable++; const top = Math.max(...ns.map((n) => n.midi)); if (ns.filter((n) => n.midi === top).length === 1) peaked++; }
      // a home chord on beat 1 or 3 of a bar the last unit can close in: its 2nd to 4th bar (a break's 2nd or 3rd)
      const lastU = Math.floor((s.bars - 1) / 4) * 4, reach = s.kind === 'break' ? 2 : 3;
      const home = [1, 2, 3].some((j) => j <= reach && lastU + j < s.bars && [0, 2].some((o) => at(p, s.start + (lastU + j) * 4 + o).root === 0));
      if (home && ns.length) {
        const n = ns[ns.length - 1];
        homeable++;
        if (p.chords.some((c) => c.root === 0 && c.start < n.beat + n.len - 1e-9 && c.start + c.beats > n.beat + 1e-9)) homes++;
      }
    }
    const As = secs.filter((s) => s.kind === 'A'), first = (s) => notesIn(s.start, 16).map((n) => `${(n.beat - s.start).toFixed(2)}:${n.midi}`).join();
    for (let i = 1; i < As.length; i++) { firstPairs++; if (first(As[i]) === first(As[0])) firstSame++; }
  }
  m.resting = Object.fromEntries(Object.entries(rest).map(([k, [n, r]]) => [k, r / n]));
  m.restingRange = [Math.min(...Object.values(m.resting)), Math.max(...Object.values(m.resting))];
  m.ideasBack = back / ideas; m.peakOnce = peaked / peakable; m.closeHome = homes / homeable; m.firstShared = firstSame / firstPairs;

  // Melody shape.
  let iv = 0, steps = 0, leaps = 0, leapsNext = 0, turns = 0;
  const peaks = [0, 0, 0, 0];
  for (const p of plans) for (const s of p.sections) {
    const ns = p.events.lead.filter((n) => n.beat >= s.start && n.beat < s.start + s.bars * 4);
    for (let i = 1; i < ns.length; i++) {
      const d = ns[i].midi - ns[i - 1].midi;
      iv++;
      if (Math.abs(d) <= 2) steps++;
      if (Math.abs(d) >= 5) { leaps++; if (ns[i + 1]) { leapsNext++; if (Math.sign(ns[i + 1].midi - ns[i].midi) === -Math.sign(d)) turns++; } }
    }
    for (let b = 0; b < s.bars; b += 4) {
      const ph = ns.filter((n) => n.beat >= s.start + b * 4 && n.beat < s.start + b * 4 + 16);
      if (ph.length > 3) { const hi = Math.max(...ph.map((n) => n.midi)); peaks[Math.min(3, Math.floor((ph.find((n) => n.midi === hi).beat - s.start - b * 4) / 4))]++; }
    }
  }
  m.steps = steps / iv; m.leaps = leaps / iv; m.turnsAfterLeap = turns / Math.max(1, leapsNext);
  m.peakByQuarter = peaks.map((x) => x / peaks.reduce((a, b) => a + b, 0));

  // Harmony: in-key chords (not borrowed, not substituted, not the harmonic-minor V) must keep their colour in the mode.
  let inKey = 0, outside = 0, uniform = 0;
  for (const p of plans) {
    for (const c of p.chords) {
      const sec = p.sections.find((s) => c.start >= s.start && c.start < s.start + s.bars * 4);
      if (c.borrowed || c.sub || (c.roman === 'V' && c.kind === 'dom' && isMinor(sec.mode))) continue;
      inKey++;
      const scale = MODES[sec.mode].map((x) => mod12(sec.key + x));
      if (chordPcs(c.key + c.root, c.q).some((pc) => !scale.includes(pc))) outside++;
    }
    const kinds = {};
    for (const c of p.chords) (kinds[c.kind] ??= new Set()).add(c.q);
    if (Object.values(kinds).every((s) => s.size === 1)) uniform++;
  }
  m.outOfMode = outside / inKey; m.uniformColour = uniform / plans.length;

  // Expression: how much the keys' strength varies within a track.
  m.keysVelSpread = plans.reduce((acc, p) => {
    const v = p.events.keys.map((k) => k.vel), mean = v.reduce((a, b) => a + b, 0) / v.length;
    return acc + Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / v.length);
  }, 0) / plans.length;
  return m;
}

// [name, measure, passes, target as written in DESIGN.md or MELODY.md, how to show the measure (a share by default)]
const range = ([a, b]) => `${Math.round(100 * a)}–${Math.round(100 * b)}%`;
export const TARGETS = [
  ['hats on swung positions', 'hatsSwung', (x) => x >= 0.35, '≥ 35%'],
  ['bass notes off the kick', 'bassOffKick', (x) => x === 0, 'none'],
  ['melody at or below the keys\' top note', 'leadBelowKeys', (x) => x === 0, '0%'],
  ['melody a semitone above a keys note, on the beat', 'rubOnBeat', (x) => x === 0, '0%'],
  ['drum bars n and n+2 alike', 'drumsShared', (x) => x === 1, '100%'],
  ['melody moving by step', 'steps', (x) => x >= 0.65, '≥ 65%'],
  ['in-key chords coloured outside the mode', 'outOfMode', (x) => x === 0, '0%'],
  ['keys velocity spread', 'keysVelSpread', (x) => x >= 0.1, '≥ 0.1', (x) => x.toFixed(3)],
  ['lead-section bars resting, fewest–most by character', 'restingRange', ([a, b]) => a >= 0.35 && b <= 0.55, '35–55%', range],
  ['idea bars back note for note where the chords repeat', 'ideasBack', (x) => x >= 0.8, '≥ 80%'],
  ['lead sections whose top note sounds once', 'peakOnce', (x) => x >= 0.9, '≥ 90%'],
  ['closing notes over a home chord, where one comes', 'closeHome', (x) => x >= 0.9, '≥ 90%'],
  ['first 4 bars shared by the A sections with the lead', 'firstShared', (x) => x === 1, '100%'],
];

// Each station's median and 10–90% range of the critic's melody scores, and of the bars the lead leaves empty in the
// sections it plays.
export function stationScores(plans) {
  const out = {};
  for (const p of plans) {
    const s = scores(p), row = (out[p.station] ??= {});
    if (s) for (const [k, v] of Object.entries(s)) if (v !== null) (row[k] ??= []).push(v);
    for (const sec of p.sections) if (sec.layers.includes('lead') && sec.kind !== 'intro') for (let b = 0; b < sec.bars; b++) {
      const at = sec.start + b * 4;
      (row.resting ??= []).push(p.events.lead.some((n) => n.beat >= at - 1e-9 && n.beat < at + 4 - 1e-9) ? 0 : 1);
    }
  }
  const q = (xs, f) => [...xs].sort((a, b) => a - b)[Math.round(f * (xs.length - 1))];
  for (const row of Object.values(out)) for (const k of Object.keys(row)) {
    const xs = row[k];
    row[k] = k === 'resting' ? { share: xs.reduce((a, b) => a + b, 0) / xs.length } : { median: q(xs, 0.5), lo: q(xs, 0.1), hi: q(xs, 0.9) };
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const per = Number(process.argv[2] || 60);
  const plans = STATIONS.flatMap((st) => Array.from({ length: per }, (_, i) => plan(11 + i * 29, st)));
  const m = measure(plans), pct = (x) => `${(100 * x).toFixed(1)}%`;
  console.log(`${plans.length} plans\n`);
  for (const [name, k, ok, target, show = pct] of TARGETS) console.log(`${ok(m[k]) ? 'ok  ' : 'MISS'} ${name.padEnd(52)} ${show(m[k]).padStart(7)}   target ${target}`);
  console.log(`\n     melody a semitone above a keys note, anywhere      ${pct(m.rubAny).padStart(7)}`);
  console.log(`     leaps of a fourth or more                          ${pct(m.leaps).padStart(7)}   turn back after one ${pct(m.turnsAfterLeap)}`);
  console.log(`     phrase peak by quarter                             ${m.peakByQuarter.map(pct).join(' ')}`);
  console.log(`     tracks with one colour per chord kind              ${pct(m.uniformColour).padStart(7)}`);
  console.log(`     lead-section bars resting, by character            ${Object.entries(m.resting).map(([k, x]) => `${k} ${pct(x)}`).join('  ')}`);

  // the melody scores, median [10–90%] per station
  const S = stationScores(plans), cols = ['surprise', 'fit', 'colour', 'anchoring', 'hook', 'exact', 'fresh'];
  const show = (k, x) => (k === 'surprise' || k === 'fit' ? x.toFixed(2) : pct(x).replace('.0%', '%'));
  console.log(`\nmelody scores, median [10–90%]; resting: lead-section bars with no lead note`);
  for (const [station, row] of Object.entries(S)) {
    console.log(`  ${station.padEnd(13)} ${cols.map((k) => `${k} ${show(k, row[k].median)} [${show(k, row[k].lo)}–${show(k, row[k].hi)}]`).join('  ')}  resting ${pct(row.resting.share)}`);
  }
}
