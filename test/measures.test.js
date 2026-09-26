// The targets in DESIGN.md ("What must change, in numbers"), measured over many plans. The seeds differ from the
// ones tools/diagnose.js reports on, so a target met by tuning to one set of seeds shows up here as a failure.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STATIONS } from '../src/stations.js';
import { plan } from '../src/plan.js';
import { measure, TARGETS } from '../tools/diagnose.js';

const plans = STATIONS.flatMap((st) => Array.from({ length: 40 }, (_, i) => plan(5003 + i * 37, st)));
const m = measure(plans);

for (const [name, key, passes, target] of TARGETS) {
  test(`${name}: ${target}`, () => assert.ok(passes(m[key]), `${name}: ${m[key].toFixed(3)}`));
}
