#!/usr/bin/env python3
"""The harmony and the instruments of stem-split tracks, grouped by mood or station (see research/moods.md).

    python3 tools/palette.py downloads/stems/*/ [--json FILE]

Reads the folders tools/stems.py reads: downloads/stems/<group>--<name>/ is a reference, <station-id>-<seed>/ a lowtide
render split the same way, whose plan (renders/<name>/facts.json) is the truth the estimates are checked against. A
downloads/stems6/<name>/ folder beside it (tools/split.py --six) adds guitar and piano. Bars come from stems.py.

Per track:
- notes a half bar: the pitch classes sounding in each half bar (bass, other), counting one when it carries at least
  `share` of the half bar's heaviest pitch class, by duration × amplitude. Three is a bare triad, four a 7th chord or a
  triad under a melody note, six or more a 9th or 13th chord with a line over it. `share` is fitted on our split
  renders against their plans, where every note is known, using every note basic-pitch found.
- chord changes a bar: how often the bass's pitch class on a half bar's first beat differs from the last half bar's.
- key: the Krumhansl–Kessler profile that best fits all the notes; its mode, major or minor, and its fit r.
- instruments: each stem's level against the mix in dB, and the share of bars where it plays (within 20 dB of the
  mix's level in that bar). Guitar and piano only with a stems6 split.
"""
import argparse
import json
import statistics as st
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import stems  # noqa: E402

MAJ = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
MIN = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
SHARES = np.arange(0.02, 0.6, 0.02)


def halves(grid):
    """Start and end times of each half bar."""
    q = np.arange(grid.n * 2 + 1) * 2 + grid.phase
    B, gap = grid.beats, np.median(np.diff(grid.beats))
    t = np.interp(q, np.arange(len(B)), B, right=np.nan)
    t = np.where(np.isnan(t), B[-1] + (q - len(B) + 1) * gap, t)
    return list(zip(t[:-1], t[1:]))


def weights(notes, spans):
    """Per span, the weight of each pitch class: overlap × amplitude."""
    W = np.zeros((len(spans), 12))
    for s, e, m, a in notes:
        for i, (u, v) in enumerate(spans):
            o = min(e, v) - max(s, u)
            if o > 0:
                W[i, int(m) % 12] += o * a
    return W


def sizes(W, share):
    top = W.max(axis=1, keepdims=True)
    return ((W >= share * top) & (top > 0)).sum(axis=1)[W.max(axis=1) > 0]


def changes(bass, spans):
    """The bass's pitch class at the start of each span (the lowest note sounding), and how often it changes."""
    pcs = []
    for u, v in spans:
        on = [n for n in bass if n[0] <= u + 0.1 * (v - u) and n[1] > u]
        pcs.append(min(on, key=lambda n: n[2])[2] % 12 if on else None)
    pairs = [(a, b) for a, b in zip(pcs, pcs[1:]) if a is not None and b is not None]
    return 2 * float(np.mean([a != b for a, b in pairs])) if pairs else float('nan')


def key_of(W):
    x = W.sum(axis=0)
    best = max(((np.corrcoef(x, np.roll(P, k))[0, 1], k, q) for P, q in ((MAJ, 'major'), (MIN, 'minor')) for k in range(12)))
    return {'key': f'{NAMES[best[1]]} {best[2]}', 'mode': best[2], 'r': float(best[0])}


def instruments(d, grid, name):
    """Level and share of bars playing, per stem, against the mix."""
    six = stems.ROOT / 'downloads' / 'stems6' / name
    src = {k: d / f'{k}.wav' for k in ('drums', 'bass', 'other', 'vocals')}
    if six.exists():
        src.update({k: six / f'{k}.wav' for k in ('guitar', 'piano', 'other')})
    mix = stems.mono(stems.ROOT / 'downloads/refs' / f'{name}.wav' if '--' in name else stems.ROOT / 'renders' / name / 'mix.wav')
    edges = [int(t * stems.SR) for t, _ in halves(grid)[::2]] + [len(mix)]
    rms = lambda y, a, b: np.sqrt(np.mean(y[a:b] ** 2) + 1e-12)
    out = {}
    for k, p in src.items():
        y = stems.mono(p)[:len(mix)]
        bars = [(a, b) for a, b in zip(edges, edges[1:]) if b - a > stems.SR // 4]
        on = [20 * np.log10(rms(y, a, b) / rms(mix, a, b)) > -20 for a, b in bars]
        out[k] = {'db': stems.db(y, mix), 'plays': float(np.mean(on)) if on else float('nan')}
    return out


def measure(r, d):
    """One split track: its notes' weights per half bar, and the rest of its measures."""
    # every transcribed note, not stems.py's loudest 60%: quiet chord tones count here, and `share` is fitted to them
    spans = halves(r['grid'])
    notes = [n for k in ('bass', 'other') for n in json.loads((d / f'{k}.notes.json').read_text())]
    W = weights(notes, spans)
    out = {'group': r['station'], 'source': r['source'], 'name': r['name'], 'tempo': r['tempo'], 'W': W,
           'changes': changes(r['notes']['bass'], spans), **key_of(W), 'inst': instruments(d, r['grid'], d.name)}
    facts = stems.ROOT / 'renders' / d.name / 'facts.json'
    if r['source'] == 'ours-split' and facts.exists():
        F = json.loads(facts.read_text())
        other, bass, _ = stems.plan_notes(F)
        out['truth'] = {'W': weights(other + bass, spans), 'changes': changes(bass, spans)}
    return out


def fit(rows):
    """The share at which the split renders' notes a half bar best match their plans' (least median error)."""
    truth = [r for r in rows if 'truth' in r]
    if not truth:
        return 0.3, float('nan')
    err = lambda s: st.median(abs(float(np.median(sizes(r['W'], s))) - float(np.median(sizes(r['truth']['W'], 0.001)))) for r in truth)
    s = min(SHARES, key=err)
    return float(s), err(s)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('dirs', nargs='+')
    ap.add_argument('--json')
    a = ap.parse_args()
    rows = []
    for d in map(Path, a.dirs):
        if (d / 'other.notes.json').exists():
            rows.append(measure(stems.split_track(d), d))
            print(f'  {d.name}', file=sys.stderr, flush=True)
    share, err = fit(rows)
    print(f'notes a half bar counted at {share:.3f} of the heaviest pitch class (median error {err:.1f} on our split renders)\n')
    for r in rows:
        n = sizes(r['W'], share)
        r.update({'notes': float(np.median(n)), 'triads': float(np.mean(n <= 3)), 'rich': float(np.mean(n >= 6))})
        if 'truth' in r:
            t = sizes(r['truth']['W'], 0.001)
            r['truth'] = {'notes': float(np.median(t)), 'triads': float(np.mean(t <= 3)), 'rich': float(np.mean(t >= 6)), 'changes': r['truth']['changes']}
        del r['W']

    cols = [('tempo', 'bpm', '.0f'), ('notes', 'notes/half bar', '.1f'), ('triads', '≤3 notes', '.0%'), ('rich', '≥6 notes', '.0%'),
            ('changes', 'changes/bar', '.2f'), ('minor', 'minor', '.0%'), ('r', 'key fit', '.2f')]
    inst = ['drums', 'bass', 'guitar', 'piano', 'other', 'vocals']
    val = lambda r, k: (r['mode'] == 'minor') if k == 'minor' else r.get(k, float('nan'))
    print('| group | n | ' + ' | '.join(c[1] for c in cols) + ' | ' + ' | '.join(f'{k} dB · plays' for k in inst) + ' |')
    print('|---' * (len(cols) + len(inst) + 2) + '|')
    for g in dict.fromkeys(r['group'] + ('' if r['source'] == 'ref' else ' (ours)') for r in rows):
        rs = [r for r in rows if r['group'] + ('' if r['source'] == 'ref' else ' (ours)') == g]
        med = lambda k: np.nanmean([val(r, k) for r in rs]) if k == 'minor' else np.nanmedian([val(r, k) for r in rs])
        ins = [f"{np.nanmedian([r['inst'][k]['db'] for r in rs if k in r['inst']]):.0f} · {np.nanmedian([r['inst'][k]['plays'] for r in rs if k in r['inst']]):.0%}"
               if any(k in r['inst'] for r in rs) else '–' for k in inst]
        print(f'| {g} | {len(rs)} | ' + ' | '.join(format(med(k), f) for k, _, f in cols) + ' | ' + ' | '.join(ins) + ' |')
    print('\nper track:')
    for r in rows:
        t = r.get('truth')
        print(f"  {r['group']:>10} {r['name']:<28} {r['tempo']:4.0f} bpm  {r['key']:<9} notes {r['notes']:.0f} triads {r['triads']:.0%} rich {r['rich']:.0%} "
              f"changes {r['changes']:.2f}" + (f"   plan: notes {t['notes']:.0f} triads {t['triads']:.0%} rich {t['rich']:.0%} changes {t['changes']:.2f}" if t else ''))
    if a.json:
        Path(a.json).write_text(json.dumps({'share': share, 'error': err, 'tracks': rows}, indent=1, default=float))


if __name__ == '__main__':
    main()
