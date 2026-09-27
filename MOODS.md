# lowtide — mood stations

The user asked for stations by mood: groovy, chill beats, afternoon laze, night and Tokyo. `research/moods.md` first measured three tracks from each of five reference mixes, and this round turned those measures into five new stations. It then measured ten tracks from each station's own mix, and §6 retunes all nine stations to match.

**Agreed:**

- Add five stations and keep the four there are.
- Each station's settings come from the data. Each also gets one trait its settings alone can't give it.
- Retune every station to the ten-track references (§6).

## 1. The stations

| Station | Reference mix | Its trait |
|---|---|---|
| Groovy | Settle, *Chill Lofi Mix Vol. 2* | a syncopated bass |
| Chill Beats | Lofi Girl, *1 A.M Study Session* | the beat never stops |
| Afternoon Laze | the bootleg boy, *slow afternoon* | every track plays behind the beat |
| Night Lofi | HITO, *Night lofi* | a piano plays the melody |
| Tokyo Lofi | The Japanese Town, *90's Chill Lofi Rain* | two guitars: one strums, one picks the tune |

The lab shows each station's line under its name: what the station is and, for these five, its trait.

## 2. Settings from the data

As retuned (§6), from ten tracks a mix (six for Tokyo):

| | Groovy | Chill Beats | Afternoon | Night | Tokyo |
|---|---|---|---|---|---|
| Reference bpm | 79 | 79 | 80 | 67 | 65 |
| Our bpm | 74–82 | 76–84 | 76–84 | 63–71 | 62–70 |
| Reference chord changes a bar | 1.02 | 0.98 | 0.93 | 0.81 | 0.75 |
| Loop shapes favoured | 1 chord a bar | 1 chord a bar | 1 chord a bar | 1 a bar, some 1 per 2 bars | 1 a bar or 1 per 2 bars |
| Our chord changes a bar (plans) | 0.88 | 0.92 | 0.85 | 0.68 | 0.65 |
| Reference guitar plays | 52% | 37% | 24% | 2% | 92% |
| Guitar share (none · chords · riff) | 2 · 1 · 1 | 4 · 1 · 1 | 3 · 0.5 · 0.5 | 9 · 0.5 · 0.5 | 0.5 · 1 · 1, and both 3 |
| Our modes | mostly dorian | even | major only | mixed | mostly minor |
| Room | short | medium | short | long, wet | medium, rain bed in 80% |

The references' pace comes from the bass on every half bar; ours counts the plans' chords. The two methods differ in size, so compare the order (§5).

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

**Night Lofi: a piano melody.** A new lead sound, `piano`, plays the melody on the upright piano samples. Its notes die away like the vibes', so the lead may also play the riff on it. It is the station's commonest lead (4 of 7): in the first pass the piano led 91% of the night references. The ten-track split can't tell the night mix's piano from its other keys, so that figure stands unchecked.

**Tokyo Lofi: two guitars.** A new guitar part, `both`:

- the drawn guitar strums the chords;
- the other guitar picks the riff, as the guitar role does (GUITAR.md §4).

Any guitar riff over guitar chords now goes to the other guitar, so a nylon strum carries a jazz line and a jazz strum carries a nylon one.

## 4. What stays the same

- **The engine.** A plan that used a trait was tagged `riff-3`, like one with a guitar; the rest kept `riff-2` or `melody-2`. The retune changed settings, not the engine, so the tags kept their meaning. The hook later replaced all three with `hook-1` (HOOK.md §4).
- **The engine checks.** Round 2's check and the riff-2 check ran on the four old stations as they stood before the retune, frozen in a test fixture, until the hook retired both.

## 5. Checks

`test/moods.test.js` checks the following:

- **Groovy:** the groove bass plays its offbeats and stays under the keys.
- **Chill Beats:** drums play in every A and B bar.
- **Afternoon Laze:** every track leans behind the beat, over the chords it would have on the beat.
- **Night Lofi:** the piano lead renders within 3 dB of a vibes lead. It gets a gain of 2 on the upright's samples.
- **Tokyo Lofi:** a `both` track strums one guitar and picks the other.
- **Every station** plans tracks the critic passes at its own tempo.
- **Chord pace:** where two stations' reference mixes differ by 0.15 changes a bar or more, ours change chords in the same order. Closer pairs, such as Afternoon, Chill Beats and Groovy, are within the noise of ten tracks.

The existing tests (melody, voicing, riff, moves) run over all nine stations.

## 6. The retune

The second pass measured ten tracks from the user's own mix for each station (`research/moods.md`). Several differ from the first pass and from the old stations' settings. Each station moves to its mix on tempo, chord pace and how often a guitar plays. Modes stay as they were, since the key finder reads major tracks as minor.

**The old four:**

| | Rain | Sunday | Train | Autumn |
|---|---|---|---|---|
| Reference bpm | 66 | 75 | 82 | 81 |
| Our bpm | 70–78 → 62–70 | 82–88 → 72–80 | 72–80 → 78–86 | 76–84, kept |
| Reference chord changes a bar | 1.06 | 1.28 | 0.93 | 0.61 |
| Ours (plans) | 0.77 → 0.89 | 0.76 → 1.12 | 0.98 → 0.82 | 0.75 → 0.49 |
| Reference guitar plays | 41% | 70% | 23% | 44% |
| Ours | 31%, kept | 85%, kept | 76% → 29% | 29% → 40% |

**The mood stations:**

- **Afternoon Laze** now follows the bootleg boy's *slow afternoon*, not Morning Coffee: 76–84 bpm, a chord a bar (1.24 → 0.85), and guitar in a quarter of tracks rather than three quarters.
- **Chill Beats:** 76–84 bpm, and a little slower in its chords (1.06 → 0.92).
- **Night Lofi:** 63–71 bpm, a chord more often (0.59 → 0.68), and guitar in 1 track in 10.
- **Tokyo Lofi:** a chord more often (0.49 → 0.65).
- **Groovy** already matched and is unchanged.

**Ratings.** The same seed now plays other music on a retuned station, under the same engine. Each retuned station carries `tuning: 2`, which the plan and the lab's rating key take up, so ratings made on the old settings stay apart. Groovy has no tuning, so its ratings carry over.

**A bass fix the retune turned up.** A section's last bass approach aims at the first chord of its own loop. Under a guitar, the next section's first chord can land on that approach, pushed half a beat early, with its root lower. The bass now drops an octave under any guitar chord it would sound over. Only guitar tracks change, and they are `riff-3` already.

**What the retune leaves:** the references' top line runs 8–10 notes a bar against our 5, and their bass starts on beat 1 in 8–27% of bars against our 61%. Both need engine work, not settings.

## Files

- **Changed:**
  - `src/stations.js`: the five stations, then the retune, each station's line for the lab, and `tuning`.
  - `src/groove.js`: the `groove` bassline.
  - `src/form.js`: `steady`.
  - `src/plan.js`: `lazy`, the piano lead, the `both` guitar part, the plan's `tuning`, and the bass under a pushed guitar.
  - `src/render.js`: the piano lead.
  - `src/lab.js`, `lab/listen.html`: the chips for the new traits, the station's line, and the tuning in the rating key.
  - `test/riff.test.js`, `test/guitar.test.js`: the round 2 and riff-2 checks ran on the frozen stations (since retired, HOOK.md §4).
  - `test/arrange.test.js`: a guitar riff over guitar chords is on the other guitar.
  - `research/moods.md`: the ten-track pass.
- **New:** this file, `test/moods.test.js`.
