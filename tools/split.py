#!/usr/bin/env python3
"""Splits tracks into htdemucs stems (drums, bass, other, vocals) under downloads/stems/<name>/ (see research/stems.md).
A renders/<name>/mix.wav is named after its folder; any other file after itself. Skips tracks already split.

    uv run --no-project --python 3.11 --with demucs --with soundfile python tools/split.py mps downloads/refs/*.wav

The first run downloads the model (~80 MB, from Hugging Face adefossez/HTDemucs). Reads and writes with soundfile, so
torchaudio's I/O backends aren't needed. About a tenth of a track's length on an M3 Pro's GPU.
"""
import sys
import time
from pathlib import Path

import numpy as np
import soundfile as sf
import torch
from demucs.apply import apply_model
from demucs.pretrained import get_model

OUT = Path(__file__).resolve().parent.parent / 'downloads' / 'stems'
dev = sys.argv[1]
model = get_model('htdemucs')
model.to(dev).eval()
for f in sys.argv[2:]:
    p = Path(f)
    name = p.parent.name if p.name == 'mix.wav' else p.stem
    d = OUT / name
    if (d / 'other.wav').exists():
        print('skip', name)
        continue
    t0 = time.time()
    x, sr = sf.read(p, always_2d=True, dtype='float32')
    assert sr == model.samplerate, sr
    if x.shape[1] == 1:
        x = np.repeat(x, 2, 1)
    wav = torch.from_numpy(x.T.copy())
    ref = wav.mean(0)
    m, s = ref.mean(), ref.std()
    with torch.no_grad():
        out = apply_model(model, ((wav - m) / s)[None].to(dev), device=dev, shifts=1, split=True, overlap=0.25, progress=False)[0]
    out = (out * s + m).cpu().numpy()
    d.mkdir(parents=True, exist_ok=True)
    for src, y in zip(model.sources, out):
        sf.write(d / f'{src}.wav', y.T, sr, subtype='PCM_16')
    print(f'{name}: {time.time() - t0:.1f} s for {len(x) / sr:.0f} s audio on {dev}', flush=True)
