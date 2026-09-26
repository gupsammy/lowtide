// Prints the first seconds of several tracks from each station: what they open with, how loud, how long to render.
//   node tools/openings.js [count] [seconds]
import { STATIONS } from '../src/stations.js';
import { nextTrack } from '../src/critic.js';
import { opening } from '../src/plan.js';
import { renderOpening } from '../src/render.js';
import { NOTE_NAMES } from '../src/theory.js';

const count = Number(process.argv[2] || 4), seconds = Number(process.argv[3] || 15), sr = 44100;
const db = (x) => (20 * Math.log10(x + 1e-9)).toFixed(1).padStart(6);
for (const st of STATIONS) {
  console.log(`\n${st.name}`);
  const recent = [];
  for (let i = 0; i < count; i++) {
    const { plan: p, rerolls } = nextTrack(1 + i * 101, st, recent);
    recent.unshift(p);
    const t0 = performance.now(), a = renderOpening(p, seconds, sr), ms = performance.now() - t0;
    let peak = 0, sum = 0;
    for (let j = 0; j < a.L.length; j++) { peak = Math.max(peak, Math.abs(a.L[j]), Math.abs(a.R[j])); sum += a.L[j] ** 2 + a.R[j] ** 2; }
    const o = opening(p), t = p.traits;
    console.log(`  ${p.title.padEnd(15)} ${(NOTE_NAMES[t.key] + ' ' + t.mode).padEnd(12)} ${p.bpm} ${o.intro.padEnd(10)} ${o.chord.padEnd(12)} reg ${o.register} ${t.keysVoice.padEnd(4)} ${t.standout.padEnd(8)} peak ${db(peak)} rms ${db(Math.sqrt(sum / (2 * a.L.length)))} dB  ${Math.round(ms)} ms  rerolls ${rerolls}`);
  }
}
