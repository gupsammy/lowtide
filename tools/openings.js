// Prints the first seconds of several tracks from each station: what they open with, how loud (LUFS, the
// broadcast measure, and peak), and how long each took to render.
//   node tools/openings.js [count] [seconds]
import { STATIONS } from '../src/stations.js';
import { nextTrack } from '../src/critic.js';
import { opening } from '../src/plan.js';
import { renderOpening } from '../src/render.js';
import { lufs, peakDb } from '../src/meter.js';
import { NOTE_NAMES } from '../src/theory.js';
import { diskBank } from './disk.js';

const count = Number(process.argv[2] || 4), seconds = Number(process.argv[3] || 15), sr = 44100;
const bank = await diskBank();
for (const st of STATIONS) {
  console.log(`\n${st.name}`);
  const recent = [];
  for (let i = 0; i < count; i++) {
    const { plan: p, rerolls } = nextTrack(1 + i * 101, st, recent);
    recent.unshift(p);
    const t0 = performance.now(), a = renderOpening(p, seconds, sr, bank), ms = performance.now() - t0;
    const o = opening(p), t = p.traits;
    console.log(`  ${p.title.padEnd(15)} ${(NOTE_NAMES[t.key] + ' ' + t.mode).padEnd(12)} ${p.bpm} ${o.intro.padEnd(10)} ${o.chord.padEnd(12)} ${t.keysVoice.padEnd(7)} ${t.leadVoice.padEnd(7)} ${t.bassVoice.padEnd(7)} ${lufs(a, sr).toFixed(1).padStart(6)} LUFS  peak ${peakDb(a).toFixed(1).padStart(5)} dB  ${Math.round(ms)} ms  rerolls ${rerolls}`);
  }
}
