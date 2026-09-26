#!/usr/bin/env python3
"""Scores rendered tracks with Meta's Audiobox Aesthetics, a model trained on human ratings of audio (see HEARING.md).
Four scores, 1–10: CE content enjoyment, CU content usefulness, PC production complexity, PQ production quality.
The model hears 10-second windows; a track's score is their mean, and each window's scores are kept too.

    npm run judge                                  every track in renders/
    uv run --python 3.11 --with audiobox_aesthetics python tools/judge.py renders/last-train-*

Adds to judge.json beside the track folders; hear.py --ratings reads it. The first run downloads the model (415 MB).
"""
import json
import sys
from pathlib import Path

import soundfile as sf
import torch
from audiobox_aesthetics.infer import initialize_predictor

AXES = ['CE', 'CU', 'PC', 'PQ']


def windows(predictor, wav, sr):
    """Scores for each 10-second window of a (channels, samples) array."""
    x = torch.from_numpy(wav)
    return [predictor.forward([{'path': x[:, i:i + 10 * sr], 'sample_rate': sr}])[0] for i in range(0, x.shape[1], 10 * sr)]


def score(predictor, wav, sr):
    """The whole track's scores, as the model's own mean over windows weighted by length, plus each window's."""
    whole = predictor.forward([{'path': torch.from_numpy(wav), 'sample_rate': sr}])[0]
    return {**whole, 'windows': windows(predictor, wav, sr)}


def main():
    folders = sorted({p.parent for x in map(Path, sys.argv[1:] or ['renders'])
                      for p in ([x / 'facts.json'] if (x / 'facts.json').exists() else x.glob('*/facts.json'))})
    if not folders:
        sys.exit('no rendered tracks found; make some with: node tools/render.js <station> <seed>')
    predictor = initialize_predictor()
    path = folders[0].parent / 'judge.json'
    out = json.loads(path.read_text()) if path.exists() else {}
    print(f"{'track':26} {'title':15}" + ''.join(f'{a:>6}' for a in AXES))
    for d in folders:
        wav, sr = sf.read(d / 'mix.wav', dtype='float32', always_2d=True)
        out[d.name] = score(predictor, wav.T.copy(), sr)
        title = json.loads((d / 'facts.json').read_text())['title']
        print(f'{d.name:26} {title:15}' + ''.join(f'{out[d.name][a]:6.2f}' for a in AXES))
    path.write_text(json.dumps(out, indent=1))


if __name__ == '__main__':
    main()
