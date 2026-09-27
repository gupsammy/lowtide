# What makes each mood

**The question.** The user wants tunes that sound more melodic, stations by mood, guitar, and some voice. What do tracks in each mood play, and where does lowtide differ?

**The tracks.** 113 reference tracks, measured on 27 Sep 2026. A first pass took three tracks from each of five mood mixes. This second pass takes ten from each of the user's mixes, one mix per station:

| Group | Station | Mix | Tracks |
|---|---|---|---|
| groovy | Groovy | Settle, *Chill Lofi Mix Vol. 2* | 10 |
| latenight | Chill Beats | Lofi Girl, *1 A.M Study Session* | 10 |
| afternoon | Afternoon Laze | the bootleg boy, *slow afternoon* | 10 |
| morning | none | Lofi Girl, *Morning Coffee* | 10 |
| night | Night Lofi | HITO, *Night lofi* | 10 |
| tokyo | Tokyo Lofi | The Japanese Town, *90's Chill Lofi Rain* | 6 |
| rain | Rain Study | the user's rain mix (youtu.be/uEQ7fH7ViXo) | 7, and 3 older picks |
| sunday | Sunday Porch | Lofi Girl, *Lazy Sunday* | 10, and 3 older picks |
| train | Last Train | Chill with Taiki, *a train ride of peace and quiet* | 10, and 3 older picks |
| autumn | Autumn Field | Lofi Girl, *A Book, a Blanket, and the Autumn Breeze* | 10, and 3 older picks |

- **Older picks:** the twelve station references from `research/stems.md`, kept in their station's group.
- **Ours:** eight lowtide renders, two a station, all from the four older stations. All but `sunday-porch-1735216548` come from before the riff (round 2).
- **Morning Coffee** stood in for afternoon laze in the first pass. The user has since named an afternoon mix, so morning stays only as a group to compare against.

**How:**

- `tools/split.py` splits each track twice with Demucs: four stems (drums, bass, other, vocals), then six (the same plus guitar and piano).
- `tools/transcribe.py` turns the bass and other stems into notes.
- `tools/palette.py` measures the harmony and the instruments.
- `tools/stems.py` measures the top line, the bass and the drums.

**Caveats:**

- **Ten tracks from one mix** show that mix, not the whole mood.
- **The six-stem split** often mistakes guitar for piano and the reverse. Read its shares as rough. On the night mix it puts the keys in "other" (100% of bars) and gives the piano 6%, so the night group's piano share can't be read.
- **Minor keys read high.** The key finder reads our Sunday renders, which are all major, as minor. Read the minor column as an upper bound.
- **Two mixes loop.** The rain video repeats about 17 minutes of music and the Tokyo stream 15, so they hold seven and six songs.
- **Three mixes have no tracklist** (rain, night, Tokyo). Their tracks were cut at the silences or dips between songs, and the night mix's clips came in at 22 kHz.

## Harmony and instruments

`tools/palette.py`, medians per group:

| group | n | bpm | notes a half bar | half bars with ≤3 notes | with ≥6 | chord changes a bar | minor keys | guitar plays | piano plays | drums play |
|---|---|---|---|---|---|---|---|---|---|---|
| groovy | 10 | 79 | 5.0 | 8% | 17% | 1.02 | 40% | 52% | 38% | 82% |
| latenight | 10 | 79 | 4.8 | 16% | 20% | 0.98 | 50% | 37% | 10% | 100% |
| afternoon | 10 | 80 | 5.0 | 6% | 34% | 0.93 | 20% | 24% | 39% | 88% |
| morning | 10 | 74 | 5.0 | 4% | 37% | 1.39 | 10% | 82% | 16% | 86% |
| night | 10 | 67 | 4.5 | 8% | 20% | 0.81 | 30% | 2% | 6% | 82% |
| tokyo | 6 | 65 | 5.0 | 1% | 30% | 0.75 | 100% | 92% | 17% | 90% |
| rain | 10 | 66 | 4.0 | 16% | 15% | 1.06 | 40% | 41% | 53% | 92% |
| sunday | 13 | 75 | 5.0 | 10% | 18% | 1.28 | 15% | 70% | 21% | 92% |
| train | 13 | 82 | 5.0 | 9% | 29% | 0.93 | 38% | 23% | 4% | 86% |
| autumn | 13 | 81 | 5.0 | 14% | 19% | 0.61 | 23% | 44% | 37% | 87% |
| **ours** | 8 | 77 | 5.0 | 0–25% | – | 0.33–1.91 | 6 of 8 | none | none | 93–100% |

How to read the columns:

- **Notes a half bar:** the pitch classes sounding in half a bar, melody included. On our renders it reads about one note low (5 where the plans have 5–6), and the same bias applies to the references.
- **Chord changes a bar:** how often the bass's note changes from one half bar to the next. On our renders it matches the plans to within 0.1.
- **Plays:** the share of bars where a stem is within 20 dB of the mix.

## The top line, the bass and the drums

`tools/stems.py`, medians per group; ours from the split of our eight renders:

| group | bpm | top line notes a bar | its range | repeats the bar a loop earlier | bass notes a bar | bass on beat 1 | drum hits a bar | swing |
|---|---|---|---|---|---|---|---|---|
| groovy | 79 | 8 | 22 | 67% | 2 | 26% | 18 | 0.53 |
| latenight | 79 | 8 | 28 | 61% | 3 | 15% | 23 | 0.57 |
| afternoon | 80 | 9 | 24 | 85% | 2 | 11% | 20 | 0.56 |
| morning | 74 | 9 | 26 | 71% | 2 | 27% | 22 | 0.52 |
| night | 67 | 10 | 26 | 82% | 2 | 8% | 21 | 0.52 |
| tokyo | 65 | 8 | 17 | 31% | 1 | 52% | 19 | 0.53 |
| rain | 66 | 8 | 29 | 46% | 2 | 25% | 20 | 0.54 |
| sunday | 75 | 9 | 25 | 72% | 2 | 24% | 22 | 0.54 |
| train | 82 | 8 | 21 | 60% | 2 | 24% | 21 | 0.51 |
| autumn | 81 | 8 | 22 | 84% | 2 | 12% | 24 | 0.53 |
| **ours** | 77 | 5 | 22 | 27% | 1 | 61% | 25 | 0.60 |

- **Top line:** the loudest note in the "other" stem, a semitone range across the track.
- **Bass on beat 1:** the share of bars whose first beat starts a bass note.

## What this says

1. **Rich chords are still not what separates us.** Every group sounds about 5 notes a half bar, as we do, and few bare triads (1–16% of half bars against our 0–25%). The sparse rain and autumn picks of the first pass were outliers.
2. **Guitar plays in most bars in four groups** (Tokyo 92%, morning 82%, Sunday 70%, groovy 52%), in a quarter to under half of bars in five, and almost never at night. The first pass, at three tracks a mix, put it higher for train (94%) and lower for autumn (0%). The user's own mixes turn both round.
3. **Each station's mix sets its pace and tempo, and several differ from the first pass:**
   - rain is slow, 66 bpm, where the older picks ran 88;
   - Sunday runs 75 bpm and train 82, not 83 and 99;
   - the afternoon mix sits at 80 bpm and changes chord about once a bar, slower than Morning Coffee's 1.39;
   - autumn changes chord least (0.61 a bar), Sunday most (1.28).

   These are station settings; MOODS.md §6 retunes them.
4. **The tune that sticks is busy, wide and repeating:** 8–10 notes a bar over about two octaves, repeating the bar a loop earlier in 60–85% of bars in most groups. Our split renders give 5 a bar, repeating 27%. Most of those renders predate the riff.
5. **The bass keeps off beat 1.** The references start a bass note on beat 1 in 8–27% of bars, Tokyo aside (52%). Ours do in 61%. Our bass lands with the chord change; theirs pushes or lays back.
6. **The drums play almost throughout, in every mood (82–100% of bars).** "No drums" works as a moment, as the moves in ARRANGE.md use it, not as a mood.

## Our tracks now

27 tracks from the current engine, three a station (seed 2026 in `tools/render.js`), split and measured as the references were, and read from their plans too. Three a station is thin: read the station rows as hints and the totals as the finding.

| | References | Ours, split | Ours, plan |
|---|---|---|---|
| Top line notes a bar | 8–10 | 7 (5–9) | 6 (4–8) |
| Top line repeats the bar a loop earlier | 31–85%, most 60–85% | 62% | 54% |
| Bass starts a note on beat 1 | 8–27% | 30% | 40% |
| Swing | 0.51–0.57 | 0.60 | 0.59 |

- **Notes a bar: a small gap, not a large one.** The split adds about one note a bar to our current tracks (6 in the plans, 7 split), so the references' 8–10 means about 7–9 real notes. Night (5 against 10), rain, train and autumn (5–6 against 8) fall shortest. The first study's split added 2–3 notes, on sparser tracks from before the riff.
- **A lead melody over the riff stops the tune repeating.** The top line is the highest note, so where the lead plays it is the lead. The eight plans with a lead melody repeat 0–39% of bars (median 13%); the nineteen without repeat 42–93% (median 61%). All three Afternoon Laze tracks drew a lead over a `signature` riff and repeat 0–14%. The references' tune repeats like a riff, which our lead melodies don't.
- **The `root` bassline puts every bass note on beat 1.** Six of seven plans with it read 100%; plans with the others read 29–67% (median 34%). Both are above the references' 8–27%. Afternoon, rain and night draw `root` most.
- **Swing:** ours swing harder than every reference group. On the 16th grid the 8th reads straight (0.50), so the excess comes from the 8th-grid tracks (0.60–0.65).
- **Guitar in the audio** follows what the tracks drew: stations whose three tracks all drew a guitar read 56–100% of bars, and stations where none did read 4–17%.
- **Chord pace can't be read at three tracks a station.** The split counts bass-note changes, which a walking or groove bass adds to; ours range 0.66–2.00 against the references' 0.61–1.28.

## Rerun

```
uv run --no-project --python 3.11 --with demucs --with soundfile python tools/split.py mps downloads/refs/*.wav renders/<eight renders>/mix.wav
uv run --no-project --python 3.11 --with demucs --with soundfile python tools/split.py mps --six downloads/refs/*.wav
uv run --no-project --python 3.11 --with basic-pitch --with 'setuptools<81' python tools/transcribe.py downloads/stems/*/
python3 tools/palette.py downloads/stems/*/
python3 tools/stems.py downloads/stems/*/
```

Each clip runs from a second after the song starts to two seconds before it ends, clear of the mix's crossfades. The songs sit at these times in the mixes:

| Mix | Songs |
|---|---|
| Settle | 0:00–2:15, 3:56–5:33, 13:07–14:47, 21:54–23:34, 30:31–32:34, 32:34–34:19, 43:20–44:56, 52:28–54:37, 58:06–59:45, 70:23–72:19 |
| Lofi Girl, *1 A.M* | 3:25–5:28, 7:44–10:28, 12:43–14:24, 16:20–19:02, 22:43–25:10, 30:51–32:48, 36:08–38:28, 42:20–44:51, 49:32–51:44, 56:32–58:06 |
| the bootleg boy | 0:00–2:23, 2:23–4:47, 4:47–7:43, 9:13–11:41, 11:41–14:08, 14:08–16:29, 16:29–18:38, 18:38–20:52, 20:52–23:27, 23:27–25:58 |
| Lofi Girl, *Morning Coffee* | 0:00–3:14, 3:14–6:22, 8:34–10:35, 13:15–15:26, 17:40–20:10, 20:10–23:05, 25:50–28:25, 37:36–39:55, 44:30–47:21, 54:54–57:20 |
| HITO | 0:00–3:07, 3:10–5:58, 5:59–8:17, 8:23–11:38, 11:39–15:19, 15:21–18:12, 33:36–36:24, 36:25–38:43, 38:54–42:09, 45:52–48:41 |
| The Japanese Town | 0:09–2:29, 2:29–4:48, 4:50–7:20, 7:22–9:56, 9:57–12:25, 12:28–14:49 |
| rain | 0:00–1:44, 1:44–5:00, 5:00–7:42, 7:42–9:46, 9:46–13:00, 13:00–14:44, 14:44–16:44 |
| Lofi Girl, *Lazy Sunday* | 0:00–2:43, 5:25–7:31, 9:38–11:59, 14:24–16:20, 18:39–21:10, 23:42–26:09, 30:09–32:37, 35:14–37:31, 44:48–47:09, 51:35–53:31 |
| Chill with Taiki | 0:00–3:04, 5:37–8:12, 10:31–12:56, 16:15–19:00, 21:10–23:11, 26:04–28:13, 31:54–33:25, 35:43–38:47, 42:58–45:15, 51:40–54:10 |
| Lofi Girl, *Autumn Breeze* | 0:00–2:39, 7:26–9:59, 12:05–14:49, 19:09–21:04, 25:40–27:57, 32:15–34:42, 39:34–42:03, 46:35–49:19, 56:30–58:35, 74:02–76:31 |
