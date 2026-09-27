// The mood stations and their traits (MOODS.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STATIONS, stationById } from '../src/stations.js';
import { plan, GUITARS } from '../src/plan.js';
import { nextTrack } from '../src/critic.js';
import { playing } from '../src/form.js';
import { renderSection } from '../src/render.js';
import { diskBank } from '../tools/disk.js';

const SEEDS = Array.from({ length: 40 }, (_, i) => 11 + i * 29);
const MOODS = ['groovy', 'chill-beats', 'afternoon-laze', 'night-lofi', 'tokyo-lofi'].map(stationById);
const plansOf = (st, opts) => SEEDS.map((s) => plan(s, st, opts));

test('groovy: the groove bass plays off the beat and stays under the keys', () => {
  let notes = 0, off = 0;
  for (const p of plansOf(stationById('groovy'))) {
    if (p.traits.bassline !== 'groove') continue;
    for (const b of p.events.bass) {
      notes++;
      if (Math.abs(b.beat - Math.round(b.beat)) > 1e-9) off++;
      const keys = p.events.keys.filter((k) => k.beat <= b.beat + 1e-9 && b.beat < k.beat + k.len - 1e-9);
      for (const k of keys) assert.ok(b.midi < k.midis[0], `${p.seed} beat ${b.beat}: bass ${b.midi} over ${k.midis[0]}`);
    }
  }
  assert.ok(notes > 500, `only ${notes} groove bass notes`);
  assert.ok(off / notes > 0.5, `${Math.round((100 * off) / notes)}% of groove bass notes off the beat`);
});

test('chill beats: the drums play in every A and B bar', () => {
  for (const p of plansOf(stationById('chill-beats'))) for (const s of p.sections) {
    if (s.kind !== 'A' && s.kind !== 'B') continue;
    for (let b = 0; b < s.bars; b++) assert.ok(playing(s, 'drums', b * 4), `${p.seed}: ${s.kind} bar ${b + 1} has no drums`);
  }
});

// The lean moves the rest of the rhythm stream (a dragged track draws its hat swing no more), so only the harmony is
// compared with the same station played on the beat.
test('afternoon laze: every track plays behind the beat, over the same chords', () => {
  const st = stationById('afternoon-laze'), eager = { ...st, music: { ...st.music, lazy: false } };
  for (const s of SEEDS) {
    const { feel } = plan(s, st).traits;
    assert.ok(feel.kickMs <= -6 && feel.snareMs >= 22 && feel.keysMs >= 20, `${s}: kick ${feel.kickMs.toFixed(1)}, snare ${feel.snareMs.toFixed(1)}, keys ${feel.keysMs.toFixed(1)} ms`);
    assert.deepEqual(plan(s, st).chords, plan(s, eager).chords);
  }
});

test('night lofi: the piano lead sounds as loud as a vibes lead', async () => {
  const bank = await diskBank(), sr = 22050, db = (x) => 10 * Math.log10(x.dry.L.reduce((e, v) => e + v * v, 0) / x.dry.L.length);
  let piano = 0, vibes = 0, n = 0;
  for (const p of plansOf(stationById('night-lofi')).slice(0, 12)) {
    const i = p.sections.findIndex((s) => s.kind !== 'intro' && s.layers.includes('lead'));
    if (i < 0 || !p.events.lead.length) continue;
    const as = (v) => { const q = structuredClone(p); q.traits.leadVoice = v; q.traits.space.pump = 0; return db(renderSection(q, i, sr, bank, { only: ['lead'] })); };
    piano += as('piano'); vibes += as('vibes'); n++;
  }
  assert.ok(n >= 4, `only ${n} tracks with a lead`);
  assert.ok(Math.abs(piano / n - vibes / n) < 3, `piano lead ${(piano / n).toFixed(1)} dB, vibes ${(vibes / n).toFixed(1)} dB`);
});

test('tokyo lofi: with two guitars, one strums and the other picks the tune', () => {
  let seen = 0;
  for (const p of plansOf(stationById('tokyo-lofi'))) {
    if (p.traits.guitar?.part !== 'both') continue;
    seen++;
    assert.ok(GUITARS.includes(p.traits.keysVoice));
    assert.equal(p.traits.riff, 'guitar');
    assert.ok(GUITARS.includes(p.traits.riffVoice) && p.traits.riffVoice !== p.traits.keysVoice);
    assert.ok(p.events.riff.length > 0);
    assert.equal(p.events.lead.length, 0);
  }
  assert.ok(seen >= 15, `only ${seen} of ${SEEDS.length} Tokyo tracks drew two guitars`);
});

// Chord changes a bar in the A sections, as roots that differ from the chord before.
const pace = (st) => {
  let changes = 0, bars = 0;
  for (const p of plansOf(st)) for (const s of p.sections.filter((x) => x.kind === 'A')) {
    let prev = null;
    for (const c of p.chords.filter((x) => x.start >= s.start && x.start < s.start + s.bars * 4)) {
      const r = (c.key + c.root) % 12;
      if (prev !== null && r !== prev) changes++;
      prev = r;
    }
    bars += s.bars;
  }
  return changes / bars;
};

test('the moods change chords in the order their reference mixes do: Tokyo, night, groovy, chill beats, afternoon', () => {
  const [groovy, chill, afternoon, night, tokyo] = MOODS.map(pace);
  assert.ok(tokyo < night && night < groovy && groovy < chill && chill < afternoon,
    `tokyo ${tokyo.toFixed(2)}, night ${night.toFixed(2)}, groovy ${groovy.toFixed(2)}, chill ${chill.toFixed(2)}, afternoon ${afternoon.toFixed(2)}`);
});

test('every mood station plans tracks the critic passes, in its own tempo', () => {
  for (const st of MOODS) {
    let recent = [], rerolls = 0;
    for (const s of SEEDS.slice(0, 15)) {
      const r = nextTrack(s, st, recent);
      rerolls += r.rerolls;
      assert.ok(r.plan.bpm >= st.music.bpm[0] && r.plan.bpm <= st.music.bpm[1]);
      recent = [...recent, r.plan].slice(-4);
    }
    assert.ok(rerolls / 15 < 1, `${st.id}: ${rerolls} rerolls in 15 tracks`);
  }
  assert.equal(STATIONS.length, 9);
});
