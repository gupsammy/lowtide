# Melodious lofi leads: rules from producers and jazz players

Research for lowtide, 26 Sep 2026. It turns what producers, jazz teachers and melody studies say about leads into rules the engine can follow, each checked against it.

**How lowtide was measured.** I ran `plan()` on seeds 1–80 per station and counted lead notes. Figures are Last Train's; the other stations land within a few points.

## Where lowtide stands

| Measure | lowtide now | Sources point to |
|---|---|---|
| Lead-section bars with no lead note | 4% | about half |
| Notes per bar | 2.5 | lofi guides: few; Nujabes lines: 4–8 |
| Moves of 2 semitones or less | 71% | 89–95% (two Nujabes analyses); 60–80% (pop advice) |
| Chord tones: 1-3-5-7 / 9-11-13 | 70% / 18% | 62–89% (four Nujabes analyses) |
| Notes outside the chord's scale | 0% | half-step approach notes |
| Chord changes met by the new 3rd or 7th | 36% | most of them |
| Chances taken to step from a 7th down to the next 3rd | 12% | the core ii–V move |
| Closing long notes over a tonic chord | 33% | section ends land on the tonic |
| Sections whose top note sounds once | 31% | one climax |
| Bars 5–6 repeating bars 1–2: pitch / rhythm | 34% / 96% | the hook returns |
| Bars whose first note is on beat 1 | 78% | varied starts |
| A sections sharing one melody | 100% | vary the last |
| Lead timing | 4–16 ms late on every note, fresh jitter | on-beat notes late, off-beats on time |

**Already in line:** the register (about F4–B5, 5–12 semitones a track, like the Nujabes lines), chord tones on beats 1 and 3, the arch, turning back after a leap, an open then a closed cadence, and the pickup intro.

**What the artists show.** Interviews say little about melody craft; the numbers come from analyses and jazz teaching. [Nujabes](https://musictech.com/features/interviews/nujabes-lasting-impact-on-hip-hop-and-electronic-music/) built tracks from few parts: a beat, a bar or two of melody from a jazz record, perhaps a counter-line; Hooktheory's community analyses of four tracks give the table's figures. [idealism](https://www.stereofox.com/interviews/interview-idealism-mini-mix/) records piano chords and room sound before the drums; [Kupla](https://musicfinland.com/en/news/tomppabeats-kupla-and-idealism-superstars-of-low-fidelity-and-low-profile) adds clarinet and other wind leads to piano; [Jinsang](https://synergyfm.net/interview-with-jinsang/) samples old jazz and soul and keeps the flaws; [Philanthrope's](https://www.stereofox.com/interviews/interview-philanthrope/) interview says nothing on melody. [Dilla](https://www.ethanhein.com/wp/2022/dilla-time/) set straight and swung parts against each other and repeated the same timing quirks every loop. [Chillhop's](https://daily.bandcamp.com/features/chillhop-records-feature) sound is sample-based smooth jazz over boom-bap.

## Rules worth taking

Ranked by likely effect; rules 1 and 2 work as a pair. *Start* marks my first guesses, to tune in the lab; other numbers come from the sources.

### 1. Leave the band half the bars
- **Rule.** Plan the lead in 4-bar units: it plays 2 bars (sometimes 1 or 3) and rests to the end of the unit; *start* 35–50% of lead-section bars silent. Rests inside a phrase last an eighth or a quarter; gaps between phrases, 1–2 bars.
- **Why.** Space lets a phrase sink in and leaves the keys and echo room to answer. In the blues the voice takes 2 bars of each 4-bar line and an instrument the other 2; jazz teachers drill 1 bar on and 3 off, or 2 and 2.
- **Sources:** [Open Music Theory, blues](https://human.libretexts.org/Bookshelves/Music/Music_Theory/Open_Music_Theory_2e_%28Gotham_et_al.%29/06%3A_Jazz/6.09%3A_Blues_Melodies_and_the_Blues_Scale), [Jazzadvice](https://www.jazzadvice.com/lessons/exploring-space/), [Learn Jazz Standards](https://www.learnjazzstandards.com/blog/learning-jazz/jazz-advice/phrasing-space-can-radically-improve-solos/), [EDMProd](https://www.edmprod.com/using-call-and-response/), [Songer](https://songer.co/blog/posts/the-lo-fi-sound-explained-how-to-build-chill-beats-from-the-ground-up), [MusicProductionWiki](https://musicproductionwiki.com/articles/how-to-make-lofi-music).
- **lowtide: lacks.** Only the `call` form rests a bar. `FORMS` and `barShape` in `src/melody.js`.

### 2. Write a two-bar hook that returns with the loop
- **Rule.** One 2-bar hook per section type: *start* 4–8 notes, including one that starts off the beat and holds across the next, one a beat or longer, and one leap of a 4th to a minor 7th; steps elsewhere; at most 2–3 rhythm cells. Where a later bar has the same chords as an earlier one, repeat the melody pitch for pitch and change only the phrase ending. State the hook's rhythm three times per section, the third bending into the cadence. *Start:* bars 5–6 match bars 1–2 in 80% of sections whose chords repeat.
- **Why.** Repeated phrases cover 50–90% of most songs in a 909-song Chinese pop study; a period's second phrase restates the first idea. Earworms have long notes, small steps and a common shape, or else an unusual leap pattern.
- **Sources:** [Dai et al.](https://arxiv.org/abs/2010.07518), [Open Music Theory, period](https://openmusictheory.github.io/period.html), [Mintzer](https://www.midwestclinic.org/downloads?type=clinicpdf_1&cid=742), [EDMProd](https://www.edmprod.com/advanced-melodies-chord-tones-motifs/), [Jakubowski et al.](https://www.apa.org/pubs/journals/releases/aca-aca0000090.pdf).
- **lowtide: partly.** The idea is one bar; the skeleton search solves phrase 2 afresh against a higher arch. Lengthen `idea()` to two bars; copy phrase 1 into phrase 2 where `chordAt` matches (`src/melody.js`).

### 3. Close on the tonic; leave the turnaround to the band
- **Rule.** A closed ending (degree 1 or 3, held 2 beats or more) sounds over a tonic chord. If the loop's last bar isn't tonic, close on its last tonic bar and rest, or anticipate: start the last note on the "and" of 4 and hold it into a tonic downbeat. Open endings (2, 5, 7 or a colour note) may sit on any chord.
- **Why.** In the same songs, degree 1 and long notes gather at section ends: 72% of notes a bar or longer end a section, 6% end a phrase mid-section. An anticipation sounds the next chord's note early.
- **Sources:** [Dai et al.](https://arxiv.org/abs/2010.07518), [Puget Sound, anticipation](https://musictheory.pugetsound.edu/mt21c/Anticipation.html).
- **lowtide: lacks.** Every A or B section's closing note falls in bar 8; 33% sound over a tonic chord, 42% over a predominant, 26% over a dominant. The rule is my inference. Place cadences by each chord's `fn` in `writeMelody` (`src/melody.js`).

### 4. Meet chord changes with guide tones
- **Rule.** At a chord change, the sounding note (struck or held) is the new 3rd or 7th in *start* 60% of changes. A note on a 7th steps down a half or whole step to the next 3rd. A bar with two chords (ii–V turnarounds) gets a second target on beat 3. Over a tritone sub, aim at V7's guide tones, which the two chords share; ♭II7's #11 is V's root, a safe long note.
- **Why.** The 3rd and 7th name the chord, so they spell the changes without the bass; in *All the Things You Are* nearly every strong-beat note is a 3rd.
- **Sources:** [Learn Jazz Standards](https://www.learnjazzstandards.com/blog/learning-jazz/jazz-theory/use-guide-tones-navigate-chord-changes/), [The Jazz Resource](https://www.thejazzresource.com/guide_tones.html), [Mintzer](https://www.midwestclinic.org/downloads?type=clinicpdf_1&cid=742), [Hooktheory, tritone subs](https://www.hooktheory.com/blog/tritone-substitutions/), [Learn Jazz Standards, tritone subs](https://www.learnjazzstandards.com/blog/learning-jazz/jazz-theory/tritone-substitution-types/).
- **lowtide: partly.** A small bonus (0.35) rewards a guide tone, on each bar's first note only. Raise it, reward the 7→3 step, add the beat-3 target (`src/melody.js`).

### 5. Approach targets from a half step below
- **Rule.** Before *start* a third of the targets on beats 1 and 3, put a one-eighth approach note on the off-beat before it: a half step below, or a scale step above. Sometimes enclose: scale step above, half step below, target on the beat. Never on a strong beat; one approach group per bar at most. Exempt these notes from the rub rule; they resolve at once.
- **Why.** A half-step pull into a chord tone is core to jazz lines. From below it slips by; from above, a chromatic note clashes, so use a scale note.
- **Sources:** [Anton Schwartz](https://antonjazz.com/2019/07/approaches-enclosures/), [jazz-guitar-licks.com](https://www.jazz-guitar-licks.com/blog/lessons/target-notes-enclosures-jazz-guitar-lesson.html), [Piano With Jonny](https://pianowithjonny.com/piano-lessons/7-techniques-to-spice-up-a-jazz-melody/).
- **lowtide: lacks.** `realise()` in `src/melody.js`, plus the same exemption in the grind check in `src/critic.js` and in DESIGN.md's "0% anywhere" rub target.

### 6. Time the lead like a jazz soloist
- **Rule.** Delay on-beat lead notes against the drums (*start* 25–45 ms); keep off-beat notes within ±5 ms of the band's swung grid. Keep the lead's swing at or under 1.5:1 (amount ≤ 0.6) and below the hats'. Fix each note's offset once per written melody and replay it on every repeat.
- **Why.** Across 456 jazz solos, players delayed downbeats by about 30 ms (9% of a beat at 150 BPM, more when slower) and kept off-beats with the band. Musicians rated that as swinging more, at 7.5 times the odds of the quantised take; delaying every note didn't help. Soloists swing less than drummers. Dilla's quirks repeat each loop, so they sound meant.
- **Sources:** [Nelias et al.](https://www.nature.com/articles/s42005-022-00995-z), [Friberg & Sundström](https://online.ucpress.edu/mp/article-abstract/19/3/333/61900/Swing-Ratios-and-Ensemble-Timing-in-Jazz), [Ethan Hein, Dilla Time](https://www.ethanhein.com/wp/2022/dilla-time/).
- **lowtide: partly.** The lead leans 4–16 ms late with fresh jitter per note, so it often lands before the keys (8–22 ms late); on 8th-grid tracks its off-beats take the band's full swing (0.60–0.66). The lead's `ms` and swing in `src/plan.js`.

### 7. Develop the hook, don't replace it
- **Rule.** Build later bars from the hook by sequence (same shape a step or chord tone away), displacement (moved an eighth or a beat, across the bar line), fragmentation, augmentation (doubled note values, for endings) and new endings. *Start:* a third of phrases begin off beat 1: on the "and" of 1, on beat 2, or as a pickup.
- **Why.** Changing one thing while keeping rhythm or shape sounds planned, not aimless; varied starts give phrases intent.
- **Sources:** [Mintzer](https://www.midwestclinic.org/downloads?type=clinicpdf_1&cid=742), [The Jazz Piano Site](https://www.thejazzpianosite.com/jazz-piano-lessons/jazz-reharmonization/composition-and-melodic-development/), [Craig Buhler](https://craigbuhler.com/2022/02/28/demystifying-motivic-development/), [Jazzadvice](https://www.jazzadvice.com/lessons/exploring-space/).
- **lowtide: partly.** `barShape` has fragment, contrast (shape upside down) and cadence; no displacement or augmentation (`src/melody.js`).

### 8. One peak per section, late
- **Rule.** Place the section's highest note once, two-thirds to three-quarters of the way through (bar 6 of 8); keep that pitch out of the rest of the section.
- **Why.** The arch is among the commonest melodic shapes, and a common shape predicts an earworm; a recurring top note weakens the climax.
- **Sources:** [Open Music Theory, counterpoint](https://openmusictheory.github.io/firstSpecies.html), [The Jazz Piano Site](https://www.thejazzpianosite.com/jazz-piano-lessons/jazz-reharmonization/composition-and-melodic-development/), [Jakubowski et al.](https://www.apa.org/pubs/journals/releases/aca-aca0000090.pdf).
- **lowtide: partly.** Each 4-bar phrase arches to 62% and the last aims 15% higher, but the top note recurs in 69% of sections. Add a cost for reusing the top pitch (`src/melody.js`).

### 9. Let long notes carry colour
- **Rule.** On open endings and long notes, prefer a tension the chord allows: the 9th on major and minor chords, the 11th on minor, the 13th on dominants, the #11 on Lydian-dominant chords (tritone subs, backdoor ♭VII7). Resolve by step later in the bar or on the next chord, or hold it when the next chord contains it too (a pivot note). The 4th over a major chord stays a passing note.
- **Why.** A bar that opens on a tension puts the colour forward and moves the line on; resolution can wait. A note that fits several chords ties a loop together.
- **Sources:** [Berklee Today](https://www.berklee.edu/berklee-today/summer-2014/tension-and-resolution), [Wikipedia, avoid note](https://en.wikipedia.org/wiki/Avoid_note), [Mintzer](https://www.midwestclinic.org/downloads?type=clinicpdf_1&cid=742).
- **lowtide: partly.** The skeleton charges 0.25 for a tension target, though 16% of strong-beat notes are still colour notes; SPEC.md promised rests on 9ths, 11ths and major 7ths (`src/melody.js`).

### Where sources disagree
- **Scale.** Lofi guides say pentatonic or modal; jazz teaching says chord scales with chromatic approaches. My middle path: chord-tone targets, passing notes from the chord's scale minus its avoid note (often a pentatonic-like set), chromatic notes only as approaches.
- **Density and intervals.** Lofi guides say few notes, and one prefers wide leaps; the Nujabes lines run 4–8 notes a bar, mostly by step. So: a full hook, long gaps, one signature leap.
- **Repetition.** Lofi guides make repetition the point; jazz teachers vary an idea across three statements. So: repeat exactly while the loop repeats; vary the last statement.

## The lead's role in the arrangement

**When it plays.** Lofi tracks run about [two minutes](https://richardpryn.com/lofi-music-structure/) in 4–6 sections of 20–30 s; the melody joins on "chorus" loops and leaves "verse" loops to chords and drums. Producers [add or drop one part](https://blog.native-instruments.com/lo-fi-hip-hop-beats/) every 4 or 8 bars, and pull a tired part so its return lands. *Start:*
- First A: no lead, or a 1–2 bar pickup.
- Second A: the first full statement.
- B: no lead half the time; otherwise an answer with longer notes, starting higher than the hook.
- Break: lead alone with long gaps, or keys alone; never both busy.
- Last A: the hook, then a new ending.
- Outro: a fragment at most.

Now the lead plays every B and break once a track has one, entering at A1 (22% of tracks), A2 (28%), B (43%) or a pickup intro (7%). `sections()` in `src/form.js`.

**Trading with the keys.** Jazz compers [fill the holes](https://www.thejazzpianosite.com/jazz-piano-lessons/jazz-chord-voicings/how-to-comp/) a soloist leaves, play less under a busy line, and go high when the soloist is low; a [counter-line](https://pianowithjonny.com/piano-lessons/7-techniques-to-spice-up-a-jazz-melody/) stays active through the lead's rests and long notes. So when the lead rests, the keys answer with a busier comp or a 2–4 note fill from the voicing's top; when it plays, they hold or push. Keep the keys' top-voice peak off the lead's climax: [two voices](https://openmusictheory.github.io/firstSpecies.html) shouldn't peak together. Now the keys ignore the lead (`src/plan.js`, `COMPS` in `src/groove.js`).

**Echo.** On tracks with echo (60%), the whole lead feeds it (`ECHO.lead = 1` in `src/render.js`). Mix engineers [echo the note before a gap](https://www.musicguymixing.com/delay-throw/); with the lead in 96% of bars, repeats pile under the next notes. After rule 1, raise the send on phrase-final notes and lower it inside phrases.

**Repeating across A sections.** In the [909 songs](https://arxiv.org/abs/2010.07518), 20% of sections repeat the previous one exactly; 47% repeat only its end (29%) or start (18%). Jazz players [restate an idea](https://www.midwestclinic.org/downloads?type=clinicpdf_1&cid=742) about three times, changing it. *Start:* the first two A statements identical; the last A keeps bars 1–4 and changes the ending (wind-up, augmentation, displacement or an octave). Now every A shares one melody (the `melodies` cache in `src/plan.js`).

## Sources

Lofi practice and artists
- [Songer](https://songer.co/blog/posts/the-lo-fi-sound-explained-how-to-build-chill-beats-from-the-ground-up): 2-bar phrases, silence.
- [MusicProductionWiki](https://musicproductionwiki.com/articles/how-to-make-lofi-music): gaps, wide leaps.
- [Native Instruments](https://blog.native-instruments.com/lo-fi-hip-hop-beats/): counter-lines, layering.
- [Richard Pryn](https://richardpryn.com/lofi-music-structure/): track shape.
- [MusicTech on Nujabes](https://musictech.com/features/interviews/nujabes-lasting-impact-on-hip-hop-and-electronic-music/): few parts.
- Hooktheory TheoryTabs, [Aruarian Dance](https://www.hooktheory.com/theorytab/view/nujabes/aruarian-dance), [Lady Brown](https://www.hooktheory.com/theorytab/view/nujabes/lady-brown), [Feather](https://www.hooktheory.com/theorytab/view/nujabes/feather), [After Hanabi](https://www.hooktheory.com/theorytab/view/nujabes/after-hanabi): Nujabes figures.
- Stereofox, [idealism](https://www.stereofox.com/interviews/interview-idealism-mini-mix/), [Kupla](https://www.stereofox.com/interviews/interview-kupla-mix/), [Philanthrope](https://www.stereofox.com/interviews/interview-philanthrope/): working methods.
- [Music Finland](https://musicfinland.com/en/news/tomppabeats-kupla-and-idealism-superstars-of-low-fidelity-and-low-profile): Finnish producers.
- [Synergy FM](https://synergyfm.net/interview-with-jinsang/): Jinsang.
- [Bandcamp Daily](https://daily.bandcamp.com/features/chillhop-records-feature): the Chillhop sound.
- [Ethan Hein](https://www.ethanhein.com/wp/2022/dilla-time/): Dilla's timing.

Melody structure and memory
- [Dai, Zhang, Dannenberg 2020](https://arxiv.org/abs/2010.07518): repetition, phrase ends.
- [Jakubowski et al. 2017](https://www.apa.org/pubs/journals/releases/aca-aca0000090.pdf): earworm features.
- [EDMProd, melody guide](https://www.edmprod.com/advanced-melodies-chord-tones-motifs/): steps, rhythms.
- [EDMProd, call and response](https://www.edmprod.com/using-call-and-response/).
- [Open Music Theory, period](https://openmusictheory.github.io/period.html).
- [Open Music Theory, blues](https://human.libretexts.org/Bookshelves/Music/Music_Theory/Open_Music_Theory_2e_%28Gotham_et_al.%29/06%3A_Jazz/6.09%3A_Blues_Melodies_and_the_Blues_Scale).
- [Open Music Theory, counterpoint](https://openmusictheory.github.io/firstSpecies.html): one climax.
- [Puget Sound](https://musictheory.pugetsound.edu/mt21c/Anticipation.html): anticipation.

Jazz craft
- [Learn Jazz Standards, guide tones](https://www.learnjazzstandards.com/blog/learning-jazz/jazz-theory/use-guide-tones-navigate-chord-changes/).
- [The Jazz Resource](https://www.thejazzresource.com/guide_tones.html): 7th to 3rd.
- [Learn Jazz Standards, tritone subs](https://www.learnjazzstandards.com/blog/learning-jazz/jazz-theory/tritone-substitution-types/) and [Hooktheory](https://www.hooktheory.com/blog/tritone-substitutions/): shared guide tones.
- [Anton Schwartz](https://antonjazz.com/2019/07/approaches-enclosures/): approaches and enclosures.
- [jazz-guitar-licks.com](https://www.jazz-guitar-licks.com/blog/lessons/target-notes-enclosures-jazz-guitar-lesson.html): enclosure types.
- [Piano With Jonny](https://pianowithjonny.com/piano-lessons/7-techniques-to-spice-up-a-jazz-melody/): embellishment.
- [Berklee Today](https://www.berklee.edu/berklee-today/summer-2014/tension-and-resolution): tensions.
- [Wikipedia](https://en.wikipedia.org/wiki/Avoid_note): avoid notes.
- [Bob Mintzer, Midwest Clinic](https://www.midwestclinic.org/downloads?type=clinicpdf_1&cid=742): motif devices.
- [Craig Buhler](https://craigbuhler.com/2022/02/28/demystifying-motivic-development/): motif devices.
- [The Jazz Piano Site, composition](https://www.thejazzpianosite.com/jazz-piano-lessons/jazz-reharmonization/composition-and-melodic-development/): melody shape.
- [The Jazz Piano Site, comping](https://www.thejazzpianosite.com/jazz-piano-lessons/jazz-chord-voicings/how-to-comp/).
- [Jazzadvice](https://www.jazzadvice.com/lessons/exploring-space/): space drills.
- [Learn Jazz Standards, space](https://www.learnjazzstandards.com/blog/learning-jazz/jazz-advice/phrasing-space-can-radically-improve-solos/).

Timing and mix
- [Nelias et al. 2022](https://www.nature.com/articles/s42005-022-00995-z): downbeat delays.
- [Friberg & Sundström 2002](https://online.ucpress.edu/mp/article-abstract/19/3/333/61900/Swing-Ratios-and-Ensemble-Timing-in-Jazz): soloist timing.
- [Music Guy Mixing](https://www.musicguymixing.com/delay-throw/): delay throws.
