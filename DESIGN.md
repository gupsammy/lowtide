# lowtide — design, round 2

This round covers Milestone 2 (the sound) and three changes agreed after measuring Milestone 1: fixes for what the measurements showed, a new melody engine, and ratings in the listening lab. [SPEC.md](SPEC.md) holds the product decisions; this file says how they are built.

**Status:** built, and every target below is met. Where the build departed from the first draft of this file, the text now describes the build.

Later rounds, agreed but not started: the **flip** (chop and resequence a rendered phrase), **bass lines with inversions**, and **call and response with arrangement moments** (drop-outs, tape stops, reverse swells). **Search with a musicality score** waits until the lab has ratings to check it against.

## What must change, in numbers

Measured over 240 plans (60 per station) with `tools/diagnose.js`. "Target" is what this round had to reach; "Now" is the build, measured the same way. `test/measures.test.js` checks the targets again on 160 other seeds, so the build can't pass by fitting one sample.

| Measure | Before | Target | Now |
|---|---|---|---|
| Hi-hats on swung positions | 9% | at least 35% | 40.5% |
| Bass notes that follow the kick, off the kick's swung time | all of them | none | none |
| Melody notes at or below the chords' top note | 28% | 0% | 0% |
| Melody notes a semitone above a sounding chord note | 18% (any rub) | 0% on the beat | 0% anywhere |
| Melody shared by two A sections | 64% | at least 95% | 100% |
| Drum hits shared by bar n and bar n+2 (outside variation bars) | 79% | 100% | 100% |
| Melody moving by step (≤ 2 semitones) | 56% | at least 70% | 71.5% |
| In-key chords with a colour note outside the mode | 11% | 0% | 0% |
| Keys velocity spread within a track | 0.05 | at least 0.1 | 0.107 |

## 1. Feel: swing and pocket

- **One swing map for every part.** Each track picks a swing grid: 8th or 16th. `swingBeat(beat, amount, grid)` moves any straight position onto the swung timeline: the first half of each pair stretches to `amount`, and the second half shrinks to fit. Drums, bass, keys and melody all go through it, so the bass lands with the kick.
- **Hats follow the grid.** On a 16th grid, hat patterns include soft odd 16ths, so the swing is audible. On an 8th grid, the 8th off-beats carry it.
- **Pocket.** Every part gets a fixed lag in milliseconds plus Gaussian jitter:
  - keys 8–22 ms late
  - bass 0–10 ms behind the kick
  - melody 4–16 ms late
  - kick −5 to +2 ms
  - snare 6–18 ms late

  The jitter's size (3–7 ms) is drawn per track. The "drag" standout trait pulls the kick 6–12 ms early, pushes the snare to 22–32 ms late and holds the keys back 12 ms more.

## 2. Chord colour from the scale

Each chord has a governing scale:

- **Diatonic chords:** the section's mode.
- **Harmonic-minor V:** Phrygian dominant.
- **Tritone subs and backdoor ♭VII7:** Lydian dominant.
- **Secondary dominants:** Mixolydian, or Mixolydian ♭9 ♭13 when the target chord is minor.
- **Borrowed iv and ♭VI:** the parallel minor.

A colour note (9th, 11th, 13th) is allowed only if that scale contains it. Each chord draws its own colour, weighted towards the track's colour and sometimes taking the one beside it. It then takes the first quality in its colour's list that fits its scale. The result: every colour is in key by construction, and chords within one track differ.

## 3. Register and dynamics

- **The melody owns a band** from `lead − 5` to `lead + 7` semitones. **Chord voicings stay below `lead − 6`** in every section, so the two never overlap.
- **No semitone rub on the beat.** The melody never takes a note a semitone above a note sounding in the chord voicing (for example, the root over a major-7th voicing).
- **Voicing balance:**
  - top note ×1.25
  - lowest note ×0.9
  - inner notes ×0.8
- **Comping velocity** follows section energy, accents the first hit of each two-bar cycle, and varies by about 8% from hit to hit.
- **Melody velocity** rises with pitch, so peaks sound like peaks.

## 4. Repetition

- **Drums.** Each section type (intro, A, B, break) gets one two-bar pattern: the kick, snare, ghost notes and hat layer, fixed once. Bars 4 and 8 carry a small variation. A section's last bar carries a fill when drums continue after it. A later A section reuses A's pattern, and more energy only adds hat density.
- **Chords.** Voicings are fixed per section type too, like a looped sample, so a repeated section is the same loop.
- **Melody.** Written once per section type and reused whole. A "pickup" intro previews the opening bars of A's melody.
- **Keys comping.** Section B may take a second comping style, for contrast.

## 5. Melody v2

A melody is built skeleton first, then decorated. That order is what makes it sound intended.

1. **The idea** (one per section type): a one-bar rhythm of 2–4 notes in 8th slots, mostly starting on the downbeat, and a shape in scale steps. The shape is mostly steps, falling a little more often than rising, turns back after any leap, and spans at most 4 steps.
2. **The phrase form** (one per song), bar by bar:
   - sentence: idea · idea · fragment · cadence
   - period: idea · open cadence · idea · closed cadence
   - `aaba`: idea · idea · contrast · cadence
   - call: idea · rest · idea · cadence

   In an 8-bar section, the first phrase ends open (on degree 2, 5 or 7) and the second ends closed (on degree 1 or 3).
3. **The skeleton.** Each bar's first note is a target: a note of the chord sounding under it, inside the band, and free of any rub against the voicing. A small dynamic-programming search picks the targets for the whole phrase. It minimises:
   - the size of the move between targets (steps are cheapest)
   - distance from an arch that peaks about two-thirds of the way through
   - a missed guide tone, i.e. not taking the new chord's 3rd or 7th when the chord changes
   - failing the cadence set in the final bar

   Small random weights keep seeds apart.
4. **The decoration.** The remaining notes follow the idea's shape in scale steps from the target. A note on beat 1 or 3 that isn't in the chord steps along its own direction of motion to the nearest chord note, instead of jumping to whichever chord note is closest. A weak note that rubs moves a step.
5. **Fragment bars** state the idea's first half twice, the second time a step lower (the speed-up in a sentence). **Cadence bars** hold the cadence note from beat 1, with a pickup when there's room.

## 6. Sound

### Signal flow

```
per section (worker, can run in parallel)
  keys ─► chorus (electric piano) ─► sweep (intro) ─┐
  bass, lead, pad ──────────────────────────────────┴─► duck under kick ─┐
  drums (sampler) ───────────────────────────────────────────────────────┴─► dry, reverb send, echo send
  then phone and fade, when the section has them, on all three

joined stream (the deck, one unbroken pass, stateful)
  echo send ─► ping-pong tape echo ─┬─────────────► mix
                                    └─► reverb send
  reverb send ─► 8-line feedback-delay reverb ─────► mix
  dry ──────────────────────────────────────────────► mix
  ocean-drum bed (some tracks) ─────────────────────► mix
  mix ─► head bump ─► saturation ─► wow/flutter ─► roll-off ─► hiss ─► grit ─► vinyl ─► glue compressor ─► soft clip
```

Linear effects (chorus, filters, ducking) can run per section, because each is tied to absolute time and linear effects add up. Anything nonlinear (saturation, compression, clipping, crush) runs in the deck, over one unbroken stream. The deck processes any chunk sizes in order and gives the same result as one pass. The radio in Milestone 3 feeds it section by section.

### The deck, per track (drawn from station ranges)

- **Reverb:**
  - 8 delay lines mixed by a Householder matrix
  - line gains set by the decay time (T60 1.2–3 s)
  - one-pole damping in each line
  - 10–35 ms pre-delay
  - 150 Hz high-pass on the input
  - odd lines to the left, even lines to the right
- **Echo:**
  - ping-pong
  - dotted 8th or quarter note, from the tempo
  - feedback 0.25–0.5
  - high-pass and low-pass filters in the loop
  - 40% of the echo also goes to the reverb
- **Tape:**
  - wow of 3–11 cents at 0.3–0.9 Hz
  - flutter of 0.5–2.5 cents at 6–11 Hz
  - slow random drift
  - all three through a Hermite-interpolated delay; depth in ms comes from cents
  - asymmetric tanh saturation
  - +1.5 to +3 dB head bump at about 100 Hz
  - roll-off at 12 kHz − 6 kHz × tape
  - a little hiss, louder on more worn tape
- **Grit (some tracks only):**
  - sample-and-hold at 16–24 kHz
  - 10–14 bit quantising
- **Vinyl:**
  - crackle as random clicks through a band-pass, plus rare low pops
  - surface noise that swells with the record's 33⅓ rpm turn
  - rumble
  - the "bed" intro raises it 6 dB until section A starts
- **Texture (some tracks only):** the ocean-drum recording, looped with a long crossfade, low-passed at 4.5 kHz, the right side half a loop behind the left so the bed sounds wide.
- **Glue:** stereo-linked RMS compressor, 2:1 above −18 dBFS, 15 ms attack, 200 ms release, 2 dB make-up gain, then a tanh soft clip at −0.9 dBFS.

### Loudness

`src/meter.js` measures loudness in LUFS, as BS.1770 defines it. BS.1770 publishes its weighting filter only for 48 kHz, so the meter derives the filter for any rate with the formulas libebur128 uses. The mix level into the deck (`MASTER` in `render.js`) is set so openings measure about −16 LUFS.

### Instruments

| Part | Choices |
|---|---|
| Keys | FM electric piano (velocity "bark", ±3 cent detune per note, chorus on the bus), felt piano (two detuned strings per note, hammer noise, brightness from velocity), sampled upright piano |
| Lead | sampled vibraphone, sampled kalimba, FM bell, soft synth |
| Bass | round (sine and triangle, low-pass, light drive), upright (plucked string, sine under it) |
| Drums | a sampler kit per track: two synth kicks, and sampled snares, rim, soft snare taps for ghost notes, claps, hats and shakers, with round-robin variants. A dusty kit is pitched down 1–4 semitones, low-passed at 4.5–7.5 kHz and cut to 10–12 bits, like an old sampler; a tight kit stays close to the recordings and doubles loud backbeats with a clap |
| Texture | ocean drum as a rain or surf bed, on some tracks |

### The sample kit

- **Source:** VCSL, CC0 (public domain). The raw files live outside the repo. `node tools/kit.js <raw dir>` converts them with ffmpeg:
  - raises each file so its peak sits at −1 dBFS, so quiet recordings survive the trim
  - trims the silence before each attack, cuts the tail and fades it
  - writes mono 22.05 kHz 16-bit WAV
  - measures each pitched sample's tuning in cents, since some kalimba tines sit 20–40 cents off true
  - measures each pitched sample's loudness, so every note of an instrument plays at one level
- **What goes in `samples/`** (50 files, 4.8 MB):
  - upright piano: C and G from MIDI 48 to 91. VCSL names middle C (MIDI 60) "C3".
  - soft vibraphone, MIDI 53–88
  - kalimba, MIDI 59–83
  - hi-hats (closed, pedal and open)
  - small shaker
  - claps
  - snares, a rim click and a soft snare tap
  - one ocean-drum texture
- **Manifest:** `samples/kit.json` lists each file's instrument, pitch, length, tuning and loudness.
- **Loading:** `src/wav.js` parses WAV in plain JS, so the browser worker and the Node tests read samples the same way.
- **Pitched notes:** the nearest sample (the lower one on a tie) is resampled with cubic interpolation and corrected by its measured tuning. The kit covers every note the plans ask for (the piano's voicings reach down to MIDI 50), so no note shifts more than 3 semitones.

## 7. Ratings in the lab

- **Rating a track:** each card gets 👍, 👎 and tags: *lovely*, *stiff*, *muddy*, *samey*, *busy*, *boring*. Pressing a button again takes it back.
- **What's saved:** each rating goes to `localStorage` with the station, seed, title, traits and opening. Rating the same track again replaces the old rating.
- **Getting the data out:** an Export button saves `lowtide-ratings-<date>.json`. When you listen in the app's browser pane, I can read the ratings directly.

## 8. Tests this round adds

- **Plan measures:** each target in the table above is checked over 160 plans.
- **Critic:** it flags a melody note that sinks into the chord or grinds against it.
- **Deck:** processing in random chunk sizes gives the same samples as one pass.
- **Wow:** the pitch deviation on a sine matches the configured cents.
- **Reverb:** its decay time matches T60.
- **Echo:** the repeats land on the tempo-synced time and alternate sides, each quieter by the feedback ratio.
- **Soft clip:** peaks stay under −0.9 dBFS however hard the input.
- **Sampled instruments:** piano, vibraphone and kalimba play the requested pitch within 5 cents, between samples, below the lowest and on off-tune tines. This checks the resampling ratio and the tuning correction.
- **Kit:** the same seed gives the same kit, and different seeds give different kicks.
- **Ducking:** the keys dip after each kick and not before it.
- **Loudness:** openings measure −20 to −12 LUFS with peaks below −0.5 dBFS.
- **Variety:** consecutive openings differ in loudness shape or brightness, measured on the audio.

## 9. Files

- **New:**
  - `src/deck.js`
  - `src/sampler.js`
  - `src/wav.js`
  - `src/meter.js` (loudness, BS.1770)
  - `tools/kit.js`
  - `tools/diagnose.js`
  - `tools/disk.js` (reads `samples/` in Node)
  - `test/deck.test.js`
  - `test/measures.test.js`
  - `samples/`
- **Rewritten:**
  - `src/melody.js`
  - `src/plan.js`
  - `src/render.js`
  - `test/sound.test.js`
- **Changed:**
  - `src/critic.js`
  - `src/groove.js`
  - `src/harmony.js`
  - `src/voicing.js`
  - `src/stations.js`
  - `src/synth/voices.js`
  - `src/lab.js`, `src/lab-worker.js`, `lab/listen.html`
  - `tools/openings.js` (now prints loudness and peak, so no separate levels tool)
- **Removed:** `src/synth/drums.js`; the sampler builds the kit now.
