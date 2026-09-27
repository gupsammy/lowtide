#!/usr/bin/env python3
"""What the riff, bass and drums play, bar by bar, in stem-split tracks and in lowtide's plans (see research/stems.md).

    python3 tools/stems.py downloads/stems/*/ renders/*/
      --json FILE       also write every measure to FILE

Two kinds of folder. downloads/stems/<name>/ holds htdemucs stems (drums, bass, other, vocals .wav) and basic-pitch
notes (bass.notes.json, other.notes.json as [start, end, midi, amp]); <station>--<name> is a reference track (mix in
downloads/refs/), <station-id>-<seed> a lowtide render split the same way (mix in renders/<name>/). renders/<name>/
is read from the notes its plan wrote into facts.json: the truth for that render.

Bars come from beat tracking on the drum stem (on the mix when the track has no drums), folded into 62–125 bpm, with
the downbeat where the kick is strong, the snare weak and the chords change. Positions are in 16ths. Parts: the riff
is the top note on each 16th of `other` (keys, pad, lead and riff in a plan); the loop is all of `other`; the bass is its
lowest note on each 16th; drums are onsets in three bands. Per part: events per bar, range (5th–95th percentile,
semitones), the loop length (1, 2, 4 or 8 bars) at which bars sound most alike and their median likeness there
(fingerprint cosine, below), the share of playing bars that repeat the bar one loop earlier (same pitch classes, each
onset within a 16th), and how many loop variants recur (heard twice or more) with the share the main one covers.

Transcription is noisy. Each stem loses its weakest 40% of notes, and an `other` stem with under 4 notes a bar counts
as failed (no riff or loop measures). A split track's bars are compared by a smeared (pitch class × 16th) fingerprint,
and a bar counts as a repeat when the cosine clears a threshold fitted on our own renders, split the same way, against
their plans (Youden's J). The observed share is then corrected for that test's hit and false-alarm rates
(Rogan–Gladen). The bass adds its share of notes on beat 1, and for plans its share on the chord root (roots can't be
read from a split: rootless voicings fool any chord-template guess, which read 0–19% on our renders); drums add swing,
where the off-beat 8th lands once the grid's lag is removed (0.50 straight, 0.67 triplet). Levels: each stem's RMS
against the mix's, in dB.
"""
import argparse
import json
import re
import statistics as st
from pathlib import Path

import librosa
import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parent.parent
SR = 22050
HOP = 256
WEAK = 0.4  # drop each stem's weakest 40% of notes by basic-pitch amplitude: mostly reverb tails and overtones
SPARSE = 4  # a stem with fewer confident notes than this per bar counts as a failed transcription
DEGREE = {'I': 0, 'II': 2, 'III': 4, 'IV': 5, 'V': 7, 'VI': 9, 'VII': 11}
STATION = {'rain-study': 'rain', 'sunday-porch': 'sunday', 'last-train': 'train', 'autumn-field': 'autumn'}
BANDS = {0: (0, 150), 1: (150, 5000), 2: (5000, SR / 2)}  # kick, snare, hats
DRUM_BAND = {'kick': 0, 'snare': 1, 'rim': 1, 'hat': 2, 'open': 2, 'shaker': 2}
PARTS = ('riff', 'loop', 'bass', 'drums')


class Grid:
    """Beat times → bar and position in 16ths, with the downbeat on beat `phase`."""

    def __init__(self, beats, phase):
        self.beats, self.phase = np.asarray(beats), phase
        self.n = int((len(beats) - phase) // 4)

    def beat(self, t):
        B, gap = self.beats, np.median(np.diff(self.beats))
        b = np.interp(t, B, np.arange(len(B)))
        return np.where(t < B[0], (t - B[0]) / gap, np.where(t > B[-1], len(B) - 1 + (t - B[-1]) / gap, b))

    def bars(self, events, pick):
        """events (time, key, weight) → per bar a list of (pos, key, weight): on each 16th the top or lowest key, or
        ('all') each key once."""
        out = [[] for _ in range(self.n)]
        if not events:
            return out
        q = (self.beat(np.array([e[0] for e in events])) - self.phase) * 4
        bar = np.rint(q).astype(int) // 16
        keep = {}
        for b, p, (_, k, w) in zip(bar, q - bar * 16, events):
            slot = (b, int(round(p))) + ((k,) if pick == 'all' else ())
            old = keep.get(slot)
            if 0 <= b < self.n and (old is None or (k > old[1] if pick == 'top' else k < old[1] if pick == 'low' else w > old[2])):
                keep[slot] = (p, k, w)
        for slot, e in keep.items():
            out[slot[0]].append(e)
        return out


def row(k, drums):
    return k if drums else k % 12


def same(a, b, drums):
    """An exact repeat: the same keys, each onset within a 16th."""
    if not a or len(a) != len(b):
        return False
    for k in {row(e[1], drums) for e in a + b}:
        pa, pb = (sorted(e[0] for e in x if row(e[1], drums) == k) for x in (a, b))
        if len(pa) != len(pb) or any(abs(u - v) >= 1 for u, v in zip(pa, pb)):
            return False
    return True


def fingerprint(bar, drums):
    """(key row × 16th), each onset split between its two nearest 16ths, then smeared one 16th either side."""
    M = np.zeros((3 if drums else 12, 18))
    for p, k, w in bar:
        i = int(np.floor(p)) + 1
        M[row(k, drums), i:i + 2] += w * np.array([i - p, p + 1 - i])
    M = M[:, 1:17]
    return (M + 0.5 * np.roll(M, 1, 1) + 0.5 * np.roll(M, -1, 1)).ravel()


def cos(a, b):
    return float(a @ b / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-12))


class Part:
    def __init__(self, bars, drums, exact):
        self.bars, self.drums, self.exact = bars, drums, exact
        self.F = [fingerprint(b, drums) for b in bars]

    def sim(self, i, j):
        return cos(self.F[i], self.F[j]) if self.bars[i] and self.bars[j] else 0.0

    def measures(self, threshold):
        """With exact parts `threshold` is unused: bars repeat when `same`."""
        B, n = self.bars, len(self.bars)
        test = (lambda i, j: same(B[i], B[j], self.drums)) if self.exact else (lambda i, j: self.sim(i, j) >= threshold)
        mean = {L: np.mean([self.sim(i, i - L) for i in range(L, n) if B[i]]) for L in (1, 2, 4, 8) if sum(map(bool, B[L:])) > 4}
        L = max(mean, key=lambda L: mean[L] - 0.01 * L) if mean else 1
        idx = [i for i in range(L, n) if B[i]]
        clusters = []
        for u in (u for u in range(0, n - L + 1, L) if any(B[u:u + L])):
            c = next((c for c in clusters if all(test(u + k, c[0] + k) or not (B[u + k] or B[c[0] + k]) for k in range(L))), None)
            c.append(u) if c else clusters.append([u])
        sizes = sorted(map(len, clusters), reverse=True)
        keys = [e[1] for b in B for e in b]
        playing = [b for b in B if b]
        return {'per_bar': st.median(map(len, playing)) if playing else 0,
                'range': float(np.percentile(keys, 95) - np.percentile(keys, 5)) if keys and not self.drums else float('nan'),
                'loop': L, 'likeness': float(np.median([self.sim(i, i - L) for i in idx])) if idx else float('nan'),
                'repeat': float(np.mean([test(i, i - L) for i in idx])) if idx else float('nan'),
                'variants': sum(s >= 2 for s in sizes), 'main': sizes[0] / sum(sizes) if sizes else float('nan')}


def plan_roots(F):
    """(time, root pitch class) for each chord in a plan, from its roman numeral and the key of its section."""
    out = []
    for t, name in F['chords']:
        acc, deg = re.match(r'([b#]?)(VII|VI|IV|V|III|II|I)', name, re.I).groups()
        key = next((x['key'] for x in F['sections'] if x['start'] <= t < x['end']), F['key'])
        out.append((t, (key + DEGREE[deg.upper()] + {'b': -1, '#': 1, '': 0}[acc]) % 12))
    return out


def parts_of(grid, other, bass, hits, exact, roots=None):
    """other, bass: (start, end, midi, amp); hits: (time, band, weight); roots: (time, pitch class), plans only."""
    ev = [(n[0], n[2], n[3]) for n in other]
    P = {'riff': grid.bars(ev, 'top'), 'loop': grid.bars(ev, 'all'), 'bass': grid.bars([(n[0], n[2], n[3]) for n in bass], 'low'),
         'drums': grid.bars(hits, 'all')}
    P = {k: Part(b, k == 'drums', exact) for k, b in P.items()}
    on = []
    if roots:
        rt, rp = np.array([r[0] for r in roots]), [r[1] for r in roots]
        on = [rp[max(0, np.searchsorted(rt, n[0], 'right') - 1)] == n[2] % 12 for n in bass]
    notes = [e for b in P['bass'].bars for e in b]
    frac = grid.beat(np.array([h[0] for h in hits if h[1] == 2])) % 1
    w = (frac + 0.5) % 1 - 0.5
    lag = np.median(w[abs(w) < 0.2]) if (abs(w) < 0.2).sum() > 8 else 0.0
    off = (frac - lag)[((frac - lag) > 0.4) & ((frac - lag) < 0.72)]
    extra = {'bass': {'root': float(np.mean(on)) if on else float('nan'),
                      'beat1': float(np.mean([round(e[0]) == 0 for e in notes])) if notes else float('nan')},
             'drums': {'swing': float(np.median(off)) if len(off) > 8 else float('nan')}}
    return P, extra


def mono(path):
    y, sr = sf.read(path, always_2d=True)
    return librosa.resample(y.mean(axis=1), orig_sr=sr, target_sr=SR) if sr != SR else y.mean(axis=1)


def db(x, ref):
    return float(10 * np.log10(np.mean(x ** 2) / np.mean(ref ** 2) + 1e-12))


def plan_notes(F):
    N = F['notes']
    other = [(t, t + ln, p, 1.0) for k in ('keys', 'pad', 'lead', 'riff') for t, ln, m in N.get(k, []) for p in (m if isinstance(m, list) else [m])]
    return other, [(t, t + ln, m, 1.0) for t, ln, m in N['bass']], [(t, DRUM_BAND[k], v) for t, k, v in N['drums']]


def split_track(d):
    """A folder of htdemucs stems with basic-pitch notes. A lowtide render also gets its plan laid on the same grid."""
    name = d.name
    if '--' in name:
        station, source, mixpath = name.split('--')[0], 'ref', ROOT / 'downloads/refs' / f'{name}.wav'
    else:
        station, source, mixpath = STATION[re.sub(r'-\d+$', '', name)], 'ours-split', ROOT / 'renders' / name / 'mix.wav'
    y = {k: mono(d / f'{k}.wav') for k in ('drums', 'bass', 'other', 'vocals')}
    mix = mono(mixpath)
    level = {k: db(v, mix) for k, v in y.items()}
    drumless = level['drums'] < -30  # then the beat comes from the mix and there are no drum measures

    env = librosa.onset.onset_strength(y=mix if drumless else y['drums'], sr=SR, hop_length=HOP)
    _, beats = librosa.beat.beat_track(onset_envelope=env, sr=SR, hop_length=HOP, start_bpm=85)
    bt = librosa.frames_to_time(beats, sr=SR, hop_length=HOP)
    tempo = 60 / np.median(np.diff(bt))
    while tempo > 125:
        bt, tempo = bt[::2], tempo / 2
    while tempo < 62:
        bt, tempo = np.sort(np.r_[bt, (bt[1:] + bt[:-1]) / 2]), tempo * 2

    # Drum onsets per band, weighted by strength.
    S = librosa.power_to_db(librosa.feature.melspectrogram(y=y['drums'], sr=SR, hop_length=HOP, n_mels=96))
    f = librosa.mel_frequencies(96, fmax=SR / 2)
    hits, strength = [], {}
    for band, (lo, hi) in BANDS.items():
        e = np.maximum(0, np.diff(S[(f >= lo) & (f < hi)], axis=1)).mean(axis=0)
        e = strength[band] = e / (np.percentile(e, 99.5) + 1e-9)
        fr = librosa.onset.onset_detect(onset_envelope=e, sr=SR, hop_length=HOP, delta=0.1)
        hits += [(t, band, float(e[k])) for t, k in zip(librosa.frames_to_time(fr, sr=SR, hop_length=HOP), fr)]

    # Downbeat: the phase whose beats carry the most kick, the least snare and the most change in the chords.
    C = librosa.feature.chroma_cqt(y=y['other'], sr=SR, hop_length=HOP)
    nov = np.r_[0, np.linalg.norm(np.diff(C, axis=1), axis=0)]
    fr = np.minimum(librosa.time_to_frames(bt, sr=SR, hop_length=HOP), len(nov) - 2)
    z = lambda v: (v - v.mean()) / (v.std() + 1e-9)
    score = z(strength[0][fr]) - z(strength[1][fr]) + z(nov[fr])
    grid = Grid(bt, max(range(4), key=lambda k: score[k::4].mean()))

    notes, failed = {}, []
    for k in ('bass', 'other'):
        n = json.loads((d / f'{k}.notes.json').read_text())
        floor = np.quantile([x[3] for x in n], WEAK) if n else 0
        notes[k] = [x for x in n if x[3] >= floor]
        if len(n) < SPARSE * grid.n and k == 'other':
            failed += ['riff', 'loop']
    P, extra = parts_of(grid, notes['other'], notes['bass'], [] if drumless else hits, exact=False)
    for k in failed + (['drums'] if drumless else []):
        del P[k]
    r = {'station': station, 'source': source, 'name': name.split('--')[-1], 'tempo': float(tempo), 'bars': grid.n,
         'parts': P, 'extra': extra, 'level': level, 'failed': failed + (['drums'] if drumless else [])}
    facts = ROOT / 'renders' / name / 'facts.json'
    if source == 'ours-split' and facts.exists():
        r['truth'] = parts_of(grid, *plan_notes(json.loads(facts.read_text())), exact=True)[0]
    return r


def planned_track(d):
    """A lowtide render, read from the notes its plan wrote into facts.json."""
    F = json.loads((d / 'facts.json').read_text())
    spb = 60 / F['bpm']
    grid = Grid(np.arange(0, F['seconds'] + 8 * spb, spb), 0)
    P, extra = parts_of(grid, *plan_notes(F), exact=True, roots=plan_roots(F))
    mix = mono(d / 'mix.wav')
    return {'station': STATION[F['station']], 'source': 'ours-plan', 'name': d.name, 'tempo': F['bpm'], 'bars': grid.n,
            'parts': P, 'extra': extra, 'level': {k: db(mono(d / f'{k}.wav'), mix) for k in ('drums', 'harmony', 'lead')}}


def calibrate(rows):
    """Per part, the cosine threshold that best splits true repeats from the rest on our split renders (Youden's J),
    with its hit rate (tpr) and false-alarm rate (fpr), over lags of 1, 2 and 4 bars."""
    cal = {}
    for part in PARTS:
        y, s = [], []
        for r in (r for r in rows if 'truth' in r):
            T, S = r['truth'][part], r['parts'][part]
            for L in (1, 2, 4):
                for i in (i for i in range(L, len(T.bars)) if T.bars[i]):
                    y.append(same(T.bars[i], T.bars[i - L], T.drums))
                    s.append(S.sim(i, i - L))
        y, s = np.array(y), np.array(s)
        if 0 < y.mean() < 1:
            th = max(np.arange(0.3, 0.99, 0.02), key=lambda t: (s[y] >= t).mean() - (s[~y] >= t).mean())
            cal[part] = {'threshold': round(float(th), 2), 'tpr': float((s[y] >= th).mean()), 'fpr': float((s[~y] >= th).mean()),
                         'pairs': len(y), 'true_share': float(y.mean()), 'called_share': float((s >= th).mean())}
    return cal


def finish(r, cal):
    """The measures of each part; for a split track the repeat share corrected by the calibration."""
    out = {k: v for k, v in r.items() if k not in ('parts', 'extra', 'truth')}
    for part, P in r['parts'].items():
        c = cal.get(part, {'threshold': 1.0, 'tpr': 1.0, 'fpr': 0.0})
        m = P.measures(c['threshold'])
        if not P.exact:
            m['observed'] = m['repeat']
            m['repeat'] = float(np.clip((m['repeat'] - c['fpr']) / (c['tpr'] - c['fpr']), 0, 1))
        out[part] = {**m, **(r['extra'].get(part, {}) if part in r['parts'] else {})}
    if 'truth' in r:
        out['truth'] = {part: P.measures(0) for part, P in r['truth'].items()}
    return out


COLS = [('tempo', 'bpm', '.0f'),
        ('riff.per_bar', 'riff n/bar', '.0f'), ('riff.range', 'range', '.0f'), ('riff.loop', 'loop', '.0f'), ('riff.likeness', 'like', '.2f'), ('riff.repeat', 'repeat', '.0%'),
        ('riff.variants', 'var', '.0f'), ('riff.main', 'main', '.0%'), ('loop.repeat', 'stem repeat', '.0%'),
        ('bass.per_bar', 'bass n/bar', '.0f'), ('bass.range', 'range', '.0f'), ('bass.loop', 'loop', '.0f'), ('bass.repeat', 'repeat', '.0%'),
        ('bass.root', 'root', '.0%'), ('bass.beat1', 'beat 1', '.0%'),
        ('drums.per_bar', 'drum hits/bar', '.0f'), ('drums.loop', 'loop', '.0f'), ('drums.repeat', 'repeat', '.0%'), ('drums.swing', 'swing', '.2f'),
        ('level.other', 'dB other', '.0f'), ('level.harmony', 'dB harmony', '.0f'), ('level.lead', 'dB lead', '.0f'),
        ('level.bass', 'dB bass', '.0f'), ('level.drums', 'dB drums', '.0f'), ('level.vocals', 'dB vocals', '.0f')]


def get(r, key):
    a, _, b = key.partition('.')
    v = r.get(a, float('nan')) if not b else r.get(a, {}).get(b, float('nan'))
    return float(v)


def table(groups, label):
    rows = [r for _, rs in groups for r in rs]
    cols = [c for c in COLS if any(not np.isnan(get(r, c[0])) for r in rows)]
    print(f'| {label} | ' + ' | '.join(c[1] for c in cols) + ' |\n' + '|---' * (len(cols) + 1) + '|')
    for name, rs in groups:
        vals = [[get(r, k) for r in rs if not np.isnan(get(r, k))] for k, _, _ in cols]
        print(f'| {name} | ' + ' | '.join(format(st.median(v), fmt) if v else '–' for v, (_, _, fmt) in zip(vals, cols)) + ' |')
    print()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('dirs', nargs='+')
    ap.add_argument('--json')
    a = ap.parse_args()
    raw = []
    for d in map(Path, a.dirs):
        if (d / 'other.notes.json').exists():
            raw.append(split_track(d))
        elif (d / 'facts.json').exists():
            raw.append(planned_track(d))
    cal = calibrate(raw)
    rows = [finish(r, cal) for r in raw]

    print('calibration on our split renders (repeat test per part):')
    for part, c in cal.items():
        print(f"  {part:6s} cosine ≥ {c['threshold']:.2f}  hits {c['tpr']:.0%} of true repeats, false alarms {c['fpr']:.0%}; "
              f"{c['pairs']} bar pairs, {c['true_share']:.0%} true repeats, {c['called_share']:.0%} called")
    print()
    for r in (r for r in rows if 'truth' in r):
        print(f"  {r['name']}: split vs plan  " + '  '.join(
            f"{p} n/bar {r[p]['per_bar']:.0f}/{r['truth'][p]['per_bar']:.0f} repeat {r[p]['repeat']:.0%}/{r['truth'][p]['repeat']:.0%}" for p in PARTS))
    print()
    table([(f"{r['station']} {r['name']}" if r['source'] == 'ref' else f"{r['name']} ({r['source']})", [r]) for r in rows], 'track')
    table([(f'{s} {src}', [r for r in rows if (r['source'], r['station']) == (src, s)]) for src, s in sorted({(r['source'], r['station']) for r in rows})], 'station')
    table([(src, [r for r in rows if r['source'] == src]) for src in sorted({r['source'] for r in rows})], 'source')
    if a.json:
        Path(a.json).write_text(json.dumps({'calibration': cal, 'tracks': rows}, indent=1))


if __name__ == '__main__':
    main()
