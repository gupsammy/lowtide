// The listening lab: ten consecutive radio tracks for one station, each opening rendered and playable, so sameness
// can be heard rather than argued about.
import { STATIONS, stationById } from './stations.js';
import { nextTrack } from './critic.js';
import { deriveSeed } from './rand.js';
import { NOTE_NAMES } from './theory.js';

const COUNT = 10, SECONDS = 15, ROW_SECONDS = 8;
const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
// Renders run at one fixed rate; the browser resamples to the sound card's rate on playback.
const sr = 44100;
let ctx, playing = null, rowTimer = null, batchId = 0;

const stationSel = $('station');
for (const st of STATIONS) stationSel.append(new Option(`${st.name}`, st.id));
stationSel.value = stationById(params.get('station'))?.id ?? STATIONS[0].id;
$('seed').value = params.get('seed') ?? String(Math.floor(Math.random() * 1e6));

const workers = Array.from({ length: Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 4) - 1)) },
  () => new Worker(new URL('./lab-worker.js', import.meta.url), { type: 'module' }));
const jobs = new Map();
let next = 0;
workers.forEach((w) => (w.onmessage = ({ data }) => { jobs.get(data.id)?.(data); jobs.delete(data.id); }));
const render = (plan, seconds) => new Promise((resolve) => {
  const id = Math.random().toString(36).slice(2);
  jobs.set(id, resolve);
  workers[next++ % workers.length].postMessage({ id, plan, seconds, sr });
});

function audio() {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

const tracks = [];
function build() {
  const station = stationById(stationSel.value), base = Number($('seed').value) >>> 0, id = ++batchId;
  history.replaceState(null, '', `?station=${station.id}&seed=${base}`);
  stop();
  $('grid').innerHTML = '';
  tracks.length = 0;
  const recent = [];
  for (let i = 0; i < COUNT; i++) {
    const { plan, rerolls, problems } = nextTrack(deriveSeed(base, i), station, recent);
    recent.unshift(plan);
    const card = cardFor(plan, rerolls, problems, i);
    $('grid').append(card.el);
    const track = { plan, card, buffer: null };
    tracks.push(track);
    render(plan, SECONDS).then((res) => {
      if (id !== batchId) return;
      if (res.error) { card.status(`render failed: ${res.error}`, true); return; }
      track.data = res;
      card.wave(res.L, res.R);
      card.status(`${(res.ms / 1000).toFixed(1)} s to render${rerolls ? ` · ${rerolls} re-roll${rerolls > 1 ? 's' : ''}` : ''}`);
    });
  }
}

function cardFor(p, rerolls, problems, i) {
  const t = p.traits, el = document.createElement('article');
  el.className = 'card';
  const chip = (text, cls = '') => `<span class="chip ${cls}">${text}</span>`;
  el.innerHTML = `
    <div class="top"><span class="title">${i + 1}. ${p.title}</span><span class="seed">seed ${p.seed}</span></div>
    <div class="facts">${chip(`${NOTE_NAMES[t.key]} ${t.mode}`)}${chip(`${p.bpm} bpm`)}${chip(`opens: ${t.intro}`, 'intro')}${chip(`stands out: ${t.standout}`, 'standout')}
      ${chip(t.keysVoice === 'ep' ? 'electric piano' : 'felt piano')}${chip(`lead: ${t.leadVoice}`)}${chip(`${t.kit} kit`)}${chip(`${t.family} beat`)}${chip(t.voicing)}${chip(t.comp)}</div>
    <div class="prog"><b>A</b> ${t.shape} <b>· B</b> ${t.shapeB}${t.shift !== 'none' ? ` <b>(${t.shift})</b>` : ''}</div>
    <canvas width="600" height="88" aria-label="play opening"></canvas>
    <div class="row"><span class="status">rendering…</span><button>Play</button></div>`;
  const canvas = el.querySelector('canvas'), status = el.querySelector('.status');
  const play = () => playTrack(i, SECONDS);
  canvas.onclick = play; el.querySelector('button').onclick = play;
  if (problems.length) { status.textContent = `critic gave up: ${problems[0]}`; status.classList.add('warn'); }
  return {
    el,
    status(text, warn) { status.textContent = text; status.classList.toggle('warn', !!warn); },
    wave(L, R) {
      const g = canvas.getContext('2d'), w = canvas.width, h = canvas.height, step = Math.floor(L.length / w);
      g.clearRect(0, 0, w, h);
      g.fillStyle = '#f0a86099';
      for (let x = 0; x < w; x++) {
        let peak = 0;
        for (let j = x * step; j < (x + 1) * step; j++) peak = Math.max(peak, Math.abs(L[j]), Math.abs(R[j]));
        const y = Math.max(1, peak * h * 0.95);
        g.fillRect(x, (h - y) / 2, 1, y);
      }
    },
  };
}

function playTrack(i, seconds, onEnd) {
  const tr = tracks[i];
  if (!tr?.data) return false;
  stopSource();
  const c = audio(), n = Math.min(tr.data.L.length, Math.round(seconds * sr));
  const buf = c.createBuffer(2, n, sr);
  buf.copyToChannel(tr.data.L.subarray(0, n), 0); buf.copyToChannel(tr.data.R.subarray(0, n), 1);
  const src = c.createBufferSource(), g = c.createGain();
  src.buffer = buf; src.connect(g).connect(c.destination);
  // a short fade at the cut, so stopping mid-note doesn't click
  g.gain.setValueAtTime(1, c.currentTime + seconds - 0.25);
  g.gain.linearRampToValueAtTime(0, c.currentTime + seconds);
  src.start();
  playing = { src, i };
  tracks.forEach((t, k) => t.card.el.classList.toggle('playing', k === i));
  src.onended = () => { if (playing?.src === src) { playing = null; tr.card.el.classList.remove('playing'); onEnd?.(); } };
  return true;
}
function stopSource() { if (playing) { const { src } = playing; playing = null; try { src.stop(); } catch {} } tracks.forEach((t) => t.card.el.classList.remove('playing')); }
function stop() { clearTimeout(rowTimer); rowTimer = null; stopSource(); }

function playRow(i = 0) {
  if (i >= tracks.length) return;
  if (!playTrack(i, ROW_SECONDS, () => (rowTimer = setTimeout(() => playRow(i + 1), 400)))) rowTimer = setTimeout(() => playRow(i), 300);
  tracks[i].card.el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

$('batch').onclick = () => { $('seed').value = String(Math.floor(Math.random() * 1e6)); build(); };
$('row').onclick = () => { stop(); playRow(0); };
$('stop').onclick = stop;
stationSel.onchange = build;
$('seed').onchange = build;
build();
