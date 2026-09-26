// A whole track, planned from a seed before any sound exists: key, tempo, feel, sounds, form, and every chord, note
// and drum hit. Pure data, so it can be checked, compared with recent tracks and tested without audio.
// Times are in beats, already swung; `ms` on an event is the part's lean against the beat (its pocket) plus a little
// human wobble, which the renderer adds on top.
import { stream } from './rand.js';
import { isMinor } from './theory.js';
import { progression, scaleOf, colourChord } from './harmony.js';
import { voice, bassNote } from './voicing.js';
import { kickPattern, drumPattern, drumBar, busier, swingBeat, FILLS, COMPS, BASSLINES } from './groove.js';
import { idea, writeMelody } from './melody.js';
import { sections as buildSections } from './form.js';

// Which melody engine wrote the plan. A new engine writes a different melody from the same seed, so ratings and
// rendered tracks carry this tag (MELODY.md §1).
export const ENGINE = 'melody-2';

// Each track turns one trait up so it has something you remember it by.
export const STANDOUTS = { tape: 1, mediant: 1, drag: 1, halftime: 1, strum: 1 };

const TITLE_A = ['slow', 'paper', 'late', 'quiet', 'amber', 'blue', 'soft', 'grey', 'warm', 'far', 'half', 'still', 'rain', 'low'];
const TITLE_B = ['window', 'letters', 'tea', 'lamps', 'streets', 'rooms', 'tide', 'coats', 'hours', 'static', 'pages', 'steam', 'drift', 'wires'];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

export function plan(seed, station) {
  const M = station.music;
  // the station is part of each stream's name, so one seed makes a different track on each station
  const R = (part) => stream(seed, `${station.id}:${part}`);
  const H = R('harmony'), Rh = R('rhythm'), Me = R('melody'), F = R('form'), S = R('sound'), Sp = R('space'), T = R('title');
  // the small human wobbles in timing and strength, one stream per part so a part coming in never moves another's
  const touch = Object.fromEntries(['keys', 'bass', 'lead', 'drums'].map((k) => [k, R(`touch:${k}`)]));

  const standout = F.weighted(STANDOUTS);
  const key = H.int([0, 11]), mode = H.weighted(M.modes), colour = H.weighted(M.colour);
  const bpm = Math.round(Rh.range(M.bpm));
  const grid = Number(Rh.weighted(M.grids)), swing = Rh.range(grid === 8 ? M.swing8 : M.swing);
  const family = standout === 'halftime' ? 'half' : Rh.weighted(M.families);
  const drag = standout === 'drag';
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
  const keysVoice = S.weighted(M.keys), leadVoice = S.weighted(M.leads), bassVoice = S.weighted(M.basses), kit = S.weighted(M.kits);
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
  const leadPick = F.weighted({ A1: 1, A2: 2, B: 1 }), leadFrom = leadVoice === 'none' ? null : leadPick;
  const softB = F.chance(0.3);

  // Harmony: A's loop, then B's, which must differ and may move to another key.
  const progA = progression(H, { mode, colour, grammar: M.grammar, shapes: M.shapes });
  const shift = standout === 'mediant' ? H.pick(['mediant-up', 'mediant-down']) : H.weighted({ none: 6, relative: 1.5, 'mediant-down': 1 });
  const [bKey, bMode] = {
    none: [key, mode],
    relative: isMinor(mode) ? [(key + 3) % 12, 'ionian'] : [(key + 9) % 12, 'aeolian'],
    'mediant-down': [(key + 8) % 12, mode], // ♭VI: the floor drops out warmly
    'mediant-up': [(key + 4) % 12, mode], // III: a bright lift
  }[shift];
  const progB = progression(H, { mode: bMode, colour, grammar: M.grammar, shapes: M.shapes, startFn: { T: 2, PD: 5, D: 1 }, avoid: [progA.shape] });

  const secs = buildSections(F, { form, intro, loopBars: Math.max(progA.bars, progB.bars), leadFrom, softB });

  // Register: the melody owns a band; the hands stay under it.
  const lead = Math.round(Me.range(M.lead)), band = [lead - 5, lead + 7];
  const ceiling = lead - 7, center = Math.min(register, ceiling - 5);
  const phrase = Me.weighted({ sentence: 3, period: 3, aaba: 2, call: 1 });
  const ideaA = idea(Me), ideaB = Me.chance(0.6) ? idea(Me, ideaA) : idea(Me); // B keeps A's rhythm more often than not

  // Voicings are fixed per progression, like a looped sample: a repeated section is the same loop. The loop is voiced
  // twice round and the second pass kept, so its last chord leads smoothly back into its first.
  const loops = new Map();
  const loopOf = (prog, k) => {
    if (!loops.has(prog)) {
      let prev = null, vs = [];
      for (let pass = 0; pass < 2; pass++) vs = prog.chords.map((c) => (prev = voice(c, k, voicing, prev, center, ceiling)));
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

  const sw = (b, amount = swing) => swingBeat(b, amount, grid);
  const lean = (part, ms, spread) => ms + touch[part].gauss() * feel.jitterMs * spread;
  const chords = [], events = { keys: [], pad: [], bass: [], lead: [], drums: [] }, cues = [];
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
      vs.push(voice(home, key, voicing, vs[vs.length - 1] ?? lastV, center, ceiling));
    }
    chords.push(...here);
    for (const c of here) cues.push({ beat: sw(c.start), type: 'chord', roman: c.roman, q: c.q });
    cues.push({ beat, type: 'section', kind: sec.kind, energy: sec.energy });

    // the drums, bar by bar: the section type's pattern, with a fill into the next section if it has drums too
    const pattern = patternFor(sec), next = secs[si + 1];
    const bars = Array.from({ length: sec.bars }, (_, b) =>
      drumBar(pattern, b, b === sec.bars - 1 && next && next.layers.includes('drums') ? Rh.pick(FILLS) : null));
    if (has('drums')) bars.forEach((hits, b) => {
      for (const [s, drum, v] of hits) {
        const amount = drum === 'hat' || drum === 'open' || drum === 'shaker' ? feel.hatSwing : swing;
        const ms = drum === 'kick' ? feel.kickMs : drum === 'snare' || drum === 'rim' ? feel.snareMs : 0;
        events.drums.push({ beat: beat + b * 4 + swingBeat(s / 4, amount, grid), drum, vel: v, ms: lean('drums', ms, 1) });
      }
    });
    // straight kick positions, in beats from the section's start, for a bass that plays with the kick
    const kickBeats = bars.flatMap((hits, b) => hits.filter(([, d]) => d === 'kick').map(([s]) => b * 4 + s / 4));

    const compHere = isB ? compB : comp;
    let cycle = -1;
    here.forEach((c, ci) => {
      const v = vs[ci];
      lastV = v;
      if (has('keys')) {
        for (const [off, l, ve] of COMPS[compHere](c.beats)) {
          if (off >= c.beats) continue;
          const at = c.start + (off < 0 && c.start === 0 ? 0 : off), end = c.start + Math.min(c.beats, Math.max(0, off) + l);
          // comping follows the section's energy and leans on the first hit of each two-bar cycle
          const inCycle = Math.floor((c.start + Math.max(0, off) - beat) / 8), accent = inCycle !== cycle ? 1 : 0.86;
          cycle = inCycle;
          const vel = clamp((0.52 + 0.45 * sec.energy) * accent * (ve / 0.8) * (1 + 0.08 * touch.keys.gauss()), 0.3, 1);
          events.keys.push({ beat: sw(at), len: sw(end) - sw(at), midis: v, vel, ms: lean('keys', feel.keysMs, 0.5), spreadMs: compHere === 'strum' ? patch.spreadMs : 4 });
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
          if (which === 'approach') { const nr = bassNote(nextC, nextC.key, root); m = nr === root ? root + 7 : nr > root ? nr - 1 : nr + 1; }
          while (m >= v[0]) m -= 12; // the bass always stays under the hands
          const at = c.start + off;
          events.bass.push({ beat: sw(at), len: sw(at + l) - sw(at), midi: m, vel: ve, ms: lean('bass', feel.bassMs, 0.4) });
        }
        prevBass = root;
      }
    });

    if (has('lead')) for (const n of melodyFor(sec.kind, sec.bars)) {
      const at = beat + n.beat;
      events.lead.push({ beat: sw(at), len: sw(at + n.len) - sw(at), midi: n.midi, vel: n.vel, ms: lean('lead', feel.leadMs, 0.5) });
      cues.push({ beat: sw(at), type: 'note', midi: n.midi });
    }
    beat += len;
  });
  cues.sort((a, b) => a.beat - b.beat);

  const traits = {
    key, mode, colour, bpm, shape: progA.shape, shapeB: progB.shape, loop: `${progA.bars}×${progA.perBar}`, shift,
    family, voicing, register: Math.round(center), lead, phrase, comp, compB, bassline, keysVoice, leadVoice, bassVoice, kit, shaker,
    tape, intro, form, standout, feel, patch, space,
  };
  const title = `${T.pick(TITLE_A)} ${T.pick(TITLE_B)}`;
  return { seed, station: station.id, engine: ENGINE, title, bpm, traits, sections: secs, chords, events, cues, lengthBeats: beat };
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
