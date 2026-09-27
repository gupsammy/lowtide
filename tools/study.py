#!/usr/bin/env python3
"""Measures any audio file the way hear.py measures lowtide's renders, plus what a loop-built track does over time,
so reference tracks and lowtide's own can sit in one table (see research/references.md).

    python3 tools/study.py downloads/refs/*.wav            reference tracks, named <station>--<name>.wav
    python3 tools/study.py renders/*/mix.wav               lowtide's renders, grouped by the station in the folder name
      --json FILE       also write every measure to FILE

Per track: loudness, spectral balance and stereo width (hear.py's own measures); tempo and key; the loop length in
bars and how exactly bars come round again; notes per bar in the harmonic part; and how often the arrangement changes
(a band's level moving 3 dB or more from one 4-bar block to the next).
"""
import argparse
import json
import re
import statistics as st
from pathlib import Path

import librosa
import numpy as np
import soundfile as sf

from hear import NOTE_NAMES, bands, best_key, loudness, spectrum, tilt

SR = 22050
HOP = 512


def cos(a, b):
    return float(a @ b / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-12))


def per_bar(feature, frame_times, bar_starts):
    """The mean of a (dims × frames) feature over each bar."""
    out = []
    for a, b in zip(bar_starts[:-1], bar_starts[1:]):
        k = (frame_times >= a) & (frame_times < b)
        out.append(feature[:, k].mean(axis=1) if k.any() else np.zeros(feature.shape[0]))
    return np.array(out)


def study(path):
    stereo, sr = sf.read(path, always_2d=True)
    mono = stereo.mean(axis=1)
    I, lra, peak, _, _ = loudness(path)
    fr, p = spectrum(mono, sr)
    y = librosa.resample(mono, orig_sr=sr, target_sr=SR)
    H, P = librosa.effects.hpss(y)

    # Tempo and bars. Bars are counted in fours from the first beat; the phase may be off, which shifts every bar
    # alike and so leaves the repetition measures alone.
    tempo, beats = librosa.beat.beat_track(y=y, sr=SR, hop_length=HOP)
    bt = librosa.frames_to_time(beats, sr=SR, hop_length=HOP)
    bars = bt[::4]
    C = librosa.feature.chroma_cqt(y=H, sr=SR, hop_length=HOP)
    ct = librosa.frames_to_time(np.arange(C.shape[1]), sr=SR, hop_length=HOP)
    Cb = per_bar(C, ct, bars)
    M = librosa.feature.mfcc(y=y, sr=SR, hop_length=HOP, n_mfcc=13)
    Mb = per_bar(M[1:], ct, bars)
    tonic, q, _ = best_key(C.sum(axis=1))

    # The loop: the lag (1, 2, 4 or 8 bars) at which bars sound most alike, and the share of bars within 0.95 of the
    # bar one loop earlier in pitch content and 0.9 in timbre.
    lags = {L: float(np.mean([cos(Cb[i], Cb[i - L]) for i in range(L, len(Cb))])) for L in (1, 2, 4, 8) if len(Cb) > L + 4}
    loop = max(lags, key=lambda L: lags[L] - 0.01 * L)  # the shortest of near-equal lags
    same = [cos(Cb[i], Cb[i - loop]) >= 0.95 and cos(Mb[i], Mb[i - loop]) >= 0.9 for i in range(loop, len(Cb))]

    # Notes per bar: onsets in the harmonic part.
    on = librosa.frames_to_time(librosa.onset.onset_detect(y=H, sr=SR, hop_length=HOP), sr=SR, hop_length=HOP)
    density = st.median([((on >= a) & (on < b)).sum() for a, b in zip(bars[:-1], bars[1:])]) if len(bars) > 2 else 0

    # Change over time: per 4-bar block, the level of the bass (below 150 Hz), the harmony (500 Hz–4 kHz of the
    # harmonic part), the drums (the percussive part) and the top (above 5 kHz of the percussive part).
    S, SH, SP = (np.abs(librosa.stft(x, hop_length=HOP)) ** 2 for x in (y, H, P))
    f = librosa.fft_frequencies(sr=SR)
    lanes = {'bass': S[f < 150].sum(0), 'harmony': SH[(f >= 500) & (f < 4000)].sum(0), 'drums': SP.sum(0), 'top': SP[f >= 5000].sum(0)}
    blocks = bars[::4]
    level = {k: [10 * np.log10(v[(ct >= a) & (ct < b)].mean() + 1e-12) for a, b in zip(blocks[:-1], blocks[1:])] for k, v in lanes.items()}
    changes = sum(any(abs(level[k][i] - level[k][i - 1]) >= 3 for k in level) for i in range(1, len(blocks) - 1))
    minutes = len(mono) / sr / 60

    return {
        'seconds': round(len(mono) / sr), 'lufs': I, 'lra': lra, 'correlation': float(np.corrcoef(stereo[:, 0], stereo[:, 1])[0, 1]),
        'tilt': tilt(fr, p), **{f'band_{k}': v for k, v in bands(fr, p).items()},
        'tempo': float(np.atleast_1d(tempo)[0]), 'key': f'{NOTE_NAMES[tonic]} {q}', 'bars': len(Cb),
        'loop_bars': loop, 'loop_likeness': lags[loop], 'bars_repeating': float(np.mean(same)) if same else 0.0,
        'notes_per_bar': float(density), 'changes_per_minute': changes / minutes,
    }


def group_of(path):
    """reference files are <group>--<name>.wav; renders are renders/<station>-<seed>/mix.wav"""
    p = Path(path)
    if p.name == 'mix.wav':
        return re.sub(r'-\d+$', '', p.parent.name), p.parent.name
    g, _, name = p.stem.partition('--')
    return g, name


COLS = [('lufs', '.1f'), ('lra', '.1f'), ('tilt', '.1f'), ('band_low-mid', '.1f'), ('band_presence', '.1f'), ('correlation', '.2f'),
        ('tempo', '.0f'), ('loop_bars', '.0f'), ('bars_repeating', '.0%'), ('notes_per_bar', '.0f'), ('changes_per_minute', '.1f')]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('files', nargs='+')
    ap.add_argument('--json')
    a = ap.parse_args()
    rows = []
    for path in a.files:
        g, name = group_of(path)
        rows.append({'group': g, 'name': name, **study(path)})
        r = rows[-1]
        print(f"{g:13s} {name[:22]:22s} " + '  '.join(f"{k.replace('band_', '')} {format(r[k], fmt)}" for k, fmt in COLS) + f"  key {r['key']}")
    print('\nmedians by group')
    for g in sorted({r['group'] for r in rows}):
        rs = [r for r in rows if r['group'] == g]
        print(f"{g:13s} n={len(rs):2d} " + '  '.join(f"{k.replace('band_', '')} {format(st.median(r[k] for r in rs), fmt)}" for k, fmt in COLS))
    if a.json:
        Path(a.json).write_text(json.dumps(rows, indent=1))


if __name__ == '__main__':
    main()
