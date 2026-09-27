# What the most-played lofi tracks share

Research for lowtide, 26 Sep 2026. The question: our openings work, but tracks sag in the middle and the tunes don't stick. What do the hits do that a rule engine with forms like intro A A B A outro would miss?

This brief does not repeat `lofi-melody.md`, `melody-science.md` or `github-repos.md`. Those cover how a lead line should move. This one looks at whole tracks: what repeats, what carries the hook, and how long they run.

**A warning up front.** The web has plenty of stream counts, keys and tempos, and some chord and melody data. It has very little on *what changes bar by bar* in these tracks; that lives in YouTube videos, which I could not read. So the arrangement claims below come from how the tracks were made (sample sources, stems, transcriptions), not from timed notes. I mark guesses as guesses. The last section gives a short listening sheet that would settle them in an hour.

## The tracks

Streams are Spotify totals from kworb.net (Sep 2026) unless marked. Bars = length × tempo ÷ 240, in 4/4.

| Track | Streams | Tempo, key | Length ≈ bars | Chord loop | What carries the hook |
|---|---|---|---|---|---|
| Øneheart × reidenshi, *snowfall* | 1.2 bn (Wikipedia) | 95–98, F major | 2:04 ≈ 50 | I7 – ii7 – vi9 (3 chords) | Simple, busy e-piano line: ~7 notes a bar, 84% chord tones, melodic complexity 20–22 of 100 |
| potsu, *i'm closing my eyes* | 246 M | 67 (134 double), C minor | 1:58 ≈ 33 | minor loop, 4–6 chords (fan tab) | Shiloh Dynasty's sung sample |
| idealism, *controlla* | 154 M | 81, B minor | 1:48 ≈ 36 | F♯m7 – Bm – Em (fan chords) | A cover of Drake's hit tune |
| Nujabes, *Feather* | 130 M | ~91 (181 double), D♭ | 2:52 ≈ 65 | I7 – ii7sus2 – IV9 – V – vi | Piano loop from Yusef Lateef; rap verses on top |
| potsu, *[oops]* | 130 M | 69 | 2:22 ≈ 41 | not found | Guitar loop |
| Jinsang, *Affection* | 127 M | 84, G (fan chords) | 1:57 ≈ 41 | Bm – Am – E – Dm – A (fan) | Dorothy Ashby harp clips, plus Pharcyde and Big L vocal snippets |
| Tomppabeats, *Monday Loop* | 103 M | 69, E♭/B♭ | 1:32 ≈ 27 | Fm7 – B♭7 – E♭ – E♭m | Doris Day vocal sample, first heard at 0:27 (bar ~8) |
| Nujabes, *Lady Brown* | 79 M | — | 3:18 | — | Luiz Bonfá guitar sample; rap |
| Nujabes, *Aruarian Dance* | 62 M | 100, F♯ major | — | ii9 – V13 (2 chords) | Several clips of Laurindo Almeida's guitar; flute and strings |
| Kupla, *Kingdom in Blue* | 43 M | 78 | 3:21 ≈ 65 | — | Clarinet and melodica over piano |
| Kupla, *Roots* | 42 M | — | 2:18 | — | Same palette |
| WYS, *Snowman* | first Lofi Girl music video | 110, A minor | 3:15 (2023 cut) | Am – F – Fmaj7 – Fm (fan) | Piano |

Melody figures for *snowfall*, *Feather* and *Aruarian Dance* come from Hooktheory. *Feather*'s lead there spans one octave with 62% chord tones; *Aruarian Dance*'s notes come every half beat, 89% chord tones. Nujabes' six *Luv(sic)* tracks all run over the **same drum loop**.

## What they share, ranked

Ranked by how many of the 12 show it, then by how cheaply lowtide could copy it.

### 1. The hook lives in the loop, not in a lead that comes and goes (9 of 12)

In the sample-built tracks the tune *is* the loop: Lateef's piano in *Feather*, Ashby's harp in *Affection*, Almeida's guitar in *Aruarian Dance*, the guitar in *[oops]*, the e-piano line in *snowfall*. It starts in the first bars and plays, the same notes each time, until the end. In a two-minute track at 70–85 bpm a 2-bar loop comes round about 20 times. The rap, voice or solo sits on top as a second layer.

lowtide splits the roles the other way. Its keys only comp chords (hold, push, strum, pulse); all the tune sits in the lead. The lead skips the first A, sits out half the B sections, and may drop out of the break, so the one memorable thing is missing for long stretches. That fits the complaint: a strong opening, then a middle with nothing to hold on to.

**For lowtide:** add a *riff* comp. It gives the keys a 1–2 bar top line (3–8 notes, mostly chord tones, with the rhythm fixed) and plays it on every loop in every section, intro included. It changes only to follow the chords, such as moving a 3rd to a ♭3rd over a borrowed chord. The lead stays, but as the second layer. *Cost: low.* It is a new entry in `COMPS` plus a top-voice rule in `voicing.js`; `plan.js` already repeats loops.

### 2. One signature sound, heard throughout (9 of 12)

Almost every hit is known by one sound that isn't a plain piano: harp (*Affection*), nylon guitar (*[oops]*, *Lady Brown*, *Aruarian Dance*), clarinet and melodica (Kupla), flute and strings (*Aruarian Dance*), a stack of soft pads, choir, harp and three e-pianos (the *snowfall* MIDI has 11 channels). That sound plays through the whole track, not just one section.

lowtide's leads are vibes, soft, bell and kalimba, and the lead is the part that drops out. **For lowtide:** play the riff from §1 on the station's signature sound, not on the comping keys. Add one plucked sound (harp or nylon guitar) and one breathy wind (flute or clarinet). *Cost: medium* (two new synth voices).

### 3. A human voice (7 of 12)

*i'm closing my eyes*, *Monday Loop* and *Affection* hang on short sung or spoken clips. *controlla* borrows a famous pop tune, and *Feather*, *Lady Brown* and *Luv(sic)* have rap. In *Monday Loop* the voice enters around bar 8, about when lowtide's lead enters, and then keeps coming back. A voice is the most memorable sound there is, and lowtide has none.

**For lowtide:** a wordless "ooh"/"ah" voice made with formant filters on a saw or pulse, playing the hook's 2-bar cell verbatim at fixed spots, such as the last 2 bars of each A. The hits use samples, but lowtide can't use theirs. *Cost: medium–high*, since a vowel synth that doesn't sound cheap is hard. Try it last.

### 4. Change the take, not the tune (2 documented; probably most)

*Affection* swaps between several Ashby harp clips so the harp never stops, and *Aruarian Dance* uses several clips of one Almeida record. The middle stays alive by cycling close variants of one loop, not by writing new material.

**For lowtide:** build the riff twice, as A and A′. A′ keeps the same rhythm and changes one or two notes, or ends somewhere else. Play them A A A A′ in the first A section and A A′ A A′ later on, so the second half moves a little faster than the first. *Cost: low*, reusing `vary()` from `melody.js` on the riff.

### 5. Leave the drums alone and spend change elsewhere (strong single case)

*Luv(sic)* uses one drum loop across six tracks and holds up. lowtide already varies bars 4 and 8 and adds a fill at each section's end (`groove.js`). That is fine, but drums are not where the middle gets its lift. **For lowtide:** send any new change budget to the riff, the voice and textures, not the kit. *Cost: nil.*

### 6. Already in line: length, loop size and colour chords

- **Length.** The hits run 1:32–3:21, median ≈ 2:00, which is 27–65 bars (median ≈ 41). lowtide's T1 is 2–4 + 4×8 + 4 ≈ 40 bars, 1:50–2:15 at station tempos. Length is not the problem; what fills the bars is.
- **Loop size.** 2–5 chords, often just 2 or 3 (*Aruarian Dance* 2, *snowfall* 3). lowtide's shapes match.
- **One borrowed colour chord.** *Monday Loop* turns E♭ into E♭m, and *Snowman* turns F into Fm. lowtide's `borrowedIv` covers this.
- **Busy but simple tunes.** *snowfall* plays ~7 notes a bar with the lowest melodic complexity of the set. `lofi-melody.md` already argues for more notes than lowtide's 2.5 a bar.

## What I could not settle

Text sources don't say what these tracks change halfway through: whether a B section brings new chords or the same loop with parts muted, when the drums drop, when a filter moves. My guess, from how they were made (one or two samples, a drum loop, short running time), is that most have **no new chords at all** and change only by muting and returning parts. If so, lowtide's B, with its new progression and higher energy, works against the style. A B with the riff kept, drums out and the lead taking over might suit better.

A cheap way to check: listen to six tracks (*snowfall*, *Affection*, *Monday Loop*, *[oops]*, *Feather* instrumental, *Kingdom in Blue*) and note, for each 4 bars:

- which parts play (riff/loop, drums, bass, voice/lead, texture)
- whether the chords are the ones from bar 1
- anything that happens once (a stop, reverse, filter, vocal ad-lib)

About 10 minutes a track. It would turn §1, §4 and the B-section question from reasoned guesses into counts.

## Files you could download (not downloaded)

| What | URL | Format, size | Licence / terms |
|---|---|---|---|
| *Aruarian Dance* piano MIDI, fan transcription | midishow.com/en/midi/aruarian-dance-nujabes-midi-download-166433 | MIDI, 3.1 KB, 2 tracks, 467 notes, 1:45, 80 bpm, B major (transposed) | Not stated; fan work of a copyrighted piece. Fine for private study |
| *snowfall* full arrangement MIDI (11 channels incl. drums) | nonstop2k.com/midi-files/23008-oneheart-reidenshi-snowfall-midi.html | MIDI, size not given, 2:08 | Paid (premium credits). Not free |
| *snowfall* piano sequences | onlinesequencer.net/3535569 and /4799411 | Browser sequence, MIDI export, small | Site licence proprietary; sequence rights unstated |
| MuseScore scores: *snowfall* (9068414, 11684071, 8545223), *Aruarian Dance* piano + drums (32521661), *controlla* (6170163) | musescore.com/user/…/scores/… | MSCZ / MIDI, small | Free to view; download usually needs an account and may need a paid plan; per-score rights |
| Kaggle "Lo-Fi Hip Hop MIDIs" (zakarii) | kaggle.com/datasets/zakarii/lofi-hip-hop-midi | MIDI set, size not shown | Licence not shown on the page I could read; one user says it is mostly melodies, few chords |
| Lo-Fi Drums Dataset | github.com/patchbanks/Lo-Fi-Drums-Dataset | 10,000 four-bar WAV loops, 12.9 GB, 50–90 bpm | CC BY 4.0. Synthetic, not from real tracks |
| *Feather* sample-breakdown FLP | patreon.com/posts/nujabes-feather-111689545 | FL Studio project | Paid Patreon |
| *Snowman* FL Studio remake | flpstudio.com/products/wys-snowman-fl-studio-remake-hip-hop | 83.7 MB zip (FLP, MIDI, samples) | Paid, $30.90; needs Serum, Kontakt 7, Kickstart 2 |

For checking §1 and §4, the MidiShow *Aruarian Dance* file and one MuseScore *snowfall* score are the useful ones: small, and they show whether the loop's top line repeats note for note. The drum set is off topic.

## Sources

- Stream counts: kworb.net artist pages for [Nujabes](https://kworb.net/spotify/artist/3Rq3YOF9YG9YfCWD4D56RZ_songs.html), [Jinsang](https://kworb.net/spotify/artist/5FsfZj0Mp6YwEWytuJUcWt_songs.html), [potsu](https://kworb.net/spotify/artist/5XE0fiZWGbq9TcSuWwJ1fA_songs.html), [Tomppabeats](https://kworb.net/spotify/artist/0Q2Tc5yZFJpumLMc7Yz4e4_songs.html), [Kupla](https://kworb.net/spotify/artist/7daSp9zXk1dmqNxwKFkL35_songs.html); idealism figure from a search summary of the same source.
- [Snowfall (song), Wikipedia](https://en.wikipedia.org/wiki/Snowfall_(song)): 1.2 bn streams, 2:04, viral on TikTok and Instagram.
- Hooktheory TheoryTabs: [snowfall](https://www.hooktheory.com/theorytab/view/oneheart-x-reidenshi/snowfall), [Feather](https://www.hooktheory.com/theorytab/view/nujabes/feather), [Aruarian Dance](https://www.hooktheory.com/theorytab/view/nujabes/aruarian-dance).
- Tempo, key, length: songbpm.com pages for [Monday Loop](https://songbpm.com/@tomppabeats/monday-loop), [Affection](https://songbpm.com/@jinsang/affection), [Feather](https://songbpm.com/@nujabes/feather), [controlla](https://songbpm.com/@idealism/controlla), [Kingdom in Blue](https://songbpm.com/@kupla/kingdom-in-blue), [[oops]](https://songbpm.com/@potsu/oops), [Snowman](https://songbpm.com/@wys/snowman); Tunebat via search for *i'm closing my eyes*; [Kingdom in Blue EP, Bandcamp](https://lofigirl.bandcamp.com/album/kingdom-in-blue).
- Samples (WhoSampled, via search summaries; the site blocks direct reads): [Affection](https://www.whosampled.com/Jinsang/Affection/), [Monday Loop](https://www.whosampled.com/sample/459754/Tomppabeats-Monday-Loop-Doris-Day-The-Mellomen-Again/), [i'm closing my eyes](https://www.whosampled.com/sample/522931/Potsu-I'm-Closing-My-Eyes-Shiloh-Dynasty-AUGUST-21,-2016/), [controlla](https://www.whosampled.com/cover/497704/Idealism-Controlla-Drake-Controlla/), [Aruarian Dance](https://www.whosampled.com/sample/92673/Nujabes-Aruarian-Dance-Laurindo-Almeida-The-Lamp-Is-Low/), [Feather](https://www.whosampled.com/Nujabes/Feather/); [Lady Brown, Wikipedia](https://en.wikipedia.org/wiki/Lady_Brown_(song)).
- Harp clips layered and alternated in *Affection*: [Harp Society feature on Dorothy Ashby](https://www.harpsociety.org/downloads/files/F7EPG2JDMREPKZCABTG-2021-summer-Dorothy-Ashby.pdf) (via search summary).
- Same drum loop across the *Luv(sic)* series: [warm pathways](https://warmpathways.substack.com/p/the-luvsic-hexalogy).
- *snowfall* MIDI channel list: [Nonstop2k](https://www.nonstop2k.com/midi-files/23008-oneheart-reidenshi-snowfall-midi.html).
- Chords from fan sites, lower trust: ChordU/Chordify for *Affection*, *controlla*, *Snowman*, *Monday Loop*; ukulele-tabs.com for *i'm closing my eyes*.
- Kupla's instruments: [Stereofox interview](https://www.stereofox.com/interviews/interview-kupla-mix/). Nujabes' live players: [Steppin' Into Tomorrow](https://www.steppinintotomorrow.com/post/the-misconception-of-music-being-lo-fi).
- Download candidates: [MidiShow](https://www.midishow.com/en/midi/aruarian-dance-nujabes-midi-download-166433), [Kaggle](https://www.kaggle.com/datasets/zakarii/lofi-hip-hop-midi), [Lo-Fi Drums Dataset](https://github.com/patchbanks/Lo-Fi-Drums-Dataset), [FLP Studio](https://flpstudio.com/products/wys-snowman-fl-studio-remake-hip-hop).
- lowtide code read: `src/form.js`, `src/stations.js`, `src/groove.js`, `src/plan.js`.
