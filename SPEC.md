# lowtide — spec

*Working name. Drafted 26 Sep 2026 from the brainstorm that followed the loficities teardown.*

## Overview

lowtide is a radio that writes its own music and draws its own pictures in the browser. One seed makes one track and the scene that goes with it. Music comes from encoded music rules, not from a list of stock progressions, so tracks differ from the first bar. It starts with lofi, then adds melodic deep house.

The point of the project is variety that still sounds good. Loficities, clawd and loop-band all sound alike at the start of each track; lowtide should not.

## Why other generators sound the same

From reading their code (26 Sep):

- **loficities** hides every per-track choice during the intro. Every intro plays the same FM electric piano, one held chord per bar, under a 900 Hz low-pass and crackle boosted by 4 dB. There are no drums yet, so you can't even hear the tempo. Chords come from 13 hand-written progressions, almost all m9 and maj9, and most start on the tonic. The first voicing always sits around the same register. The city does not affect the music at all.
- **clawd** always opens with a drum count-in. 75% of its intros replay the chorus progression, and I–V–vi–IV dominates that pool. Chords change once a bar, and every phrase is four bars long.
- **Common cause:** a new key is the main thing that changes between tracks, and a new key sounds like the same song. What actually changes the feel is the chords' function, the voicing, the groove, the sound and the form.

## Decisions

| Area | Decision |
|---|---|
| Listening | A radio with light steering. It plays by itself. A few knobs bend what comes next. |
| Engine | The seed plans the whole track up front. A worker renders each section a little ahead of the playhead. |
| Genres | Lofi first. House comes second, as a new set of rules, not a new engine. |
| Structure | Genre knob → stations → tracks. A station is a set of limits on music *and* picture. |
| Sound | Synthesised, plus a small sample kit used with care: texture, some drum hits, vinyl. |
| Quality | A rule-based critic checks each planned track and re-rolls weak or repeated ones before you hear them. |
| Taste | Like and skip shift the odds of the traits that track used. |
| Visuals | Drawn in code as `draw(t, seed, music)`, from the same seed as the track, reacting to the music. Ink print for lofi, aurora glow for house. |
| Audience | Built for the user first; public later, with share-by-seed links. |
| Code | New folder and repo. Start from loop-band's worker renderer and synth code, then let it evolve apart. |

## How a track is made

```
seed ─┬─ station limits ─┐
      │                  ▼
      └──► plan (pure, no audio) ──► critic ──pass──► render sections in worker ──► play
                  │                    │ fail: re-roll with seed+1
                  └──► picture cues ──────────────────────────────► draw(t, seed, music)
```

1. **Plan.** `plan(seed, station)` is a pure function that returns a track plan: key, mode, tempo, groove, palette of sounds, form, and every section's chords, voicings, drum pattern and motif. It returns data, not audio, so it is cheap to test and to check.
2. **Critic.** Checks the plan (see Quality). A failed plan re-rolls with a derived seed.
3. **Render.** Each section renders in a Web Worker a few bars ahead, as in loop-band. Renders are exact for a given seed. Export to WAV comes almost free.
4. **Play and steer.** Knobs change the plan of sections not yet rendered, never the audio already queued.
5. **Picture.** The plan also yields a timeline of cues (section starts, chord changes, beats, melody notes) that the drawing code reads.

**Random streams.** As in loficities and clawd, each part draws from its own seeded stream (`harmony`, `rhythm`, `melody`, `form`, `sound`, `scene`, `title`). A new feature then can't reshuffle old seeds.

## The music rules

### Harmony: a grammar, not a list

Chords are chosen by function:

- **Tonic** {I, iii, vi}
- **Predominant** {ii, IV, iv, ♭VI}
- **Dominant** {V, ♭II7, ♭VII7, vii°}

The base path is T → PD → D → T. On top of that, each rule fires with its own odds:

- Any chord may be preceded by its own V7 or ii–V (secondary dominants).
- V may become ♭II7 (tritone sub).
- IV may become iv (the borrowed "sad" chord, lofi's signature).
- D may become ♭VII7 (backdoor).
- V may resolve to vi (deceptive cadence).
- Loop length is 2, 4 or 8 bars. Harmonic rhythm is ½, 1 or 2 chords a bar.
- Modal vamps (Dorian i9–IV13, Aeolian, Mixolydian) come in as their own grammar.

**Chord quality** is set per function and per station: maj7/maj9 on I and IV, m9/m11 on ii and vi, and 13, 7♭9 or 7sus on dominants.

The same grammar feeds section B through **avoid rules**, so B never reuses A's loop. B can move to the relative key or a chromatic mediant (I → ♭VI).

### Voicing

- Rootless voicings (3‑7‑9, 7‑3‑13), drop‑2, quartal or 6/9 cluster, picked per track.
- The bass takes the root separately.
- Each next voicing is the one that moves the fewest semitones, with a cost on top-voice leaps over a 4th.
- **The first voicing's register is drawn from a range, not fixed.** This is one of loficities' faults.

### Groove

- Tempo comes from the station's range.
- Swing is set per instrument. Kick, snare and hats each get their own offset and swing (54–66%), which gives the loose, Dilla-like feel.
- Timing jitter is Gaussian.
- Ghost snares sit at 20–35% velocity.
- Every 4 or 8 bars the hat pattern changes.
- Drum patterns are built from rules (a kick–snare backbone, then density up to the section's energy), not taken from a fixed grid list.

### Melody

- A 2–4 note motif made of chord tones plus one passing tone.
- It develops by repetition, transposition to fit the next chord, displacement, and call and response.
- It stays sparse (at most half the eighth-note slots) and rests on the 9th, 11th or maj7.

### Form and openings

The intro type is drawn per track, never fixed:

1. Keys alone, filter opening.
2. Drums first, chords enter at bar 5.
3. A room or vinyl bed with a pad swell.
4. A melody pickup into bar 1.
5. Chords played small and far away ("through a phone"), then the band drops in.
6. A cold start on section A.

Forms are templates such as intro–A–A′–B–A″–outro. An energy curve per section sets the layer count, hat density, filter and ghost notes. Fills land at 4, 8 and 16 bar boundaries.

### One standout trait per track

Each track promotes one trait to stand out, so it has a clear identity instead of many small random changes. Examples: heavy tape wobble, a mediant key shift in B, a strong Dilla drag, or a lead in an unusual voice.

### Sound

- **A patch is a set of values drawn from ranges, not a fixed preset.** Examples: electric piano FM ratio and index, detune, tremolo rate, low-pass, and the "tape" chain (wow, flutter, saturation, bit depth, crackle).
- **Drum kits pair with the station's sounds,** so combinations stay coherent.
- **The sample kit** holds a few short, tasteful recordings: vinyl and room noise, a few drum one-shots, maybe one or two instrument hits. Samples are layered and processed by the same seed-driven chain, so they don't make every track sound alike.

### House (phase 2)

A second set of rules, not a fork of the engine:

- four-on-the-floor with the off-beat open hat
- 118–124 BPM, sidechain pump
- one- and two-chord vamps, with the filter carrying the motion

It also includes the flavour of the user's Spotify likes (Azimov, Jabarov, George Kopaliani): harmonic minor and Phrygian dominant scales, plus plucked or reed-like leads.

## Stations

A station is data: a set of limits the seed chooses within. It fixes some traits so tracks feel related, and leaves the rest open so they differ.

```js
{
  id: 'rain-study', genre: 'lofi', name: 'Rain Study',
  music: {
    bpm: [72, 82], modes: { dorian: 2, aeolian: 1, ionian: 1 },
    grammar: { borrowedIv: 0.4, tritoneSub: 0.15, vamp: 0.2 },
    swing: [0.56, 0.62], keys: ['ep', 'felt'], kits: ['dusty', 'brushed'],
    intros: { filtered: 2, bed: 2, phone: 1, drumsFirst: 1 }, tape: [0.3, 0.7],
  },
  picture: { scene: 'window', weather: ['rain', 'drizzle'], hours: [17, 23], palette: 'slate-amber', motion: 0.3 },
}
```

**First stations** (a draft; the limits get tuned by ear in the listening lab):

| Station | Genre | Music | Picture |
|---|---|---|---|
| Rain Study | lofi | 70–78 BPM, minor 7ths, soft electric piano, heavy vinyl | blue and pink inks; rainy harbour; dusk to night; window lights |
| Sunday Porch | lofi | 82–88 BPM, major 9ths, guitar, brushed drums | yellow and orange inks; lake shore; morning to noon; birds |
| Last Train | lofi | ~75 BPM, jazzy ii–V, muted keys | violet and blue inks; edge of a town; night rain; window lights |
| Autumn Field | lofi | ~80 BPM, Dorian, flute-like lead, tape wobble | orange and green inks; rolling hills; dusk wind; birds and leaves |
| Caspian Night | house | 120–122 BPM, Phrygian dominant, oud-like pluck, rolling bass | teal and amber; sea horizon; night stars; rising sparks |
| Silk Road Dusk | house | 118–120 BPM, harmonic minor, duduk-like lead, hand drums | amber and magenta; dunes; dusk to night; lanterns |
| Tbilisi Hills | house | ~122 BPM, Aeolian, strings and arps, long builds | violet and rose; hills with a lit town; fog; window lights |
| Aurora Drive | house | ~124 BPM, bright major lift, plucks | green and blue aurora; lake and forest; clear night; sparks on the drop |

The picture limits each station sets: palette (ink set or hue range), scene kind, weather set, hours, motion (0–1) and characters (birds, lights, lanterns, boats).

## Quality: the critic

It runs on the plan, before any audio exists.

- **Music checks:**
  - melody range under a 12th
  - no melody note a minor 9th against the chord on a strong beat
  - no voicing crossings
  - bass never above the lowest chord tone
  - energy never flat for more than 16 bars
- **Fit check:** every value falls inside the station's limits.
- **Sameness check:** compare with the last N tracks. Reject if the track shares more than 3 major traits with the one before (progression shape, kit, key sound, intro type, tempo within 5 BPM), or has the same intro type as either of the last 2.
- **Mix checks,** after rendering the first section: peak, loudness and silence stay in range.

A **listening lab** dev page renders the first 15 s of 10 seeds side by side. It is the test that the sameness problem is gone.

## Taste

Like and skip adjust the odds of the traits that track used (progression shape, groove, sounds, intro, standout trait), on top of the station's limits. The shift is small and capped so the radio keeps surprising. Stored in the browser to start.

## Picture

- **Contract:** `draw(t, seed, music)`, where `music` is the cue timeline. The same seed gives the same scene.
- **Reactions:**
  - sections → light and weather
  - chords → colour (a borrowed chord cools the scene for a bar)
  - beat → small motion (strong in house, faint in lofi)
  - melody notes → characters: birds, window lights, marks
- **Performance:** static layers are drawn once to offscreen canvases. Each frame redraws only light and moving parts. It must hold 60 fps on a phone.
- **Style: one per genre** (decided 26 Sep, after comparing six styles in `lab/styles.html`).
  - **Lofi → ink print (riso).** Three halftone inks, slightly out of register, blended by multiply. Chords swap the accent ink. The beat nudges the registration by a pixel. Melody notes become birds printed in blue ink.
  - **House → aurora glow.** Additive ribbons and blobs of light, mirrored in water, over dark hills. Chords set the three-colour palette. The beat lifts brightness and wobbles the reflection. Melody notes become rising sparks.
  - **Why not one style or a style per station:** lofi wants warm paper by day, and melodic house wants dark and glowing, so one style would blur the two genres. A style per station multiplies build and testing work, and the product loses one identity.
- **Shared scene layer.** Both styles read the same scene data (sky, hills, water, shore, objects) and the same music cues. Only the drawing differs. A third style later is one new drawing function.
- **Low resolution, scaled up.** Draw at 480×270 and scale up, as loficities does. Bake static layers once per seed and redraw only lit and moving parts each frame.
- **Section names differ by genre.** Lofi sections map to time of day and weather. House sections (intro, build, drop, breakdown) map to energy: light intensity, stars, sparks.
- p5.brush is ruled out as too heavy per frame.

## Steering knobs (first guess)

- **genre:** lofi / house
- **station**
- **energy:** changes the next section's density and filter
- **mood:** tilts the grammar toward borrowed and minor colour, or toward bright major
- **like / skip**

## Milestones

1. **Engine core.**
   - Plan, harmony grammar, voicing, groove, form, critic.
   - Pure functions with tests.
   - The listening lab page renders 10 seeds with loop-band's synths.
2. **Sound.**
   - New electric piano, keys, bass and drum patches with drawn values.
   - Tape chain and sample kit.
   - Levels tool.
3. **Radio.** Endless playback, stations, knobs, like and skip, seed links.
4. **Picture.** The shared scene layer and the ink-print style for the lofi stations, with music cues wired in.
5. **House.** Its own music rules, the aurora style and the house stations.

## Constraints and boundaries

- No ML models, and no image or video generation. Everything is rules and code.
- No pixel art, no cities, no p5.brush.
- No heavy framework. Plain ES modules, as in loop-band.
- The sample kit stays small, used as seasoning, not as the source of the music.
- Not an instrument. Steering stays light; loop-band remains the hands-on playground.

## Open questions

- The exact limits of each station (tuned in the listening lab).
- The source and licence of the sample kit (CC0 packs, or our own recordings).
- The final set of knobs and what each changes.
- Whether taste data should sync across devices.
- The final name.
