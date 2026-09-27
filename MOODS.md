# lowtide — mood stations

The user asked for stations by mood: groovy, chill beats, afternoon laze, night and Tokyo. `research/moods.md` measured three tracks from each of the user's five reference mixes. This round turns those measures into five new stations.

**Agreed:**

- Add five stations and keep the four there are. The four play exactly what they played before.
- Each station's settings come from the data. Each also gets one trait its settings alone can't give it.

## 1. The stations

| Station | Reference mix | Its trait |
|---|---|---|
| Groovy | Settle, *Chill Lofi Mix Vol. 2* | a syncopated bass |
| Chill Beats | Lofi Girl, *1 A.M Study Session* | the beat never stops |
| Afternoon Laze | Lofi Girl, *Morning Coffee* | every track plays behind the beat |
| Night Lofi | HITO, *Night lofi* | a piano plays the melody |
| Tokyo Lofi | The Japanese Town, *90's Chill Lofi Rain* | two guitars: one strums, one picks the tune |

No reference mix was named for afternoon laze. *Morning Coffee* is the nearest: bright, major and unhurried.

## 2. Settings from the data

| | Groovy | Chill Beats | Afternoon | Night | Tokyo |
|---|---|---|---|---|---|
| Reference bpm | 77 | 81 | 74 | 70 | 65 |
| Our bpm | 74–82 | 78–86 | 70–78 | 66–74 | 62–70 |
| Reference chord changes a bar | 0.98 | 1.14 | 1.43 | 0.76 | 0.52 |
| Loop shapes favoured | 1 chord a bar | 1 chord a bar, some 2 | 1–2 chords a bar | half 1 a bar, half 1 per 2 bars | 1 chord per 2 bars |
| Our chord changes a bar (plans) | 0.88 | 1.06 | 1.24 | 0.59 | 0.49 |
| Reference minor keys | 2 of 3 | 1 of 3 | 0 of 3 | 1 of 3 | 2 of 3 |
| Our modes | mostly dorian | even | major only | mixed | mostly minor |
| Reference guitar plays | 50% | 33% | 65% | 26% | 77% |
| Guitar share (none · chords · riff) | 2 · 1 · 1 | 4 · 1 · 1 | 1 · 1 · 2 | 3 · 0.5 · 0.5 | 0.5 · 1 · 1, and both 3 |
| Room | short | medium | short | long, wet | medium, rain bed in 80% |

The references' pace comes from the bass on every half bar; ours counts the plans' chords. The two methods differ in size, so compare the order: both rise from Tokyo through Night, Groovy and Chill Beats to Afternoon.

The rest follows each mood:

- **Groovy:** a tight kit, 16th grid, skipping kicks, and pulse and pushed comps.
- **Chill Beats:** a dusty boom-bap kit and more beat tapes (2 in 6).
- **Afternoon Laze:** felt and upright pianos, and lazy and half-time drums.
- **Night Lofi:** felt piano keys, held and strummed.
- **Tokyo Lofi:** jazz and nylon guitars equally, and a dusty kit.

## 3. The traits

**Groovy: a syncopated bass.** A new bassline, `groove`, plays through a four-beat chord:

- the root on the one;
- a soft root a sixteenth before beat 2;
- the octave on the and of 2;
- the root on the and of 3;
- an approach note on the last sixteenth.

A shorter chord keeps the first three. It is Groovy's commonest bassline (4 of 6).

**Chill Beats: the beat never stops.** The station is marked `steady`:

- A B that replays the loop keeps its drums.
- Moves that take the drums out are never drawn. Only the bare break remains, so most tracks have no move.

The reference drums play in every bar.

**Afternoon Laze: behind the beat.** The station is marked `lazy`. Every track draws the lean that the `drag` standout gives:

- the kick early;
- the snare late;
- the keys a further 12 ms late.

The standout is still drawn, and the chords are what they would be on the beat. The rhythm stream does move after the lean, because a dragged track draws no hat swing. That changes nothing a listener knew, since the station has no on-the-beat tracks to keep.

**Night Lofi: a piano melody.** A new lead sound, `piano`, plays the melody on the upright piano samples. Its notes die away like the vibes', so the lead may also play the riff on it. It is the station's commonest lead (4 of 7), since the piano leads 91% of the night references.

**Tokyo Lofi: two guitars.** A new guitar part, `both`:

- the drawn guitar strums the chords;
- the other guitar picks the riff, as the guitar role does (GUITAR.md §4).

Any guitar riff over guitar chords now goes to the other guitar, so a nylon strum carries a jazz line and a jazz strum carries a nylon one.

## 4. What stays the same

- The four old stations don't use any of the traits, so their tracks are note for note what they were. A plan that uses a trait is tagged `riff-3`, like one with a guitar. `test/guitar.test.js` already checks this against riff-2.
- The round 2 check covers the four old stations only. With the riff off there is no guitar and no move, and the new stations never played in round 2.

## 5. Checks

`test/moods.test.js` checks the following:

- **Groovy:** the groove bass plays its offbeats and stays under the keys.
- **Chill Beats:** drums play in every A and B bar.
- **Afternoon Laze:** every track leans behind the beat, over the chords it would have on the beat.
- **Night Lofi:** the piano lead renders within 3 dB of a vibes lead. It gets a gain of 2 on the upright's samples.
- **Tokyo Lofi:** a `both` track strums one guitar and picks the other.
- **Every new station** plans tracks the critic passes at its own tempo.
- **Chord pace:** the moods change chords in the order their reference mixes do, Tokyo slowest and Afternoon fastest.

The existing tests (melody, voicing, riff, moves) now run over all nine stations.

## Files

- **Changed:**
  - `src/stations.js`: the five stations.
  - `src/groove.js`: the `groove` bassline.
  - `src/form.js`: `steady`.
  - `src/plan.js`: `lazy`, the piano lead and the `both` guitar part.
  - `src/render.js`: the piano lead.
  - `src/lab.js`: the chips for the new traits.
  - `test/riff.test.js`: the round 2 check covers the four old stations only.
  - `test/arrange.test.js`: a guitar riff over guitar chords is on the other guitar.
- **New:** this file, `test/moods.test.js`.
