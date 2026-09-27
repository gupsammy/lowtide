#!/usr/bin/env python3
"""Turns each stem folder's bass.wav and other.wav into notes with Spotify's basic-pitch (see research/stems.md).
Writes <stem>.mid and <stem>.notes.json as [start, end, midi, amp], sorted by start. Skips stems already done.

    uv run --no-project --python 3.11 --with basic-pitch --with 'setuptools<81' python tools/transcribe.py downloads/stems/*/

On macOS basic-pitch runs its CoreML model, so TensorFlow isn't needed. 1–4 s a stem. setuptools is pinned because its
resampy dependency still imports pkg_resources.
"""
import json
import sys
import time
from pathlib import Path

from basic_pitch import ICASSP_2022_MODEL_PATH
from basic_pitch.inference import Model, predict

model = Model(ICASSP_2022_MODEL_PATH)
for d in map(Path, sys.argv[1:]):
    for stem, kw in (('bass', dict(minimum_frequency=30, maximum_frequency=400)), ('other', dict(minimum_frequency=60))):
        out = d / f'{stem}.notes.json'
        if out.exists():
            continue
        t0 = time.time()
        _, midi, notes = predict(str(d / f'{stem}.wav'), model, onset_threshold=0.5, frame_threshold=0.3, minimum_note_length=80, **kw)
        midi.write(str(d / f'{stem}.mid'))
        out.write_text(json.dumps(sorted([round(float(s), 4), round(float(e), 4), int(p), round(float(a), 3)] for s, e, p, a, _ in notes)))
        print(f'{d.name}/{stem}: {len(notes)} notes, {time.time() - t0:.1f} s', flush=True)
