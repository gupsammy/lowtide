# What the riff, bass and drums play in twelve hit lofi tracks

Research for lowtide, 27 September 2026. `viral-lofi.md` guessed that in hit lofi one riff plays nearly the whole track, and a chroma measure (`tools/study.py`) backed it: 45–89% of bars repeat the loop, against 24–43% in our renders. This brief splits each track into parts and writes the tonal parts out as notes, to see what the riff, bass and drums actually play.

## How

- **Split.** Meta's Demucs (`htdemucs`) splits each track into drums, bass, other and vocals. On the M3 Pro's GPU (MPS) a track takes 7–20 s, about a tenth of its length.
- **Notes.** Spotify's basic-pitch (CoreML build, no TensorFlow) turns the bass and other stems into notes, in 1–4 s a stem.
- **Measure.** `tools/stems.py` finds the beat on the drum stem, snaps notes to 16ths and compares each bar with the bar one loop earlier. The *riff* is the top note on each 16th of the other stem. For our plans it is the top note of keys, pad and lead.
- **Check against truth.** Transcription is noisy, so I split four of our own renders the same way and laid their plans on the same grid. That gave a known answer for about 360 bar pairs. What the check showed:
  - Tempo came out within 0.3 bpm, the downbeat was right on all four, and swing matched to 0.01.
  - Transcription adds 2–3 top-line notes a bar and doubles drum hits (ours: 3 riff notes and 14 drum hits a bar in the plan, 6 and 28 after splitting).
  - So a bar counts as a repeat when a smeared (pitch class × 16th) fingerprint matches closely enough. The cut-off is fitted on our renders, and each share is then corrected for the test's error rates. The test is near perfect for bass (catches 100% of true repeats, 3% false alarms) and good for the riff (88% and 23%). It is poor for drums (71% and 32%).
  - Station medians come out close (our split renders read 20% riff repeats against a true 26%). A single track can be 25 points off.
- **Likeness** is the median fingerprint match at the loop length (0 to 1). It needs no cut-off, so it backs up the repeat shares.

## Per station

Columns: *riff notes/bar* and *drum hits/bar* are raw counts after splitting, so read them against the "ours, split" row, not the plan row. *Range* is the 5th to 95th percentile, in semitones. *Loop bars* is the lag at which bars match best. *Repeats* is the share of playing bars that repeat the bar one loop earlier: the same pitch classes, each onset within a 16th. *Variants* counts loop versions heard at least twice, and *main variant* is the share of loops the commonest one covers. *Swing* is where the off-beat 8th lands: 0.50 is straight, 0.67 is triplet. *dB* is each stem's level against the mix; in plan rows, *other* is the harmony stem (keys, pad and bass), and the lead sits at −8 dB.

### rain

| track | bpm | riff notes/bar | riff range | loop bars | likeness | riff repeats | variants | main variant | bass notes/bar | bass repeats | bass on 1 | drum hits/bar | drum repeats | swing | dB other | dB bass | dB drums | dB vocals |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| closing-my-eyes | 67 | 3 | 19 | 4 | 0.43 | 53% | 2 | 29% | 2 | 38% | 7% | 19 | 29% | 0.51 | -9 | -58 | -1 | -17 |
| lee-rain | 88 | 7 | 24 | 4 | 0.65 | 82% | 4 | 33% | 3 | 88% | 28% | 21 | 61% | 0.59 | -6 | -10 | -2 | -23 |
| snowman | 110 | 7 | 29 | 1 | 0.28 | 32% | 8 | 22% | 1 | 55% | 18% | 12 | 4% | 0.54 | -7 | -2 | -8 | -42 |
| **median, refs** | 88 | 7 | 24 | 4 | 0.43 | 53% | 4 | 29% | 2 | 55% | 18% | 19 | 29% | 0.54 | -7 | -10 | -2 | -23 |
| ours 734895756, split | 70 | 6 | 22 | 1 | 0.24 | 14% | 6 | 32% | 1 | 45% | 80% | 32 | 59% | 0.50 | -5 | -9 | -2 | -46 |
| ours, plan (n=5) | 74 | 2 | 16 | 4 | 0.19 | 30% | 2 | 22% | 1 | 52% | 100% | 18 | 44% | 0.50 | -4 | – | -1 | – |

### sunday

| track | bpm | riff notes/bar | riff range | loop bars | likeness | riff repeats | variants | main variant | bass notes/bar | bass repeats | bass on 1 | drum hits/bar | drum repeats | swing | dB other | dB bass | dB drums | dB vocals |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| affection | 83 | – | – | – | – | – | – | – | 1 | 18% | 16% | 22 | 0% | 0.55 | -6 | -9 | -2 | -20 |
| oops | 69 | 10 | 39 | 4 | 0.81 | 100% | 2 | 75% | 2 | 100% | 9% | 26 | 56% | 0.51 | -7 | -9 | -2 | -19 |
| soulful | 88 | 9 | 23 | 4 | 0.48 | 78% | 1 | 47% | 3 | 71% | 24% | 23 | 2% | 0.54 | -4 | -6 | -5 | -54 |
| **median, refs** | 83 | 10 | 31 | 4 | 0.64 | 89% | 2 | 61% | 2 | 71% | 16% | 23 | 2% | 0.54 | -6 | -9 | -2 | -20 |
| ours 701340518, split | 83 | 5 | 22 | 4 | 0.26 | 25% | 2 | 25% | 1 | 37% | 51% | 25 | 18% | 0.60 | -8 | -7 | -2 | -54 |
| ours, plan (n=10) | 85 | 3 | 16 | 4 | 0.32 | 27% | 2 | 22% | 2 | 52% | 46% | 14 | 28% | 0.59 | -4 | – | -0 | – |

### train

| track | bpm | riff notes/bar | riff range | loop bars | likeness | riff repeats | variants | main variant | bass notes/bar | bass repeats | bass on 1 | drum hits/bar | drum repeats | swing | dB other | dB bass | dB drums | dB vocals |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| aruarian-dance | 99 | 12 | 32 | 2 | 0.52 | 48% | 6 | 53% | 5 | 51% | 10% | 22 | 72% | 0.51 | -5 | -11 | -3 | -62 |
| feather | 91 | 6 | 19 | 2 | 0.77 | 100% | 1 | 93% | 3 | 98% | 27% | 29 | 100% | 0.49 | -5 | -5 | -8 | -12 |
| lady-brown | 99 | 12 | 21 | 8 | 0.62 | 48% | 3 | 40% | 7 | 59% | 13% | 33 | 100% | 0.48 | -6 | -7 | -5 | -8 |
| **median, refs** | 99 | 12 | 21 | 2 | 0.62 | 48% | 3 | 53% | 5 | 59% | 13% | 29 | 100% | 0.49 | -5 | -7 | -5 | -12 |
| ours 667785280, split | 73 | 5 | 21 | 1 | 0.23 | 29% | 7 | 25% | 2 | 26% | 24% | 30 | 10% | 0.50 | -7 | -5 | -3 | -57 |
| ours, plan (n=10) | 76 | 3 | 14 | 2 | 0.34 | 18% | 7 | 21% | 2 | 45% | 36% | 14 | 3% | 0.55 | -4 | – | -1 | – |

### autumn

| track | bpm | riff notes/bar | riff range | loop bars | likeness | riff repeats | variants | main variant | bass notes/bar | bass repeats | bass on 1 | drum hits/bar | drum repeats | swing | dB other | dB bass | dB drums | dB vocals |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| kingdom-in-blue | 78 | 13 | 28 | 8 | 0.62 | 100% | 1 | 100% | 1 | 34% | 35% | 25 | 21% | 0.57 | -5 | -6 | -3 | -29 |
| nagashi | 86 | 8 | 21 | 4 | 0.84 | 100% | 1 | 100% | 1 | 23% | 20% | 23 | 9% | 0.55 | -4 | -9 | -3 | -55 |
| snowfall | 96 | 5 | 16 | 8 | 0.55 | 93% | 1 | 40% | 1 | 75% | 26% | – | – | – | -6 | -1 | -54 | -61 |
| **median, refs** | 86 | 8 | 21 | 8 | 0.62 | 100% | 1 | 100% | 1 | 34% | 26% | 24 | 15% | 0.56 | -5 | -6 | -3 | -55 |
| ours 768450994, split | 82 | 6 | 24 | 2 | 0.14 | 14% | 6 | 25% | 3 | 62% | 19% | 25 | 27% | 0.60 | -5 | -6 | -4 | -56 |
| ours, plan (n=5) | 82 | 2 | 12 | 4 | 0.38 | 31% | 2 | 26% | 2 | 58% | 33% | 13 | 38% | 0.61 | -4 | – | -0 | – |

## All stations

| source | bpm | riff notes/bar | riff range | loop bars | likeness | riff repeats | variants | main variant | whole-stem repeats | bass notes/bar | bass repeats | bass on 1 | drum hits/bar | drum repeats | swing | dB other | dB bass | dB drums | dB vocals |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| references (n=12) | 88 | 8 | 23 | 4 | 0.62 | 82% | 2 | 47% | 61% | 2 | 57% | 19% | 23 | 29% | 0.54 | -6 | -8 | -3 | -26 |
| ours, split the same way (n=4) | 77 | 6 | 22 | 2 | 0.24 | 20% | 6 | 25% | 16% | 1 | 41% | 37% | 28 | 23% | 0.55 | -6 | -7 | -3 | -55 |
| ours, plan truth (n=30) | 78 | 3 | 15 | 4 | 0.33 | 26% | 2 | 22% | 19% | 2 | 52% | 39% | 14 | 28% | 0.59 | -4 | – | -1 | – |

*Whole-stem repeats* runs the same test on every note in the other stem, not just the top line. For our plans, 46% of bass notes fall on the chord root.

## What should change

- **Play the riff the same way almost every time.** In the references a median 82% of bars repeat the riff exactly, against 26% in our plans. Likeness gives the same answer without a cut-off: 0.62 against 0.24 through the same process. Sunday and autumn run at 89–100%; rain and train at about 50%, with the lower figures coming from *Snowman* (a piano piece) and the sample-switching Nujabes tracks. So the riff should repeat verbatim in at least three bars of four, and the track should change by adding and dropping parts, not by rewriting the riff's notes.
- **One main version, one alternate.** The references have one to three versions of the loop (median 2), and the main one fills about half of all loops (all of them in autumn). Ours has as many versions that come back (median 2), but most of its loops are one-offs, so the main version fills only 22%. Build A and A′, and give A at least 60% of loops.
- **Make the riff a 2–4 bar phrase.** Loops match best at 4 bars (train 2, autumn 8), not the 1–2 bars `viral-lofi.md` assumed. Tempos agree with published figures for all eight tracks that have one, so this is not a doubled beat. Our plans already loop at 4 bars; the gap is in how exactly the loop comes back.
- **Busier riff, same range.** The references' top line has about 8 notes a bar after splitting, against our 6 after splitting. Take off the 2–3 that transcription adds and that is 5–6 a bar, 9 on train, against our 2–3. Range is the same (23 against 22 semitones after splitting). Aim for 4–8 riff notes a bar (rain at the low end, train at the top) inside the range we use now.
- **Move the bass off beat 1.** Bass density (2 notes a bar) and repetition (57% against our 52%) match, so the bass is not the gap. Placement is. Only 19% of the references' bass notes land on beat 1, and about a third (median 36%) on any quarter beat. Ours put 39% on beat 1, and 67% on quarter beats (rain: every note on beat 1). Write more anticipations (the "and" of 4 into the next bar) and 8th-note pickups, and drop rain's whole-note-on-1 pattern.
- **Lighter swing and fewer drum hits.** The references swing at 0.54 (0.48–0.59; the Nujabes tracks run straight 8ths), while sunday and autumn plans use 0.59–0.61. Rain's references show 19 drum hits a bar after splitting against our 32, which is about 10 real hits against our 18. Other stations are close. Set swing to 0.52–0.57 and thin rain's kit. Keep drums as one fixed loop: the two Nujabes tracks read 100% drum repeats, which fits the one-loop story from `viral-lofi.md`, but the drum repeat test is too weak to set a target from.
- **The riff is loud enough; what it plays is the problem.** The other stem sits at −6 dB against the mix in both the references and our split renders, bass at −8 and −7, drums at −3 and −3. Levels need no change. Half the references carry a voice-like layer between −8 and −23 dB: rap on *Feather* and *Lady Brown*, samples on *i'm closing my eyes*, *[oops]*, *Affection* and *Lee Rain*. Demucs's vocal stem also catches lead instruments, so treat that count as an upper bound.

## Limits

- **Transcription.** Basic-pitch adds notes and octave errors: our split renders show 2–3 extra top-line notes a bar and 7 extra semitones of range. It failed on *Affection*'s harp (117 confident notes in 41 bars), so that track has no riff figures. A lower onset threshold finds 680 notes and would be worth a rerun.
- **The fitted test.** The riff cut-off rests on 4 renders and about 40 true repeats. The correction assumes the references' error rates match our renders'. Dusty samples probably blur more, which would push their true repeat shares higher, not lower. Trust station medians, not single tracks.
- **Beats.** Beat tracking can lock onto double or half time; here all eight known tempos match. The downbeat guess (strong kick, weak snare, chord change) was right on all four of our renders. It is likely one beat off on *i'm closing my eyes*, where 37% of bass notes sit on another beat, which lowers that track's "bass on 1". *Snowfall* has no drums (−54 dB), so its beat comes from the mix and it has no drum figures.
- **Chord roots** can't be read from the split: lowtide's rootless voicings fooled a chord-template guess, which read 0–19% on our renders where the plan says about 46%. The tables give "bass on 1" instead.
- **Drum repeats** are shown but weak (the test misses 29% of true repeats and calls 32% of non-repeats repeats).
- **Few tracks.** Three references a station; one split render a station. Our 30 plans are the renders in `renders/` today.

## Rerun

```
# split (Demucs 4.1, weights from Hugging Face adefossez/HTDemucs, ~80 MB) and transcribe (basic-pitch 0.4, CoreML)
uv run --no-project --python 3.11 --with demucs --with soundfile python tools/split.py mps downloads/refs/*.wav renders/{rain-study-734895756,last-train-667785280,sunday-porch-701340518,autumn-field-768450994}/mix.wav
uv run --no-project --python 3.11 --with basic-pitch --with 'setuptools<81' python tools/transcribe.py downloads/stems/*/
python3 tools/stems.py downloads/stems/*/ renders/*/ --json downloads/stems/stems.json
```

The stems take 1.7 GB, so they aren't kept; the three commands rebuild them in a few minutes.
