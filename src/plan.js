// A whole track, planned from a seed before any sound exists: key, tempo, feel, sounds, form, and every chord, note
// and drum hit. Pure data, so it can be checked, compared with recent tracks and tested without audio.
import { stream } from './rand.js';
import { isMinor } from './theory.js';
import { progression } from './harmony.js';
import { voice, bassNote } from './voicing.js';
import { kickPattern, drumBar, stepBeat, FILLS, COMPS, BASSLINES } from './groove.js';
import { motif, melodyLine } from './melody.js';
import { sections as buildSections } from './form.js';

// Each track turns one trait up so it has something you remember it by.
export const STANDOUTS = { tape: 1, mediant: 1, drag: 1, halftime: 1, strum: 1 };

const TITLE_A = ['slow', 'paper', 'late', 'quiet', 'amber', 'blue', 'soft', 'grey', 'warm', 'far', 'half', 'still', 'rain', 'low'];
const TITLE_B = ['window', 'letters', 'tea', 'lamps', 'streets', 'rooms', 'tide', 'coats', 'hours', 'static', 'pages', 'steam', 'drift', 'wires'];

export function plan(seed, station) {
  const M = station.music;
  // the station is part of each stream's name, so one seed makes a different track on each station
  const R = (part) => stream(seed, `${station.id}:${part}`);
  const H = R('harmony'), Rh = R('rhythm'), Me = R('melody'), F = R('form'), S = R('sound'), T = R('title');

  const standout = F.weighted(STANDOUTS);
  const key = H.int([0, 11]), mode = H.weighted(M.modes), colour = H.weighted(M.colour);
  const bpm = Math.round(Rh.range(M.bpm)), swing = Rh.range(M.swing);
  const family = standout === 'halftime' ? 'half' : Rh.weighted(M.families);
  const drag = standout === 'drag';
  const feel = {
    swing, hatSwing: Math.min(0.68, swing + (drag ? 0.05 : Rh.range([-0.02, 0.03]))),
    kickMs: drag ? Rh.range([-12, -6]) : Rh.range([-5, 2]), snareMs: drag ? Rh.range([22, 32]) : Rh.range([6, 18]),
    jitterMs: Rh.range([3, 7]),
  };
  const voicing = H.weighted(M.voicings), register = H.range(M.register);
  const comp = standout === 'strum' ? 'strum' : Rh.weighted(M.comps), bassline = Rh.weighted(M.basslines);
  const keysVoice = S.weighted(M.keys), leadVoice = S.weighted(M.leads), kit = S.weighted(M.kits);
  const tape = standout === 'tape' ? Math.min(1, M.tape[1] + 0.25) : S.range(M.tape);
  const patch = { tremRate: S.range([3, 5.5]), tremDepth: S.range([0.05, 0.25]), bright: S.range([0.3, 1]), spreadMs: S.range([18, 45]) };
  const intro = F.weighted(M.intros), form = F.weighted({ T1: 2, T2: 2, T3: 1.5 });
  const leadFrom = leadVoice === 'none' ? null : F.weighted({ A1: 1, A2: 2, B: 1 }), softB = F.chance(0.3);

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
  const kicks = kickPattern(Rh, family), hatStyle = Rh.chance(0.4) ? 'skip' : 'even';
  const mA = motif(Me), mB = Me.chance(0.5) ? motif(Me) : mA;
  const leadCenter = Me.range(M.lead);

  const chords = [], events = { keys: [], pad: [], bass: [], lead: [], drums: [] }, cues = [];
  let beat = 0, prevVoicing = null, prevBass = 40;
  secs.forEach((sec, si) => {
    const isB = sec.kind === 'B', prog = isB ? progB : progA;
    Object.assign(sec, { start: beat, key: isB ? bKey : key, mode: isB ? bMode : mode });
    const len = sec.bars * 4;
    // lay the loop's chords across the section; the outro ends by resting on the home chord
    const here = [];
    for (let t = 0, i = 0; t < len; i++) {
      const c = prog.chords[i % prog.chords.length], b = Math.min(c.beats, len - t);
      here.push({ ...c, start: beat + t, beats: b, key: sec.key });
      t += b;
    }
    if (sec.kind === 'outro') {
      const home = { roman: isMinor(mode) ? 'i' : 'I', root: 0, fn: 'T', q: isMinor(mode) ? 'm9' : colour === 'airy' ? '6/9' : 'maj9', key };
      while (here.length && here[here.length - 1].start >= beat + len - 8) here.pop();
      const from = here.length ? here[here.length - 1].start + here[here.length - 1].beats : beat;
      here.push({ ...home, start: from, beats: beat + len - from });
    }
    chords.push(...here);
    for (const c of here) cues.push({ beat: c.start, type: 'chord', roman: c.roman, q: c.q });
    cues.push({ beat, type: 'section', kind: sec.kind, energy: sec.energy });
    const vel = 0.8 + sec.energy * 0.3, has = (l) => sec.layers.includes(l);

    for (const c of here) {
      const v = voice(c, c.key, voicing, prevVoicing, register);
      prevVoicing = v;
      if (has('keys')) {
        for (const [off, l, ve] of COMPS[comp](c.beats)) {
          if (off >= c.beats) continue;
          const at = c.start + (off < 0 && c.start === 0 ? 0 : off);
          events.keys.push({ beat: at, len: Math.min(l, c.beats - Math.max(0, off)), midis: v, vel: ve * vel, spreadMs: comp === 'strum' ? patch.spreadMs : 4 });
        }
      }
      if (has('pad')) events.pad.push({ beat: c.start, len: c.beats, midis: v, vel: 0.7 });
      if (has('bass')) {
        const root = bassNote(c, c.key, prevBass), next = chords[chords.indexOf(c) + 1] ?? here[0];
        for (const [off, l, ve, which] of BASSLINES[bassline](c.beats, kicks[0])) {
          let m = root;
          if (which === 'fifth') m = root + 7 > 52 ? root - 5 : root + 7;
          if (which === 'octave') m = root + 12 > 55 ? root : root + 12;
          if (which === 'approach') { const nr = bassNote(next, next.key, root); m = nr === root ? root + 7 : nr > root ? nr - 1 : nr + 1; }
          while (m >= v[0]) m -= 12; // the bass always stays under the hands
          events.bass.push({ beat: c.start + off, len: l, midi: m, vel: ve });
        }
        prevBass = root;
      }
    }
    if (has('drums')) {
      const energy = sec.kind === 'intro' ? 0.35 : sec.energy, next = secs[si + 1];
      for (let b = 0; b < sec.bars; b++) {
        const fill = b === sec.bars - 1 && next && next.layers.includes('drums') ? Rh.pick(FILLS) : null;
        for (const [s, drum, v] of drumBar(Rh, { family, kicks, energy, bar: b, fill, hatStyle })) {
          const sw = drum === 'hat' || drum === 'open' ? feel.hatSwing : feel.swing;
          const ms = (drum === 'kick' ? feel.kickMs : drum === 'snare' ? feel.snareMs : 0) + Rh.gauss() * feel.jitterMs;
          events.drums.push({ beat: beat + b * 4 + stepBeat(s, sw), drum, vel: v, ms });
        }
      }
    }
    if (has('lead')) {
      const chordAt = (t) => here.findLast((c) => c.start <= beat + t) ?? here[0];
      const line = melodyLine(Me, { m: isB ? mB : mA, bars: sec.bars, key: sec.key, mode: sec.mode, anchor: Math.round(leadCenter), chordAt, devs: isB ? ['invert', 'up'] : ['up', 'late', 'down'] });
      for (const n of line) { events.lead.push({ ...n, beat: beat + n.beat }); cues.push({ beat: beat + n.beat, type: 'note', midi: n.midi }); }
    }
    beat += len;
  });
  cues.sort((a, b) => a.beat - b.beat);

  const traits = {
    key, mode, colour, bpm, shape: progA.shape, shapeB: progB.shape, loop: `${progA.bars}×${progA.perBar}`, shift,
    family, voicing, register: Math.round(register), comp, bassline, keysVoice, leadVoice, kit, tape, intro, form, standout, feel, patch,
  };
  const title = `${T.pick(TITLE_A)} ${T.pick(TITLE_B)}`;
  return { seed, station: station.id, title, bpm, traits, sections: secs, chords, events, cues, lengthBeats: beat };
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
