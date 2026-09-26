// Builds samples/ from raw VCSL files (CC0, github.com/sgossner/VCSL): mono, 22.05 kHz, 16-bit, the silence before
// each attack trimmed, tails cut and faded. Each file is raised so its peak sits at -1 dBFS before it's cut to 16
// bits: the soft vibraphone was recorded near -40 dB and would otherwise keep only a few bits. Pitched samples are
// measured, so the sampler plays them in tune even when the instrument isn't tuned to its note name.
//   node tools/kit.js <raw dir>      (raw/<group>/<file>.wav, as fetched)
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { parseWav } from '../src/wav.js';

const RAW = process.argv[2], OUT = new URL('../samples/', import.meta.url).pathname, SR = 22050;
if (!RAW) { console.error('usage: node tools/kit.js <raw dir>'); process.exit(1); }

const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
// VCSL names notes with middle C as C3 (MIDI 60), an octave below scientific names
const midiOf = (name) => { const m = name.match(/_([A-G]#?)(\d)_/); return m ? 12 * (Number(m[2]) + 2) + NOTE[m[1]] : null; };

// [group, raw file, our name, seconds kept, fade seconds, extra]
const pitched = (group, inst, secs, fade) => (file) => [group, file, `${inst}-${file.match(/_([A-G]#?\d)_/)[1].replace('#', 's')}`, secs, fade, { inst, midi: midiOf(file) }];
const LIST = [
  ...['C2', 'G2', 'C3', 'G3', 'C4', 'G4', 'C5', 'G5'].map((n) => `Upright1_Sus_${n}_vl2_rr1.wav`).map(pitched('piano', 'upright', 4, 0.6)),
  ...['F2_v1_rr1', 'A2_v1_rr1', 'C3_v1_rr2', 'E3_v1_rr2', 'G3_v1_rr1', 'B3_v1_rr1', 'D4_v1_rr1', 'F4_v1_rr1', 'A4_v1_rr1', 'C5_v1_rr1', 'E5_v1_rr1']
    .map((n) => `Vibes_soft_${n}_Main.wav`).map(pitched('vibes', 'vibes', 3, 0.5)),
  ...['B2_k8', 'C#3_k7', 'D#3_k6', 'F#3_k5', 'G#3_k4', 'B3_k3', 'C#4_k2', 'D#4_k13', 'F#4_k14', 'A4_k1', 'B4_k15']
    .map((n) => `Mbira6_Normal_MainSpirit_${n}_vl3_rr2.wav`).map(pitched('kalimba', 'kalimba', 2.5, 0.5)),
  ['hats', 'HiHat_HitC_v2_rr1_Mid.wav', 'hat-closed-1', 0.35, 0.1, { inst: 'hat' }],
  ['hats', 'HiHat_HitC_v2_rr2_Mid.wav', 'hat-closed-2', 0.35, 0.1, { inst: 'hat' }],
  ['hats', 'HiHat_HitC_v3_rr1_Mid.wav', 'hat-closed-3', 0.35, 0.1, { inst: 'hat' }],
  ['hats', 'HiHat_Close_rr1_Mid.wav', 'hat-pedal', 0.3, 0.1, { inst: 'hat' }],
  ['hats', 'HiHat_HitO_rr1_Mid.wav', 'hat-open', 1.1, 0.4, { inst: 'open' }],
  ['hats', 'HiHat_HitLoose_rr1_Mid.wav', 'hat-loose', 0.6, 0.2, { inst: 'open' }],
  ['snare', 'Snare3M_HitSN_v3_rr1_Mid.wav', 'snare-1', 0.7, 0.2, { inst: 'snare' }],
  ['snare', 'Snare3M_HitSN_v3_rr2_Mid.wav', 'snare-2', 0.7, 0.2, { inst: 'snare' }],
  ['snare', 'Snare3M_HitSN_v4_rr1_Mid.wav', 'snare-3', 0.7, 0.2, { inst: 'snare' }],
  ['snare', 'Snare3M_HitSN_v5_rr1_Mid.wav', 'snare-4', 0.7, 0.2, { inst: 'snare' }],
  ['snare', 'Snare3M_Xstick_v2_rr1_Mid.wav', 'rim', 0.4, 0.1, { inst: 'rim' }],
  ['snare', 'Snare3M_taps_v4_rr1_Mid.wav', 'snare-tap', 0.4, 0.1, { inst: 'tap' }],
  ...['Mid_ShakerDouble_Down_rr1', 'Mid_ShakerDouble_Down_rr2', 'Mid_ShakerHighFaster_Up_rr1', 'Mid_Shaker_Slap_rr1']
    .map((f, i) => ['shaker', `${f}.wav`, `shaker-${i + 1}`, 0.3, 0.08, { inst: 'shaker' }]),
  ...[1, 2, 3].map((i) => ['claps', `Clap_rr${i}.wav`, `clap-${i}`, 0.6, 0.2, { inst: 'clap' }]),
  ['ocean', 'OceanDrum_Sus_2_Mid.wav', 'ocean', 12, 0.3, { inst: 'ocean', raw: true }],
];

// How far a note sits from its name, in cents, and how strong that pitch is against the loudest one in the sound.
// A Hann-windowed DFT, scanned within a semitone of the name. The kalimba needs the level check: its other tines ring
// in sympathy, and on the highest tines the ringing outlasts the note itself.
function tuning(x, sr, midi) {
  const n = x.length, win = x.map((v, i) => v * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1))));
  const power = (m) => {
    const w = 2 * Math.PI * 440 * Math.pow(2, (m - 69) / 12) / sr;
    let re = 0, im = 0;
    for (let i = 0; i < n; i++) { re += win[i] * Math.cos(w * i); im += win[i] * Math.sin(w * i); }
    return re * re + im * im;
  };
  let best = -1, cents = 0, loudest = 0;
  for (let c = -100; c <= 100; c++) { const p = power(midi + c / 100); if (p > best) { best = p; cents = c; } }
  for (let m = 36; m <= 108; m += 0.1) loudest = Math.max(loudest, power(m));
  return { cents, db: 10 * Math.log10(best / loudest) };
}

mkdirSync(OUT, { recursive: true });
const manifest = [];
// execFileSync hands stderr back only on failure, so read volumedetect's report through a shell redirect instead
const peakOf = (src) => {
  const log = execFileSync('sh', ['-c', 'ffmpeg -v info -i "$0" -af "pan=mono|c0=0.5*c0+0.5*c1,volumedetect" -f null - 2>&1', src], { encoding: 'utf8' });
  return Number(log.match(/max_volume: (-?[\d.]+) dB/)[1]);
};
for (const [group, file, name, secs, fade, extra] of LIST) {
  const src = join(RAW, group, file), lift = -1 - peakOf(src);
  const trim = extra.raw ? 'atrim=start=1' : 'silenceremove=start_periods=1:start_threshold=-40dB:start_silence=0.001:detection=peak';
  const filters = `pan=mono|c0=0.5*c0+0.5*c1,volume=${lift.toFixed(2)}dB,${trim},atrim=0:${secs},asetpts=PTS-STARTPTS,afade=t=out:st=${Math.max(0, secs - fade)}:d=${fade}`;
  const out = join(OUT, `${name}.wav`);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', src, '-af', filters, '-ar', String(SR), '-ac', '1', '-c:a', 'pcm_s16le', out]);
  const bytes = readFileSync(out);
  const { data, sr } = parseWav(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  const entry = { id: name, file: `${name}.wav`, ...extra, seconds: +(data.length / sr).toFixed(3) };
  delete entry.raw;
  if (extra.midi != null) {
    // measured just past the attack, before the tine or string has faded into its neighbours' ringing
    const t = tuning(data.subarray(Math.round(0.03 * sr), Math.round(0.5 * sr)), sr, extra.midi);
    // a low piano string's second harmonic can outweigh its fundamental by 15 dB; past 20 dB the pitch is unclear
    if (t.db < -20) { unlinkSync(out); console.log(`${name.padEnd(16)} dropped: its own pitch is ${-t.db.toFixed(0)} dB under the loudest`); continue; }
    entry.tune = t.cents;
    // Files are stored at full scale for resolution, but a kalimba note is mostly click and a vibraphone note mostly
    // ring: the gain (dB) that brings each note's first 0.8 s to the same average level evens them out on playback.
    const head = data.subarray(0, Math.round(0.8 * sr));
    entry.gain = +(-18 - 10 * Math.log10(head.reduce((a, v) => a + v * v, 0) / head.length)).toFixed(1);
  }
  manifest.push(entry);
  console.log(`${name.padEnd(16)} ${entry.seconds}s  raised ${lift.toFixed(1)} dB${entry.tune != null ? `  ${entry.tune > 0 ? '+' : ''}${entry.tune} cents` : ''}`);
}
writeFileSync(join(OUT, 'kit.json'), JSON.stringify({ sr: SR, source: 'VCSL (CC0), github.com/sgossner/VCSL', samples: manifest }, null, 1) + '\n');
