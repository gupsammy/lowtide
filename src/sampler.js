// Recorded sounds: the VCSL kit in samples/ (see tools/kit.js), played as pitched instruments and as a drum kit.
import { TAU, rng, Biquad, hashString } from './synth/dsp.js';
import { parseWav } from './wav.js';

// read(file) → Promise<ArrayBuffer>, for a file in samples/: fetch in the browser, readFile in Node.
export async function loadBank(read) {
  const kit = JSON.parse(new TextDecoder().decode(await read('kit.json')));
  const samples = await Promise.all(kit.samples.map(async (s) => ({ ...s, ...parseWav(await read(s.file)) })));
  const byInst = {};
  for (const s of samples) (byInst[s.inst] ??= []).push(s);
  for (const list of Object.values(byInst)) list.sort((a, b) => (a.midi ?? 0) - (b.midi ?? 0));
  return { byInst };
}

// Catmull-Rom cubic between x[i] and x[i+1], f of the way along.
function cubic(x, i, f) {
  const a = x[i - 1] ?? 0, b = x[i] ?? 0, c = x[i + 1] ?? 0, d = x[i + 2] ?? 0;
  return b + 0.5 * f * (c - a + f * (2 * a - 5 * b + 4 * c - d + f * (3 * (b - c) + d - a)));
}

// How each sampled instrument behaves once the key is let go, and how velocity shapes its tone.
const INSTS = {
  upright: { release: 0.18, dark: [900, 7000], level: 0.88 },
  vibes: { release: 0.35, dark: [1800, 9000], level: 1.8 },
  kalimba: { release: 0.3, dark: [1500, 9000], level: 1.35 },
};

// One note from a pitched instrument: the recording nearest in pitch (the lower one on a tie, since a sample pitched
// down sounds more natural than one pitched up), resampled so it sounds at o.midi, corrected by the tuning the kit
// measured. Softer notes are darker, as they are on the real instrument. o: { t, len, midi, vel, pan }.
export function sampledNote(L, R, sr, bank, inst, o) {
  const list = bank.byInst[inst], I = INSTS[inst];
  let s = list[0];
  for (const x of list) if (Math.abs(x.midi - o.midi) < Math.abs(s.midi - o.midi)) s = x;
  const step = Math.pow(2, (o.midi - s.midi - s.tune / 100) / 12) * (s.sr / sr);
  const i0 = Math.round(o.t * sr), relAt = Math.round(o.len * sr), relN = Math.round(I.release * sr);
  const n = Math.min(Math.floor((s.data.length - 2) / step), relAt + relN);
  const cut = I.dark[0] + (I.dark[1] - I.dark[0]) * o.vel * o.vel, a = Math.exp((-TAU * cut) / sr);
  const g = I.level * Math.pow(10, (s.gain ?? 0) / 20) * Math.pow(o.vel, 1.3), pan = o.pan ?? 0, gl = g * Math.min(1, 1 - pan), gr = g * Math.min(1, 1 + pan);
  let pos = 0, lp = 0;
  for (let i = 0; i < n; i++) {
    const j = i0 + i;
    if (j >= L.length) break;
    const k = Math.floor(pos);
    lp = (1 - a) * cubic(s.data, k, pos - k) + a * lp;
    const env = i < relAt ? 1 : 1 - (i - relAt) / relN;
    if (j >= 0) { L[j] += lp * env * gl; R[j] += lp * env * gr; }
    pos += step;
  }
}

// A one-shot resampled by `ratio` (below 1 plays it lower and longer), as an old sampler pitching a hit down.
function repitch(x, ratio) {
  const out = new Float32Array(Math.floor((x.length - 2) / ratio));
  for (let i = 0; i < out.length; i++) { const p = i * ratio, k = Math.floor(p); out[i] = cubic(x, k, p - k); }
  return out;
}

// The kick is synthesized: a sine that starts high and drops fast to its note, plus a click where the beater hits.
function synthKick(sr, r, dusty) {
  const n = Math.round(0.55 * sr), out = new Float32Array(n);
  const f1 = 46 + 14 * r(), bend = 1 + 1.4 * r(), body = 0.1 + 0.1 * r(), click = new Biquad('bp', 2500 + 2500 * r(), 0.9, 0, sr);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr, f = f1 * (1 + bend * Math.exp(-t / 0.014));
    ph += f / sr;
    const tone = Math.sin(TAU * ph) * (0.85 * Math.exp(-t / body) + 0.15 * Math.exp(-t / 0.04)) * Math.min(1, t / 0.0008);
    out[i] = Math.tanh(1.4 * (tone + click.tick(r() * 2 - 1) * Math.exp(-t / 0.003) * (dusty ? 0.3 : 0.5)));
  }
  return out;
}

// Which recordings play which drum. Ghost notes on the snare use the soft taps; the backbeat on a tight kit is
// doubled by a clap.
const DRUMS = { snare: 'snare', rim: 'rim', tap: 'tap', hat: 'hat', open: 'open', shaker: 'shaker', clap: 'clap' };

// A track's drum kit: its recordings chosen and processed once, like a producer loading a sampler. dusty: pitched
// down, low-passed and crushed to fewer bits; tight: close to the recording. The same seed gives the same kit.
export function buildKit(bank, seed, style, sr) {
  const r = rng(hashString(`kit:${seed}`)), dusty = style === 'dusty';
  const shift = dusty ? -1 - 3 * r() : -1 * r(), cut = dusty ? 4500 + 3000 * r() : 9000 + 5000 * r();
  const bits = dusty ? 10 + Math.floor(3 * r()) : 0;
  const process = (s) => {
    let x = repitch(s.data, Math.pow(2, shift / 12) * (s.sr / sr));
    const lp = new Biquad('lp', cut, 0.7, 0, sr);
    x = x.map((v) => lp.tick(v));
    if (bits) { const q = Math.pow(2, bits - 1); x = x.map((v) => Math.round(v * q) / q); }
    let peak = 0;
    for (const v of x) peak = Math.max(peak, Math.abs(v));
    return x.map((v) => v / (peak || 1));
  };
  const choose = (inst, k) => {
    const pool = [...bank.byInst[inst]];
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    return pool.slice(0, k).map(process);
  };
  const kit = { style, kick: [synthKick(sr, r, dusty), synthKick(sr, r, dusty)] };
  for (const [name, inst] of Object.entries(DRUMS)) kit[name] = choose(inst, name === 'hat' ? 3 : 2);
  return kit;
}

// Where each drum sits and how loud, before the section's mix.
const PLACE = { kick: [0.95, 0], snare: [0.5, 0.05], rim: [0.42, 0.08], tap: [0.3, 0.05], clap: [0.3, -0.05], hat: [0.3, 0.3], open: [0.24, 0.3], shaker: [0.2, -0.35] };

// Plays one hit into the stem it belongs to. Round-robin: which variant plays comes from the hit's time, so a
// section renders the same wherever it starts. stems: { kick, snare, hats } stereo buffers.
export function playHit(stems, sr, kit, t, drum, vel) {
  let name = drum;
  if (drum === 'snare' && vel < 0.35) name = 'tap';
  const variants = kit[name], x = variants[hashString(`${name}:${Math.round(t * 1000)}`) % variants.length];
  const [level, pan] = PLACE[name], g = level * Math.pow(vel, 1.2), gl = g * Math.min(1, 1 - pan), gr = g * Math.min(1, 1 + pan);
  const stem = name === 'kick' ? stems.kick : name === 'hat' || name === 'open' || name === 'shaker' ? stems.hats : stems.snare;
  const i0 = Math.round(t * sr);
  for (let i = 0; i < x.length; i++) {
    const j = i0 + i;
    if (j >= stem.L.length) break;
    if (j >= 0) { stem.L[j] += x[i] * gl; stem.R[j] += x[i] * gr; }
  }
  if (drum === 'snare' && vel >= 0.6 && kit.style === 'tight') playHit(stems, sr, kit, t + 0.004, 'clap', vel * 0.8);
}
