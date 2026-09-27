// A whole track, planned from a seed before any sound exists: key, tempo, feel, sounds, form, and every chord, note
// and drum hit. Pure data, so it can be checked, compared with recent tracks and tested without audio.
// Times are in beats, already swung; `ms` on an event is the part's lean against the beat (its pocket) plus a little
// human wobble, which the renderer adds on top.
import { stream } from './rand.js';
import { isMinor } from './theory.js';
import { progression, scaleOf, colourChord } from './harmony.js';
import { voice, bassNote } from './voicing.js';
import { kickPattern, drumPattern, drumBar, busier, swingBeat, FILLS, COMPS, BASSLINES, STRUMS, strokes } from './groove.js';
import { idea, writeMelody, rubs } from './melody.js';
import { sections as buildSections, VERSIONS, arrange, leaveOut, playing } from './form.js';
import { riffCell, fitRiff } from './riff.js';

// Which engine wrote the plan. A new engine writes different music from the same seed, so ratings and rendered tracks
// carry this tag (MELODY.md §1). A plan with its riff switched off is round 2's, note for note; a plan with no guitar
// and no mood trait in it (MOODS.md §3) is the riff round's (GUITAR.md §2). A station whose settings were retuned
// carries a tuning too, since the same engine then plays other music from the same seed (MOODS.md §6).
export const ENGINE = 'riff-3', RIFF_2 = 'riff-2', ROUND_2 = 'melody-2';

// Sounds whose notes die away fast enough to play a riff on the lead (ARRANGE.md §1), the piano lead among them
// (MOODS.md §3).
const PLUCKED = ['vibes', 'kalimba', 'piano'];
// The guitars (GUITAR.md), and how busy and wide the guitar's riff is: notes a bar, and arpeggio steps its shape spans.
export const GUITARS = ['nylon', 'jazz'];
const GUITAR_RIFF = { notes: [6, 8], span: 7 };
// Riff roles that carry the tune alone, so the lead writes no melody over them.
const SOLO = ['lead', 'guitar'];

// Each track turns one trait up so it has something you remember it by.
export const STANDOUTS = { tape: 1, mediant: 1, drag: 1, halftime: 1, strum: 1 };

const TITLE_A = ['slow', 'paper', 'late', 'quiet', 'amber', 'blue', 'soft', 'grey', 'warm', 'far', 'half', 'still', 'rain', 'low'];
const TITLE_B = ['window', 'letters', 'tea', 'lamps', 'streets', 'rooms', 'tide', 'coats', 'hours', 'static', 'pages', 'steam', 'drift', 'wires'];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// opts.riff: the riff's role, 'keys', 'lead', 'signature' (RIFF.md §2) or 'guitar' (GUITAR.md §4), or null for none;
// drawn from the roles that fit the track's sounds when left out, and played as given, fit or not, when set
// (ARRANGE.md §1). With the riff off there is no guitar.
// opts.version: 'full' or 'beat' (ARRANGE.md §3); drawn when left out, and 'full' when there is no riff.
// opts.moves: the moves to apply, those of them that fit (ARRANGE.md §2); drawn when left out, none when [].
// opts.double: whether the riff doubles in the final A; drawn when left out.
export function plan(seed, station, opts = {}) {
  if (![undefined, null, 'keys', 'lead', 'signature', 'guitar'].includes(opts.riff)) throw new Error(`no riff role called ${opts.riff}`);
  if (opts.version !== undefined && !VERSIONS[opts.version]) throw new Error(`no version called ${opts.version}`);
  const M = station.music;
  // the station is part of each stream's name, so one seed makes a different track on each station
  const R = (part) => stream(seed, `${station.id}:${part}`);
  const H = R('harmony'), Rh = R('rhythm'), Me = R('melody'), F = R('form'), S = R('sound'), Sp = R('space'), T = R('title');
  // the small human wobbles in timing and strength, one stream per part so a part coming in never moves another's
  const touch = Object.fromEntries(['keys', 'bass', 'lead', 'drums', 'riff', 'double'].map((k) => [k, R(`touch:${k}`)]));

  const standout = F.weighted(STANDOUTS);
  const key = H.int([0, 11]), mode = H.weighted(M.modes), colour = H.weighted(M.colour);
  const bpm = Math.round(Rh.range(M.bpm));
  const grid = Number(Rh.weighted(M.grids)), swing = Rh.range(grid === 8 ? M.swing8 : M.swing);
  const family = standout === 'halftime' ? 'half' : Rh.weighted(M.families);
  // a lazy station plays every track behind the beat, as the drag standout does (MOODS.md §3)
  const drag = standout === 'drag' || !!M.lazy;
  const kickMs = drag ? Rh.range([-12, -6]) : Rh.range([-5, 2]);
  const feel = {
    grid, swing, hatSwing: clamp(swing + (drag ? 0.04 : Rh.range([-0.01, 0.03])), 0.5, 0.7),
    kickMs, snareMs: drag ? Rh.range([22, 32]) : Rh.range([6, 18]), bassMs: kickMs + Rh.range([0, 10]),
    keysMs: Rh.range([8, 22]) + (drag ? 12 : 0), leadMs: Rh.range([4, 16]), jitterMs: Rh.range([3, 7]),
  };
  const voicing = H.weighted(M.voicings), register = H.range(M.register);
  const comp = standout === 'strum' ? 'strum' : Rh.weighted(M.comps);
  const compB = Rh.chance(0.45) ? Rh.weighted({ ...M.comps, [comp]: 0 }) : comp; // B may comp differently, for contrast
  const bassline = Rh.weighted(M.basslines), shaker = Rh.chance(M.perc.shaker);
  const piano = S.weighted(M.keys), drawnLead = S.weighted(M.leads), bassVoice = S.weighted(M.basses), kit = S.weighted(M.kits);
  // The guitar's part, none, the chords, the riff or both (MOODS.md §3), and its sound, pattern and strum speed, from a
  // stream of their own, so a track that draws no guitar is note for note what it was (GUITAR.md §2).
  const G = R('guitar'), gtr = { part: G.weighted(M.guitar.parts), sound: G.weighted(M.guitar.sounds), pattern: G.pick(Object.keys(STRUMS)), spreadMs: G.range([6, 11]) };
  const chordsOnGuitar = gtr.part === 'chords' || gtr.part === 'both';
  const keysVoice = opts.riff !== null && chordsOnGuitar ? gtr.sound : piano, strummed = GUITARS.includes(keysVoice);
  // The riff's role, the kind of B, the version and the double, drawn whole every time from a stream of their own,
  // so forcing one never moves another, and nothing else in the track moves with them. The role is drawn from those
  // that fit the sounds: the lead's only if its notes die away fast, the kalimba's only over a piano, since the
  // electric piano's tines blur with it. A track with no lead would play the riff on the station's commonest.
  const topLead = Object.entries(M.leads).filter(([k]) => k !== 'none').sort((a, b) => b[1] - a[1])[0][0];
  const fits = { keys: true, lead: PLUCKED.includes(drawnLead === 'none' ? topLead : drawnLead), signature: keysVoice !== 'ep', guitar: !strummed || gtr.part === 'both' };
  const A = R('arrange'), drawn = {
    riff: A.weighted(Object.entries(M.riff.roles).map(([k, w]) => [k, fits[k] ? w : 0])), sameB: A.chance(0.5),
    version: A.weighted(M.riff.versions), double: A.chance(0.4),
  };
  // a guitar drawn to play the riff takes the role over the one the arrange stream drew
  const riff = opts.riff === undefined ? (gtr.part === 'riff' || gtr.part === 'both' ? 'guitar' : drawn.riff) : opts.riff;
  const version = opts.version ?? (riff ? drawn.version : 'full'), sameB = !!riff && drawn.sameB;
  // The riff's sound. On the lead's, a track with no lead borrows the station's commonest; on the kalimba, a
  // kalimba lead plays vibes, so the second layer doesn't copy the riff's sound. The double, an octave up in the
  // final A, is a second sound that stays clear of the keys; the lead's riff already sits up there and never doubles.
  // A guitar riff over guitar chords goes to the other guitar.
  const riffVoice = { keys: 'keys', signature: 'kalimba', lead: drawnLead === 'none' ? topLead : drawnLead, guitar: strummed ? GUITARS.find((g) => g !== keysVoice) : gtr.sound }[riff] ?? null;
  const leadVoice = riff === 'signature' && drawnLead === 'kalimba' ? 'vibes' : drawnLead;
  const doubleVoice = { keys: keysVoice === 'ep' ? 'vibes' : 'kalimba', signature: 'vibes' }[riff] ?? null;
  const double = !!doubleVoice && (opts.double ?? drawn.double);
  const tape = standout === 'tape' ? Math.min(1, M.tape[1] + 0.25) : S.range(M.tape);
  const patch = { tremRate: S.range([3, 5.5]), tremDepth: S.range([0.05, 0.25]), bright: S.range([0.3, 1]), spreadMs: S.range([18, 45]) };
  // the room and the machine the track plays through (see deck.js)
  const space = {
    t60: Sp.range(M.space.t60), size: Sp.range([0.8, 1.25]), predelayMs: Sp.range([10, 35]), damp: Sp.range([0.25, 0.6]), wet: Sp.range(M.space.wet),
    echo: Sp.chance(M.echo) ? { beats: Sp.pick([0.75, 1]), feedback: Sp.range([0.25, 0.5]), send: Sp.range([0.2, 0.35]) } : null,
    wowCents: Sp.range([3, 11]) + (standout === 'tape' ? 4 : 0), wowHz: Sp.range([0.3, 0.9]),
    flutterCents: Sp.range([0.5, 2.5]), flutterHz: Sp.range([6, 11]), bumpDb: Sp.range([1.5, 3]),
    grit: Sp.chance(M.grit) ? { bits: Sp.int([10, 14]), rate: Sp.range([16000, 24000]) } : null,
    vinyl: Sp.range(M.vinyl), pump: Sp.range(M.pump), texture: Sp.chance(M.texture) ? Sp.range([0.1, 0.22]) : 0,
  };
  const intro = F.weighted(M.intros), form = F.weighted({ T1: 2, T2: 2, T3: 1.5 });
  // drawn whether or not there is a lead, so a change of lead voice never reshuffles the form
  // Over a riff the lead is a second layer and comes in no earlier than A2; when the lead or a guitar plays the riff
  // there is none.
  const leadPick = F.weighted({ A1: 1, A2: 2, B: 1 });
  const leadFrom = leadVoice === 'none' || SOLO.includes(riff) ? null : riff && leadPick === 'A1' ? 'A2' : leadPick;
  const softB = F.chance(0.3);

  // Harmony: A's loop, then B's, which must differ and may move to another key.
  const progA = progression(H, { mode, colour, grammar: M.grammar, shapes: M.shapes });
  const shift = standout === 'mediant' ? H.pick(['mediant-up', 'mediant-down']) : H.weighted({ none: 6, relative: 1.5, 'mediant-down': 1 });
  const [bKey, bMode] = sameB ? [key, mode] : {
    none: [key, mode],
    relative: isMinor(mode) ? [(key + 3) % 12, 'ionian'] : [(key + 9) % 12, 'aeolian'],
    'mediant-down': [(key + 8) % 12, mode], // ♭VI: the floor drops out warmly
    'mediant-up': [(key + 4) % 12, mode], // III: a bright lift
  }[shift];
  // B's own loop, drawn even when B replays A's, so the harmony stream stays where it was
  const newB = progression(H, { mode: bMode, colour, grammar: M.grammar, shapes: M.shapes, startFn: { T: 2, PD: 5, D: 1 }, avoid: [progA.shape] });
  const progB = sameB ? progA : newB;

  const secs = buildSections(F, { form, intro, loopBars: Math.max(progA.bars, progB.bars), leadFrom, softB, sameB, steady: !!M.steady });
  // Parts leave and come back over the loop (ARRANGE.md §2), from a stream of their own; round 2 has no moves. They
  // are placed on the full band, so a version changes only the parts it leaves out. The doubled riff takes the
  // lead's band in the final A, so the lead rests there.
  const moves = riff ? arrange(R('moves'), secs, opts.moves, !!M.steady) : [], lastA = secs.findLastIndex((x) => x.kind === 'A');
  for (const x of secs) leaveOut(x, VERSIONS[version]);
  if (double) leaveOut(secs[lastA], ['lead']);

  // Register: the melody owns a band; the hands stay under it. A riff played above the chords sits between the two,
  // and the lead moves up to make room (RIFF.md §2). The guitar's riff is the tune and spans both bands (GUITAR.md §4).
  const lead = Math.round(Me.range(M.lead)), over = riff === 'keys' || riff === 'signature';
  const band = over ? [lead - 1, lead + 8] : [lead - 5, lead + 7];
  const riffBand = riff === 'guitar' ? [lead - 12, lead + 7] : over ? [lead - 13, lead - 2] : [lead - 5, lead + 7];
  const ceiling = over || riff === 'guitar' ? lead - 10 : lead - 7, center = Math.min(register, ceiling - 5);
  // a guitar voices its chords its own way; the drawn style is kept so the harmony stream stays where it was
  const style = strummed ? 'guitar' : voicing;
  const phrase = Me.weighted({ sentence: 3, period: 3, aaba: 2, call: 1 });
  const ideaA = idea(Me), ideaB = Me.chance(0.6) ? idea(Me, ideaA) : idea(Me); // B keeps A's rhythm more often than not

  // Voicings are fixed per progression, like a looped sample: a repeated section is the same loop. The loop is voiced
  // twice round and the second pass kept, so its last chord leads smoothly back into its first.
  const loops = new Map();
  const loopOf = (prog, k) => {
    if (!loops.has(prog)) {
      let prev = null, vs = [];
      for (let pass = 0; pass < 2; pass++) vs = prog.chords.map((c) => (prev = voice(c, k, style, prev, center, ceiling)));
      const at = (t) => { // the chord and voicing sounding t beats into the loop
        let u = t % (prog.bars * 4), j = 0;
        while (j < prog.chords.length - 1 && u >= prog.chords[j].beats - 1e-9) u -= prog.chords[j++].beats;
        return { chord: prog.chords[j], v: vs[j] };
      };
      loops.set(prog, { vs, at });
    }
    return loops.get(prog);
  };

  // Drum patterns are fixed per section type; a later section of a type with more energy only adds hats.
  const kicks = kickPattern(Rh, family), patterns = {};
  const patternFor = (sec) => {
    if (!patterns[sec.kind]) {
      const energy = sec.kind === 'intro' ? 0.35 : sec.energy;
      const backbeat = Rh.chance({ intro: 0.6, break: 0.6, A: 0.3, B: 0.1 }[sec.kind] ?? 0.3) ? 'rim' : 'snare';
      patterns[sec.kind] = { energy, p: drumPattern(Rh, { family, kicks, energy, grid, backbeat, shaker: shaker && (sec.kind === 'A' || sec.kind === 'B') }) };
    }
    const m = patterns[sec.kind];
    return sec.energy >= m.energy + 0.1 ? busier(m.p) : m.p;
  };

  // Melodies are written once per section type and reused whole. The pickup intro previews A's opening bars.
  const melodies = {};
  const melodyFor = (kind, bars) => {
    const k = kind === 'intro' ? 'A' : kind;
    if (!melodies[k]) {
      const prog = k === 'B' ? progB : progA, loop = loopOf(prog, k === 'B' ? bKey : key);
      melodies[k] = writeMelody(Me, {
        idea: k === 'B' ? ideaB : ideaA, form: k === 'break' ? 'call' : phrase, bars: secs.find((x) => x.kind === k)?.bars ?? 8,
        key: k === 'B' ? bKey : key, mode: k === 'B' ? bMode : mode, band,
        chordAt: (t) => loop.at(t).chord, voicingAt: (t) => loop.at(t).v,
      });
    }
    return melodies[k].filter((n) => n.beat < bars * 4);
  };

  // The riff: one cell for the track, fitted once to each loop it plays over, as A and as A′. Keys that push play
  // each chord half a beat early while the last one still rings, so the riff takes the new chord's notes and clears
  // both.
  const cell = !riff ? null : riff === 'guitar' ? riffCell(R('riff'), GUITAR_RIFF.notes, GUITAR_RIFF.span) : riffCell(R('riff'), M.riff.notes), riffs = new Map();
  const riffOf = (prog, k, alt, push) => {
    const id = `${prog === progA ? 'A' : 'B'}${alt ? '′' : ''}${push ? '<' : ''}`, ahead = push ? 0.5 : 0;
    if (!riffs.has(id)) {
      const loop = loopOf(prog, k);
      riffs.set(id, fitRiff(cell, {
        bars: prog.bars, band: riffBand, key: k, chordAt: (t) => loop.at(t + ahead).chord, voicingAt: (t) => loop.at(t + ahead).v,
        heldAt: (t) => [...loop.at(t).v, ...loop.at(t + ahead).v],
      }, alt));
    }
    return riffs.get(id);
  };
  const half = secs.reduce((n, s) => n + s.bars * 4, 0) / 2, riffMs = riff === 'keys' ? feel.keysMs : feel.leadMs;
  let pass = 0;

  const sw = (b, amount = swing) => swingBeat(b, amount, grid);
  const lean = (part, ms, spread) => ms + touch[part].gauss() * feel.jitterMs * spread;
  const chords = [], events = { keys: [], pad: [], bass: [], lead: [], drums: [], riff: [], double: [] }, cues = [];
  let beat = 0, prevBass = 40, lastV = null;
  secs.forEach((sec, si) => {
    const isB = sec.kind === 'B', prog = isB ? progB : progA, loop = loopOf(prog, isB ? bKey : key);
    Object.assign(sec, { start: beat, key: isB ? bKey : key, mode: isB ? bMode : mode });
    const len = sec.bars * 4, has = (l) => sec.layers.includes(l);

    // lay the loop's chords across the section; the outro ends by resting on the home chord
    const here = [], vs = [];
    for (let t = 0, i = 0; t < len; i++) {
      const j = i % prog.chords.length, c = prog.chords[j], b = Math.min(c.beats, len - t);
      here.push({ ...c, start: beat + t, beats: b, key: sec.key });
      vs.push(loop.vs[j]);
      t += b;
    }
    if (sec.kind === 'outro') {
      const home = { roman: isMinor(mode) ? 'i' : 'I', root: 0, fn: 'T', kind: isMinor(mode) ? 'min' : mode === 'mixolydian' ? 'dom' : 'maj' };
      home.scale = scaleOf(home, mode);
      home.q = colourChord(H, home, colour, home.scale);
      while (here.length && here[here.length - 1].start >= beat + len - 8) { here.pop(); vs.pop(); }
      const from = here.length ? here[here.length - 1].start + here[here.length - 1].beats : beat;
      here.push({ ...home, start: from, beats: beat + len - from, key });
      vs.push(voice(home, key, style, vs[vs.length - 1] ?? lastV, center, ceiling));
    }
    chords.push(...here);
    for (const c of here) cues.push({ beat: sw(c.start), type: 'chord', roman: c.roman, q: c.q });
    cues.push({ beat, type: 'section', kind: sec.kind, energy: sec.energy });

    // the drums, bar by bar: the section type's pattern, with a fill into the next section if it has drums too. A
    // part a version left out counts as there, so leaving the drums out never reshuffles the rhythm stream; a hit a
    // move leaves out still draws its wobble, so the hits after it land as they would have.
    const pattern = patternFor(sec), next = secs[si + 1];
    const bars = Array.from({ length: sec.bars }, (_, b) =>
      drumBar(pattern, b, b === sec.bars - 1 && next && (next.layers.includes('drums') || next.left?.includes('drums')) ? Rh.pick(FILLS) : null));
    if (has('drums')) bars.forEach((hits, b) => {
      for (const [s, drum, v] of hits) {
        const amount = drum === 'hat' || drum === 'open' || drum === 'shaker' ? feel.hatSwing : swing;
        const ms = lean('drums', drum === 'kick' ? feel.kickMs : drum === 'snare' || drum === 'rim' ? feel.snareMs : 0, 1);
        if (playing(sec, 'drums', b * 4)) events.drums.push({ beat: beat + b * 4 + swingBeat(s / 4, amount, grid), drum, vel: v, ms });
      }
    });
    // straight kick positions, in beats from the section's start, for a bass that plays with the kick
    const kickBeats = bars.flatMap((hits, b) => hits.filter(([, d]) => d === 'kick').map(([s]) => b * 4 + s / 4));

    const compHere = isB ? compB : comp;
    let cycle = -1;
    here.forEach((c, ci) => {
      const v = vs[ci];
      lastV = v;
      // a guitar strums the comp's strokes (GUITAR.md §3): a downstroke plays the whole chord, an upstroke its top three
      if (has('keys')) {
        const hits = strummed ? strokes(compHere, gtr.pattern, (c.start - beat) % 4, c.beats) : COMPS[compHere](c.beats);
        for (const [off, l, ve, up] of hits) {
          if (off >= c.beats) continue;
          const at = c.start + (off < 0 && c.start === 0 ? 0 : off), end = strummed ? at + l : c.start + Math.min(c.beats, Math.max(0, off) + l);
          // comping follows the section's energy and leans on the first hit of each two-bar cycle
          const inCycle = Math.floor((c.start + Math.max(0, off) - beat) / 8), accent = inCycle !== cycle ? 1 : 0.86;
          cycle = inCycle;
          const vel = clamp((0.52 + 0.45 * sec.energy) * accent * (ve / 0.8) * (1 + 0.08 * touch.keys.gauss()), 0.3, 1);
          if (strummed) events.keys.push({ beat: sw(at), len: sw(end) - sw(at), midis: up ? v.slice(-3) : v, vel, ms: lean('keys', feel.keysMs, 0.5), spreadMs: gtr.spreadMs * (compHere === 'hold' ? 3 : 1), up });
          else events.keys.push({ beat: sw(at), len: sw(end) - sw(at), midis: v, vel, ms: lean('keys', feel.keysMs, 0.5), spreadMs: compHere === 'strum' ? patch.spreadMs : 4 });
        }
      }
      if (has('pad')) events.pad.push({ beat: sw(c.start), len: c.beats, midis: v, vel: 0.7 });
      if (has('bass')) {
        const root = bassNote(c, c.key, prevBass), nextC = here[ci + 1] ?? here[0];
        const kicksIn = kickBeats.map((k) => k - (c.start - beat)).filter((k) => k >= 0 && k < c.beats);
        for (const [off, l, ve, which] of BASSLINES[bassline](c.beats, kicksIn)) {
          let m = root;
          if (which === 'fifth') m = root + 7 > 52 ? root - 5 : root + 7;
          if (which === 'octave') m = root + 12 > 55 ? root : root + 12;
          if (which === 'approach') {
            const nr = bassNote(nextC, nextC.key, root);
            m = nr === root ? root + 7 : nr > root ? nr - 1 : nr + 1;
            // a pushed guitar chord lands with the approach, its root maybe under it, so the bass comes up from below
            if (strummed && m >= (vs[ci + 1] ?? vs[0])[0]) m = nr - 1;
          }
          while (m >= v[0]) m -= 12; // the bass always stays under the hands
          const at = c.start + off;
          const ms = lean('bass', feel.bassMs, 0.4);
          if (playing(sec, 'bass', at - beat)) events.bass.push({ beat: sw(at), len: sw(at + l) - sw(at), midi: m, vel: ve, ms });
        }
        prevBass = root;
      }
    });

    // The riff plays wherever the keys do, from the section's first bar, on every pass of the loop: A A A A′ in the
    // first half of the track, A A′ A A′ in the second, counted from A1; an intro plays A, so a version that gives
    // the intro keys never moves an A′. In the outro it stops when the home chord comes in. When the
    // next section's keys push, its first chord sounds in this one's last half beat; a riff note there that would
    // grind against it is left out, a breath before the new section.
    if (cell && has('keys')) {
      const push = (isB ? compB : comp) === 'push', L = prog.bars * 4, nx = secs[si + 1];
      const into = nx?.layers.includes('keys') && (nx.kind === 'B' ? compB : comp) === 'push' ? loopOf(nx.kind === 'B' ? progB : progA, nx.kind === 'B' ? bKey : key).vs[0] : null;
      const stop = sec.kind === 'outro' ? here[here.length - 1].start - beat - (push ? 0.5 : 0) : len;
      for (let t = 0; t < stop; t += L) {
        const intro = sec.kind === 'intro', alt = !intro && (beat + t < half ? pass % 4 === 3 : pass % 2 === 1);
        if (!intro) pass++;
        for (const n of riffOf(prog, sec.key, alt, push)) {
          if (t + n.beat >= stop || (into && t + n.beat >= len - 0.5 - 1e-9 && rubs(n.midi, into))) continue;
          const a = beat + t + n.beat;
          events.riff.push({ beat: sw(a), len: sw(a + n.len) - sw(a), midi: n.midi, vel: clamp(n.vel * (1 + 0.06 * touch.riff.gauss()), 0.3, 1), ms: lean('riff', riffMs, 0.5) });
          if (double && si === lastA) events.double.push({ beat: sw(a), len: sw(a + n.len) - sw(a), midi: n.midi + 12, vel: clamp(n.vel * 0.9 * (1 + 0.06 * touch.double.gauss()), 0.3, 1), ms: lean('double', feel.leadMs, 0.5) });
        }
      }
    }

    // Over a riff the lead never plays the intro; when the lead or a guitar plays the riff there is no melody. A lead a
    // version or a move left out is still written, so the melodies after it come out the same.
    const writes = (has('lead') || sec.left?.includes('lead')) && !SOLO.includes(riff) && !(riff && sec.kind === 'intro');
    const written = writes ? melodyFor(sec.kind, sec.bars) : [];
    for (const n of written) {
      const at = beat + n.beat, ms = lean('lead', feel.leadMs, 0.5);
      if (!has('lead')) continue;
      events.lead.push({ beat: sw(at), len: sw(at + n.len) - sw(at), midi: n.midi, vel: n.vel, ms });
      cues.push({ beat: sw(at), type: 'note', midi: n.midi });
    }
    beat += len;
  });
  // A section's last approach aims at its own loop, but a pushed guitar chord from the next section may sound over it
  // with its root lower down: the bass drops under whatever the guitar strums (GUITAR.md §3).
  if (strummed) for (const b of events.bass) {
    for (const k of events.keys) if (k.beat <= b.beat + 1e-9 && b.beat < k.beat + k.len - 1e-9) while (b.midi >= k.midis[0]) b.midi -= 12;
  }
  cues.sort((a, b) => a.beat - b.beat);

  const traits = {
    key, mode, colour, bpm, shape: progA.shape, shapeB: progB.shape, loop: `${progA.bars}×${progA.perBar}`, loopB: `${progB.bars}×${progB.perBar}`, shift: sameB ? 'none' : shift,
    family, voicing: style, register: Math.round(center), lead, phrase, comp, compB, bassline, keysVoice, leadVoice, bassVoice, kit, shaker,
    tape, intro, form, standout, feel, patch, space,
    riff, riffVoice, riffNotes: cell?.rhythm.length ?? null, sameB, version, leadBand: band, moves, double: double ? doubleVoice : null,
    fits: Object.keys(fits).filter((k) => fits[k]),
    guitar: strummed ? { part: riff === 'guitar' ? 'both' : 'chords', sound: keysVoice, pattern: gtr.pattern } : riff === 'guitar' ? { part: 'riff', sound: gtr.sound } : null,
  };
  const title = `${T.pick(TITLE_A)} ${T.pick(TITLE_B)}`;
  return { seed, station: station.id, tuning: station.tuning, engine: !riff ? ROUND_2 : traits.guitar || M.steady || M.lazy || bassline === 'groove' || leadVoice === 'piano' ? ENGINE : RIFF_2, title, bpm, traits, sections: secs, chords, events, cues, lengthBeats: beat };
}

// What the first few seconds of a track are made of: the things that decide whether two openings sound alike.
export function opening(p) {
  const first = p.chords[0], v = p.events.keys[0]?.midis ?? p.events.pad[0]?.midis ?? [];
  return {
    intro: p.traits.intro, layers: p.sections[0].layers.join('+'), sound: p.traits.keysVoice,
    chord: `${first.roman}${first.q}`, register: v.length ? Math.round(v.reduce((s, x) => s + x, 0) / v.length) : null,
    tempo: Math.round(p.bpm / 4) * 4,
  };
}
