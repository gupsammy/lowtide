# lowtide — melody, round 3

Round 2 gave every track a melody that is in tune, in key and never buried (see [DESIGN.md](DESIGN.md) and [HEARING.md](HEARING.md)). This round makes it memorable, and gives each station a melodic character of its own. The research behind it is in `research/`: open-source composers, producers and jazz teachers, melody science, and house (kept for phase 2).

**Agreed:** approach C, and melody characters drawn per track from a weighted pool per station.

**Order of work:**

1. Three checks in the critic: surprise, fit and repetition. They measure and report; they reject nothing yet.
2. **Round A**, space and hook: the lead rests, a two-bar hook returns, one peak per section, endings on the tonic. Each character sets its own amounts.
3. **The lab check.** You compare the old and new melody on the same seeds. B starts only after your go.
4. **Round B**, note language per character: jazz approaches and guide tones for the soloist, pedal notes and 4ths for the drifter, and so on.

## Where the melody stands

Track medians from `node tools/diagnose.js` (60 plans per station), scoring the first statement of each section type (see §1):

| Check | Rain Study | Sunday Porch | Last Train | Autumn Field |
|---|---|---|---|---|
| Surprise, bits per note | 2.67 | 2.77 | 2.86 | 2.80 |
| Fit (four-note chord) | 0.95 | 0.93 | 0.92 | 0.91 |
| Colour notes (9th, 11th, 13th) | 14% | 17% | 17% | 20% |
| Bars repeating an earlier bar, at any pitch | 43% | 40% | 40% | 36% |
| Bars repeating an earlier bar exactly | 31% | 29% | 21% | 21% |
| Lead bars never heard earlier in the track | 42% | 44% | 46% | 46% |
| Lead-section bars with no lead note (all plans) | 3.5% | 4.9% | 5.9% | 5.1% |

The four stations write nearly the same melody: every gap between two stations' medians is smaller than the spread within one station (surprise, for one, runs 2.3–3.5 bits from the 10th to the 90th percentile). Their chords, sounds and tempos differ; their lines barely do. The lofi brief found the rest: the top note recurs in 69% of sections, 33% of closing notes sound over a tonic chord, and bars 5–6 repeat bars 1–2 in pitch 34% of the time.

## 1. Three checks

Each check scores a section type's first statement (A, B, break): repeats add nothing new, and a loop heard twice would teach any memory-based model to expect it. A track's value is the mean over its statements, weighted by note count. The checks read the plan only.

### Surprise

How expected each note is, in bits, from Temperley's model of melodic expectation (Temperley 2008), which predicts listeners' ratings of continuations at r = .74. Liking follows an inverted U in surprise, peaking on the predictable side, with a sweet spot that differs from listener to listener (melody-science.md, rule 3).

- For each candidate pitch p from MIDI 21 to 108: w(p) = N(p; c, 29.0) · N(p; previous note, 7.2) · K[(p − tonic) mod 12]. The note's surprise is −log₂ of its own w over the sum of all w. The first note has no previous note, so it drops that factor.
- c is the statement's mean pitch; the paper instead sums over all central pitches. The variances are the paper's Essen estimates.
- K follows the three levels of the paper's key profiles: notes of the home triad 0.19 each, the mode's other notes 0.10, all others 0.006. It is built for each of the five modes, so a Dorian 6th isn't marked wrong the way a folk-song minor profile would mark it. The section's own key and mode apply, so a B in a new key is scored in that key.
- Reports the mean and its spread. No target: the band comes from your ratings.

### Fit

How well the notes sit on the chords: CTnCTR (Yeh et al. 2021). Chord notes, plus other notes that step (2 semitones or less) to the next note, over all notes.

- **Chord notes** are the four-note chord: root, 3rd (or sus 4th), 5th, 7th (or 6th). The 9th, 11th and 13th are **colour**, reported as their own share. Counting colour as chord notes scores every current track 1.00, which says nothing.
- **Anchoring**: the share of other notes that step to a chord note of the next note's chord.
- **Anticipation:** a note that starts within an eighth of a chord change and is held across it is judged against the chord it anticipates.
- Human pop melodies score 0.74 on triads; machine harmonisations scored higher (0.82–0.91), and listeners still preferred the human ones. So higher isn't better beyond a point.

### Repetition

- **Hook:** within a statement, the share of lead bars after the first whose rhythm and intervals repeat an earlier bar at any pitch.
- **Exact:** the same, at the same pitch.
- **Fresh:** across the whole track as heard, the share of lead bars whose notes never sounded earlier. In 909 pop songs, 15–35% of a song is new material (Dai et al. 2020).

### Where the numbers go

- `review()` returns `scores` beside `problems`. `tools/diagnose.js` prints each station's median and 10–90% range.
- **The lab card** shows the three numbers and the melody character.
- **Each rating** saves the scores and the engine version (`plan.engine`, now `melody-2`). A new engine plays a different melody from the same seed, so the rating key becomes `engine:station:seed`. Keys saved before this change are read as `melody-2`.
- **Rendered tracks:** `tools/render.js` writes the scores into `facts.json`. `hear.py --ratings` sets them beside the audio measures, as `plan.surprise`, `plan.fit` and so on.

### Why they reject nothing yet

No study gives a band for lofi, and the science brief warns that such measures can veto weak candidates but don't rank good ones. Rejecting now would also change which tracks the lab plays, and move the baseline that round A is judged against. When at least 10 liked and 10 disliked tracks exist, set each band where the liked ones sit, and keep it only if it holds when each rating is left out in turn.

### Tests

Each test is built from hand-written notes with a known answer, not from the engine's output:

- **Surprise:** an in-key stepwise line scores below the same rhythm with leaps, which scores below a line with notes outside the key. One note outside the mode scores more than 6 bits. A B section in a new key is scored in its own key.
- **Fit:** chord notes alone give 1. An outside note that leaps away lowers the fit; the same note stepping to a chord note does not. An anticipated chord note of the next chord counts as a chord note.
- **Repetition:** bars 5–6 copying bars 1–2 give a known exact share. The same bars a step higher count toward the hook but not toward exact. A second A copying the first halves what is fresh.

## 2. Melody characters

Each track draws a character from its station's weights. The character is a trait: it shows on the lab card and is saved with ratings, so your ratings show which characters you like.

| Station | sparse | singable | soloist | drifting |
|---|---|---|---|---|
| Rain Study | 3 | 1 | | 1 |
| Sunday Porch | 1 | 3 | | 1 |
| Last Train | 1 | 1 | 3 | |
| Autumn Field | 1 | 1 | | 3 |

- **Sparse:** few notes and long ones, falling lines, colour on the long notes; the echo answers in the gaps.
- **Singable:** a tuneful two-bar hook that returns note for note, repeated notes, one upward leap, and an ending on the tonic.
- **Soloist:** a jazz player's language: guide tones, half-step approaches, bebop phrases before cadences, late downbeats.
- **Drifting:** a short motif repeated over the vamp, 4ths and pentatonic notes, pedal notes held across chord changes, few cadences.

A character is a set of settings. Round A fills in the settings for shape; round B adds the settings for note choice. Phase 2 adds house characters (a riff over a root pedal, the Hijaz path) as new rows in the same table.

**Seeds keep their backing.** The character, and every other new choice this round, comes from the melody stream or a new `arrange` stream. The harmony, rhythm, form and sound streams are untouched, so a seed keeps its chords, drums, sounds and form, and only the melody and when it plays change. That makes the lab's before-and-after fair (§4).

## 3. Round A: space and hook

### Settings per character

Starting values, to tune in the lab:

| Setting | sparse | singable | soloist | drifting |
|---|---|---|---|---|
| Bars played per 4-bar unit (weights) | 1: 1, 2: 4, 3: 1 | 2: 3, 3: 1 | 2: 2, 3: 1 | 2: 1, 3: 1 |
| Lead-section bars resting (expected) | 50% | 44% | 42% | 38% |
| Notes in the hook | 2–4 in 2 bars | 4–8 in 2 bars | 5–8 in 2 bars | 3–5 in 1 bar, stated twice |
| Note lengths, in eighths | 3–6 | 1–3 | 1–2 | 2–3 |
| Repeated notes, share of moves | 7% (as now) | 25% | 5% | 15% |
| Signature leap in the hook | none | one upward, a 4th to a 6th | one, any direction | 4ths welcome |
| Contour (weights) | fall 1, arch 1 | arch 3, ramp 1, terrace 1 | arch 2, ramp 1, terrace 1 | hover 2, arch 1 |
| Hook returns note for note where the chords repeat | 0.8 | 0.9 | 0.6 | 0.9 |
| B's band raised by | 2 semitones | 3 | 2 | 2 |

Contours, per phrase: **arch** rises to a peak about two thirds through and falls; **fall** starts high and descends; **ramp** moves one way and turns at the band's edge; **terrace** steps one way and leaps back every two bars; **hover** stays within a 4th of the band's centre.

### Rules for every character

1. **Phrases in 4-bar units.** The lead plays the unit's first 1–3 bars and rests to its end. The last bar played ends the phrase: open (on degree 2, 5, 7 or a colour note) in the first unit, closed (1 or 3) in the last. This replaces round 2's phrase forms (sentence, period, aaba, call).
2. **A two-bar hook** per section type: bar 1 is the idea, and bar 2 answers it and carries the ending. B's hook has slower notes. In later units, idea bars come back note for note, at the character's odds, wherever the chords under them repeat. The answer bar is written again each time, since it carries the ending and, in the last unit, the peak.
3. **One peak.** The section's top note sounds once, in its second half. Of the notes there that may move (not an ending, not a returning idea bar), the one whose lift adds the least motion rises to the lowest chord note above the rest. Always lifting the closing bar's first note cost ten points of steps.
4. **Close on home.** A closed ending sounds over the home chord (I or i) where one falls on beat 1 or 3 of the last unit's 2nd to 4th bar, then the lead rests. Where none does (27% of sections), it closes over the nearest chord that does the home chord's job (iii or vi).
5. **Later A sections vary one thing.** Every A with the lead plays the same melody, except the last when another came before it: that one keeps its first unit and changes its ending, to the other closed degree, held a bar longer, or moved an eighth early.

### Arrangement

- **First A:** no lead. When the lead would have entered there, the A ends with two eighths on its last beat, stepping into the lead's first note.
- **B:** sits out half the time, but never when it would be the lead's first section. When it plays, it sits higher than A (by the character's lift) with slower notes.
- **Break:** the lead alone with long gaps, or the keys alone, at even odds.
- **Keys fill the gaps.** In the first bar the lead leaves empty after a phrase, the keys play 2–4 eighths up or down through the chord notes just above the voicing, ending at the bar line. The notes sit above the voicing, so they never strike a note the chord still holds. No fills with the pulse comp, which is busy enough.
- **Echo throws.** On tracks with echo, a phrase's last note sends twice as much to the echo, and the notes inside a phrase and the pickup send half as much. The repeats then fall in the gaps rather than under the next notes.

### Round A as built

Measured by `tools/diagnose.js` (60 plans per station) and checked on other seeds by `test/measures.test.js`:

| Measure | Before | Target | Built |
|---|---|---|---|
| Lead-section bars with no lead note | 5% | 35–55% for each character | sparse 43%, soloist 38%, singable 38%, drifting 35% |
| Idea bars back note for note, where the chords repeat | 34% (bars 5–6) | at least 80% | 90% |
| Sections whose top note sounds once | 31% | at least 90% | 95% |
| Closing notes over the home chord, where the last unit has one | 33% (all sections) | at least 90% | 99% |
| First 4 bars shared by the A sections with the lead | 100% | 100% | 100% |
| Melody moving by step | 71.5% | at least 65% | 68.7% (66% on the test's seeds) |

Round 2's other targets hold: no melody note at or below the keys' top note, and no semitone rub.

**Steps fell short of 70%.** Beats 1 and 3 must be chord notes, a sparse line puts most of its notes there, and neighbouring chord notes lie a third apart. The singable and soloist hooks each carry one leap by design. Three changes won back 15 points from a first 54%: each note is placed from its neighbour rather than from the bar's target, the search counts each bar's own moves, and the peak goes where lifting it moves least. The guard is 65%. Round B's passing and approach notes should raise it; if the lab finds the lines leapy, say so.

The rests are a little under the settings' guesses, because the closing bar moves later to reach the home chord.

Melody scores, median per station:

| Check | Rain Study | Sunday Porch | Last Train | Autumn Field |
|---|---|---|---|---|
| Surprise, bits per note | 2.90 | 2.94 | 3.10 | 2.82 |
| Fit (four-note chord) | 0.94 | 0.93 | 0.93 | 0.91 |
| Bars repeating an earlier bar, at any pitch | 38% | 38% | 29% | 44% |
| Lead bars never heard earlier in the track | 50% | 50% | 67% | 47% |
| Lead-section bars with no lead note | 42% | 37% | 41% | 36% |

The stations now differ where the characters do: Last Train's soloist repeats least, Autumn Field's drifter most.

## 4. The lab check

This is the gate between A and B.

- **Same seed, old and new.** The lab gains a compare mode. The round-2 engine is kept as a git worktree at `engines/melody-2/` (`git worktree add --detach engines/melody-2 d78e304`), which git ignores and the dev server serves. With `?compare=melody-2`, each card is followed by the same seed's round-2 plan, played through today's renderer. Chords, drums, sounds and form match (§2), so the only difference you hear is the melody and when it plays. Each version is rated on its own.
- **Numbers beside your ears.** `tools/diagnose.js` gives before and after for every station and character. `npm run hear` checks that the sections now contrast more. `npm run judge` guards the sound: a drop of 0.5 or more in CE or PQ means something broke.
- **Your call.** Listen to a few tracks per station, old against new. Go, tune the settings, or change course. The ratings you export then set the checks' bands (§1).

## 5. Round B: note language

This starts after the lab check. Starting values:

| Setting | sparse | singable | soloist | drifting |
|---|---|---|---|---|
| Passing notes from | the chord's scale | the chord's scale without its avoid notes (near pentatonic) | the chord's scale, plus chromatic approaches | near pentatonic |
| Half-step approach or enclosure, per target on beat 1 or 3 | 0 | 0.05 | 0.3 | 0 |
| Guide tones at chord changes | as now | as now | 3rd or 7th at 60% of changes; a 7th steps down to the next 3rd | as now |
| Long notes on a tension (9th, 11th, 13th, ♯11) | often | rarely | sometimes | often |
| Pedal: a long note held across a change when the next chord contains it | 0.15 | 0.05 | 0.05 | 0.35 |
| Anticipation: a target an eighth early, held over the barline | 0.1 | 0.25 | 0.25; every target when the keys push | 0.1 |
| Bebop cell (four 8ths, e.g. 5–6–♭7–7) before a cadence | 0 | 0 | 0.2 | 0 |
| On-beat notes late by | 10–20 ms | 0–10 ms | 25–45 ms | 10–20 ms |

- **Timing:** off-beat notes sit within 5 ms of the band's swung grid. The lead swings no more than 0.6, and less than the hats. Each note's offset is fixed when the melody is written and replays on every repeat, the way Dilla's quirks repeat each loop.
- **A walking bass,** for every station that draws `walk`: four quarter notes a bar, with the root on 1, chord notes stepping towards the next root on 2 and 3, and a note leading into the next chord on 4. No pitch repeats across the barline.
- **The critic:** approach notes are exempt from the rub rule when they are an eighth or shorter, off the beat, and resolve by a semitone. Anticipated notes are judged against the chord they anticipate.
- **Expected in the numbers:** the soloist's surprise rises above the other characters'; the singable character's fit and repetition rise; the drifting character's colour share rises.

## Not in this round

- House characters: phase 2, as new rows in §2's table.
- Letting the checks steer or search: once ratings set their bands.
- Like and skip changing the odds: Milestone 3.

## Files

- **Checks:** `src/critic.js`, `src/plan.js` (the engine tag), `src/lab.js`, `tools/diagnose.js`, `tools/render.js`, `tools/hear.py`, and a new `test/scores.test.js`.
- **Round A:** `src/melody.js` (rewritten around units and hooks), `src/plan.js`, `src/form.js`, `src/stations.js`, `src/render.js` (echo throws), `src/lab.js` (compare mode), `tools/diagnose.js`, `test/measures.test.js`, `.gitignore`.
- **Round B:** `src/melody.js`, `src/groove.js` (the walking bass), `src/plan.js` (timing), `src/critic.js`.
- **Docs:** this file. README and DESIGN.md link to it.
