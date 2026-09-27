// Renders whole tracks into renders/ for tools/hear.py to measure (see HEARING.md). Each track gets a folder with:
//   mix.wav      the track as heard, 44.1 kHz stereo
//   lead.wav, harmony.wav (keys, pad, bass, riff), drums.wav, bed.wav (the surface noise alone)
//                mono stems at 22.05 kHz. They go through the room, the echo and the tape's movement but skip the
//                saturation, grit and glue, so together they are the mix before those stages.
//   facts.json   what the plan says the audio should carry: tempo, sections, keys, swing, the lead's band and notes;
//                and the engine that wrote it, with the critic's melody scores
//
//   node tools/render.js <station> <seed> [count]   a lab batch: the tracks the lab shows for that station and seed
//   node tools/render.js --ratings <file>           the tracks in a ratings export
import { Worker, isMainThread, parentPort } from 'node:worker_threads';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { availableParallelism } from 'node:os';
import { STATIONS, stationById } from '../src/stations.js';
import { nextTrack, scores } from '../src/critic.js';
import { plan } from '../src/plan.js';
import { deriveSeed } from '../src/rand.js';
import { renderTrack, sectionSpan, TAIL } from '../src/render.js';
import { scalePcs } from '../src/theory.js';
import { writeWav } from '../src/wav.js';
import { diskBank } from './disk.js';

const OUT = new URL('../renders/', import.meta.url), SR = 44100, STEM_SR = 22050;
const MUSIC = ['echo', 'reverb', 'wow', 'flutter', 'drift', 'rolloff'];
const STEMS = {
  lead: { only: ['lead'], deck: { only: MUSIC } },
  harmony: { only: ['keys', 'pad', 'bass', 'riff'], deck: { only: MUSIC } },
  drums: { only: ['drums'], deck: { only: MUSIC } },
  bed: { only: [], deck: { only: ['texture', 'hiss', 'vinyl', 'wow', 'flutter', 'drift', 'rolloff'] } },
};

function whole(p, sr, bank, opts) {
  let L, R;
  for (const c of renderTrack(p, sr, bank, opts)) {
    L ??= new Float32Array(c.total); R ??= new Float32Array(c.total);
    L.set(c.L, c.offset); R.set(c.R, c.offset);
  }
  return { L, R };
}

// Times in seconds, as the renderer places them: the beat plus the part's lean.
function facts(p) {
  const spb = 60 / p.bpm, at = (e) => e.beat * spb + (e.ms ?? 0) / 1000, T = p.traits, end = sectionSpan(p, p.sections.length - 1);
  return {
    station: p.station, seed: p.seed, engine: p.engine, scores: scores(p), title: p.title, bpm: p.bpm, seconds: end.start + end.length + TAIL,
    key: T.key, mode: T.mode, scale: scalePcs(T.key, T.mode),
    grid: T.feel.grid, swing: T.feel.swing, hatSwing: T.feel.hatSwing,
    lead: { voice: T.leadVoice, band: T.leadBand ?? [T.lead - 5, T.lead + 7] },
    sections: p.sections.map((s, i) => {
      const { start, length } = sectionSpan(p, i);
      return { kind: s.kind, start, end: start + length, energy: s.energy, layers: s.layers, fx: Object.keys(s.fx), key: s.key, mode: s.mode, scale: scalePcs(s.key, s.mode) };
    }),
    notes: {
      ...Object.fromEntries(['keys', 'pad', 'bass', 'lead', 'riff'].map((k) => [k, (p.events[k] ?? []).map((e) => [at(e), e.len * spb, e.midis ?? e.midi])])),
      drums: p.events.drums.map((e) => [at(e), e.drum, e.vel]),
    },
    chords: p.chords.map((c) => [c.start * spb, `${c.roman}${c.q}`]),
    traits: T,
  };
}

if (isMainThread) {
  const [a, b, c] = process.argv.slice(2);
  let jobs = [];
  if (a === '--ratings') jobs = JSON.parse(await readFile(b, 'utf8')).map((r) => ({ station: r.station, seed: r.seed }));
  else if (stationById(a) && b) {
    const recent = [];
    for (let i = 0; i < Number(c ?? 10); i++) {
      const { plan: p } = nextTrack(deriveSeed(Number(b) >>> 0, i), stationById(a), recent);
      recent.unshift(p);
      jobs.push({ station: a, seed: p.seed });
    }
  } else {
    console.error(`usage: node tools/render.js <station> <seed> [count] | --ratings <file>\nstations: ${STATIONS.map((s) => s.id).join(', ')}`);
    process.exit(2);
  }
  const run = (w, job) => new Promise((res, rej) => {
    const ok = (m) => { w.off('error', bad); res(m); }, bad = (e) => { w.off('message', ok); rej(e); };
    w.once('message', ok); w.once('error', bad); w.postMessage(job);
  });
  const t0 = performance.now();
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(jobs.length, Math.max(1, availableParallelism() - 2)) }, async () => {
    const w = new Worker(new URL(import.meta.url));
    while (next < jobs.length) {
      const r = await run(w, jobs[next++]);
      console.log(`${r.dir.padEnd(26)} ${r.title.padEnd(15)} ${(r.ms / 1000).toFixed(1)} s`);
    }
    await w.terminate();
  }));
  console.log(`${jobs.length} tracks in ${((performance.now() - t0) / 1000).toFixed(1)} s → renders/`);
} else {
  const bank = await diskBank();
  parentPort.on('message', async ({ station, seed }) => {
    const t0 = performance.now(), p = plan(seed, stationById(station)), name = `${station}-${seed}`, dir = new URL(`${name}/`, OUT);
    await mkdir(dir, { recursive: true });
    const mix = whole(p, SR, bank);
    await writeFile(new URL('mix.wav', dir), Buffer.from(writeWav([mix.L, mix.R], SR)));
    for (const [stem, opts] of Object.entries(STEMS)) {
      const s = whole(p, STEM_SR, bank, opts);
      await writeFile(new URL(`${stem}.wav`, dir), Buffer.from(writeWav([s.L.map((x, i) => (x + s.R[i]) / 2)], STEM_SR)));
    }
    await writeFile(new URL('facts.json', dir), JSON.stringify(facts(p)));
    parentPort.postMessage({ dir: name, title: p.title, ms: performance.now() - t0 });
  });
}
