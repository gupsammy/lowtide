# What makes each mood

**The question.** The user wants tunes that sound more melodic, stations by mood, guitar, and some voice. What do tracks in each mood play, and where does lowtide differ?

**The tracks.** 27 reference tracks, measured on 27 Sep 2026:

- **New mood groups**, three tracks from each of the user's five mixes:
  - *groovy* (Settle, *Chill Lofi Mix Vol. 2*)
  - *night* (HITO, *Night lofi*)
  - *tokyo* (The Japanese Town, *90's Chill Lofi Rain*)
  - *latenight* (Lofi Girl, *1 A.M Study Session*)
  - *morning* (Lofi Girl, *Morning Coffee*)
- **Older picks:** the twelve station references from `research/stems.md`.
- **Ours:** eight lowtide renders, two a station. All but `sunday-porch-1735216548` come from before the riff (round 2).

**How:**

- `tools/split.py` splits each track twice with Demucs: four stems (drums, bass, other, vocals), then six (the same plus guitar and piano).
- `tools/transcribe.py` turns the bass and other stems into notes.
- `tools/palette.py` (new) measures the harmony and the instruments.
- `tools/stems.py` measures the top line, the bass and the drums.

**Caveats:**

- **Three tracks a mood** show a direction, not a rule.
- **The six-stem split** often mistakes guitar for piano and the reverse. Read its shares as rough.
- **The night and Tokyo mixes have no tracklist.** Their tracks were cut at the silences between songs, and the night mix's clips came in at 22 kHz.

## Harmony and instruments

`tools/palette.py`, medians per group:

| group | bpm | notes a half bar | half bars with ≤3 notes | chord changes a bar | minor keys | guitar plays | piano plays | drums play |
|---|---|---|---|---|---|---|---|---|
| groovy | 77 | 5 | 4% | 0.98 | 2 of 3 | 50% | 8% | 75% |
| night | 70 | 5 | 7% | 0.76 | 1 of 3 | 26% | 91% | 85% |
| tokyo | 65 | 5 | 2% | 0.52 | 2 of 3 | 77% | 46% | 90% |
| latenight | 81 | 5 | 16% | 1.14 | 1 of 3 | 33% | 15% | 100% |
| morning | 74 | 5 | 10% | 1.43 | 0 of 3 | 65% | 87% | 95% |
| rain | 88 | 4 | 37% | 1.33 | 2 of 3 | 40% | 11% | 94% |
| sunday | 83 | 5 | 17% | 2.00 | 0 of 3 | 100% | 0% | 92% |
| train | 99 | 5 | 5% | 1.72 | 2 of 3 | 94% | 0% | 100% |
| autumn | 86 | 4 | 37% | 0.35 | 0 of 3 | 0% | 11% | 100% |
| **ours** (8) | 78 | 5 | 4–14% | 0.24–1.95 | most | none | none | 93–100% |

How to read the columns:

- **Notes a half bar:** the pitch classes sounding in half a bar, melody included. On our renders it reads about one note low (5 where the plans have 5–6), and the same bias applies to the references.
- **Chord changes a bar:** how often the bass's note changes from one half bar to the next. On our renders it matches the plans to within 0.1.
- **Plays:** the share of bars where a stem is within 20 dB of the mix.

## The top line, the bass and the drums

`tools/stems.py`:

- **The references' top line is busy and wide, and repeats.**
  - Median about 8 notes a bar.
  - About two octaves (range medians 16–34 semitones by group).
  - It repeats the bar one loop earlier in about 70% of bars.
- **Ours is thinner.** Our split renders give 4–5 notes a bar. The riff engine, measured on plans, gives 5.2 a bar in an 11-semitone band. The split adds about 8 semitones of range to what a plan holds.
- **Bass and swing: nothing new.** The references still put few bass notes on beat 1 (0–46%) and swing lightly (0.48–0.62), as `research/stems.md` found.
- **Voice is rare.** It shows up mostly where a track has singing or rap: *Feather*, *Lady Brown* and *Closing My Eyes*. The night mix has a faint voice at −32 dB. No mood uses wordless voice throughout.

## What this says

1. **Rich chords are not what separates us from these moods.** The new mood groups sound 5 notes a half bar, as we do, and have few bare triads (2–17% of half bars against our 4–14%). Only the older rain and autumn picks are sparser (37%). My guess that lowtide's colour chords blur its tunes doesn't hold up.
2. **Guitar is what most of them share.** It plays in most bars in six of the nine groups (50–100%). It's there in latenight and night too, less often (26–33%). Lowtide has none. The piano leads the morning and night groups (87–91%).
3. **Each mood has its own pace and key:**
   - morning and Sunday are major;
   - Tokyo and night are slow, 65–70 bpm, changing chord every one or two bars (0.5–0.8 changes a bar);
   - Sunday, train and morning change once or twice a bar.

   These are station settings, not new code.
4. **The melody that sticks is a busy, wide, repeating line on a real instrument**, guitar or piano, at about 8 notes a bar over two octaves. Ours is 5 a bar within an octave, on the keys, vibes or kalimba.
5. **The drums play almost throughout, in every mood (75–100% of bars).** "No drums" works as a moment, as the moves in ARRANGE.md use it, not as a mood.

## Rerun

```
uv run --no-project --python 3.11 --with demucs --with soundfile python tools/split.py mps downloads/refs/*.wav renders/<eight renders>/mix.wav
uv run --no-project --python 3.11 --with demucs --with soundfile python tools/split.py mps --six downloads/refs/*.wav
uv run --no-project --python 3.11 --with basic-pitch --with 'setuptools<81' python tools/transcribe.py downloads/stems/*/
python3 tools/palette.py downloads/stems/*/
python3 tools/stems.py downloads/stems/*/ renders/<eight renders>/
```

The clips were cut from the mixes at these times:

| Mix | Clips |
|---|---|
| Settle | 0:00–2:15, 3:56–5:33, 30:31–32:34 |
| Lofi Girl, *1 A.M* | 3:25–5:28, 7:44–10:28, 12:43–14:24 |
| Lofi Girl, *Morning Coffee* | 3:14–6:22, 8:34–10:35, 20:10–23:05 |
| HITO | 0:00–3:05, 3:10–5:57, 5:59–8:16 |
| The Japanese Town | 2:29–4:46, 4:50–7:18, 7:22–9:56 |
