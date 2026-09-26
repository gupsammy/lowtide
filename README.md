# lowtide

A radio that writes its own lofi in the browser, from music rules rather than stock progressions, so no two tracks open alike. The plan and its reasons are in [SPEC.md](SPEC.md).

## Run

```
npm run dev        # http://localhost:8795/lab/listen.html
npm test
npm run openings   # prints the first seconds of a few tracks per station, with levels
```

There is no build step. The code is plain ES modules.

## Where things are

| File | What it does |
|---|---|
| `src/plan.js` | Seed + station → a whole track as data |
| `src/harmony.js` | Chord progressions from chord jobs (tonic, predominant, dominant) and colour swaps |
| `src/voicing.js` | Spreads each chord so its notes move as little as possible |
| `src/groove.js` | Drum patterns, swing, and how keys and bass sit on the beat |
| `src/melody.js` | A motif and its development into phrases |
| `src/form.js` | Openings, section templates, energy |
| `src/critic.js` | Checks a plan and re-rolls weak or repeated tracks |
| `src/stations.js` | Each station's limits |
| `src/render.js`, `src/synth/` | Plan → audio (synth voices partly from loop-band) |
| `lab/listen.html` | Ten tracks' openings side by side, to hear sameness |
| `lab/styles.html` | The six visual styles we compared |
