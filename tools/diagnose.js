// Measures planned tracks against the targets in DESIGN.md ("What must change, in numbers") and RIFF.md §1, plus a few figures that
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

  // Repetition: the two A sections' melodies, and a section's drum bars two apart (outside variation and fill bars).
  let pairs = 0, mSim = 0, dPairs = 0, dSim = 0;
  for (const p of plans) {
    const As = p.sections.filter((s) => s.kind === 'A' && s.layers.includes('lead'));
    if (As.length >= 2) {
      const rel = (s) => p.events.lead.filter((n) => n.beat >= s.start && n.beat < s.start + s.bars * 4).map((n) => `${(n.beat - s.start).toFixed(2)}:${n.midi}`);
      pairs++; mSim += jac(rel(As[0]), rel(As[1]));
    }
    for (const s of p.sections) if (s.layers.includes('drums')) for (let b = 0; b + 2 < s.bars - 1; b++) {
      if (b % 4 === 3 || (b + 2) % 4 === 3) continue;
      const bar = (k) => p.events.drums.filter((e) => e.beat >= s.start + k * 4 && e.beat < s.start + k * 4 + 4).map((e) => `${(e.beat - s.start - k * 4).toFixed(3)}${e.drum}${e.vel}`);
      dPairs++; dSim += jac(bar(b), bar(b + 2));
    }
  }
  m.melodyShared = mSim / pairs;
  m.drumsShared = dSim / dPairs;

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

  // Expression: how much the keys' strength varies within a track. A B that replays A's loop with the drums out
  // (RIFF.md §3) swaps the loudest section for a quiet one, which narrows the keys by design, so it is left out here.
  const dynamic = plans.filter((p) => !p.traits.sameB);
  m.keysVelSpread = dynamic.reduce((acc, p) => {
    const v = p.events.keys.map((k) => k.vel), mean = v.reduce((a, b) => a + b, 0) / v.length;
    return acc + Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / v.length);
  }, 0) / dynamic.length;

  // The riff (RIFF.md §1). Notes a bar, in the sections between the intro and the outro. Repeats: across the whole
  // track, the share of bars with riff notes that equal the bar one loop earlier, at the lag of 1, 2, 4 or 8 bars where
  // that share is highest, as tools/stems.py measures the hits. Takes: each pass of a chord loop, grouped by loop, and
  // the share of passes that are their loop's commonest take. Repeats are kept apart by the kind of B: a B with new
  // chords changes every bar where it follows A, so only a B that replays A's loop compares with the hits.
  let rBars = 0, rNotes = 0, passes = 0, main = 0;
  const rep = { same: [0, 0], fresh: [0, 0] };
  for (const p of plans) {
    if (!p.events.riff.length) continue;
    const bars = (from, n = 1) => p.events.riff.filter((x) => x.beat >= from * 4 - 1e-9 && x.beat < (from + n) * 4 - 1e-9)
      .map((x) => `${(x.beat - from * 4).toFixed(3)}:${x.midi}`).join(' ');
    const all = Array.from({ length: p.lengthBeats / 4 }, (_, b) => bars(b));
    const share = (l) => { let n = 0, k = 0; for (let b = l; b < all.length; b++) if (all[b] || all[b - l]) { n++; if (all[b] === all[b - l]) k++; } return [k, n]; };
    const [k, n] = [1, 2, 4, 8].map(share).reduce((a, c) => (c[0] / Math.max(1, c[1]) > a[0] / Math.max(1, a[1]) ? c : a));
    const r = rep[p.traits.sameB ? 'same' : 'fresh'];
    r[0] += k; r[1] += n;
    const takes = {};
    for (const s of p.sections) {
      if (s.kind === 'intro' || s.kind === 'outro' || !s.layers.includes('keys')) continue;
      const own = s.kind === 'B' && !p.traits.sameB, L = Number((own ? p.traits.loopB : p.traits.loop).split('×')[0]), t = (takes[own ? 'B' : 'A'] ??= {});
      for (let b = 0; b < s.bars; b++) { rBars++; rNotes += all[s.start / 4 + b].split(' ').filter(Boolean).length; }
      for (let b = 0; b + L <= s.bars; b += L) { const take = bars(s.start / 4 + b, L); t[take] = (t[take] ?? 0) + 1; }
    }
    for (const t of Object.values(takes)) { const c = Object.values(t); passes += c.reduce((a, b) => a + b, 0); main += Math.max(...c); }
  }
  m.riffPerBar = rNotes / Math.max(1, rBars); m.riffMain = main / Math.max(1, passes);
  m.riffRepeat = rep.same[0] / Math.max(1, rep.same[1]); m.riffRepeatNewB = rep.fresh[0] / Math.max(1, rep.fresh[1]);
  return m;
}

// [name, measure, passes, target as written in DESIGN.md]
export const TARGETS = [
  ['hats on swung positions', 'hatsSwung', (x) => x >= 0.35, '≥ 35%'],
  ['bass notes off the kick', 'bassOffKick', (x) => x === 0, 'none'],
  ['melody at or below the keys\' top note', 'leadBelowKeys', (x) => x === 0, '0%'],
  ['melody a semitone above a keys note, on the beat', 'rubOnBeat', (x) => x === 0, '0%'],
  ['melody shared by the two A sections', 'melodyShared', (x) => x >= 0.95, '≥ 95%'],
  ['drum bars n and n+2 alike', 'drumsShared', (x) => x === 1, '100%'],
  ['melody moving by step', 'steps', (x) => x >= 0.7, '≥ 70%'],
  ['in-key chords coloured outside the mode', 'outOfMode', (x) => x === 0, '0%'],
  ['keys velocity spread', 'keysVelSpread', (x) => x >= 0.1, '≥ 0.1'],
  ['riff bars repeating a loop earlier, same-loop B', 'riffRepeat', (x) => x >= 0.75, '≥ 75%'],
  ['loops played as the main take', 'riffMain', (x) => x >= 0.6, '≥ 60%'],
  ['riff notes a bar', 'riffPerBar', (x) => x >= 4 && x <= 8, '4–8'],
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
  for (const [name, k, ok, target] of TARGETS) console.log(`${ok(m[k]) ? 'ok  ' : 'MISS'} ${name.padEnd(48)} ${(k === 'keysVelSpread' || k === 'riffPerBar' ? m[k].toFixed(k === 'riffPerBar' ? 1 : 3) : pct(m[k])).padStart(7)}   target ${target}`);
  console.log(`\n     melody a semitone above a keys note, anywhere      ${pct(m.rubAny).padStart(7)}`);
  console.log(`     leaps of a fourth or more                          ${pct(m.leaps).padStart(7)}   turn back after one ${pct(m.turnsAfterLeap)}`);
  console.log(`     phrase peak by quarter                             ${m.peakByQuarter.map(pct).join(' ')}`);
  console.log(`     tracks with one colour per chord kind              ${pct(m.uniformColour).padStart(7)}`);
  console.log(`     riff bars repeating a loop earlier, new-chord B    ${pct(m.riffRepeatNewB).padStart(7)}`);

  // the melody scores, median [10–90%] per station
  const S = stationScores(plans), cols = ['surprise', 'fit', 'colour', 'anchoring', 'hook', 'exact', 'fresh'];
  const show = (k, x) => (k === 'surprise' || k === 'fit' ? x.toFixed(2) : pct(x).replace('.0%', '%'));
  console.log(`\nmelody scores, median [10–90%]; resting: lead-section bars with no lead note`);
  for (const [station, row] of Object.entries(S)) {
    console.log(`  ${station.padEnd(13)} ${cols.map((k) => `${k} ${show(k, row[k].median)} [${show(k, row[k].lo)}–${show(k, row[k].hi)}]`).join('  ')}  resting ${pct(row.resting.share)}`);
  }
}
