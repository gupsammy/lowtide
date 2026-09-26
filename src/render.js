// A plan's section → stereo audio. Each section renders on its own with a ringing tail; the player lays sections end
// to end and adds the tails into what follows, then runs the joined stream through the tape stage. The tape stage
// bends and saturates, so it must see one unbroken signal, never pieces. Pure: runs in a Web Worker and in Node.
import { rng, Biquad, SVF, stereo, mixInto } from './synth/dsp.js';
import { drums } from './synth/drums.js';
import { note, ep, felt } from './synth/voices.js';

export const PRE = 0.1; // room before the bar line for hits pushed early
export const TAIL = 2.5; // room after the section for notes ringing on

const KITS = { dusty: 'acoustic', tight: 'machine' };
const LEVEL = { keys: 0.85, pad: 0.7, bass: 0.9, lead: 0.55, kick: 0.85, snare: 0.5, hats: 0.28 };

// Where section i sits in the track, in seconds.
export function sectionSpan(p, i) {
  const spb = 60 / p.bpm, s = p.sections[i];
  return { start: s.start * spb, length: s.bars * 4 * spb };
}

export function renderSection(p, i, sr) {
  const sec = p.sections[i], spb = 60 / p.bpm, { start, length } = sectionSpan(p, i);
  const n = Math.round((PRE + length + TAIL) * sr);
  const t0 = start - PRE, from = sec.start, to = sec.start + sec.bars * 4;
  const within = (e) => e.beat >= from && e.beat < to;
  const at = (beat) => beat * spb - t0; // seconds into this buffer
  const T = p.traits, patch = T.patch;
  const bus = { keys: stereo(n), lead: stereo(n), rest: stereo(n) };

  for (const e of p.events.keys.filter(within)) {
    e.midis.forEach((midi, k) => {
      const o = { t: at(e.beat) + (k * e.spreadMs) / 1000, len: e.len * spb, midi, vel: e.vel };
      (T.keysVoice === 'ep' ? ep : felt)(bus.keys.L, bus.keys.R, sr, o, patch);
    });
  }
  for (const e of p.events.pad.filter(within)) e.midis.forEach((midi, k) =>
    note(bus.keys.L, bus.keys.R, sr, { t: at(e.beat), len: e.len * spb, midi, vel: e.vel * LEVEL.pad, voice: 'pad', seed: p.seed + k }));
  for (const e of p.events.bass.filter(within))
    note(bus.rest.L, bus.rest.R, sr, { t: at(e.beat), len: e.len * spb, midi: e.midi, vel: e.vel * LEVEL.bass, voice: 'bass', seed: p.seed });
  for (const e of p.events.lead.filter(within))
    note(bus.lead.L, bus.lead.R, sr, { t: at(e.beat), len: e.len * spb, midi: e.midi, vel: e.vel, voice: T.leadVoice, seed: p.seed });

  const hits = p.events.drums.filter(within).map((e) => [Math.max(0, at(e.beat) + e.ms / 1000), e.drum, e.vel]);
  if (hits.length) {
    const st = drums(n, sr, hits, p.seed + i, KITS[T.kit]);
    const dusty = T.kit === 'dusty' ? new Biquad('lp', 5200, 0.7, 0, sr) : null;
    if (dusty) for (const k of ['kick', 'snare', 'hats']) for (let j = 0; j < n; j++) st[k][j] = k === 'kick' ? st[k][j] : dusty.tick(st[k][j]);
    mixInto(bus.rest, st.kick, LEVEL.kick, 0);
    mixInto(bus.rest, st.snare, LEVEL.snare, 0.05);
    mixInto(bus.rest, st.hats, LEVEL.hats, 0.25);
  }

  // The intro sweep: the keys start behind a closed low-pass that opens across the section.
  if (sec.fx.sweep) sweep(bus.keys, sr, PRE, length);
  const out = stereo(n);
  for (const b of [bus.keys, bus.lead, bus.rest]) for (let j = 0; j < n; j++) { out.L[j] += b.L[j] * (b === bus.keys ? LEVEL.keys : b === bus.lead ? LEVEL.lead : 1); out.R[j] += b.R[j] * (b === bus.keys ? LEVEL.keys : b === bus.lead ? LEVEL.lead : 1); }
  if (sec.fx.phone) phone(out, sr);
  if (sec.fx.fade) fade(out, sr, PRE + length * 0.25, PRE + length + 0.5);
  return { ...out, start: t0 };
}

function sweep(b, sr, from, length) {
  const fl = new SVF(), fr = new SVF();
  for (let j = 0; j < b.L.length; j++) {
    if (j % 32 === 0) {
      const x = Math.min(1, Math.max(0, (j / sr - from) / length));
      const fc = 300 * Math.pow(7000 / 300, x * x);
      fl.set(fc, 0.9, sr); fr.set(fc, 0.9, sr);
    }
    b.L[j] = fl.lp(b.L[j]); b.R[j] = fr.lp(b.R[j]);
  }
}

// A phone speaker: no lows, no highs, a little crunch.
function phone(b, sr) {
  for (const ch of [b.L, b.R]) {
    const hp = new Biquad('hp', 420, 0.8, 0, sr), lp = new Biquad('lp', 2800, 0.9, 0, sr);
    for (let j = 0; j < ch.length; j++) ch[j] = Math.tanh(2.2 * lp.tick(hp.tick(ch[j]))) * 0.55;
  }
}

function fade(b, sr, from, to) {
  for (let j = 0; j < b.L.length; j++) {
    const t = j / sr, g = t <= from ? 1 : t >= to ? 0 : Math.pow(1 - (t - from) / (to - from), 1.6);
    b.L[j] *= g; b.R[j] *= g;
  }
}

// The worn-tape stage: the top end rolled off, soft saturation, a little hiss and the odd crackle, all scaled by the
// track's tape amount (0–1). Wow and flutter need to run unbroken across sections, so they come with the player.
export function tape(b, sr, amt, seed) {
  const r = rng(seed), drive = 1 + 1.6 * amt, norm = 1 / Math.tanh(drive * 0.5) * 0.5;
  let crackle = 0;
  for (const ch of [b.L, b.R]) {
    const lp = new Biquad('lp', 9500 - 5000 * amt, 0.6, 0, sr);
    let hp = 0, prev = 0;
    for (let j = 0; j < ch.length; j++) {
      const noise = r() * 2 - 1;
      hp = 0.97 * (hp + noise - prev); prev = noise; // hiss: white noise without its lows
      if (r() < 0.00006 * (0.4 + amt)) crackle = (0.05 + 0.12 * r()) * (r() < 0.5 ? -1 : 1);
      crackle *= 0.86;
      ch[j] = Math.tanh(drive * lp.tick(ch[j])) * norm + hp * 0.0025 * amt + crackle;
    }
  }
}

// The first `seconds` of a track, sections laid end to end with their tails overlapping.
export function renderOpening(p, seconds, sr) {
  const n = Math.round(seconds * sr), out = stereo(n);
  for (let i = 0; i < p.sections.length; i++) {
    const { start } = sectionSpan(p, i);
    if (start - PRE >= seconds) break;
    const s = renderSection(p, i, sr), o = Math.round(s.start * sr);
    for (let j = 0; j < s.L.length; j++) {
      const k = o + j;
      if (k >= 0 && k < n) { out.L[k] += s.L[j]; out.R[k] += s.R[j]; }
    }
  }
  tape(out, sr, p.traits.tape, p.seed);
  return out;
}
