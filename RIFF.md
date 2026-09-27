# lowtide — the riff in the loop

In the hits the tune lives in the loop: one riff plays from the start to the end, nearly note for note, while parts come and go around it (`research/viral-lofi.md`, `research/stems.md`). lowtide puts its tune in a lead that comes and goes, and its loop repeats less than a third as exactly. This round adds the riff, and versions of a track with parts left out.

**Agreed:**

- **Three roles for the riff, all built so you can hear them on the same seeds before choosing one.** *Keys*: the keys play the riff above their chords, and the lead stays as a second layer. *Lead*: the lead's sound plays the riff and there is no separate melody. *Signature*: a new part plays the riff on the kalimba, standing in for a harp or guitar, while the keys play chords and the lead stays as a second layer.
- **Two kinds of B, drawn per track.** *New chords*, as now, with the riff fitted to them. *Same loop*: A's chords and riff with the drums out.
- **Versions, drawn per track and switchable while you listen:** full band, keys only, no drums, beat tape. *Since replaced: ARRANGE.md picks the role from the track's sounds, keeps only the full band and the beat tape, and turns keys only and no drums into moves within a track.*

## 1. Targets

From the hits (`research/stems.md`), measured on plans by `tools/diagnose.js` and checked on other seeds by `test/measures.test.js`:

| Measure | Hits | Round 2 | Target | Riff engine |
|---|---|---|---|---|
| Riff bars that repeat the bar one loop earlier, B replaying the loop | 82% | 26% | at least 75% | 82% |
| The same, B with new chords | | | none | 50% |
| Loops played as their loop's main take | 47% | 22% | at least 60% | 64% |
| Riff notes per bar | 5–6 | 2–3 | 4–8 | 5.2 (rain 4.3, train 6.5) |

The engine's figures are from `node tools/diagnose.js` (240 plans).

- **Repeats** are counted across the whole track, at the lag of 1, 2, 4 or 8 bars where they are highest, the way `tools/stems.py` counts them in the hits.
- **A B with new chords** changes every bar where it follows A, so only a B that replays the loop is comparable with the hits. The lab decides between the two.
- **The keys' velocity spread** (DESIGN.md's target of at least 0.1) is measured on tracks with a new-chord B. A B that replays the loop swaps the loudest section for a quiet one, which narrows the spread by about 0.008. That is the cost of a drum drop, not a fault.

The bass, the swing and the drum density also differ from the hits. They are the next step, not this one.

## 2. The riff

One riff per track, written from a new `riff` stream. The role, the kind of B and the version come from a new `arrange` stream. No existing stream draws anything new, so with the riff switched off a seed writes exactly the track it wrote before (tested). Changing the role or the version never changes the riff's notes.

### The cell

A one-bar rhythm and a shape, drawn once:

- **Rhythm:** as many notes as the station's density, on eighth-note slots. Slot 0 is favoured, then the other beats, then the off-beats. Each note lasts until the next one.
- **Shape:** each note's move from the bar's first note, counted in steps along the chord's own notes (an arpeggio), mostly by one, sometimes by two, with a turn after a jump of two, spanning at most four.
- **Breath:** in half the tracks with five or more notes a bar, every second bar drops its last note, so no bar falls below four.

### Fitting it to the chords

- **The notes it may use:** the pitch classes the keys are voicing plus the root, minus any that sit a semitone above a note the keys hold. The riff therefore carries the voicing's colour and never grinds against it.
- **Pushed chords.** Keys that push play each chord half a beat early while the last one still rings. The riff takes its notes from the new chord and clears both.
- **Each bar's first note** is the allowed note nearest the last bar's first note, so the riff moves as little as the keys do. The first bar starts a third of the way up its band.
- The other notes follow the shape from there, using the chord that sounds under each note.
- The riff is written for one pass of the chord loop and replays on every pass, so a loop repeats exactly.

### A and A′

- A′ is A with its last bar changed. The last one or two notes move a step up or down the arpeggio, or the last note is dropped and the one before it held.
- **First half of the track:** A A A A′. **Second half:** A A′ A A′. This puts about two thirds of all loops on A, and the second half moves a little faster.
- The count starts at A1. An intro always plays A, so a version that gives the intro keys never moves an A′.

### Where it plays

- Wherever the keys play, intro included: on every pass of the loop, from each section's first bar.
- In the outro it stops when the closing home chord starts.
- When the next section's keys push, its first chord sounds in this section's last half beat. A riff note there that would grind against that chord is left out, as a breath before the new section.
- A B with new chords gets the same cell fitted to B's chords, so it is recognisably the same riff.

### The three roles

| | Keys | Lead | Signature |
|---|---|---|---|
| Riff sound | the track's keys | the track's lead sound | kalimba |
| Riff band (from the station's lead note L) | L−13 to L−2 | L−5 to L+7 (the lead's own band) | L−13 to L−2 |
| Keys' chords stay under | L−10 | L−7 (as now) | L−10 |
| Lead | second layer, L−1 to L+8 | none | second layer, L−1 to L+8 |
| Lead enters | at A2 at the earliest, never in the intro | none | at A2 at the earliest, never in the intro |

- In the keys and signature roles the lead always sits above the riff. The riff's band overlaps the top 3 semitones of the chords, but it uses only notes the chords voice. A lower ceiling would squeeze the chords under MIDI 57 on the stations with low leads, and a higher lead would push the vibes samples too far up.
- About 0.4% of these plans put the bass above the lowered chords; the critic re-rolls them.
- A track whose lead sound is `none` plays the lead role on the station's most common lead sound.
- In the signature role, a lead drawn as kalimba plays vibes instead, so the second layer doesn't copy the riff's sound.

## 3. B: new chords or the same loop

Each track draws one, at even odds:

- **New chords:** as now. The riff is fitted to B's chords.
- **Same loop:** B keeps A's key, chords and riff. The drums drop out and B's energy falls to 0.42. The lead plays B if it plays there now.
- The rhythm stream draws B's drum pattern and the fill into B either way, so the drums elsewhere in the track don't change with the kind of B.

## 4. Versions

*Keys only and no drums are gone; see ARRANGE.md §3.*

A track's version is drawn from its station's weights, and the lab can switch it. Switching writes the plan again with that version and renders from where you are, which takes about a second.

| Version | Leaves out | Also | Rain | Sunday | Train | Autumn |
|---|---|---|---|---|---|---|
| Full | nothing | | 5 | 6 | 6 | 5 |
| Keys only | drums, bass, lead | room 35% wetter; the ocean or rain bed at least 0.12 | 1.5 | 1 | 1 | 2 |
| No drums | drums | room 15% wetter; bed at least 0.15 | 2 | 1 | 1.5 | 1.5 |
| Beat tape | the lead | | 1 | 2 | 2 | 1 |

- An intro left with nothing to play (drums first, in the keys-only or no-drums version) plays the keys instead, riff included.
- A part a version leaves out still counts as there for the choices that depend on it. A fill into a section without its drums is drawn anyway, so the drums and the kick-following bass stay the same in every version that keeps them.
- In the lead role the riff is the lead, so the beat tape equals the full band there.

## 5. The critic

Two new checks, applied to every plan:

- **The melody dips under the riff:** a lead note at or below a riff note sounding at the same time.
- **The riff grinds against the keys:** a riff note a semitone above a note the keys hold.

The melody scores (MELODY.md §1) still read the lead only.

## 6. The lab

- **A riff selector** in the header: drawn, keys, lead, kalimba, or round 2 (no riff). *Since moved onto each card; see ARRANGE.md §4.* The critic picks each batch's seeds with the drawn engine. A forced role re-plans those same seeds, so switching roles keeps the same ten tracks.
- **A version switch on each card:** Full · Keys only · No drums · Beat tape. The drawn version is marked. Switching while the track plays carries on from the same moment.
- **Cards** show the riff's role, its notes per bar, the kind of B and the version.
- **Ratings** are kept per role and version. Round 2's ratings keep their old keys.

## Files

- **New:** `src/riff.js` (cell, fitting, A′), `test/riff.test.js`.
- **Changed:**
  - `src/plan.js`: the `arrange` and `riff` streams, roles, the kinds of B, versions and riff events.
  - `src/form.js`: layers per version, and drums out of a same-loop B.
  - `src/stations.js`: riff density and weights.
  - `src/render.js`: the riff lane.
  - `src/critic.js`: the two checks, and the options passed through to the plan.
  - `src/lab.js` and `lab/listen.html`: the selector and the switch.
  - `tools/diagnose.js`: riff measures and targets.
  - `tools/render.js`: riff notes in `facts.json`, and in the harmony stem.
  - `tools/stems.py`: riff notes counted in the plan's `other`.
- **Docs:** this file. README links to it.
