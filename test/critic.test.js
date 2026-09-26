import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STATIONS } from '../src/stations.js';
import { plan, opening } from '../src/plan.js';
import { review, nextTrack } from '../src/critic.js';
import { chordPcs, mod12 } from '../src/theory.js';

const st = STATIONS[0];
const passing = () => {
  for (let s = 1; ; s++) { const p = plan(s, st); if (review(p, st).ok && p.events.lead.length) return p; }
};

test('the critic hears a melody note grinding against its chord', () => {
  const p = structuredClone(passing());
  const n = p.events.lead.find((x) => x.beat % 1 === 0);
  const c = p.chords.findLast((x) => x.start <= n.beat);
  const tones = chordPcs(c.key + c.root, c.q).map(mod12);
  // a semitone above a chord note that isn't itself in the chord
  const bad = tones.map((t) => t + 1).find((pc) => !tones.includes(mod12(pc)));
  if (bad === undefined || c.q === '7b9') return;
  n.midi = 60 + mod12(bad);
  assert.match(review(p, st).problems.join(), /grinds/);
});

test('the critic rejects a tempo the station does not allow', () => {
  const p = structuredClone(passing());
  p.bpm = st.music.bpm[1] + 20;
  assert.match(review(p, st).problems.join(), /tempo/);
});

test('the critic rejects a track that opens the way one of the last two did', () => {
  const p = passing(), q = structuredClone(p);
  q.seed++;
  assert.match(review(q, st, [p]).problems.join(), /opens the same way/);
});

// The reason this project exists: consecutive tracks must not open alike.
test('a station never opens two tracks in a row the same way', () => {
  for (const station of STATIONS) {
    const recent = [];
    for (let i = 0; i < 40; i++) {
      const { plan: p } = nextTrack(900 + i * 31, station, recent);
      if (recent[0]) assert.notEqual(p.traits.intro, recent[0].traits.intro);
      if (recent[1]) assert.notEqual(p.traits.intro, recent[1].traits.intro);
      recent.unshift(p);
    }
  }
});

test('openings are nearly all different from each other', () => {
  for (const station of STATIONS) {
    const seen = new Set(), recent = [];
    for (let i = 0; i < 40; i++) {
      const { plan: p } = nextTrack(5000 + i * 17, station, recent);
      recent.unshift(p);
      const o = opening(p);
      seen.add(`${o.intro}|${o.chord}|${o.sound}|${Math.round(o.register / 3)}`);
    }
    assert.ok(seen.size >= 36, `${station.id}: only ${seen.size} distinct openings in 40 tracks`);
  }
});

test('the radio almost never needs many re-rolls', () => {
  const recent = [];
  let total = 0;
  for (let i = 0; i < 50; i++) {
    const r = nextTrack(70 + i, st, recent);
    assert.equal(r.problems.length, 0);
    total += r.rerolls;
    recent.unshift(r.plan);
  }
  assert.ok(total / 50 < 1.5, `average ${total / 50} re-rolls per track`);
});
