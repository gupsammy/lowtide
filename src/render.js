// A plan's section → three stereo streams: dry, a reverb send and an echo send. Everything here is linear and tied
// to absolute time (the chorus, the ducking under the kick, the intro's filter sweep), so sections can render apart,
// in any order, and simply add: one section's ringing tail adds into the next. The deck (deck.js) then hears the
// joined stream and does everything nonlinear. Pure: runs in a Web Worker and in Node.
import { TAU, Biquad, SVF, stereo, hashString } from './synth/dsp.js';
import { note, ep, felt, roundBass, uprightBass } from './synth/voices.js';
import { sampledNote, buildKit, playHit } from './sampler.js';
import { createDeck } from './deck.js';
import { GUITARS } from './plan.js';

export const PRE = 0.1; // room before the bar line for hits pushed early
export const TAIL = 3; // room after the section for notes ringing on

// Each part's level in the dry mix, and how much of it goes to the room (× the track's wet) and the echo.
const MIX = { keys: 0.8, pad: 0.5, bass: 0.7, lead: 0.62, riff: 0.72, double: 0.45, kick: 1, snare: 0.9, hats: 0.8 };
const VERB = { keys: 0.9, pad: 1.4, lead: 1, riff: 0.9, double: 1.1, snare: 0.8, hats: 0.3 };
const ECHO = { lead: 1, keys: 0.2, riff: 0.25, double: 0.4 };
// Each tonal part's EQ, so they stop piling into 100–400 Hz: a high-pass above what the part needs (the keys go
// lower when no bass plays under them), then a dip in the low mids. [type, Hz, Q, dB]
const EQ = {
  keys: (bass) => [['hp', bass ? 140 : 70, 0.7, 0], ['peak', 300, 1, -3]],
  pad: () => [['hp', 220, 0.7, 0], ['peak', 300, 1, -3]],
  lead: () => [['hp', 200, 0.7, 0]],
  riff: () => [['hp', 180, 0.7, 0]],
  double: () => [['hp', 250, 0.7, 0]],
};
const MASTER = 0.98; // into the deck's glue stage; set so openings measure about -16 LUFS

// Where section i sits in the track, in seconds.
export function sectionSpan(p, i) {
  const spb = 60 / p.bpm, s = p.sections[i];
  return { start: s.start * spb, length: s.bars * 4 * spb };
}

// Building a kit resamples every hit, so each track's kit is kept while it's in use.
const kits = new Map();
function kitFor(p, bank, sr) {
  const k = `${p.station}:${p.seed}:${p.traits.kit}:${sr}`;
  if (!kits.has(k)) { if (kits.size > 16) kits.clear(); kits.set(k, buildKit(bank, p.seed, p.traits.kit, sr)); }
  return kits.get(k);
}

// opts.only: render just these parts (keys, pad, bass, lead, riff, double, drums), for tests and soloing.
export function renderSection(p, i, sr, bank, opts = {}) {
  const sec = p.sections[i], spb = 60 / p.bpm, { start, length } = sectionSpan(p, i);
  const n = Math.round((PRE + length + TAIL) * sr), t0 = start - PRE, from = sec.start, to = sec.start + sec.bars * 4;
  const within = (e) => e.beat >= from && e.beat < to, at = (e) => e.beat * spb + (e.ms ?? 0) / 1000 - t0;
  const T = p.traits, patch = T.patch, play = (part) => !opts.only || opts.only.includes(part);
  const lanes = {}, lane = (k) => (lanes[k] ??= stereo(n));

  // Keys. The top note of a voicing is what the ear follows, so it's played a little stronger and the inner notes
  // a little softer. Each pitch of the electric piano has its own few cents of detune, like a real one's tines. A
  // guitar's upstroke meets the strings from the top (GUITAR.md §3).
  if (play('keys')) for (const e of p.events.keys.filter(within)) {
    const b = lane('keys');
    e.midis.forEach((midi, k) => {
      const w = k === e.midis.length - 1 ? 1.25 : k === 0 ? 0.9 : 0.8, order = e.up ? e.midis.length - 1 - k : k;
      const o = { t: at(e) + (order * e.spreadMs) / 1000, len: e.len * spb, midi, vel: Math.min(1, e.vel * w), seed: hashString(`${p.seed}:${e.beat}:${k}`) };
      if (T.keysVoice === 'upright') sampledNote(b.L, b.R, sr, bank, 'upright', { ...o, pan: (midi - 62) / 40 });
      else if (GUITARS.includes(T.keysVoice)) sampledNote(b.L, b.R, sr, bank, T.keysVoice, { ...o, pan: (midi - 55) / 60 });
      else if (T.keysVoice === 'ep') ep(b.L, b.R, sr, { ...o, detune: (hashString(`${p.seed}:${midi}`) % 600) / 100 - 3 }, patch);
      else felt(b.L, b.R, sr, o, patch);
    });
  }
  if (play('pad')) for (const e of p.events.pad.filter(within)) e.midis.forEach((midi, k) =>
    note(lane('pad').L, lane('pad').R, sr, { t: at(e), len: e.len * spb, midi, vel: e.vel, voice: 'pad', seed: p.seed + k }));
  if (play('bass')) for (const e of p.events.bass.filter(within)) {
    const o = { t: at(e), len: e.len * spb, midi: e.midi, vel: e.vel, seed: hashString(`${p.seed}:bass:${e.beat}`) };
    (T.bassVoice === 'upright' ? uprightBass : roundBass)(lane('bass').L, lane('bass').R, sr, o);
  }
  if (play('lead')) for (const e of p.events.lead.filter(within)) {
    const o = { t: at(e), len: e.len * spb, midi: e.midi, vel: e.vel, seed: p.seed };
    if (T.leadVoice === 'vibes' || T.leadVoice === 'kalimba') sampledNote(lane('lead').L, lane('lead').R, sr, bank, T.leadVoice, { ...o, pan: 0.15 });
    else note(lane('lead').L, lane('lead').R, sr, { ...o, voice: T.leadVoice });
  }
  // The riff, on the keys' own sound or its own (RIFF.md §2, GUITAR.md §4), and its double an octave up in the final A
  // (ARRANGE.md §1). A kalimba or guitar riff sits a little left, opposite the lead; the double sits right, where the
  // lead was. A guitar playing the tune picks harder than it strums, up where the kalimba sits (GUITAR.md §4).
  for (const [k, v, pan] of [['riff', T.riffVoice === 'keys' ? T.keysVoice : T.riffVoice, -0.15], ['double', T.double, 0.25]]) if (play(k)) for (const e of (p.events[k] ?? []).filter(within)) {
    const b = lane(k), o = { t: at(e), len: e.len * spb, midi: e.midi, vel: e.vel, seed: hashString(`${p.seed}:${k}:${e.beat}`) };
    if (v === 'upright' || v === 'vibes' || v === 'kalimba' || GUITARS.includes(v)) sampledNote(b.L, b.R, sr, bank, v, { ...o, pan: v === 'upright' ? (e.midi - 62) / 40 : pan, gain: T.riff === 'guitar' ? 1.5 : 1 });
    else if (v === 'ep') ep(b.L, b.R, sr, { ...o, detune: (hashString(`${p.seed}:${e.midi}`) % 600) / 100 - 3 }, patch);
    else if (v === 'felt') felt(b.L, b.R, sr, o, patch);
    else note(b.L, b.R, sr, { ...o, voice: v });
  }
  if (play('drums')) {
    const kit = kitFor(p, bank, sr), stems = { kick: lane('kick'), snare: lane('snare'), hats: lane('hats') };
    for (const e of p.events.drums.filter(within)) playHit(stems, sr, kit, at(e), e.drum, e.vel);
  }

  if (lanes.keys && T.keysVoice === 'ep') chorus(lanes.keys, sr, t0);
  if (lanes.riff && T.riffVoice === 'keys' && T.keysVoice === 'ep') chorus(lanes.riff, sr, t0);
  for (const k of ['keys', 'riff']) if (lanes[k] && sec.fx.sweep) sweep(lanes[k], sr, PRE, length);
  // everything tonal dips under each kick of the whole track, so a tail from the last section ducks too
  if (T.space.pump) duck(['keys', 'pad', 'bass', 'lead', 'riff', 'double'].map((k) => lanes[k]).filter(Boolean), sr, t0,
    p.events.drums.filter((e) => e.drum === 'kick').map((e) => e.beat * spb + e.ms / 1000), T.space.pump);

  // EQ each tonal lane; every filter starts at rest before the section's first note, so sections still just add
  for (const [k, b] of Object.entries(lanes)) for (const [type, f, q, db] of EQ[k]?.(sec.layers.includes('bass')) ?? []) {
    for (const ch of [b.L, b.R]) { const bq = new Biquad(type, f, q, db, sr); for (let j = 0; j < n; j++) ch[j] = bq.tick(ch[j]); }
  }

  const out = { dry: stereo(n), verb: stereo(n), echo: stereo(n) }, wet = T.space.wet, E = T.space.echo;
  for (const [k, b] of Object.entries(lanes)) {
    const gains = [[out.dry, MIX[k]], [out.verb, (VERB[k] ?? 0) * wet], [out.echo, E ? (ECHO[k] ?? 0) * E.send : 0]].filter(([, g]) => g);
    for (const [dst, g] of gains) for (let j = 0; j < n; j++) { dst.L[j] += b.L[j] * g; dst.R[j] += b.R[j] * g; }
  }
  for (const s of Object.values(out)) {
    if (sec.fx.phone) phone(s, sr);
    if (sec.fx.fade) fade(s, sr, PRE + length * 0.25, PRE + length + 0.5);
  }
  return { ...out, start: t0 };
}

// Chorus: the signal plus a copy whose delay drifts slowly, the two sides drifting in opposite directions. The drift
// follows absolute time, so sections chorused apart and summed sound as if chorused together.
function chorus(b, sr, t0) {
  for (const [ch, phase] of [[b.L, 0], [b.R, Math.PI / 2]]) {
    const src = Float32Array.from(ch);
    for (let j = 0; j < ch.length; j++) {
      const d = (0.012 + 0.0025 * Math.sin(TAU * 0.7 * (t0 + j / sr) + phase)) * sr, k = Math.floor(d), f = d - k;
      const a = j - k >= 0 ? src[j - k] : 0, c = j - k - 1 >= 0 ? src[j - k - 1] : 0;
      ch[j] = src[j] * 0.8 + (a * (1 - f) + c * f) * 0.45;
    }
  }
}

// Ducking: a gain that dips after each kick and recovers over about a tenth of a second.
function duck(bufs, sr, t0, kicks, depth) {
  if (!bufs.length || !kicks.length) return;
  const times = kicks.sort((a, b) => a - b), n = bufs[0].L.length;
  let k = 0;
  for (let j = 0; j < n; j++) {
    const t = t0 + j / sr;
    while (k + 1 < times.length && times[k + 1] <= t) k++;
    const tau = t - times[k];
    const env = tau < 0 ? 0 : tau < 0.005 ? tau / 0.005 : Math.exp(-(tau - 0.005) / 0.1);
    const g = 1 - depth * env;
    for (const b of bufs) { b.L[j] *= g; b.R[j] *= g; }
  }
}

// The intro sweep: the keys start behind a closed low-pass that opens across the section.
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

// The ocean-drum texture at the render rate, kept per rate.
const beds = new Map();
function oceanAt(bank, sr) {
  const s = bank.byInst.ocean?.[0];
  if (!s) return null;
  if (!beds.has(sr)) {
    const step = s.sr / sr, out = new Float32Array(Math.floor((s.data.length - 1) / step));
    for (let i = 0; i < out.length; i++) { const p = i * step, k = Math.floor(p), f = p - k; out[i] = s.data[k] * (1 - f) + s.data[k + 1] * f; }
    beds.set(sr, out);
  }
  return beds.get(sr);
}

// The deck for a track: its room, echo, tape, record and texture, from the plan's space traits.
export function deckFor(p, sr, bank, opts = {}) {
  const firstA = p.sections.find((s) => s.kind === 'A');
  return createDeck({
    bpm: p.bpm, tape: p.traits.tape, seed: p.seed, space: p.traits.space, ocean: oceanAt(bank, sr), gain: MASTER,
    vinylBoostUntil: p.traits.intro === 'bed' && firstA ? (firstA.start * 60) / p.bpm : 0, ...opts,
  }, sr);
}

// A whole track, one section at a time: sections laid end to end with their tails overlapping, through the deck.
// Each chunk is finished audio, in order, so playback can start while later sections render. A section's tail rings
// on into the next, so a chunk ends where the next section's audio begins, and the tail is carried over.
// Yields { offset, total, L, R }, in samples. opts.seconds: stop there.
export function* renderTrack(p, sr, bank, opts = {}) {
  const deck = deckFor(p, sr, bank, opts.deck), last = p.sections.length - 1, span = sectionSpan(p, last);
  const total = Math.round((span.start + span.length + TAIL) * sr), end = Math.min(total, Math.round((opts.seconds ?? Infinity) * sr));
  let done = 0, ringing = [];
  for (let i = 0; done < end; i++) {
    const s = renderSection(p, i, sr, bank, opts);
    ringing.push({ ...s, at: Math.round(s.start * sr) });
    const until = Math.min(end, i < last ? Math.round((sectionSpan(p, i + 1).start - PRE) * sr) : total);
    const n = until - done, dry = stereo(n), verb = stereo(n), echo = stereo(n);
    for (const x of ringing) for (const [dst, src] of [[dry, x.dry], [verb, x.verb], [echo, x.echo]]) {
      const o = x.at - done;
      for (let j = Math.max(0, -o); j < src.L.length && o + j < n; j++) { dst.L[o + j] += src.L[j]; dst.R[o + j] += src.R[j]; }
    }
    yield { offset: done, total, ...deck.process(dry, verb, echo) };
    done = until;
    ringing = ringing.filter((x) => x.at + x.dry.L.length > done);
  }
}

// The first `seconds` of a track.
export function renderOpening(p, seconds, sr, bank, opts = {}) {
  const n = Math.round(seconds * sr), L = new Float32Array(n), R = new Float32Array(n);
  for (const c of renderTrack(p, sr, bank, { ...opts, seconds })) { L.set(c.L, c.offset); R.set(c.R, c.offset); }
  return { L, R };
}
