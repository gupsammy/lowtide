# lowtide

A radio that writes its own lofi in the browser, from music rules rather than stock progressions, so no two tracks open alike. The plan and its reasons are in [SPEC.md](SPEC.md); how round 2 is built is in [DESIGN.md](DESIGN.md); the melody round in progress is in [MELODY.md](MELODY.md); how rendered tracks are measured is in [HEARING.md](HEARING.md).

## Run

```
npm run dev                  # http://localhost:8795/lab/listen.html
npm test
npm run openings             # the first seconds of a few tracks per station, with loudness and peak
node tools/diagnose.js       # measures 240 planned tracks against the targets in DESIGN.md, with each station's melody scores
node tools/kit.js <raw dir>  # rebuilds samples/ from the raw VCSL files (needs ffmpeg)
npm run render -- last-train 2026   # renders a lab batch, with stems and plan facts, into renders/
npm run hear                 # measures everything in renders/ (needs Python with librosa, and ffmpeg)
npm run test:hear
npm run judge                # scores everything in renders/ with Meta's Audiobox Aesthetics (needs uv; downloads 415 MB once)
```

There is no build step. The code is plain ES modules.

## Where things are

| File | What it does |
|---|---|
| `src/plan.js` | Seed + station → a whole track as data |
| `src/harmony.js` | Chord progressions from chord jobs (tonic, predominant, dominant), each chord coloured within its own scale |
| `src/voicing.js` | Spreads each chord so its notes move as little as possible, under the melody |
| `src/groove.js` | Drum patterns, swing, and how keys and bass sit on the beat |
| `src/melody.js` | A melody: an idea, a phrase form, a skeleton of chord notes, then decoration |
| `src/form.js` | Openings, section templates, energy |
| `src/critic.js` | Checks a plan and re-rolls weak or repeated tracks; scores its melody for surprise, fit and repetition |
| `src/stations.js` | Each station's limits |
| `src/render.js` | A plan's sections → dry, reverb and echo streams, and a whole track streamed section by section |
| `src/synth/` | Synth voices: electric and felt piano, bell, pad, soft lead and two basses (partly from loop-band) |
| `src/sampler.js` | Sampled piano, vibraphone and kalimba; each track's drum kit |
| `src/deck.js` | Echo, reverb, tape, vinyl and glue over the whole track |
| `src/meter.js` | Loudness in LUFS, and peak level |
| `src/wav.js` | Reads and writes WAV files |
| `samples/` | The sample kit, from the [VCSL](https://github.com/sgossner/VCSL) library (CC0) |
| `tools/` | Diagnostics, the sample-kit builder, a loader for `samples/` in Node, and the renderer and measures for hearing tracks (`render.js`, `hear.py`, `judge.py`) |
| `lab/listen.html` | Ten tracks to play in full, or opening after opening to hear sameness, with ratings you can export |
| `lab/styles.html` | The six visual styles we compared |
