# Melody science: what makes a melody good, and how to score one

Research for lowtide, 26 Sep 2026. What music cognition says makes a melody pleasing and memorable, and which measures could score one from the plan (the critic, in JS) or from the audio (`tools/hear.py`). It pairs with [lofi-melody.md](lofi-melody.md), which gathers producers' and jazz players' rules.

"lowtide" lines use `node tools/diagnose.js` (240 plans) unless marked. **Untested** marks my own adaptations; check them against the lab's ratings before building on them.

## Generation rules, strongest evidence first

### 1. Move mostly by small steps
- **Rule.** Keep most intervals at 2 semitones or less; the larger the leap, the rarer.
- **Evidence.** More than half of all intervals in the Essen folk-song collection are 2 semitones or less; Temperley models the next note as a spread around the last with variance 7.2 (SD 2.7 semitones). Nearness to the last note is the steadiest predictor of which note listeners expect, and small intervals hold across nine world regions. (Temperley 2008; Schellenberg 1997; Savage et al. 2015)
- **lowtide: does.** 71.5% of moves are 2 semitones or less.

### 2. Repeat motifs, then phrases
- **Rule.** Build phrases from one or two motifs, repeat a phrase soon after it first sounds, and keep new material to a minority of the track.
- **Evidence.** In POP909 (909 Chinese pop songs), repeated phrases cover 50–90% of most songs, more than half of phrases repeat at once, and 79% of songs spend only 15–35% of their length on new material. People recognise pop sections faster when the melody repeats more, and remember new tunes better when motifs recur. Looping random tone sequences six times made them sound more musical (a small effect); splicing repeats into Berio and Carter made listeners enjoy it more. (Dai et al. 2020, 2022; Van Balen et al. 2015; Müllensiefen & Halpern 2014; Margulis 2013; Margulis & Simchy-Gross 2016)
- **lowtide: does.** One idea per section feeds the phrase forms, and A sections share one melody.

### 3. Keep surprise moderate
- **Rule.** Make most notes expected and a few surprising, with the peak on the predictable side.
- **Evidence.** 50 of 57 preference studies fit an inverted U against complexity. With IDyOM measuring surprise (information content, IC) and uncertainty (entropy), liking of melodies was quadratic in both. Gold et al. and Cheung et al. (pop chords) found surprises liked most in predictable contexts. A 2025 study of 240 melodies found the reverse: the best-liked surprise rose with uncertainty. It also found the peak on the predictable side, and a personal sweet spot that was higher in jazz lovers and retested only moderately (ICC .67). In uplifting trance, 20 fans' enjoyment of chord loops rose with surprise and levelled off (quadratic R² .42 against .38 for a line). (Chmiel & Schubert 2017; Gold et al. 2019; Cheung et al. 2019; Mas-Herrero & Marco-Pallarés 2025; Agres et al. 2017)
- **lowtide: lacks.** Nothing measures or steers surprise.

### 4. Stay in a narrow band and drift back to its middle
- **Rule.** Keep notes near the section's central pitch; the further a note strays, the likelier the next heads back.
- **Evidence.** Within an Essen melody, pitch varies around the melody's mean with variance 10.6 (SD 3.3 semitones). Temperley's model of this pull, plus rule 1 and a key profile, predicts listeners' ratings of continuation tones at r = .74 with corpus values, .88 fitted. (Temperley 2008; von Hippel & Huron 2000)
- **lowtide: does.** The band spans 12 semitones, and the skeleton aims at an arch inside it.

### 5. Turn back after a leap
- **Rule.** After a leap of 7 semitones or more, change direction, ideally landing within 2 semitones of the note before the leap.
- **Evidence.** Listeners expect this: Schellenberg's two factors (nearness, reversal) fit ratings at r ≈ .85. In song from four continents most large leaps turn back, largely because leaps land near the edge of the range. A melody network tuned with rewards including leap resolution beat its untuned self with listeners (192 paired ratings, p < .001); the two versions that resolved about 90% of leaps also beat one that resolved 52%. (Schellenberg 1997; Schellenberg et al. 2002; Pearce & Wiggins 2006; von Hippel & Huron 2000; Jaques et al. 2017)
- **lowtide: partly.** The idea turns back after any move of 2 scale steps or more, but nothing checks the joins between bars. 71.5% of leaps of a 4th or more turn back.

### 6. Chord tones on strong beats; other notes resolve by step
- **Rule.** Put chord tones on beats 1 and 3. Move from each non-chord tone by 2 semitones or less to a chord tone.
- **Evidence.** Listeners rated tone sequences best with no non-chord tones, next when each non-chord tone led by step to a chord tone, worst otherwise. More chord tones is not always better: human pop melodies with their own chords score 0.74 on the chord-tone ratio (M5), machine harmonisations of the same melodies 0.82–0.91, and 202 listeners still rated the human chords most harmonious. Eight bebop saxophonists play chord tones 50–54% of the time and scale tones 78–83%. (Povel & Jansen 2002; Cuddy et al. 1981; Yeh et al. 2021; Haviv Hakimi et al. 2020)
- **lowtide: partly.** Strong beats are chord tones; weak notes avoid rubs but need not resolve by step.

### 7. Arch or fall within a phrase, with one peak
- **Rule.** Rise to a single top note near mid-phrase and fall after it, or fall throughout. Avoid lines that climb and stay up.
- **Evidence.** About 40% of some 10,000 Essen phrases arch, the commonest shape, then falling ones. Arched or falling contours hold world-wide and in birdsong. Of 100 earworms against 100 matched songs, earworms had more common overall contours; the rare ones included lines that rise and never fall. (Huron 1996; Savage et al. 2015; Tierney et al. 2011; Jakubowski et al. 2017)
- **lowtide: partly.** The skeleton aims at an arch peaking 62% through each phrase, but the top note recurs in 69% of sections (lofi-melody.md). Phrase peaks fall 34 / 20 / 40 / 7% across the four quarters.

### 8. End phrases long and stable
- **Rule.** End each phrase on a longer note on a stable degree (1, 3, 5), and each section on the tonic.
- **Evidence.** In POP909 the tonic ends 35% of phrases against about 20% elsewhere, phrase ends mostly hold longer notes, and 72% of whole-note-or-longer notes end sections. Long final notes appear in song and birdsong. Fitted to listeners' ratings, Temperley's model weighted the tonic 20 times higher as a final note. (Dai et al. 2020, 2022; Tierney et al. 2011; Temperley 2008)
- **lowtide: does.** Cadence bars hold three beats; closed cadences end on 1 or 3.

### 9. Few note lengths, some syncopation
- **Rule.** Build rhythms from two or three note lengths; syncopate some notes, not most.
- **Evidence.** Few note lengths is a world-wide tendency. For drum grooves, 66 listeners felt most pleasure at medium syncopation (quadratic R² .43). (Savage et al. 2015; Witek et al. 2014)
- **lowtide: partly.** Lengths are 1–4 eighths; nothing plans or measures syncopation.

### 10. Step down, leap up
- **Rule.** Prefer falling steps; leap upward and step back down.
- **Evidence.** Corpus counts only: in Western melodies small intervals fall more often than they rise, large ones rise more often. (Vos & Troost 1989; Huron 2006)
- **lowtide: partly.** Steps lean down 4:3, but the idea's rare leaps lean down too.

### 11. One distinctive motif, stated often
- **Rule.** Give each track a motif unlike recent tracks', and repeat it.
- **Evidence.** Mixed. People remembered melodies better when their motifs were rare in a pop corpus but repeated in the song. Yet typical melodies were recognised faster, and earworms had common contours, though uncommon slopes between turning points. (Müllensiefen & Halpern 2014; Van Balen et al. 2015; Jakubowski et al. 2017)
- **lowtide: lacks.** The critic compares traits with recent tracks, not melodies.

## Measures to score a melody

Take one section's lead notes in beat order, nᵢ = {beat, len, midi}, with ivᵢ = midiᵢ − midiᵢ₋₁, and chord(b) the pitch classes sounding at beat b, both as a triad and as the full voicing. Score each section's first statement; repeats add nothing new.

To test a measure, compare its median in liked and disliked tracks, fit like ~ x + x² by logistic regression, and keep it only if it holds under leave-one-out and on a fresh batch. Start with M3, M5 and M8: cheap, in JS, and tied to strong rules.

### M1. Steps and turn-backs *(critic; in diagnose.js now)*
- **Formula.** steps = share of |iv| ≤ 2. turnBack = share of leaps (|iv| ≥ 5) whose next interval reverses direction.
- **Target.** steps above 50% with no ceiling (Essen just over half; Nujabes lines 89–95%, per lofi-melody.md). turnBack ≥ 75% (**untested**). Now 71.5% and 71.5%.

### M2. Two-factor expectancy *(critic)*
- **Formula.** For each note from the third: proxᵢ = |ivᵢ|. revᵢ = a + b, where a = +1 if |ivᵢ₋₁| ≥ 7 and ivᵢ changes direction or repeats the note, −1 if |ivᵢ₋₁| ≥ 7 and it keeps direction, else 0; b = 1.5 if |midiᵢ − midiᵢ₋₂| ≤ 2, else 0. Report both means.
- **Evidence.** With a key term, it explains 68–75% of the variance in continuation ratings; IDyOM explains 72–83%, and far more on chorales (63% against 13%).
- **Target.** A cheap first cut of M3; no target alone.

### M3. Surprise per note, Temperley's model *(critic)*
- **Formula.** For each pitch p in MIDI 21–108, w(p) = G(p; c, 29) · G(p; prev, 7.2) · K[(p − tonic) mod 12], where G is a normal density with that variance, c the section's mean pitch, prev the last note, and K a 12-value key profile summing to 1. ICᵢ = −log₂(w(midiᵢ) / Σₚ w(p)); the first note drops the prev term. Report mean IC and its spread.
- **Evidence.** Rule 4's r = .74; liking is an inverted U in IC (rule 3).
- **Target.** None in the literature: fit a band around the lab's peak.
- **Details.** Take K from Temperley's Essen profiles or the Krumhansl–Kessler ones hear.py already uses. Profiles for Dorian, harmonic minor and Phrygian dominant, and a chord-aware K, are **untested**. Using the section mean for c simplifies the paper.

### M4. Surprise with memory, IDyOM *(offline Python on exported plans)*
- **Formula.** IDyOMpy or GraphIDyOM with pitch, interval and onset viewpoints, a long-term model trained on a melody corpus, and a short-term model of the track. Mean IC and mean entropy H per section.
- **Evidence.** 63–83% of expectancy variance; liking quadratic in both. The 2025 study's best model valued a melody as −(IC − s·H)², with s the listener's sweet spot.
- **Target.** Fit s to the lab's likes. Port to JS only if it beats M3.

### M5. Melody–chord fit *(critic)*
- **Formula.** Count chord tones n_c, non-chord tones n_n, and n_p, the non-chord tones whose next note lies within 2 semitones. CTnCTR = (n_c + n_p) / (n_c + n_n). Also: strong-beat chord-tone share, and anchoring, the share of non-chord tones followed by a step to a chord tone.
- **Target.** Triad CTnCTR 0.7–0.9 (rule 6); anchoring ≥ 0.8 (**untested**). Compute a full-voicing version too, where 7ths and 9ths count; lofi-melody.md finds lowtide at 70% on 1-3-5-7 and 18% on 9-11-13.

### M6. Contour *(critic; peak position in diagnose.js now)*
- **Formula.** Per 4-bar phrase, Huron's classes: compare the first note, the mean of the inner notes and the last note (convex if the middle is above both ends, descending if first > middle > last, and so on). Record whether the top note is unique and where it falls.
- **Target.** Mostly convex or descending, one top note each.

### M7. Pitch-class entropy *(critic)*
- **Formula.** H = −Σₖ pₖ log₂ pₖ over the 12 pitch classes of a 4-bar phrase.
- **Evidence.** With tonal ambiguity, interval size and duration entropy, one of the four best predictors of rated melodic complexity (pooled R² .45 over seven datasets). Real jazz solos score 2.87 bits per 4 bars; generated ones, rated worse, 2.9–3.1.
- **Target.** Compare with liked tracks. H cannot exceed log₂ of the note count, so skip phrases under 8 notes.

### M8. Repetition *(critic)*
- **Formula.** (a) Bar repeats: share of lead bars matching an earlier bar's rhythm and intervals at any pitch. (b) Motif reuse: share of 3-note motifs (two intervals plus onset gaps) occurring twice or more in a section. (c) New material: share of the track's lead beats that copy nothing earlier.
- **Target.** (c) 15–35% (POP909); lofi may run lower.

### M9. Rhythm *(critic)*
- **Formula.** Groove consistency = 1 − mean Hamming distance between the 16-slot onset vectors of neighbouring non-empty bars, ÷ 16. Syncopation: Longuet-Higgins and Lee's index on lead onsets.
- **Evidence.** Real jazz solos score 0.86 and generated ones 0.69–0.76 (all bar pairs, 64-slot grid, so only a rough guide); medium syncopation works best for drums.
- **Target.** Consistency ≥ 0.8 (**untested**); fit syncopation to ratings.

### M10. Distinctiveness *(critic)*
- **Formula.** Share of the idea's 3-note motifs found in the last 10 tracks' ideas. Weak evidence (rule 11); it serves variety more than memory. Keep low.

### M11. Tonal tension *(offline Python; low priority)*
- **Formula.** Herremans and Chew's spiral-array measures per bar (cloud diameter, cloud momentum, tensile strain), for example via midi-miner.
- **Evidence.** Lerdahl's tension model predicts rated tension; in the trance study, cloud momentum fit enjoyment with quadratic R² .39. These score the harmony more than the melody.

### M12. Audio *(hear.py)*
- **Lead audibility**, measured now. Vocal prominence had the strongest effect on how fast listeners recognised pop sections; keep the check.
- **Pitch fidelity.** Track the lead stem with librosa's pyin and count planned notes heard within 50 cents; tape wow can smear a line. An engineering check, not a liking predictor.
- **Structure.** Wu and Yang's indicator: peaks of a fitness scape plot from a chroma self-similarity matrix, for repeats of 3–8 s, 8–15 s and over 15 s. Real jazz scored 0.35–0.36, generated 0.10–0.27, and listeners rated the generated structure worse. Needs Müller's fitness method (libfmp).
- **Learned judges.** Audiobox Aesthetics' best axis (Content Usefulness) matches human musicality judgments at only Spearman .26, and scores lo-fi instruments lower on its Production Complexity axis. SongEval rates memorability but learned from sung songs. Use either only to rank tracks within one station.

## Cautions

- **Other music.** Nearly all this evidence comes from folk songs, hymns, chorales and sung pop. lowtide's leads are instrumental, sparse and looped; the hook is often the chord loop or bass, and no voice limits range. Treat every number as a starting point for the lab.
- **Loops defeat memory-based surprise.** A short-term model learns a loop at once, so IC drops near zero on repeats. Score first statements, or use the long-term model alone.
- **Bland melodies win many metrics.** Step share, chord-tone share, in-scale rate, low entropy, groove consistency and model probability all peak on a melody that repeats one note. Use bands, not maxima, beside a surprise measure. The harmonisations that fit best lost to human ones, and the untuned network, with 63% of its notes in runs of repeated notes, lost to its tuned versions.
- **Small effects.** Feature models of melody memory kept R² .09 and .25 under cross-validation; hook features explained 6–10% of recognition speed; the earworm classifier reached 62.5% against 50% chance. Measures can veto weak candidates; don't expect them to rank good ones.
- **One listener, shifting context.** The best surprise level differs between people, and the other melodies in a session change how much each is liked. Compare measures within a lab batch (z-scores) and fit this listener, not the average.
- **Purpose.** In one study, people preferred moderate complexity during yoga and simple music during aerobics. Study lofi and dance house both point to simpler lines than lab optimums, and US chart melodies have grown simpler since 1950.
- **Western major and minor.** Folk-trained models will call Phrygian-dominant and harmonic-minor notes surprising. Build key profiles per mode.
- **Triads miss lofi's colour.** Triad-based fit metrics count 7ths and 9ths as wrong notes; compute both versions (M5).
- **Anticipations.** Pop melodies often land just before the beat; judge an anticipated note against the chord it anticipates.
- **Many measures, few ratings.** With a dozen measures and a few dozen ratings, some will match by chance. Pick three to five before looking, test with leave-one-out, and confirm on a fresh batch.

## Sources

Expectation and melodic statistics
- [Temperley 2008](https://davidtemperley.com/wp-content/uploads/2015/11/temperley-cs08.pdf): range × proximity × key model, parameters, fits.
- [Schellenberg 1997](https://online.ucpress.edu/mp/article-abstract/14/3/295/61992/Simplifying-the-Implication-Realization-Model-of): Narmour's model cut to two factors.
- [Schellenberg et al. 2002](https://www.brainmusic.org/EducationalActivities/Schellenberg_melody2002.pdf): exact coding of the two factors.
- [Pearce & Wiggins 2006](https://eprints-gro.gold.ac.uk/1001/2/COM_2006-Pearce-Wiggins.pdf): IDyOM against the two-factor model.
- [von Hippel & Huron 2000](https://online.ucpress.edu/mp/article-abstract/18/1/59/62088/Why-Do-Skips-Precede-Reversals-The-Effect-of): leap reversal as regression to the mean.
- [Huron 1996](https://www.researchgate.net/publication/239063783_The_Melodic_Arch_in_Western_Folksongs): the arch in Essen phrases.
- [Huron 2006, *Sweet Anticipation*](https://archive.org/details/sweetanticipatio0000huro): proximity, step declination, regression, arch.
- [Vos & Troost 1989](https://www.jstor.org/stable/40285439): interval size and direction.
- [Savage et al. 2015](https://www.pnas.org/doi/10.1073/pnas.1414495112): statistical universals of music.
- [Tierney, Russo & Patel 2011](https://www.pnas.org/doi/10.1073/pnas.1103882108): arches, long final notes, small steps in song and birdsong.
- [Eerola 2016](https://emusicology.org/index.php/EMR/article/view/4836): models of melodic complexity.
- [Tan, Lustig & Temperley 2019](https://davidtemperley.com/wp-content/uploads/2019/04/tan-lustig-temperley.pdf): anticipatory syncopation in rock.

Liking and surprise
- [Gold et al. 2019](https://www.jneurosci.org/content/39/47/9397): inverted U in surprise and uncertainty.
- [Mas-Herrero & Marco-Pallarés 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12304940/): personal sweet spots.
- [Cheung et al. 2019](https://www.stefan-koelsch.de/papers/cheung_harrison_meyer_pearce_haynes_koelsch_2019_uncertainty_and_surprise_jointly_predict_musical_pleasure_and_amygdala_hippocampus_and_auditory_cortex_activity_current_biology_29.pdf): surprise and uncertainty in pop chords.
- [Chmiel & Schubert 2017](https://journals.sagepub.com/doi/full/10.1177/0305735617697507): review of 57 preference studies.
- [Albury et al. 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10684779/): context changes liking.
- [Agres et al. 2017](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2016.01999/full): harmony and enjoyment in uplifting trance.
- [Witek et al. 2014](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0094446): syncopation, pleasure, groove.
- [North & Hargreaves 2000](https://psycnet.apa.org/record/2000-12388-003): preferences during relaxation and exercise.

Memory, hooks and repetition
- [Jakubowski et al. 2017](https://www.apa.org/pubs/journals/releases/aca-aca0000090.pdf): melodic features of earworms.
- [Müllensiefen & Halpern 2014](https://research.gold.ac.uk/id/eprint/10838/1/PSY-Mu%CC%88llensiefen2014.pdf): features and memory for new melodies.
- [Van Balen et al. 2015](https://archives.ismir.net/ismir2015/paper/000148.pdf): what makes pop sections recognisable.
- [Margulis 2013](https://journals.sagepub.com/doi/10.2190/EM.31.1.c): added repetition in unfamiliar music.
- [Margulis & Simchy-Gross 2016](https://mp.ucpress.edu/content/33/4/509): repetition makes random tones musical.
- [Dai, Zhang & Dannenberg 2020](https://arxiv.org/abs/2010.07518): structure in POP909.
- [Dai, Yu & Dannenberg 2022](https://arxiv.org/abs/2209.00182): repetition across a song.
- [Hamilton & Pearce 2024](https://www.nature.com/articles/s41598-024-64571-x): US chart melodies since 1950.

Harmony fit and tension
- [Povel & Jansen 2002](https://www.researchgate.net/publication/249979650_Harmonic_Factors_in_the_Perception_of_Tonal_Melodies): implied harmony and goodness ratings.
- [Cuddy, Cohen & Mewhort 1981](https://pubmed.ncbi.nlm.nih.gov/6457099/): structure in short melodies.
- [Yeh et al. 2021](https://arxiv.org/abs/2001.02360): harmonisation metrics, 202-listener test.
- [Haviv Hakimi et al. 2020](https://program.ismir2020.net/static/final_papers/132.pdf): BebopNet, chord- and scale-tone rates.
- [Lerdahl & Krumhansl 2007](https://online.ucpress.edu/mp/article-abstract/24/4/329/95267/Modeling-Tonal-Tension): tension model tested on listeners.
- [Herremans & Chew 2016](http://dorienherremans.com/sites/default/files/paper_tenor_dh_preprint_small.pdf): tension ribbons.
- [midi-miner](https://arxiv.org/abs/1910.02049): tension measures in Python.

Metrics for generated music
- [Jaques et al. 2017](https://arxiv.org/abs/1611.02796): theory-rule rewards and a listener test.
- [Wu & Yang 2020](https://arxiv.org/abs/2008.01307): pitch-class entropy, groove, structure indicator.
- [MGEval](https://github.com/RichardYang40148/mgeval): features for comparing sets of music.
- [MusPy metrics](https://hermandong.com/muspy/metrics.html): scale and groove consistency.
- [Kader & Karmaker 2025](https://arxiv.org/abs/2509.00051): survey of evaluation metrics.
- [Zhang et al. 2025](https://arxiv.org/abs/2504.21815): Audiobox Aesthetics against human judgments.
- [SongEval](https://arxiv.org/abs/2505.10793): song ratings, including memorability.
- [IDyOMpy](https://github.com/GuiMarion/IDyOMpy), [GraphIDyOM](https://arxiv.org/abs/2607.25787): IDyOM in Python.
- [Computational Features for Symbolic Melody Analysis 2026](https://arxiv.org/abs/2608.19061): the melody-features package (FANTASTIC, IDyOM and more).
