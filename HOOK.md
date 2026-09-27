# lowtide — the hook, the pushed bass and lighter swing

`research/moods.md` ("Our tracks now") split 27 of today's tracks and set them against the references. Three gaps remain that settings alone won't close:

- **The tune doesn't repeat where a lead plays.** The top line is the highest note, so over a riff it is the lead. Plans with a lead repeat 0–39% of bars; plans without one, 42–93%; the references mostly 60–85%.
- **The bass lands on beat 1.** 44% of our bass notes start a bar, against the references' 8–27%. The `root` bassline, one note held through each chord, is the worst: every note on a chord's first beat.
- **We swing harder.** Tracks that swing eighths draw 0.59–0.63; the references land their off-beat eighth at 0.51–0.57.

**Agreed:**

- The lead repeats its hook.
- A new bassline replaces `root`.
- The swing moves to the references.

## 1. The hook

Today the lead writes one melody per section type over the whole section, eight bars in two four-bar phrases. The second phrase follows the same form but the search picks new targets, so bar 5 rarely matches bar 1.

**Now the lead writes a hook and replays it.**

- **Its length** is the loop's, and at least four bars: four bars over a 2- or 4-bar loop, eight over an 8-bar loop. A section shorter than that (a four-bar break) takes its own length.
- **It is written as melodies are now:** the idea, the phrase form, the skeleton search and the decoration. Its last bar is the form's cadence, so each pass of the hook comes home.
- **It replays whole** across the section, note for note. Each pass lands on the same chords, since the hook spans whole loops.
- **Each pass leads into the next.** Where the hook comes round again, its closing note gets the pickup the writer already puts before a new phrase: a step next to the hook's first note, on the last half beat. The section's final pass leaves it out, and the closing note ends early, a breath before the next section.
- **The pickup intro** previews the hook's first bars, as it previewed A's.

The riff keeps its own A and A′ passes, so the variation over the loop comes from the riff and the moves, not the lead.

**What this doesn't change:** the melody rules. Every note still keeps above the keys and the riff, rubs no held note, and puts a chord note on beats 1 and 3. The hook is a melody the writer already knew how to write, only shorter.

**Round A** (MELODY.md §3) also had a hook: two bars that returned, among rests, keys fills and one peak a section. You heard it as muddier than round 2. This hook keeps round 2's writing and fills every bar the lead played before; only the repeats are new.

## 2. The pushed bass

A new bassline, `push`, replaces `root` in every station that drew it. It plays the chord's root **half a beat early**, on the "and" of the beat before, and holds it across the change:

| Chord length | Notes |
|---|---|
| 2 beats | the root, pushed |
| 4 beats | the root, pushed; the fifth on the "and" of 3 |
| 8 beats | the same again in the second bar, the root pushed from the first bar's "and" of 4 |

- Each note holds until a tenth of a beat before the next.
- **A section's first chord** lands on its beat, since the section before may not play bass there.
- **A pushed note belongs to its chord.** It plays where the bass plays at the chord's start, so when a move brings the bass back, the bass leads in half a beat early, and where a move takes the bass out, the note before the gap stays silent. The note carries the chord's beat (`lands`), so the moves check judges it there.
- **The bass stays under the hands.** A pushed root sounds under the old chord as well as the new one, so it drops under both voicings. Under a guitar the rule of GUITAR.md §3 still applies.
- Keys that push land with it, so the bass and the chords arrive together, half a beat early.

The other basslines stay. `kick` and `walk` still start on beat 1, as a boom-bap bass does; `groove` already leans off it.

## 3. Lighter swing

Each station's eighth-note swing moves to a range around its reference group's median, ±0.03:

| Station | Reference | Was | Now |
|---|---|---|---|
| Rain Study | 0.54 | 0.58–0.64 | 0.51–0.57 |
| Sunday Porch | 0.54 | 0.56–0.62 | 0.51–0.57 |
| Last Train | 0.51 | 0.60–0.66 | 0.50–0.54 |
| Autumn Field | 0.53 | 0.57–0.63 | 0.50–0.56 |
| Chill Beats | 0.57 | 0.58–0.64 | 0.54–0.60 |
| Afternoon Laze | 0.56 | 0.58–0.64 | 0.53–0.59 |
| Night Lofi | 0.52 | 0.58–0.64 | 0.50–0.55 |
| Tokyo Lofi | 0.53 | 0.60–0.66 | 0.50–0.56 |

Sixteenth-note swing stays: the split can't read it, so there is nothing to tune it to. Groovy swings only sixteenths and is unchanged.

## 4. The engine tag

Every track with a lead, a `root` bass or eighth-note swing now plays differently, which is nearly all of them. One tag, `hook-1`, replaces `melody-2`, `riff-2` and `riff-3`, so ratings of the old engine stay apart.

The checks that the engine still wrote round 2 and riff-2 note for note go, with the frozen stations they ran on. The engine no longer promises it.

## 5. Targets and checks

Measured on plans, 60 a station:

| Measure | Before | Target | After |
|---|---|---|---|
| Lead bars matching the bar a hook earlier, note for note | 47% | at least 90% | 79%; 100% apart from the pickup a section's last bar leaves out |
| Bass notes starting on beat 1 | 44% | at most 30% | 25% (19–32% by station) |
| Eighth-note swing, station means | 0.59–0.63 | 0.50–0.60 | 0.52–0.57 |

`tools/diagnose.js` still passes all twelve checks. Steps in the melody fell from 73% to 70% with the first version, since each replay jumped from the closing note back to the first; the pickup into the hook brought them back to 72%.

`test/hook.test.js`:

- **The hook:** wherever the lead plays two bars a hook apart, they match note for note, except that a section's last bar leaves out the pickup; the hook is the loop's length, and at least four bars.
- **The pushed bass:** only a section's first chord gets a `push` note on its first beat; every `push` note stays under all the keys sounding over it.
- **The bass on beat 1:** across all nine stations, at most 30% of bass notes start a bar.

The melody, critic and voicing tests run as before. The melody statistics in `tools/diagnose.js` shift, since a hook repeats more; its targets stand.

## Files

- **Changed:** `src/plan.js` (the hook, the pushed bass, the tag), `src/melody.js` (the pickup back into a hook), `src/groove.js` (`push`), `src/stations.js` (basslines, swing), `test/arrange.test.js` (a pushed note is judged at its chord), `test/riff.test.js`, `test/guitar.test.js`, `MOODS.md`, `GUITAR.md`, `ARRANGE.md`, `README.md`.
- **New:** this file, `test/hook.test.js`.
- **Gone:** `test/fixtures/stations-riff2.js`.
