// The listening lab: ten consecutive radio tracks for one station. Each plays in full, so a track can be judged whole;
// the openings play back to back, so sameness can be heard rather than argued about; and tracks are rated, so taste
// can be measured rather than guessed.
import { STATIONS, stationById } from './stations.js';
import { nextTrack, review, scores } from './critic.js';
import { plan as planTrack, opening } from './plan.js';
import { deriveSeed } from './rand.js';
import { NOTE_NAMES } from './theory.js';
import { sectionSpan, TAIL } from './render.js';
import { playing } from './form.js';

const COUNT = 10, SECONDS = 15, ROW_SECONDS = 8;
const KEEP = 3; // whole tracks held in memory at once; each is about 45 MB of audio
const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
// Renders run at one fixed rate and the audio context runs at the same rate, so the chunks of a streamed track join
// sample for sample. The browser resamples the finished output to the sound card's rate.
const sr = 44100;
let ctx, batchId = 0;

// Ratings stay in this browser, keyed by engine, station and seed, so rating a track again replaces the old rating;
// a new engine writes a different melody from the same seed, so its rating is kept apart, as is each riff role and
// version of a track (RIFF.md §6), and a track with its moves off (ARRANGE.md §4). Each keeps the track's traits, opening and melody scores, so the ratings can later
// be read against what the engine chose.
const KEY = 'lowtide.ratings', TAGS = ['lovely', 'stiff', 'muddy', 'samey', 'busy', 'boring'];
const ratings = (() => {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY)) ?? {}; } catch {}
  // ratings saved before engines were tagged are melody-2's
  return Object.fromEntries(Object.entries(saved).map(([id, r]) => (r.engine ? [id, r] : [`melody-2:${id}`, { ...r, engine: 'melody-2' }])));
})();
const ratingId = (p) => {
  const t = p.traits, more = t.riff ? [t.riff, t.version, ...(p.plain ? ['plain'] : [])] : t.version && t.version !== 'full' ? [t.version] : [];
  return [p.engine, p.station, p.seed, ...more].join(':');
};
function rate(p, change) {
  const id = ratingId(p), r = { rating: 0, tags: [], ...ratings[id] };
  change(r);
  if (!r.rating && !r.tags.length) delete ratings[id];
  else ratings[id] = { ...r, engine: p.engine, station: p.station, seed: p.seed, title: p.title, traits: p.traits, opening: opening(p), scores: scores(p), at: new Date().toISOString() };
  try { localStorage.setItem(KEY, JSON.stringify(ratings)); } catch {}
  counted();
  return ratings[id] ?? { rating: 0, tags: [] };
}
const counted = () => ($('export').textContent = `Export ratings (${Object.keys(ratings).length})`);

const stationSel = $('station');
for (const st of STATIONS) stationSel.append(new Option(`${st.name}`, st.id));
stationSel.value = stationById(params.get('station'))?.id ?? STATIONS[0].id;
$('seed').value = params.get('seed') ?? String(Math.floor(Math.random() * 1e6));

// Openings render on a pool of workers. Whole tracks stream from one more, kept free for them.
const worker = () => new Worker(new URL('./lab-worker.js', import.meta.url), { type: 'module' });
const pool = Array.from({ length: Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 4) - 2)) }, worker);
const streamer = worker(), jobs = new Map(), newId = () => Math.random().toString(36).slice(2);
let next = 0;
for (const w of [...pool, streamer]) w.onmessage = ({ data }) => jobs.get(data.id)?.(data);
const render = (plan, seconds) => new Promise((resolve) => {
  const id = newId();
  jobs.set(id, (res) => { jobs.delete(id); resolve(res); });
  pool[next++ % pool.length].postMessage({ id, plan, seconds, sr });
});

function audio() {
  ctx ??= new AudioContext({ sampleRate: sr });
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// tracks[i]: { plan, station, drawnRiff and drawn (the role and version it drew), card, length in seconds, rerolls, opening: { L, R } once
// rendered, whole: see whole(), lastUse }
const tracks = [];
const lengthOf = (p) => { const span = sectionSpan(p, p.sections.length - 1); return span.start + span.length + TAIL; };
function openingOf(tr) {
  const p = tr.plan, id = batchId;
  render(p, SECONDS).then((res) => {
    if (id !== batchId || tr.plan !== p) return;
    if (res.error) { tr.card.status(`render failed: ${res.error}`, true); return; }
    tr.opening = res;
    tr.card.peaks(res.L, res.R, 0);
    if (!tr.whole) tr.card.status(`opening rendered in ${(res.ms / 1000).toFixed(1)} s`);
  });
}
function build() {
  const station = stationById(stationSel.value), base = Number($('seed').value) >>> 0;
  ++batchId;
  history.replaceState(null, '', `?station=${station.id}&seed=${base}`);
  stop();
  tracks.forEach(forget);
  $('grid').innerHTML = '';
  tracks.length = 0;
  const recent = [];
  for (let i = 0; i < COUNT; i++) {
    const found = nextTrack(deriveSeed(base, i), station, recent);
    recent.unshift(found.plan);
    const plan = found.plan, problems = found.problems;
    const tr = { plan, station, drawnRiff: plan.traits.riff, drawn: plan.traits.version, length: lengthOf(plan), rerolls: found.rerolls, opening: null, whole: null, lastUse: 0 };
    tr.card = cardFor(tr, problems, i);
    $('grid').append(tr.card.el);
    tracks.push(tr);
    openingOf(tr);
  }
}

// The track with another riff role or version, or with its moves and double off (ARRANGE.md §4): the plan written
// again from the same seed, and, if the track was playing, playback carrying on from the same moment once the new
// audio reaches it. A role is played as asked, fit or not. `plain` marks a plan whose moves are off, so its ratings
// are kept apart.
function replan(tr, { riff = tr.plan.traits.riff, version = tr.plan.traits.version, plain = !!tr.plan.plain }) {
  const T = tr.plan.traits;
  if (riff === T.riff && version === T.version && plain === !!tr.plan.plain) return;
  const playing = player?.tr === tr && !player.row, from = playing ? position() : 0, paused = playing && player.paused;
  if (player?.tr === tr) stopSources();
  forget(tr);
  tr.plan = planTrack(tr.plan.seed, tr.station, { riff, version, ...(plain ? { moves: [], double: false } : {}) });
  if (plain) tr.plan.plain = true;
  tr.length = lengthOf(tr.plan);
  tr.opening = null;
  const old = tr.card.el;
  tr.card = cardFor(tr, review(tr.plan, tr.station).problems, tracks.indexOf(tr));
  old.replaceWith(tr.card.el);
  openingOf(tr);
  if (playing && !paused) playWhole(tr, from);
}

// A whole track, streamed from the worker a section at a time: { id, chunks: [{ offset, buf }], rendered, total, done }
// in samples. Each chunk becomes an audio buffer as it arrives and, if its track is playing, is scheduled at once.
let uses = 0;
function whole(tr) {
  tr.lastUse = ++uses;
  if (tr.whole) return tr.whole;
  const held = tracks.filter((t) => t.whole), spare = held.filter((t) => t !== player?.tr).sort((a, b) => a.lastUse - b.lastUse);
  spare.slice(0, held.length - (KEEP - 1)).forEach(forget);
  const w = (tr.whole = { id: newId(), chunks: [], rendered: 0, total: Math.round(tr.length * sr), done: false });
  jobs.set(w.id, (m) => {
    if (m.error) { jobs.delete(w.id); tr.card.status(`render failed: ${m.error}`, true); return; }
    if (m.done) {
      jobs.delete(w.id);
      w.done = true;
      tr.card.status(`whole track rendered in ${(m.ms / 1000).toFixed(1)} s`);
      if (player?.tr === tr) prefetch();
      return;
    }
    const buf = new AudioBuffer({ numberOfChannels: 2, length: m.L.length, sampleRate: sr });
    buf.copyToChannel(m.L, 0); buf.copyToChannel(m.R, 1);
    const chunk = { offset: m.offset, buf };
    w.chunks.push(chunk);
    w.rendered = m.offset + m.L.length;
    w.total = m.total;
    tr.card.peaks(m.L, m.R, m.offset);
    tr.card.status(`rendering the whole track, ${Math.round((100 * w.rendered) / m.total)}%`);
    if (player?.tr === tr && !player.row && !player.paused) player.at === null ? anchor() : schedule(chunk);
  });
  streamer.postMessage({ id: w.id, plan: tr.plan, sr, full: true });
  return w;
}
function forget(tr) {
  if (!tr.whole) return;
  if (!tr.whole.done) streamer.postMessage({ cancel: tr.whole.id });
  jobs.delete(tr.whole.id);
  tr.whole = null;
}

// What's playing. A whole track: { tr, from, at, srcs, paused }, where `at` is the audio-clock time of the track's
// first sample, so the position is ctx.currentTime - at. `at` stays null until the audio at `from` has arrived.
// An opening in the row: { tr, row: true, from: 0, at, srcs }.
let player = null, playAll = false, gap = null, rowTimer = null;

function playWhole(tr, from = 0) {
  audio(); // in the click itself: Safari lets audio start only there, and the first chunk arrives after it
  stopSources();
  const w = whole(tr);
  player = { tr, from: Math.max(0, Math.min(from, tr.length - 0.25)), at: null, srcs: [], paused: false };
  anchor();
  if (w.done) prefetch();
  showPlaying();
}
// Start the clock once the audio at `from` is here (a click ahead of the render waits for it), then schedule every
// chunk already rendered.
function anchor() {
  const w = player.tr.whole;
  if (w.rendered <= player.from * sr) return;
  player.at = Math.round((audio().currentTime + 0.05 - player.from) * sr) / sr;
  w.chunks.forEach(schedule);
}
// A chunk plays at its place on the track's clock: from its start, from the position the player began at, or, if it
// arrived late, from now, skipping what has passed so the clock stays true.
function schedule(chunk) {
  const c = audio(), start = player.at + chunk.offset / sr, end = start + chunk.buf.duration;
  const when = Math.max(start, player.at + player.from, c.currentTime + 0.01);
  if (when >= end) return;
  const src = c.createBufferSource();
  src.buffer = chunk.buf;
  src.connect(c.destination);
  src.start(when, when - start);
  if (chunk.offset + chunk.buf.length >= player.tr.whole.total) src.onended = () => { if (player?.srcs.includes(src)) ended(); };
  player.srcs.push(src);
}
const position = () => (player.at === null ? player.from : Math.max(player.from, audio().currentTime - player.at));

function pause() {
  player.from = position();
  player.at = null;
  player.paused = true;
  player.srcs.forEach(silence);
  player.srcs = [];
  showPlaying();
}
function toggle(tr) {
  if (player?.tr !== tr || player.row) playWhole(tr);
  else if (player.paused) playWhole(tr, player.from);
  else pause();
}
// The next track: rendered while this one plays, started after a short pause, like a radio between songs.
function prefetch() { const i = tracks.indexOf(player.tr); if (playAll && tracks[i + 1]) whole(tracks[i + 1]); }
function ended() {
  const i = tracks.indexOf(player.tr);
  stopSources();
  if (playAll && tracks[i + 1]) {
    gap = setTimeout(() => { playWhole(tracks[i + 1]); tracks[i + 1].card.el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 1500);
  } else playAll = false;
}

const silence = (src) => { try { src.stop(); } catch {} };
function stopSources() {
  clearTimeout(gap); clearTimeout(rowTimer);
  gap = rowTimer = null;
  player?.srcs.forEach(silence);
  player = null;
  showPlaying();
}
function stop() { playAll = false; stopSources(); }

function playOpening(i, seconds, onEnd) {
  const tr = tracks[i];
  if (!tr?.opening) return false;
  stopSources();
  const c = audio(), n = Math.min(tr.opening.L.length, Math.round(seconds * sr));
  const buf = new AudioBuffer({ numberOfChannels: 2, length: n, sampleRate: sr });
  buf.copyToChannel(tr.opening.L.subarray(0, n), 0); buf.copyToChannel(tr.opening.R.subarray(0, n), 1);
  const src = c.createBufferSource(), g = c.createGain();
  src.buffer = buf; src.connect(g).connect(c.destination);
  // a short fade at the cut, so stopping mid-note doesn't click
  g.gain.setValueAtTime(1, c.currentTime + seconds - 0.25);
  g.gain.linearRampToValueAtTime(0, c.currentTime + seconds);
  src.start();
  player = { tr, row: true, from: 0, at: c.currentTime, srcs: [src] };
  src.onended = () => { if (player?.srcs.includes(src)) { stopSources(); onEnd?.(); } };
  showPlaying();
  return true;
}
function playRow(i = 0) {
  if (i >= tracks.length) return;
  if (!playOpening(i, ROW_SECONDS, () => (rowTimer = setTimeout(() => playRow(i + 1), 400)))) rowTimer = setTimeout(() => playRow(i), 300);
  tracks[i].card.el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

// Cards show which track is playing and where; the playhead moves once a frame while anything plays.
let frame = 0;
function showPlaying() {
  for (const t of tracks) t.card.show(player?.tr === t ? player : null);
  if (player && !frame) frame = requestAnimationFrame(function move() {
    if (!player) { frame = 0; return; }
    player.tr.card.show(player);
    frame = requestAnimationFrame(move);
  });
}

const KEYS = { ep: 'electric piano', felt: 'felt piano', upright: 'upright piano' };
const VERSION_NAMES = { full: 'Full', beat: 'Beat tape' }, ROLE_NAMES = { keys: 'Keys', lead: 'Lead', signature: 'Kalimba' };
const MOVE_NAMES = { drop: 'drop', ending: 'bare ending', late: 'late drums', breakdown: 'breakdown', stop: 'stop', bareBreak: 'bare break' };
const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
function cardFor(tr, problems, i) {
  const p = tr.plan, t = p.traits, S = t.space, melody = scores(p), el = document.createElement('article');
  el.className = 'card';
  const chip = (text, cls = '') => `<span class="chip ${cls}">${text}</span>`;
  el.innerHTML = `
    <div class="top"><span class="title">${i + 1}. ${p.title}</span><span class="seed">seed ${p.seed}</span></div>
    <div class="facts">${chip(`${NOTE_NAMES[t.key]} ${t.mode}`)}${chip(`${p.bpm} bpm`)}${chip(`opens: ${t.intro}`, 'intro')}${chip(`stands out: ${t.standout}`, 'standout')}
      ${chip(KEYS[t.keysVoice])}${chip(`lead: ${t.leadVoice}`)}${chip(`${t.bassVoice} bass`)}${chip(`${t.kit} kit`)}${chip(`${t.family} beat, ${t.feel.grid}ths swung ${Math.round(t.feel.swing * 100)}%`)}
      ${chip(t.voicing)}${chip(t.comp === t.compB ? t.comp : `${t.comp}, B ${t.compB}`)}${chip(`melody: ${t.phrase}`)}${S.echo ? chip('echo') : ''}${S.grit ? chip(`${S.grit.bits}-bit`) : ''}${S.texture ? chip('ocean bed') : ''}
      ${t.riff ? chip(`riff: ${t.riff === 'keys' ? `keys (${KEYS[t.keysVoice]})` : t.riffVoice}, ${t.riffNotes} a bar`, 'riff') : ''}${t.riff ? chip(t.sameB ? 'B: same loop, no drums' : 'B: new chords') : ''}
      ${t.riff ? chip(p.plain ? 'moves off' : t.moves.length ? `moves: ${t.moves.map((m) => MOVE_NAMES[m]).join(', ')}` : 'no moves', 'moves') : ''}${t.double ? chip(`doubled on ${t.double} in the last A`, 'moves') : ''}</div>
    <div class="prog"><b>A</b> ${t.shape} <b>· B</b> ${t.sameB ? 'replays A' : t.shapeB}${t.shift !== 'none' ? ` <b>(${t.shift})</b>` : ''}</div>
    <div class="versions" role="group" aria-label="who plays the riff"><span class="label">riff</span>${Object.entries(ROLE_NAMES).map(([r, name]) =>
      `<button data-riff="${r}" aria-pressed="${t.riff === r}"${t.fits.includes(r) ? '' : ' class="unfit" title="the fit rules wouldn\'t draw this role for this track"'}>${name}${r === tr.drawnRiff ? ' •' : ''}</button>`).join('')}</div>
    <div class="versions" role="group" aria-label="version">${Object.entries(VERSION_NAMES).map(([v, name]) =>
      `<button data-version="${v}" aria-pressed="${t.version === v}">${name}${v === tr.drawn ? ' •' : ''}</button>`).join('')}
      ${t.riff ? `<button class="moves" aria-pressed="${!p.plain}" title="the moves and the double"${!p.plain && !t.moves.length && !t.double ? ' disabled' : ''}>Moves</button>` : ''}</div>
    ${melody ? `<div class="prog"><b>melody</b> surprise ${melody.surprise.toFixed(2)} bits <b>·</b> fit ${melody.fit.toFixed(2)} <b>·</b> new bars ${Math.round(100 * melody.fresh)}%</div>` : ''}
    <canvas width="600" height="112" aria-label="the whole track: click to play from there"></canvas>
    <div class="row"><span class="status">rendering the opening…</span><span class="time"></span><button class="play">Play</button></div>
    <div class="rate"><button class="vote" data-v="1" aria-label="like">👍</button><button class="vote" data-v="-1" aria-label="dislike">👎</button>
      ${TAGS.map((tag) => `<button class="tag" data-tag="${tag}">${tag}</button>`).join('')}</div>`;
  const canvas = el.querySelector('canvas'), status = el.querySelector('.status'), time = el.querySelector('.time'), button = el.querySelector('.play');
  canvas.onclick = (e) => { const r = canvas.getBoundingClientRect(); playWhole(tr, ((e.clientX - r.left) / r.width) * tr.length); };
  button.onclick = () => toggle(tr);
  el.querySelectorAll('.versions [data-riff]').forEach((b) => (b.onclick = () => replan(tr, { riff: b.dataset.riff })));
  el.querySelectorAll('.versions [data-version]').forEach((b) => (b.onclick = () => replan(tr, { version: b.dataset.version })));
  const movesButton = el.querySelector('.versions .moves');
  if (movesButton) movesButton.onclick = () => replan(tr, { plain: !p.plain });
  const pressed = (r) => {
    el.querySelectorAll('.vote').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.v) === r.rating)));
    el.querySelectorAll('.tag').forEach((b) => b.setAttribute('aria-pressed', String(r.tags.includes(b.dataset.tag))));
  };
  el.querySelectorAll('.vote').forEach((b) => (b.onclick = () => pressed(rate(p, (r) => { const v = Number(b.dataset.v); r.rating = r.rating === v ? 0 : v; }))));
  el.querySelectorAll('.tag').forEach((b) => (b.onclick = () => pressed(rate(p, (r) => {
    const tag = b.dataset.tag;
    r.tags = r.tags.includes(tag) ? r.tags.filter((x) => x !== tag) : [...r.tags, tag];
  }))));
  pressed(ratings[ratingId(p)] ?? { rating: 0, tags: [] });

  // The waveform spans the whole track: one column per slice of time, drawn as its audio arrives, with the sections
  // marked above it so what's heard can be matched to the form, and a strip of who plays each bar: bright for the
  // full band, middle without drums, dim for the loop alone.
  const W = canvas.width, H = canvas.height, TOP = 32, peak = new Float32Array(W), heard = new Uint8Array(W);
  const perColumn = (tr.length * sr) / W, sections = p.sections.map((s, k) => ({ x: (sectionSpan(p, k).start / tr.length) * W, name: s.kind }));
  const spb = 60 / p.bpm, BAND = ['#4a4f58', '#8a6a48', '#f0a860'];
  const bars = p.sections.flatMap((s) => Array.from({ length: s.bars }, (_, b) => ({
    x: ((s.start + b * 4) * spb / tr.length) * W, w: (4 * spb / tr.length) * W,
    band: playing(s, 'drums', b * 4) ? 2 : playing(s, 'bass', b * 4) ? 1 : 0,
  })));
  let lastShown = -1;
  function draw(pos) {
    const g = canvas.getContext('2d'), mid = TOP + (H - TOP) / 2, px = pos === null ? -1 : (pos / tr.length) * W;
    g.clearRect(0, 0, W, H);
    g.font = '18px ui-sans-serif, system-ui, sans-serif';
    g.textBaseline = 'top';
    sections.forEach((s, k) => {
      const x = Math.round(s.x), end = sections[k + 1]?.x ?? W;
      g.fillStyle = '#2c3038';
      if (k) g.fillRect(x, 0, 1, H);
      if (g.measureText(s.name).width + 10 < end - x) { g.fillStyle = '#8a867e'; g.fillText(s.name, x + 5, 4); }
    });
    for (const b of bars) { g.fillStyle = BAND[b.band]; g.fillRect(Math.round(b.x) + 1, TOP - 9, Math.max(1, Math.round(b.w) - 1), 6); }
    for (let x = 0; x < W; x++) {
      if (!heard[x]) { g.fillStyle = '#2c3038'; g.fillRect(x, mid, 1, 1); continue; }
      const y = Math.max(1, peak[x] * (H - TOP) * 0.95);
      g.fillStyle = x < px ? '#f0a860' : '#f0a86088';
      g.fillRect(x, mid - y / 2, 1, y);
    }
    if (px >= 0) { g.fillStyle = '#e8e4dc'; g.fillRect(Math.round(px) - 1, TOP - 4, 2, H - TOP + 4); }
  }
  draw(null);
  if (problems.length) { status.textContent = `critic gave up: ${problems[0]}`; status.classList.add('warn'); }
  time.textContent = clock(tr.length);
  return {
    el,
    status(text, warn) {
      status.textContent = `${text}${tr.rerolls ? ` · ${tr.rerolls} re-roll${tr.rerolls > 1 ? 's' : ''}` : ''}`;
      status.classList.toggle('warn', !!warn);
    },
    peaks(L, R, offset) {
      for (let j = 0; j < L.length; j++) {
        const x = Math.min(W - 1, Math.floor((offset + j) / perColumn)), v = Math.max(Math.abs(L[j]), Math.abs(R[j]));
        heard[x] = 1;
        if (v > peak[x]) peak[x] = v;
      }
      draw(player?.tr === tr ? position() : null);
    },
    // pl: the player while this track is its track, else null
    show(pl) {
      el.classList.toggle('playing', !!pl);
      button.textContent = pl && !pl.row && !pl.paused ? 'Pause' : 'Play';
      const pos = pl ? position() : null, shown = pos === null ? -1 : Math.floor(pos * 10);
      if (shown === lastShown && pos !== null) return; // redraw ten times a second, not every frame
      lastShown = shown;
      draw(pos);
      time.textContent = pos === null ? clock(tr.length) : `${clock(pos)} / ${clock(tr.length)}`;
    },
  };
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
// Play all: from the track already under way, if there is one, otherwise from the first.
$('all').onclick = () => {
  playAll = true;
  if (!player || player.row) playWhole(tracks[0]);
  else if (player.paused) playWhole(player.tr, player.from);
  else if (player.tr.whole.done) prefetch();
};
$('row').onclick = () => { stop(); playRow(0); };
$('stop').onclick = stop;
stationSel.onchange = build;
$('seed').onchange = build;
build();
