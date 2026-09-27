# Better parts to build from: sound, mix and composition

Research for lowtide, 26 September 2026. It asks which free recordings, effects and composing aids would make the tracks sound less muddy and more complete. I used web search and read `src/`; I downloaded and installed nothing. `research/github-repos.md` already covers melody technique from other generators, so this brief does not repeat it.

**Two kinds of find.** *Code* (libraries, DSP, generators): the licence does not matter, since lowtide rewrites what it needs in its own style, so I judge only the idea and describe it well enough to rebuild. *Assets* (recordings, impulse responses, datasets, model weights): these ship with the app or feed it and cannot be rewritten, so each carries its licence.

## What the ear is hearing now

`HEARING.md` measured 30 renders. The mixes are **dark** (spectral tilt −5.9 to −9.0 dB per octave, median −7.8; pink noise is −3) and **near mono** (stereo correlation 0.85–0.99; 13 tracks at 0.95 or above). Reading the code, I think these are the causes. They are my reading, not yet tested one at a time:

- **Low-pass filters stack up.** A note can pass through its voice's own filter (felt: 600 Hz plus a velocity term; EP: 1.4–4.4 kHz; sampler: 900–7000 Hz by velocity squared), then the drum kit's (dusty: 4.5–7.5 kHz), the tape roll-off (6–10 kHz), the reverb's damping, and on some tracks the grit stage's lower sample rate. Each is mild; together they pile the energy into 120–500 Hz, the band `hear.py` calls mud.
- **Nothing clears the low mids.** No lane has a high-pass. Keys (register MIDI 54–61), pad (saws, filter at 300 Hz plus 900 Hz of sweep) and upright bass share 100–400 Hz. The reverb's input high-pass sits at 150 Hz, and the pad sends 1.4× to it, so the room fills the same band. The tape stage then adds 1.5–3 dB at 100 Hz.
- **Samples are mono at 22.05 kHz.** `tools/kit.js` stores every sample that way, so sampled parts hold nothing above 11 kHz and no stereo image. The upright uses one velocity layer (`vl2`) at 8 pitches a 4th or 5th apart, so notes are pitch-shifted by up to 3.5 semitones; that moves the body resonance and dulls the tone. Softer notes come only from a filter.
- **The felt piano has six harmonics.** After its low-pass, a medium-velocity note is mostly the first two. It has body but no edge, so chords blur.

"Something missing" fits this too. Computoser's listeners named fake-sounding instruments as their first complaint (41%; see `github-repos.md`). A real instrument's attack, key noise and stereo width tell the ear "a person played this", and lowtide's keys, the part heard most, are synthetic on two of three voices.

## Ranked: top 5 by gain for effort

### 1. Clear the low mids and stop stacking filters (code only, no download)

- **Idea.** Standard mix practice: high-pass every part above what it needs, EQ the reverb send, and let one stage own the tape darkening.
  - High-pass the tonal lanes: keys 120–180 Hz when a bass plays, pad 200–300 Hz, lead 200 Hz. Use 12 dB/oct (one RBJ biquad; `Biquad('hp', …)` exists).
  - Cut 2–4 dB at 250–350 Hz, Q about 1, on the keys and pad lanes.
  - EQ the reverb send, the "Abbey Road trick": high-pass near 600 Hz and low-pass near 10 kHz *before* the reverb, so the room stops filling the lows. Sources suggest starting there and tuning by ear.
  - Drop the per-voice low-passes to gentle shelves, or raise them, and let the tape roll-off be the one strong low-pass.
  - Widen: render sampled keys in real stereo (see 2 and 3); give the pad's unison copies wider pans; for mono sources, add a short (7–15 ms) delayed, filtered copy to one side at −12 dB. Correlation should fall to about 0.6–0.8.
- **Where.** `src/render.js`: a `MIX_EQ` table beside `MIX`/`VERB`, applied per lane before the sums (lanes are linear and time-anchored, so filters with state per section are safe as long as each section starts at rest, as `sweep` already does). `src/deck.js`: replace `vhL/vhR` (150 Hz) with the send EQ. `src/synth/voices.js` and `src/sampler.js`: raise the floor of each velocity low-pass.
- **Check.** `npm run hear` on a fixed set of seeds before and after: the median tilt should move from −7.8 toward −5, the low-mid band should drop, correlation should fall. Then listen and rate in the lab.
- **Effort.** An afternoon. **Gain.** Large for "muddy"; nothing for "missing".

### 2. A sampled electric piano with real velocity layers

The EP is the most drawn keys voice (weights 3, 2 and 4 of the lofi stations' keys). The FM model gets bark and tine but not the bell-and-bark mix that changes with touch.

- **Asset, first choice: Greg Sullivan's Wurlitzer EP200.** 51 FLAC files, 2.45 MB, 4 velocity layers (pp, mp, f, ff), keys every 3–7 semitones. **CC BY 3.0**: credit "Greg Sullivan" in the app. The same repo has a Yamaha CP80 and a Hohner Pianet T. [sfzinstruments/GregSullivan.E-Pianos](https://github.com/sfzinstruments/GregSullivan.E-Pianos). `smplr` ships the same set as its `ElectricPiano`.
- **For a Rhodes.** tim.kahn's *C_S Fender Rhodes Mark II* on Freesound: chromatic single notes, AIFF, one layer; his uploads are **CC BY 4.0** (check each sound's page; download needs a Freesound login). [freesound pack 3957](https://freesound.org/people/Corsica_S/packs/3957/). One layer means velocity must still come from a filter, so it adds less than the Wurlitzer.
- **Avoid, or ask first:** jRhodes3 (1977 Mark I, 5 layers, 16 MB). Its samples are **CC BY-NC-SA 4.0**. Non-commercial may suit lowtide, but ShareAlike covers the processed samples too. [jRhodes3c](https://github.com/sfzinstruments/jlearman.jRhodes3c).
- **Code to rebuild** (smplr, Tone.js `Sampler` and sfz players all work this way). Pick the region by key range and velocity range; crossfade the two nearest layers over ±8 velocity steps (equal power) so layer edges don't jump; use round-robin where a layer has several takes; on key-up, fade over the instrument's release time, and play a release sample if the set has one. smplr also ships a Dattorro plate reverb; see 4.
- **Where.** `src/sampler.js`: `sampledNote` picks by `midi` only; key it by `(midi, vel)` and read stereo. `tools/kit.js`: add the EP list and a `vel` field per sample; keep stereo for keys. `src/render.js` line 49: a `keysVoice === 'wurli'` branch, keeping FM `ep` for its own character. Keep the tremolo (`patch.tremRate`) and chorus; they suit a Wurlitzer.
- **Effort.** 1–2 days. **Gain.** Large: the part heard most becomes a real instrument.

### 3. A better piano: more layers, closer pitches, stereo, key noise

- **Assets**, best fit for lofi first:
  - **VCSL "Upright Piano, Knight"**: sustains in 2 velocity layers, sampled every whole tone (A, B, C♯, D♯, F, G) from the bottom octave to C7, plus separate *Releases* and *Pedal* noise folders. **CC0.** The sustains folder is 168 files, about 772 MB raw; lowtide needs about 50 of them. [VCSL](https://github.com/sgossner/VCSL) › Chordophones › Zithers.
  - **VSCO-2 CE "Upright Piano"**: 3 dynamic layers (dyn1–dyn3), 90 WAVs of 0.4–7.6 MB each. **CC0.** [VSCO-2-CE](https://github.com/sgossner/VSCO-2-CE) › Keys. VCSL also holds "Upright Piano, Yamaha" and three grands (Kawai, Steinway B).
  - **FreePats Upright Piano KW**: 2 layers, 32 MiB FLAC (a 2.9–6 MiB small version exists). **CC0.** [freepats](http://freepats.zenvoid.org/Piano/acoustic-grand-piano.html).
  - **Salamander Grand V3** (Yamaha C5): 16 layers every minor third, with hammer and string-release samples; 394 MiB as 44.1 kHz WAV. **CC BY 3.0.** Brighter and more "concert" than lofi usually wants, but the best free grand. [sfzinstruments/SalamanderGrandPiano](https://github.com/sfzinstruments/SalamanderGrandPiano).
  - **Splendid Grand** (Steinway): 4 layers, 256 MB FLAC. **Public domain** (Akai released it around 2000). [studiorack/splendid-grand-piano](https://github.com/studiorack/splendid-grand-piano).
  - **Not usable: Pianobook.** Its terms forbid passing the samples on unless mixed into your own music. Lowtide plays raw samples in the listener's browser, which is passing them on.
- **A felt piano from real samples.** No free CC0 felt piano turned up. Take the upright's soft layer, low-pass it gently (not the stacked filters of point 1), and add its key-release and pedal noises quietly. The noises carry most of the "felt piano in a small room" feel.
- **Where.** Same sampler change as 2. In `tools/kit.js`, sample every 3 semitones over MIDI 40–88 (17 pitches) so no note shifts by more than 1.5 semitones. In `src/render.js`, map `keysVoice` `upright` and `felt` to the new sets; keep the synth `felt` as a fallback while comparing.
- **Size at lowtide's format** (16-bit PCM WAV, 3 s per note):

  | Format | per second | 17 pitches × 2 layers | 17 × 3 |
  |---|---|---|---|
  | mono 22.05 kHz (today) | 44 KB | 4.5 MB | 6.7 MB |
  | mono 44.1 kHz | 88 KB | 9 MB | 13.5 MB |
  | stereo 32 kHz | 128 KB | 13 MB | 19.6 MB |
  | stereo 44.1 kHz | 176 KB | 18 MB | 27 MB |

  All pitched samples today total 3.9 MB. Stereo at 32 kHz with 2 layers is the middle ground: 11–16 kHz of top end, a real image. Release noises add about 0.5 MB. To halve these, lowtide could ship FLAC and decode it itself; a FLAC decoder is a few hundred lines, and neither the browser's `decodeAudioData` nor Node alone covers both runtimes.
- **Effort.** 1 day after 2. **Gain.** Large on piano tracks.

### 4. A reverb that stays out of the low end

The deck's reverb is an 8-line FDN with a Householder matrix, 30–73 ms lines, one-pole damping and a 150 Hz input high-pass. Three things are missing, and all three are known fixes:

- **Input diffusion.** Before the feedback loop, smear the input through a diffuser. Signalsmith's design ("Let's write a reverb", ADC 2021): split to 8 channels; 4 steps, each a set of random delays within 20, 40, 80, then 160 ms, then a channel shuffle with polarity flips, then an 8×8 Hadamard mix. Then the FDN with 100–200 ms lines and Householder feedback. Without diffusion, the first echoes sound like separate slaps and the tail grainy. [Signalsmith](https://signalsmith-audio.co.uk/writing/2021/lets-write-a-reverb/).
- **Decay set per band.** Fons Adriaensen's zita-rev1 (in the Faust `reverbs` library) sets two decay times: `t60dc` below crossover `f1` and `t60m` in the mids, with high damping above `f2`, inside an 8×8 FDN with an allpass in each line. A low-band T60 at about half the mid T60 keeps the room from booming. Lowtide's lows now ring as long as its mids. [Faust reverbs](https://faustlibraries.grame.fr/libs/reverbs/).
- **Slow modulation** of one or two line lengths (±0.5 ms at 0.1–1 Hz), as in the Dattorro plate (smplr and Faust `dattorro_rev` both carry it), to stop metallic ringing on sustained keys.
- **Convolution instead?** Possible: uniform partitioned FFT convolution (overlap-save, 1024-sample blocks on the absolute sample clock, so chunks still add up) costs, by my rough estimate, about 40 Mflop/s for stereo for a 2.5 s response at 44.1 kHz, fine in JS. But the algorithmic fix above gets most of the gain without assets.
- **Free impulse responses** if convolution is wanted: **Voxengo IM Reverbs**, 41 responses, 44.1 kHz 16-bit, 6.9 MB; free for any use including commercial, but you may not sell them and must keep the copyright notice. [voxengo.com/impulses](https://www.voxengo.com/impulses/). **OpenAIR** (University of York; most responses CC BY 4.0, some CC BY-SA, per response) was offline on 26 September 2026 ("account suspended"); York's research data portal lists it. I found no free plate or spring response with a clear licence.
- **Where.** `src/deck.js`, the reverb block: add a diffuser ahead of the `lines`, split `loss` into a low and a mid gain with a one-pole crossover in each line, add the send EQ from point 1. Keep the per-sample, chunk-invariant loop.
- **Effort.** 1 day. **Gain.** Medium to large for mud, most on high-`wet` stations (Rain Study).

### 5. New colours: jazz guitar, nylon guitar, reeds

Lofi players lean on guitar chords and wind leads (Kupla's clarinet; see `lofi-melody.md`). Lowtide has neither.

- **Assets, all CC0 from FreePats:**
  - FSBS Electric Guitar Clean #2 (Jazz), Fender, bridge pickup, amp and effects applied: 63 MiB FLAC; small version 2.4–5 MiB. [clean electric guitar](http://freepats.zenvoid.org/ElectricGuitar/clean-electric-guitar.html).
  - Spanish classical (nylon) guitar: 4.5 MiB FLAC; noise-reduced, since it was recorded in poor conditions. [acoustic guitar](http://freepats.zenvoid.org/Guitar/acoustic-guitar.html).
  - Tenor saxophone (from VCSL, with sustain loops): 31 MB FLAC, 4.7 MB compact. [saxophone](http://freepats.zenvoid.org/Reed/saxophone.html).
  - Clarinet: 6.7 MiB. [clarinet](http://freepats.zenvoid.org/Reed/clarinet.html). VSCO-2 CE also has clarinet, flute, oboe and strings, all CC0.
- **Where.** Guitars are plucked one-shots, like the vibes: add `INSTS` entries in `src/sampler.js`, list them in `tools/kit.js`, and add `keys: { …, guitar }` and `leads: { …, guitar }` weights in `src/stations.js`. For a guitar comp, stagger chord notes low to high by 15–30 ms (the `spreadMs` path in `render.js` already does this for keys). Reeds need held, looped notes with a slow vibrato fading in and legato between notes. Leave them until the sampler handles loops.
- **Effort.** Guitar: half a day after 2. Reeds: 2+ days. **Gain.** Medium: variety, and a human voice where the lead is now a synth.

## Also worth having

- **Groove templates from real drummers.** Magenta's Groove MIDI Dataset: 13.6 hours, 1,150 MIDI files played by 10 drummers on an e-kit, with style labels (hip-hop, jazz, funk, soul among 18) and real timing and velocity. **CC BY 4.0**, 3.11 MB MIDI-only. Mine it offline for each style's mean offset and spread (ms) and velocity per 16th-note slot, for kick, snare, hat and ghost notes, and store the tables in `src/groove.js`. That swaps lowtide's hand-picked `kickMs`/`snareMs`/`jitterMs` for measured feel. [magenta.tensorflow.org/datasets/groove](https://magenta.tensorflow.org/datasets/groove).
- **A jazz drum kit.** Virtuosity Drums (Versilian and Karoryfer): club kit with ride, cross-stick and 11 snare techniques, up to 36 dynamic layers, and a 1950s Shure mic position that suits lofi. **CC0**, 1.1 GB; take a few hits. [sfzinstruments/virtuosity_drums](https://github.com/sfzinstruments/virtuosity_drums). A ride and cross-stick would help Last Train.
- **Tape, done physically.** Chowdhury's tape model (DAFx 2019) runs the signal through Jiles–Atherton magnetic hysteresis, solved per sample with RK2 or RK4 at 2× oversampling, then playback-head losses (spacing, gap, thickness) that darken with tape speed. It gives softer, level-dependent compression than `tanh`. Worth it only after 1–4. [paper](https://ccrma.stanford.edu/~jatin/420/tape/TapeModel_DAFx.pdf). Airwindows (MIT) has smaller tape and console algorithms (ToTape, IronOxide, Console) worth reading.
- **Recorded vinyl and hiss.** Lowtide makes these itself; recordings would add little.
- **General MIDI sound fonts** (FluidR3 GM, MIT, 12.6 MB mono sf3; GeneralUser GS, own free licence, 30.7 MB; WebAudioFont): wide but plain. They trail the sets above for every instrument lowtide uses.

## Composition primitives

Judged against `github-repos.md`, which already mined the rule-based generators.

- **Magenta.js (MusicVAE, MelodyRNN, ImprovRNN).** Last release 1.23.1, November 2021, on an old TensorFlow.js. Checkpoints (Google Cloud; no weights licence stated): `mel_2bar_small` 17.7 MB, `mel_chords` (2-bar, chord-conditioned) 17.6 MB, `chord_pitches_improv` 5.6 MB. It might still run in the browser, and in Node with `tfjs-node`, but it breaks lowtide's rules: no build step, seeded and repeatable in both runtimes, small. lofigen-magenta used it only for 2-bar motifs that rules then fitted to chords; lowtide's `idea()` already does that job. **Skip.**
- **jacbz/Lofi's model.** A PyTorch VAE on a Flask server that outputs 100 numbers per track, rendered with Tone.js. Weights are in its GitHub releases, licence unstated. Too little inside to take. **Skip.**
- **tonal.js.** Theory helpers (scales, chords, voicings); lowtide's `theory.js` and `voicing.js` cover what it needs. **Skip.**
- **Data to mine for statistics, not to copy.** The melodies in these sets belong to their composers. Use them offline to measure things (interval odds, rhythm cells, where phrases rest), and ship only the numbers or short generic cells.
  - *Weimar Jazz Database*: 456 transcribed jazz solos, with a MIDI archive and pattern-mining tools (`melpat`). **ODbL 1.0** for the database. The best source for bebop cells and approach-note odds, measured from real players; it would replace guesses in rules 3 and 8 of `github-repos.md`. [jazzomat](https://jazzomat.hfm-weimar.de/download/download.html).
  - *Hooktheory* (via Sheet Sage): 26,175 annotated song sections, melody and chords in key-relative form, 20 MB JSON. **CC BY-NC-SA 3.0.** Good for pop and hook statistics. [sheetsage-data](https://github.com/chrisdonahue/sheetsage-data).
  - *POP909*: 909 Chinese pop songs, melody, bridge and piano accompaniment split into tracks. The dataset is **MIT**; the songs are not. Its piano track is a source of comping rhythms. [POP909](https://github.com/music-x-lab/POP909-Dataset).
  - *Chordonomicon*: 666,000 chord progressions with genre and section labels, 264 MB. **CC BY-NC 4.0.** Lowtide's harmony grammar is sound; use this only to check odds for jazz and soul tags.
  - *iRb corpus*: 1,186 jazz-standard chord charts (Broze and Shanahan, 2013); I did not find a licence.
  - Lakh MIDI and paid lofi MIDI packs (Cymatics and similar): scraped or sold for use in your own music, not to rebuild inside a generator. **Avoid.**
- **Primitive worth rebuilding: measured feel.** Of these, only the Groove MIDI tables (above) and Weimar-measured lick odds beat lowtide's hand-written rules in a way a listener would notice. Both are offline analysis and ship as small tables.

## Download list, for approval

Nothing below has been fetched. Sizes are as published; the size after conversion is what lowtide would ship.

| # | What | Source | Published size | Licence | Ships as |
|---|---|---|---|---|---|
| 1 | Wurlitzer EP200 (4 layers) | github.com/sfzinstruments/GregSullivan.E-Pianos | 2.45 MB FLAC (folder) | CC BY 3.0 | ~5–10 MB WAV |
| 2 | VCSL Upright Piano, Knight: about 50 sustains (MIDI 40–88, 2 layers) + releases + pedal | github.com/sgossner/VCSL | ~772 MB for all 168 sustains; ~160 MB for the ones needed | CC0 | 13–20 MB (stereo 32 kHz, 2 layers) |
| 3 | VSCO-2 CE Upright Piano (3 layers), to compare with 2 | github.com/sgossner/VSCO-2-CE | 90 files of 0.4–7.6 MB | CC0 | as 2 |
| 4 | FSBS Electric Guitar Clean #2 (Jazz), small | freepats.zenvoid.org/ElectricGuitar/clean-electric-guitar.html | 2.4–5 MiB | CC0 | ~3 MB |
| 5 | Spanish classical guitar | freepats.zenvoid.org/Guitar/acoustic-guitar.html | 4.5 MiB FLAC | CC0 | ~3 MB |
| 6 | Groove MIDI Dataset, MIDI only (offline analysis) | magenta.tensorflow.org/datasets/groove | 3.11 MB | CC BY 4.0 | tables, < 10 KB |
| 7 | Voxengo IM Reverbs (only if convolution is chosen) | voxengo.com/impulses | 6.9 MB | free use, no selling, keep notice | 1–2 responses, ~0.5 MB |
| 8 | Rhodes Mk II single notes (optional) | freesound.org/people/Corsica_S/packs/3957 | unknown (AIFF) | CC BY 4.0 (check per sound) | ~5 MB |
| 9 | Tenor sax, compact (later) | freepats.zenvoid.org/Reed/saxophone.html | 4.7 MB FLAC | CC0 | ~4 MB |
| 10 | Weimar Jazz Database + MIDI (offline analysis) | jazzomat.hfm-weimar.de/download | not listed | ODbL 1.0 | tables |
| 11 | Virtuosity Drums, a few hits (later) | github.com/sfzinstruments/virtuosity_drums | 1.1 GB whole | CC0 | ~1 MB |
| — | Salamander Grand V3 (if a grand is wanted) | github.com/sfzinstruments/SalamanderGrandPiano | 394 MiB WAV | CC BY 3.0 | as 2 |

Credits the app would need: Greg Sullivan (1), Google Magenta (6), Voxengo copyright notice (7), the Rhodes uploader (8), the Weimar Jazz Database (10), Alexander Holm (Salamander). CC0 items need none.

## Not checked

The exact velocity layers and pitches of FreePats' guitars and clarinet; the Rhodes pack's sound count and per-sound licences; OpenAIR's current home; whether Magenta.js runs on today's TensorFlow.js; the iRb corpus licence. None of the mix diagnosis above has been tested stage by stage; point 1's before-and-after `hear` run is that test.

## Sources

Samples: [VCSL](https://github.com/sgossner/VCSL), [VSCO-2 CE](https://versilian-studios.com/vsco-community/), [FreePats](http://freepats.zenvoid.org/), [Greg Sullivan E-Pianos](https://github.com/sfzinstruments/GregSullivan.E-Pianos/blob/master/README.md), [jRhodes3 licence](https://github.com/sfzinstruments/jlearman.jRhodes3c), [Salamander](https://sfzinstruments.github.io/pianos/salamander/), [Splendid Grand](https://github.com/studiorack/splendid-grand-piano), [Pianobook terms](https://www.pianobook.co.uk/terms-conditions/), [U. Iowa MIS](https://theremin.music.uiowa.edu/mis.html) (free for any project; anechoic, so dry and clinical for lofi), [Virtuosity Drums](https://versilian-studios.com/virtuosity-drums/), [smplr](https://github.com/danigb/smplr), [GeneralUser GS](https://github.com/mrbumpy409/GeneralUser-GS/blob/main/documentation/README.md).
DSP: [Signalsmith reverb](https://signalsmith-audio.co.uk/writing/2021/lets-write-a-reverb/), [Faust reverbs](https://faustlibraries.grame.fr/libs/reverbs/), [Voxengo IRs](https://www.voxengo.com/impulses/), [OpenAIR](https://www.york.ac.uk/physics-engineering-technology/research/communication-technologies/projects/open-acoustic-impulse-response-library/), [Abbey Road trick](https://flypaper.soundfly.com/produce/the-abbey-road-trick-how-to-eq-reverb-sends-to-free-up-space-in-a-mix/), [Chowdhury tape model](https://ccrma.stanford.edu/~jatin/420/tape/TapeModel_DAFx.pdf), [Airwindows](https://github.com/airwindows/airwindows).
Composition: [Magenta.js checkpoints](https://github.com/magenta/magenta-js/blob/master/music/checkpoints/README.md), [@magenta/music on npm](https://www.npmjs.com/package/@magenta/music), [jacbz/Lofi](https://github.com/jacbz/Lofi), [Groove MIDI](https://magenta.tensorflow.org/datasets/groove), [Weimar Jazz Database](https://jazzomat.hfm-weimar.de/download/download.html), [Sheet Sage / Hooktheory](https://github.com/chrisdonahue/sheetsage), [POP909](https://github.com/music-x-lab/POP909-Dataset), [Chordonomicon](https://huggingface.co/datasets/ailsntua/Chordonomicon), [iRb corpus](http://www.stacoscimus.com/irb-corpus-released/).
