# lowtide — guitar

`research/moods.md` found that guitar is what most of the user's reference moods share: it plays in 50–100% of bars in six of nine groups. Lowtide has none. The references' tune is also busier and wider than ours: about 8 notes a bar over two octaves, against our 5 within one.

**Agreed:**

- Guitar first, before the mood stations.
- Real samples, not a synthesized string.

## 1. The samples

Two CC0 guitars from FreePats (freepats.zenvoid.org):

| Sound | Source | Notes kept |
|---|---|---|
| `nylon` | Spanish classical guitar, 2019 | E2 A2 D3 G3 B3 E4 A4 D5 G5 C6 |
| `jazz` | Fender electric through a clean jazz amp, 2026 | F2 A2 C3 E3 G3 B3 E4 G4 B4 D5 G♯5 |

- `tools/kit.js` builds them as it builds the VCSL sounds: mono, 22.05 kHz, 3 seconds, tuned and levelled.
- It now rebuilds only the sounds it finds raw files for, and keeps the rest of `samples/kit.json`.
- They add about 2.8 MB to `samples/`.

## 2. Who plays the guitar

Each track draws one guitar part from a stream of its own, `guitar`:

- **none**
- **chords:** the guitar replaces the piano as the keys.
- **riff:** the guitar plays the riff over the piano, as a fourth riff role (§4).

It also draws which guitar, its strum pattern and how fast it strums.

| | Rain | Sunday | Train | Autumn |
|---|---|---|---|---|
| none · chords · riff | 3 · 1 · 1 | 1 · 2 · 2 | 1 · 2 · 2 | 4 · 1 · 1 |
| nylon · jazz | 1 · 2 | 3 · 1 | 1 · 3 | 3 · 1 |

The references drive these weights: guitar in nearly every bar of the Sunday and train picks, and in 40% of the rain picks. The autumn picks had none, but a nylon guitar suits the station's folk feel, so it gets a little.

**A track that draws no guitar is note for note what it was.** No other stream moves, so every track the user liked stays as it was. Its plan keeps the engine tag `riff-2`, so its ratings carry over. A track with a guitar in it is tagged `riff-3`. With the riff off there is no guitar, as round 2 had none.

## 3. Chords on the guitar

### Voicing

A guitarist's chord differs from a pianist's:

- The root is at the bottom.
- The low strings go down to E2.
- The notes sit far apart.

The `guitar` voicing style plays the root, 3rd, 5th, 7th and one upper note. Its rules:

- the root is the lowest note;
- the lowest note is E2 (MIDI 40) or higher;
- the notes span 7 to 19 semitones;
- where the chord will not fit under the ceiling, the upper note goes first, then the fifth.

The usual rules still apply: the voicing stays under the ceiling, and no close intervals low down. It replaces the drawn piano style only when the guitar plays the chords, so the harmony stream draws what it always did.

Under a low ceiling, fewer than 1% of chords find no shape with the root at the bottom, even as a three-note shell. They play rootless, as the piano does, over the bass's root.

The bass plays under the lowest note. A pushed chord can land on the bass's approach note, and its root may sit under that note. Under a guitar, the approach then comes up from a semitone below the new root.

### Strokes

The guitar strums the chord. The comp the track already draws decides how:

| Comp | On the guitar |
|---|---|
| hold | **ring:** one slow downstroke per chord, left to ring |
| strum | **strum:** the track's strum pattern in 8ths |
| push | **pushed strum:** the pattern, with each chord's first stroke half a beat early |
| pulse | **chops:** the pulse's hits, short and damped |

About half of all guitar-chord tracks get a strum pattern (strum or push).

**Patterns**, within a bar (D down, U up):

| Pattern | Beat 1 | & | 2 | & | 3 | & | 4 | & |
|---|---|---|---|---|---|---|---|---|
| folk | D | | D | U | | U | D | U |
| slow | D | | | U | D | | | U |

How the strokes play:

- **Down and up:**
  - a downstroke plays every note, low to high;
  - an upstroke plays the top three, high to low, and softer.
- **Chord changes:**
  - a chord that starts where the pattern has no stroke gets a downstroke there;
  - each stroke rings until the next.
- **String spread:**
  - strums and chops spread their strings 6–11 ms apart;
  - a ring spreads them three times as far.

## 4. The guitar riff

The fourth riff role, `guitar`, plays the riff on the guitar over the piano's chords. It answers the finding that the references' tune is busier and wider than ours.

**It fits** when the keys are a piano. The guitar part `riff` draws it; the arrange stream's role draw is left as it was.

| | Keys, kalimba | Guitar |
|---|---|---|
| Notes a bar | the station's (4–8) | 6–8 |
| Arpeggio steps the shape may span | 4 | 7 |
| Band | lead − 13 to lead − 2 | lead − 12 to lead + 7 |
| Lead melody | yes, from A2 or later | none: the guitar is the tune |
| Double in the final A | 40% | never |

Like the lead role, the guitar riff is the tune, so the lead writes no melody. It plays over the band where the lead would have been.

It is picked harder than the guitar strums, about 3.5 dB up. That puts it level with a kalimba riff. Over the same seeds on Sunday Porch, it spans about 13 semitones across a track, against the keys' 9.

## 5. The lab

- The riff buttons gain **Guitar**, faded when the keys are a guitar.
- The keys chip names the guitar when the guitar plays the chords, and the stroke style.

## 6. Checks

`test/guitar.test.js` checks the following:

- **Voicing:**
  - the root is at the bottom in more than 98% of chords;
  - the lowest note is at least E2;
  - the span is 7 to 19;
  - the bass plays under the lowest note.
- **Strokes:**
  - each downstroke plays the whole voicing and each upstroke its top three;
  - upstrokes fall only on off-beats;
  - strokes fall on the pattern or on a chord's first beat;
  - a ring plays one stroke per chord.
- **The guitar riff:**
  - 6–8 notes a bar, over a wider range than the keys' riff;
  - no lead notes, no double;
  - drawn only over a piano (`test/arrange.test.js`).
- **No guitar, no change:** tracks that draw no guitar hash to what `riff-2` wrote before this round.
- **The samples** play the pitch asked for (`test/sound.test.js`).

## Files

- **Changed:**
  - `tools/kit.js`: the guitars, and rebuilding only what it has raw files for.
  - `src/sampler.js`: how each guitar rings and darkens, and a gain per note.
  - `src/voicing.js`: the `guitar` style, which thins before it gives up its root.
  - `src/groove.js`: the strum patterns and the strokes.
  - `src/riff.js`: a shape span per role.
  - `src/plan.js`: the guitar draw, the guitar keys, the guitar role, the bass's approach and the engine tag.
  - `src/render.js`: the strokes and the guitar riff.
  - `src/stations.js`: the guitar weights.
  - `src/lab.js`: the Guitar button and the chips.
  - Tests: the guitar's floor in `test/music.test.js`, the fourth role in `test/arrange.test.js`, the new trait in `test/riff.test.js`, the guitar notes in `test/sound.test.js`.
- **New:** this file, `test/guitar.test.js`, `samples/nylon-*.wav`, `samples/jazz-*.wav`.
