# lowtide — hearing the tracks

The plan checks (`tools/diagnose.js`, the critic) test the score: which notes and hits the engine chose. They can't tell whether the rendered audio carries that score to a listener. A melody can be in the right register and still be buried under the chords; a swing can be planned and still sound straight. This round measures the sound itself, with tools that share no code with the engine: librosa and ffmpeg's loudness meter.

What it can't tell is whether a track is lovely. That stays with your ratings. A trained judge (Meta's Audiobox Aesthetics) was tried as a stand-in; it hears sound quality, not music (see below).

## Pipeline

1. **`npm run render -- <station> <seed> [count]`** (or `node tools/render.js --ratings <file>`) renders whole tracks into `renders/`, which git ignores. A station and a seed give the same tracks the lab shows. Each track gets a folder with:
   - `mix.wav`, the track as heard, 44.1 kHz stereo
   - four mono stems at 22.05 kHz: `lead`, `harmony` (keys, pad, bass), `drums`, and `bed` (the surface noise alone). The stems go through the room, the echo and the tape's movement, but skip the saturation, grit and glue, so together they are the mix before those stages.
   - `facts.json`: what the plan says the audio should carry. Tempo, sections with their times and keys, the swing, every note and hit in seconds, and the chords; also the engine that wrote the plan and the critic's melody scores.

   A track takes 7–23 s to render (the felt piano is the slow part); tracks render in parallel. Each takes about 40 MB of disk.
2. **`npm run hear`** measures every track in `renders/`, prints a report and writes `renders/report.json`. `python3 tools/hear.py <folders>` measures some of them.
   - `--json` prints the measures.
   - `--ratings <file>` sets the measures of liked tracks beside those of disliked ones, largest gap first. The critic's melody scores (surprise, fit, repetition; see [MELODY.md](MELODY.md)) join them as `plan.*`, read from `facts.json`.
   - It exits with 1 if any track fails a check, so it can gate a change to the engine.

## What it measures

| Check | How | ok | warn | fail |
|---|---|---|---|---|
| **Pulse** | librosa's tempo estimate, blind to the plan, should be the planned tempo, its double or its half. **Pulse clarity** (as in MIRtoolbox): how strongly the onsets repeat at the planned beat, i.e. their autocorrelation at that lag over the value at lag 0, in the sections with drums. | tempo found; clarity ≥ 0.4 | the tempo found is the swing heard as the beat (the planned tempo over the long or short half of a swung pair), or 3:2; clarity ≥ 0.25 | any other tempo; clarity lower |
| **Notes** | Chroma of the lead and harmony stems. The share of it on pitch classes the plan has sounding at that moment, counting a quarter second of ring after each note, in the section where it is lowest. This catches pitch bugs and smear. It doesn't punish a tritone sub or a coloured chord, because the plan has those notes sounding. | ≥ 70% | ≥ 55% | lower |
| **Swing** | Onsets in the drum stem at 3 ms resolution, folded onto the planned swing pairs. The median place of the off-beat notes, less the median place of the on-beat notes, is the swing as heard; the planned hits go through the same sum. | within 0.03 of the plan | within 0.06, or under 0.54 (sounds straight) | further off |
| **Melody** | Mel spectra of the lead stem and of everything else, while the lead plays: the share of the lead's energy in cells where it is louder than everything else. The lead's level against the rest, in dB, is shown too. | ≥ 50% audible | ≥ 30% | lower |
| **Sections** | Per section: loudness (the mean of the meter's momentary readings), brightness (spectral centroid), busyness (onsets per second) and harmony (mean chroma). B should differ from A by 1.5 LU, a brightness ratio of 1.15, a busyness ratio of 1.25, or a chroma cosine of 0.9 or less. The intro and outro should sit at least 1 LU below A. | both hold | either fails | — |
| **Mix** | ffmpeg's EBU R128 meter: integrated loudness, loudness range, true peak. From the spectrum: energy in five bands (low < 120 Hz, low-mid to 500 Hz where mud lives, mid to 2 kHz, presence to 6 kHz where harshness lives, air above), and the tilt in dB per octave (pink noise is −3). Stereo correlation. | −20 to −12 LUFS; peak ≤ −0.5 dBTP; correlation ≥ 0.2 | −23 to −9 LUFS; peak ≤ 0; correlation ≥ 0; low-mid or presence 3 dB above the station's median (three or more tracks) | outside those |

**Where the harmony centres** is reported, not graded. The chroma of the A sections is matched against the 24 Krumhansl–Kessler key profiles. Each profile also gets the fifth above each note, the way real instruments sound it (Gómez 2006); without that, key-finding drifts to the key a fifth up. A loop that never plays its I chord can centre elsewhere, which is the music, not a fault.

The limits are first guesses, set against synthetic sound and the first 30 tracks. Once there are ratings, `--ratings` shows which measures separate liked tracks from disliked ones, and the limits move to match.

## First results (26 Sep 2026, 30 tracks)

Batches with seed 2026: ten each from Last Train and Sunday Porch, five each from Rain Study and Autumn Field.

- **The audio carries the plan.** The tempo tracker finds the planned tempo, or its double, in 28 of 30 tracks. In the other two it locks onto the long half of the swung pair (115 for 73 bpm at a swing of 0.64). Heard swing is within 0.03 of the plan in every track. 72–90% of the chroma sits on planned notes.
- **The melody is never masked.** 96–100% of the lead is audible in every track, at −7.6 to +1.7 dB against the rest. Kalimba leads sit lowest.
- **The harmony often centres away from the planned key**: 12 of 30 tracks centre on it. Loops such as ii–IV, or V7♭9–♭III, never play the I chord.
- **B doesn't lift.** B is planned at energy 0.75 against A's 0.5–0.62, yet it lands between −1.7 and +2.1 LU of A (median +0.2), and 12 of 30 B sections are quieter than A. B differs from A mostly in harmony.
- **The "bed" intro is too loud.** All three are as loud as A or louder (+0.2 to +1.8 LU). Every other intro type sits 1–8 LU below A.
- **Mixes are dark and narrow.** Tilt is −5.9 to −9.0 dB per octave (median −7.8). Stereo correlation is 0.85–0.99, and 13 tracks are at 0.95 or above, close to mono. Loudness is −17.3 to −14.2 LUFS, with 3.9–6.6 dB of peak headroom.

## The trained judge

**`npm run judge`** scores every track in `renders/` with Audiobox Aesthetics (Meta, 2025), a model trained on people's ratings of speech, sound and music. It gives four scores from 1 to 10: CE (content enjoyment), CU (content usefulness), PC (production complexity) and PQ (production quality). It hears 10-second windows; the track's score is their mean. Scores go to `renders/judge.json`, and `hear.py --ratings` sets them beside the other measures.

On the 30 tracks, CE runs from 5.07 to 7.38. The two tracks rated liked so far score 6.77 and 6.54.

**It hears the sound, not the music.** Six tracks were damaged on purpose and scored again. The mean change in CE, and how many of the six dropped:

| Damage | CE | dropped |
|---|---|---|
| lead an octave up | −0.04 | 2 |
| lead a semitone off (wrong notes) | −0.10 | 5 |
| lead a quarter tone off (out of tune) | −0.08 | 5 |
| lead removed | −0.08 | 4 |
| beats shuffled | −0.35 | 5 |
| low-passed at 800 Hz | −0.50 | 6 |
| hiss 20 dB under the music | −0.94 | 6 |
| clipped | −1.59 | 6 |

Wrong notes cost a tenth of a point; clipping costs a point and a half. PQ moves the same way. Across the 30 tracks, CE falls as the texture layer grows (Spearman −0.46) and PQ falls with tape wear (−0.42), so the judge marks down the dust and hiss that lofi wants.

So the judge can't steer the notes. It can guard the sound: a change to the engine that drops CE or PQ by half a point or more has likely broken the mix. Whether it agrees with your taste needs more ratings, with dislikes among them.

## Tests

`npm run test:hear` (19 tests, 4 s) checks each measure on synthetic sound with a known answer:
- a click track at a known tempo
- a steady swung kit against the same number of hits at random times
- a progression played in tune against one a semitone off
- a progression whose third partials would pull a plain key-finder a fifth up
- hi-hats swung by a known amount under a late kit, and straight ones
- a melody 20 dB above the noise in its band, and 14 dB under it
- sections with and without contrast, and a B twice as loud as A (+6.02 LU)
- a known gain step for the loudness meter, readings aligned in time, the true peak of a half-scale sine
- the tilt and band shares of white and pink noise

Each test was checked against a deliberate bug in the measure it covers, and failed as it should.
