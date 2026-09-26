// The listening lab: ten consecutive radio tracks for one station, each opening rendered and playable, so sameness
// can be heard rather than argued about, and rated, so taste can be measured rather than guessed.
import { STATIONS, stationById } from './stations.js';
import { nextTrack } from './critic.js';
import { opening } from './plan.js';
import { deriveSeed } from './rand.js';
import { NOTE_NAMES } from './theory.js';

const COUNT = 10, SECONDS = 15, ROW_SECONDS = 8;
const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
// Renders run at one fixed rate; the browser resamples to the sound card's rate on playback.
const sr = 44100;
let ctx, playing = null, rowTimer = null, batchId = 0;

// Ratings stay in this browser, keyed by station and seed, so rating a track again replaces the old rating. Each
// keeps the track's traits and opening, so the ratings can later be read against what the engine chose.
const KEY = 'lowtide.ratings', TAGS = ['lovely', 'stiff', 'muddy', 'samey', 'busy', 'boring'];
const ratings = (() => { try { return JSON.parse(localStorage.getItem(KEY)) ?? {}; } catch { return {}; } })();
function rate(p, change) {
  const id = `${p.station}:${p.seed}`, r = { rating: 0, tags: [], ...ratings[id] };
  change(r);
  if (!r.rating && !r.tags.length) delete ratings[id];
  else ratings[id] = { ...r, station: p.station, seed: p.seed, title: p.title, traits: p.traits, opening: opening(p), at: new Date().toISOString() };
  try { localStorage.setItem(KEY, JSON.stringify(ratings)); } catch {}
  counted();
  return ratings[id] ?? { rating: 0, tags: [] };
}
const counted = () => ($('export').textContent = `Export ratings (${Object.keys(ratings).length})`);

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

const KEYS = { ep: 'electric piano', felt: 'felt piano', upright: 'upright piano' };
function cardFor(p, rerolls, problems, i) {
  const t = p.traits, S = t.space, el = document.createElement('article');
  el.className = 'card';
  const chip = (text, cls = '') => `<span class="chip ${cls}">${text}</span>`;
  el.innerHTML = `
    <div class="top"><span class="title">${i + 1}. ${p.title}</span><span class="seed">seed ${p.seed}</span></div>
    <div class="facts">${chip(`${NOTE_NAMES[t.key]} ${t.mode}`)}${chip(`${p.bpm} bpm`)}${chip(`opens: ${t.intro}`, 'intro')}${chip(`stands out: ${t.standout}`, 'standout')}
      ${chip(KEYS[t.keysVoice])}${chip(`lead: ${t.leadVoice}`)}${chip(`${t.bassVoice} bass`)}${chip(`${t.kit} kit`)}${chip(`${t.family} beat, ${t.feel.grid}ths swung ${Math.round(t.feel.swing * 100)}%`)}
      ${chip(t.voicing)}${chip(t.comp === t.compB ? t.comp : `${t.comp}, B ${t.compB}`)}${chip(`melody: ${t.phrase}`)}${S.echo ? chip('echo') : ''}${S.grit ? chip(`${S.grit.bits}-bit`) : ''}${S.texture ? chip('ocean bed') : ''}</div>
    <div class="prog"><b>A</b> ${t.shape} <b>· B</b> ${t.shapeB}${t.shift !== 'none' ? ` <b>(${t.shift})</b>` : ''}</div>
    <canvas width="600" height="88" aria-label="play opening"></canvas>
    <div class="row"><span class="status">rendering…</span><button class="play">Play</button></div>
    <div class="rate"><button class="vote" data-v="1" aria-label="like">👍</button><button class="vote" data-v="-1" aria-label="dislike">👎</button>
      ${TAGS.map((tag) => `<button class="tag" data-tag="${tag}">${tag}</button>`).join('')}</div>`;
  const canvas = el.querySelector('canvas'), status = el.querySelector('.status');
  const play = () => playTrack(i, SECONDS);
  canvas.onclick = play; el.querySelector('.play').onclick = play;
  const show = (r) => {
    el.querySelectorAll('.vote').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.v) === r.rating)));
    el.querySelectorAll('.tag').forEach((b) => b.setAttribute('aria-pressed', String(r.tags.includes(b.dataset.tag))));
  };
  el.querySelectorAll('.vote').forEach((b) => (b.onclick = () => show(rate(p, (r) => { const v = Number(b.dataset.v); r.rating = r.rating === v ? 0 : v; }))));
  el.querySelectorAll('.tag').forEach((b) => (b.onclick = () => show(rate(p, (r) => {
    const tag = b.dataset.tag;
    r.tags = r.tags.includes(tag) ? r.tags.filter((x) => x !== tag) : [...r.tags, tag];
  }))));
  show(ratings[`${p.station}:${p.seed}`] ?? { rating: 0, tags: [] });
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

$('export').onclick = () => {
  const blob = new Blob([JSON.stringify(Object.values(ratings), null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `lowtide-ratings-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  // the download reads the URL after this returns; freed at once, Firefox can save nothing
  setTimeout(() => URL.revokeObjectURL(a.href), 30000);
};
counted();
$('batch').onclick = () => { $('seed').value = String(Math.floor(Math.random() * 1e6)); build(); };
$('row').onclick = () => { stop(); playRow(0); };
$('stop').onclick = stop;
stationSel.onchange = build;
$('seed').onchange = build;
build();
