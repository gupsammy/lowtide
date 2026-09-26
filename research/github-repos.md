# Melody lessons from open-source composers

Research for lowtide, 26 September 2026. I read code from 18 projects through the GitHub and Codeberg APIs and ran none of it. Numbers come from source files unless a paper is cited; "Lowtide" lines describe `src/` today.

In short: for pitch, lowtide already does what the best rule-based composers do. It falls short on rhythm, on change across a track, and on the chromatic notes that make a line sound like jazz.

## Techniques worth taking

Ranked by how much I expect each to change how tuneful lowtide sounds. Items 1–9 apply to lofi now; H1–H5 wait for the house stations.

### 1. Let the melody arrive early

- **Rule.** Now and then, play a bar's target an 8th early, on the "and" of 4, and hold it over the barline; start some ideas off the beat. Impro-Visor's half-bar rhythms weight two quarters 0.6, four 8ths 0.6, a quick run 0.3, an 8th then a dotted quarter 0.3, 8th-quarter-8th 0.12 and a held half 0.06, so about one half bar in five is syncopated.
- **Source.** Impro-Visor `grammars/chord+approach.grammar` (github.com/Impro-Visor/Impro-Visor).
- **Why.** Jazz and lofi lines lean ahead of the beat; bars that all start on beat 1 sound square. Computoser's 44 listeners blamed rhythm (23%) second only to fake-sounding instruments (41%); melody got 12%.
- **Lowtide: has part.** The pickup after a cadence bar sits on the "and" of 4, but no target arrives early. About 70% of ideas start on the downbeat. The comp style `push` already lands every chord an 8th early; when it is on, push the melody's targets with it, so each early note sounds over its own chord. Elsewhere, start near one bar in four. Change `src/melody.js` (`ideaRhythm`, the output loop) and `src/critic.js` (judge an early note against the chord it anticipates).

### 2. Vary each return, one change at a time

- **Rule.** When a tune returns, change one thing and keep the downbeats. Computoser varies about half its motif repeats, with one kind of change per repeat so the motif stays clear: transpose 30%, invert 24%, reverse 17%, notes to rests 15%, new ending 7%, weak notes redrawn around fixed downbeats 3–8%. The last repeat ends on a stable note 90% of the time.
- **Source.** Computoser `src/main/java/com/music/MainPartGenerator.java`, `makeVariations` (github.com/Glamdring/computoser).
- **Why.** Repeats make a tune easy to remember; exact repeats grow dull. In MeloForm's listening tests (arXiv 2208.14345), copying a phrase to its repeats lost to developed repeats.
- **Lowtide: has part.** Within a phrase the idea already repeats over new chords. But `melodyFor` in `src/plan.js` writes each section's melody once, so A′ and A″ copy A note for note. Add a `vary()` step in `src/melody.js` for each later A, favouring changes that keep the chord fit: a new ending (degree 1 or 3 on the last A), one or two weak notes turned to rests, or one bar's weak notes redrawn.

### 3. Chromatic approach notes

- **Rule.** Pick the target first, then put a note a semitone away on the 8th before it: below when rising into the target, above when falling, never on the note just played. An enclosure circles the target first: Impro-Visor's cells include 6 then ♯4 around 5, and 8 then 6 into ♭7. Keep them rare: Kulitta adds a passing note 30% of the time and a neighbour 10%, and Impro-Visor's chord+approach grammar gives approach notes a few percent of slots.
- **Source.** Impro-Visor `src/imp/lickgen/LickGen.java` (`fillMelodyHelper`), `grammars/idiom.grammar`; Kulitta `Kulitta/Foregrounds/ClassicalFG.lhs` (github.com/donya/Kulitta).
- **Why.** In the Margulis expectancy model (Impro-Visor `src/imp/lickgen/Expectancy.java`), a semitone is the most expected move (36, against 32 for a tone and 24 for a repeat) and a chord tone the most stable goal. A chromatic slide into a chord tone gives tension, then the likeliest release: the sound of jazz, and of Last Train.
- **Lowtide: lacks.** The only approach is the scale-step pickup. The rub rule (`rubs` in `src/melody.js`, checked again in `src/critic.js`) bans any note a semitone above a keys note, so it blocks approach from above whenever the keys hold the target. Exempt notes of an 8th or less that fall off the beat and resolve by a semitone. Add the pass in `realise()`, with odds per station: say 0.3 per target on Last Train, 0.1 elsewhere.

### 4. A real walking bass for Last Train

- **Rule.** Four quarters a bar: the root on 1; chord tones near the last note on 2 and 3; on 4, a note that leads into the next chord, either a semitone from its root (lofigen) or a note of the next chord that the current one lacks (Pomax). Never repeat a pitch across the barline. Write each bar knowing the next bar's first note.
- **Source.** Pomax/walking-bass `src/generators/bass.js`. JJazzLab `plugins/JJSwing/src/main/java/org/jjazz/jjswing/bass/WbpsaScorer.java` (github.com/jjazzboss/JJazzLab) scores a phrase 100 when it lands on the next bar's first note, 0 when it repeats over the barline, 50 otherwise. lofigen-magenta `my-app/src/Patterns/Bassline.js` builds its line backward from the last bar.
- **Why.** A walking bass is a second melody that leads into each chord, and the user named it as part of Last Train.
- **Lowtide: has part.** `BASSLINES.walk` in `src/groove.js` is a two-feel: the root, a fifth or octave on 3, an approach on the "and" of 4. `src/plan.js` already knows the next root, so fill beats 2 and 3 with chord tones stepping toward it.

### 5. Vary the contour; let tracks differ in kind

- **Rule.** Choose a contour per phrase: arch 50%, ramp 25% (one way, turning at the edge of the range), terrace 25% (steps one way, a leap back every two bars). Computoser also sets switches per piece: syncopation in 25% of pieces, ornaments in 19%, a rising start in 65%.
- **Source.** Computoser `MainPartGenerator.java` (`chooseContour`, `handleContour`).
- **Why.** Every lowtide melody peaks at the same point of every phrase; over an hour of radio that sameness shows.
- **Lowtide: has part.** Form and idea vary per track, but `arch()` in `src/melody.js` always peaks at 0.62. Draw the contour per phrase at the `aim` line of `writeMelody`, and add melodic switches to the standout traits in `src/plan.js`.

### 6. Lift the B section

- **Rule.** Give B a higher average pitch or a wider span than A. MeloForm tags each phrase with both and raises them for a chorus.
- **Source.** microsoft/muzic `meloform/` (github.com/microsoft/muzic); arXiv 2208.14345.
- **Why.** Listeners preferred MeloForm with these tags to the same system without them.
- **Lowtide: has part.** All sections share one band, lead −5 to lead +7 (`src/plan.js`); only the last phrase aims higher. Raise B's band 2–3 semitones; the melody then spans 14–15 semitones, inside the critic's 19.

### 7. Allow more repeated notes

- **Rule.** About a quarter of moves in pop tunes repeat the note. Computoser's counts from 500 Hooktheory songs and 50 MIDI files: repeat 25%, step 48%, skip 25%, octave 2%.
- **Source.** Computoser paper, arXiv 1412.3079.
- **Why.** Repeats make a line sound sung and let rhythm carry it. Jazz lines repeat less (Impro-Visor's grammar sets avoid-repeats), so this suits the plainer stations.
- **Lowtide: has part.** In `idea()` a repeat has weight 0.8 of 10.9, about 7%, and `moveCost(0)` = 0.7 costs more than a whole step (0.3). Raise the weight toward 3 (about 23%) on songlike stations and cut `moveCost(0)` to about 0.3.

### 8. Bebop cells for Last Train fills

- **Rule.** Keep a book of four-note 8th cells in chord degrees and use one before a cadence. Impro-Visor's `grammars/idiom.grammar` has about 50, such as 5-6-♭7-7 (a chromatic climb to the root), 1-2-3-5 and 8-7-♭7-6. For longer runs, the bebop scale (major plus a passing note between 5 and 6) keeps chord tones on the beats; Strudel's Barry Harris example uses it (codeberg.org/uzu/strudel, `website/src/repl/tunes.mjs`).
- **Why.** These are the stock phrases of jazz, and the bar before a cadence is where players fill.
- **Lowtide: lacks.** Add a bar role in `src/melody.js` for bar 3 of the sentence on Last Train, about 20% of the time, fitted by `realise()`.

### 9. Octave doubling

Double the lead at the octave, as jacbz/Lofi and lofigen-magenta do, if HEARING.md's melody check finds it buried. Lowtide lacks it; the change would sit in `src/plan.js` where lead events are made.

### Already in lowtide, and backed by these projects

Chord tones on strong beats (Impro-Visor: chord tones 0.7, colour 0.15, scale 0.05); a skeleton, then decoration (Kulitta, Impro-Visor); one rhythm over new chords (Computoser reuses the last bar's lengths 55% of the time); the sentence (MeloForm's 8-bar motif, sequence, change, ending); a turn after a leap; a breath at phrase ends (Computoser rests there 75% of the time).

### For house (phase 2)

**H1. Riff: three notes over a root pedal.** trance-generator puts a 3-note motif on 3 chosen 16ths per half bar and the chord's root on 3 others; the motif stays fixed in the key while the pedal follows the chords. Most motifs mix a stable note (1, ♭3, 5, 8) with an unstable one (2, 4, ♭7). In the last 8 steps of every 4 bars, a variant keeps two notes and swaps one. acid-banger sets a note's odds by position: density times 0.6 on beats, 0.5 on steps divisible by 3, 0.3 on other even steps, 0.1 elsewhere, which pulls 3 against 4. *Why:* the pedal ties any notes to the key, and 3 against 4 gives drive without many notes. *Source:* apvilkko/trance-generator `src/pattern.js`; vitling/acid-banger `src/pattern.ts`. *Lowtide: lacks;* a riff writer would sit beside `writeMelody`.

**H2. Weighted pools, a target per chord.** acid-banger lists the root more than once in its pools ([0,0,12,24,27], or the Phrygian [0,1,7,10,12,13]). trance-generator's third lead picks a target per chord (its 3rd, 5th or octave), often holds the last note over the change, drifts to a motif note, then to a scale neighbour of the target, and lands on the target for the chord's last quarter; its notes fall every 3 sixteenths. *Why:* a heavy root keeps a Phrygian riff anchored, and a target per chord gives arrival. *Lowtide: has part;* the skeleton already aims at chord notes.

**H3. The maqam path for oud and duduk leads.** DiArMaqAr codes each maqam's traditional path. For Hijaz, whose 12-note cousin is Phrygian dominant: enter the tonic from a whole step below; linger in the lowest four notes (1 ♭2 3 4); treat the 4th as the pivot and mid-phrase rest; climb through 4 5 ♭6 ♭7 to the octave; coming down, raise the 7th so the top repeats the Hijaz shape (8 7 ♭6 5); touch the whole step below the tonic before the last note. Add grace notes to long notes; Computoser ornaments 6% of notes. *Why:* a scale gives the notes; the path gives their order. *Source:* Music-Intelligence-Lab/DiArMaqAr `data/maqamat.json` (maqām ḥijāz, after al-Ḥilū 1961 and al-Shawwā 1946). *Lowtide: lacks;* the `aim` in `writeMelody` could follow a path of target degrees.

**H4. Answers and echoes.** Strudel's examples answer a line with a copy of itself an 8th or a quarter later, a few steps or an octave up (`off`), and add fading copies (`echo`). Tidal's `_arp` (`tidal-core/src/Sound/Tidal/UI.hs`) has thumb-up and pinky-up modes that alternate each note with the lowest or highest, a pedal inside the arp. *Why:* one idea heard twice fills space without new material. *Lowtide: lacks;* stations have an echo effect, not written answers.

**H5. Motion over time.** acid-banger (`src/app.ts`) moves each knob every 100 ms with momentum: speed × 0.98 plus noise of 1/400 of the range, pushed back outside the middle 20–80%. On a grid, it redraws drum mutes every 8 bars (kick 20%, others 50%), a new line (50%) and drums (30%) every 16, and new notes (20%) every 64. Strudel sweeps cutoff with a slow sine (500–4000 Hz over 16 cycles) and drops one bar in eight. *Why:* SPEC gives the filter the motion in vamps; momentum drifts like a hand, and the grid puts changes where DJs expect them. *Lowtide: has part;* one intro type opens a low-pass over the keys (`sweep` in `src/render.js`), but nothing moves a filter through a section.

## Projects read

**vin-huynh/lofigen-magenta** (github.com/vin-huynh/lofigen-magenta). The closest cousin: rule-built chords (after a tonic pair, ii–V 60% or backdoor 40%; substitution odds per degree), MusicVAE motifs re-fitted to each 2-bar chord pair, notes snapped to the chord's scale in MIDI 54–77, bass built backward.

**jacbz/Lofi** (github.com/jacbz/Lofi). A Hooktheory-trained VAE gives 8th-note degrees; `client/src/producer.ts` merges repeats into long notes and varies tempo (70–100), swing (one track in ten), bass rhythm and presets.

**magenta/lofi-player and Melody RNN** (github.com/magenta/lofi-player, github.com/magenta/note-seq). lofi-player blends melodies with MusicVAE. Melody RNN's lookback encoder (`note_seq/encoder_decoder.py`) adds outputs that repeat one or two bars back; Magenta reports its melodies wander less.

**Impro-Visor.** The richest jazz source. Grammars build a rhythm, then fill slots by note class: chord, colour, approach, scale, rest, outside (`src/imp/lickgen/Terminals.java`). Grammars learned from players, such as `grammars/ChetBaker.grammar`, tie licks to chord idioms.

**Glamdring/computoser** (arXiv 1412.3079). Rules with odds from real songs, and the clearest code for motifs, variation, rests and contour. Its survey put it joint first with DarwinTunes (42% each), ahead of SoundHelix (34%).

**microsoft/muzic MeloForm.** An expert system writes to a form, then a network refines; only templates are public (`meloform/data/refine/expert_system/`). Motifs of 1–2 bars from chord tones; endings lower than the start or on long notes; at most 2 beats of rest a bar.

**generativefm/generators.** Alex Bainter's ambient pieces: slow mutation (Spring Again), a Markov chain that knows its place in the phrase (Aisatsana), notes that play 85% of the time (Remembering).

**donya/Kulitta.** A chord skeleton, then decoration from the scale both chords share; its jazz lead stays in MIDI 65–80 with no leap over 7.

**jjazzboss/JJazzLab and Pomax/walking-bass.** One tiles phrases of real walking bass; the other states the rules in a few lines.

**apvilkko/trance-generator.** The clearest riff rules found (H1, H2). Its chords lean on i, ♭VII and ♭VI.

**vitling/acid-banger** (1.2k stars). Its autopilot is a full model of change over time for loop music.

**Strudel, TidalCycles, Sonic Pi, scribbletune.** Tools, not composers, but their examples show Euclidean rhythms (3 or 5 of 8), a scale per chord, answers, echoes, sweeps, bar drops and guide-tone voicings (Strudel `packages/tonal/voicings.mjs`). Sonic Pi's `etc/examples/wizard/tilburg_2.rb` fixes a random riff by reseeding each loop.

**Music-Intelligence-Lab/DiArMaqAr.** Data: 145 maqams with scales up and down, four-note groups, pivots and paths; the only source on the order a player moves through Hijaz.

## Dead ends

- potch/lofibot: no melody to study.
- tonal.js and music21: theory and analysis libraries; they compose nothing.
- arman-aminian/lofi-generator and the lofi repos of brucejh99 and jacek-mcp: student models with no rules to lift.
- Andrea-Cavallo/cadenza, vectorclash/sound-generator, ee0pdt/lofi-stream, AntonioLujanoLuna/lofi-generator: recent repos whose melody code is simpler than lowtide's.
- Gogul09/deep-drum: drums and stock Magenta models, no melody rules.
- jisungk/deepjazz: an LSTM trained on one MIDI file; its note classes appear in fuller form in Impro-Visor.
- tidalcycles/strudel on GitHub: archived and empty; the code lives on Codeberg.
- Not read for lack of time: cyu2019/lofibot, drakh/acid-generator, shiehn/chords-to-melody-generator, musicpy.
