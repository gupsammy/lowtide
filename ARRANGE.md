# lowtide — who plays when

What the listening after the riff round (RIFF.md) found:

- **Riff roles:** no role suits every track.
  - The keys suit most tracks.
  - The lead's sound failed on the soft synth and on the bell.
  - The kalimba failed over the electric piano.
- **Versions:** keys only and no drums don't carry a whole track, but they work as moments.

So this round does two things:

- It picks who plays the riff from the track's own sounds.
- It changes which parts play as the song goes, over the same loop.

**Agreed:**

- Fit rules pick the riff's role. Some tracks double the riff an octave up in the last A.
- Named moves take parts out and bring them back at phrase edges.
- Tracks draw only the full band or the beat tape. Keys only and no drums become moves.

## 1. Who plays the riff

| Role | Fits when | Why |
|---|---|---|
| Keys | always | One player: chords in one hand, riff in the other. |
| Lead | the lead's sound is vibes or kalimba | A riff wants short notes that die away. The soft synth holds and wobbles; the bell turns shrill when it repeats all track. |
| Signature (kalimba) | the keys are the felt or upright piano | The electric piano and the kalimba both ring from struck metal tines. In the same range they blur into one. |

- A fourth role, the guitar, came in later; GUITAR.md §4 has its rule.
- The role is drawn from the station's weights, among the roles that fit. The keys always fit, so every track has a role.
- A track with no lead sound tests the lead role against the station's commonest lead, which is the sound that role would use.
- The lab's riff buttons on each card play any role, fit or not, so the rules can be checked by ear.

### Doubling

- In 40% of tracks where the keys or the kalimba play the riff, a second sound joins in the final A, an octave up.
- **The second sound:**
  - kalimba over the felt or upright piano;
  - vibes over the electric piano, or under a kalimba riff.
- The octave up lands in the lead's band. The lead therefore rests in that A, and the doubled riff carries the tune.
- The lead role never doubles, because its riff already sits in the lead's band.
- The double plays the riff's own notes, so it can grind against the keys only where the riff does, which is nowhere.

## 2. Moves

Producers add or drop a part every 4 or 8 bars, and pull a part so its return lands (`research/lofi-melody.md`). The loop, meaning the keys and the riff, never stops. The moves take the drums, the bass or the lead out around it.

| Move | Where | Out | Fits when |
|---|---|---|---|
| Drop | the last 4 bars before the final A | drums, bass | that section has drums |
| Bare ending | the last 4 bars of the final A, then the outro | drums and bass; the bass in the outro | always |
| Late drums | the first 4 bars of the first A | drums | the intro has no drums |
| Breakdown | the first 4 bars of the first B | drums, bass | that B has drums |
| Stop | the last bar of the A before the first B | drums, bass | that B opens with drums |
| Bare break | the whole break (form T3) | the lead | the break has a lead |

- **How many:** each track draws one to three moves (weights 1 : 3 : 2) from those that fit. The move weights are:

  | drop | ending | late | breakdown | stop | bare break |
  |---|---|---|---|---|---|
  | 3 | 3 | 2 | 2 | 1.5 | 2 |

- **One move per section.**
- **Drums play in at least half the bars of the A and B sections.** A same-loop B counts against this, and a move that would break it isn't drawn.
- **Edges:** a part leaves or returns only 4 bars from a section's edge, or, for the stop, on its last bar.
- **The lead leaves only for whole sections**, so no melody is cut mid-phrase.
- **Moves change who plays, never what they play.** The chords, the riff and every note, hit and fill of the parts still playing are what they would be without the moves. A fill into a breakdown plays, as it does into a same-loop B.
- **Moves draw from their own stream**, `moves`, so drawing them moves nothing else.
- **With the riff off there are no moves**, so a seed still writes round 2's track note for note.
- **A note a move leaves out still draws its timing wobble**, so the notes after it land where they would have.

### What the draw gives

From 300 plans a station (the engine is now `riff-2`):

| | Rain | Sunday | Train | Autumn |
|---|---|---|---|---|
| Keys · lead · kalimba | 56 · 24 · 19% | 47 · 25 · 28% | 59 · 25 · 16% | 54 · 10 · 36% |
| Doubled | 32% | 33% | 29% | 38% |
| Tracks with no move | 15% | 23% | 18% | 17% |
| A and B bars without drums | 34% | 36% | 33% | 35% |
| Plans the critic rejects | 0% | 0% | 0% | 0% |

- **Bare ending** is the commonest move, in about 60% of tracks. **Late drums** comes next, in 25–43%.
- **Tracks with no move** mostly have form T2 (A B A B) with a same-loop B. Their drums already sit out half the A and B bars, and the loop already comes and goes.
- **The lead role is rare in autumn**, whose commonest lead is the soft synth.

## 3. Versions

- A track is the full band or the beat tape, which leaves out the lead.
- Each station's weights, full to beat tape:

  | Rain | Sunday | Train | Autumn |
  |---|---|---|---|
  | 5 : 1 | 6 : 2 | 6 : 2 | 5 : 1 |

- Keys only and no drums are gone as versions, along with the room changes that came with them.

## 4. The lab

- **Each card's buttons:**
  - Riff: Keys · Lead · Kalimba. Each plays the same track with that role. • marks the role the track drew, and a faded button is a role the fit rules wouldn't draw for it.
  - Full · Beat tape.
  - Moves, which turns the moves and the double off and on, so a track can be heard with and without them.
- **The header's riff menu is gone,** along with its round 2 setting.
- **A strip above the waveform** shows who plays in each bar:
  - bright: the full band;
  - middle: no drums;
  - dim: the loop alone.
- **Chips** name the moves and the double.
- **Ratings** of a track with its moves off are kept apart from the same track with them on.

## 5. Checks

`test/arrange.test.js` checks the following:

- **Fit rules:** a drawn lead role only on vibes or kalimba, and a drawn kalimba never over the electric piano.
- **The double:**
  - it plays the riff an octave up in the final A only;
  - the lead is silent there;
  - its sound differs from the riff's.
- **Notes:** a plan with moves plays a subset of the same plan without them, and every note left out falls where a move put its part out.
- **The loop never stops:** wherever the keys play, the riff plays.
- **Drums:** they play in at least half the A and B bars.
- **Placement:** every move sits at a phrase edge, with at most one move per section.

## Files

- **Changed:**
  - `src/form.js`: the moves, `playing()` and the two versions.
  - `src/plan.js`: the fit rules, the double, and the moves applied to the drums, bass and lead.
  - `src/stations.js`: the version weights.
  - `src/render.js`: the double's lane.
  - `src/lab.js` and `lab/listen.html`: the buttons, the strip and the chips.
  - `tools/diagnose.js`: its drum and bass measures skip the bars a move empties.
  - `tools/render.js`, `tools/hear.py` and `tools/stems.py`: the double's notes, and the spans with drums.
- **New:** this file, `test/arrange.test.js`.
