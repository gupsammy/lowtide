#!/usr/bin/env python3
"""Measures rendered tracks against their plans and against the norms of the genre (see HEARING.md).

    python3 tools/hear.py renders/                  every track folder in renders/ (made by tools/render.js)
    python3 tools/hear.py renders/last-train-*      some of them
      --json            print the measures as JSON instead of the report
      --ratings FILE    set the measures of liked tracks beside those of disliked ones (a ratings export from the lab)

Writes report.json beside the track folders. Exits with 1 if any track fails a check.
"""
import argparse
import json
import os
import re
import subprocess
import sys
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

import librosa
import numpy as np
import soundfile as sf
from scipy.signal import welch

NOTE_NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B']
# Krumhansl–Kessler key profiles, from the tonic up. Played on real instruments each note also sounds its fifth (the
# third partial), which pulls a plain match toward the key a fifth up, so each profile gets the same partials (Gómez 2006).
KK = {q: p * (1 + 0.6 + 0.6 ** 3) + np.roll(p, 7) * 0.6 ** 2 for q, p in {
    'major': np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]),
    'minor': np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])}.items()}
BANDS = {'low': (20, 120), 'low-mid': (120, 500), 'mid': (500, 2000), 'presence': (2000, 6000), 'air': (6000, 20000)}
RANK = {'ok': 0, 'n/a': 0, 'warn': 1, 'fail': 2}
HOP = 256  # analysis frames of 11.6 ms at 22.05 kHz


def grade(x, ok, warn):
    """'ok' if x ≥ ok, 'warn' if x ≥ warn, else 'fail'. Negate all three to grade a measure where lower is better."""
    return 'ok' if x >= ok else 'warn' if x >= warn else 'fail'


def worst(*statuses):
    return max(statuses, key=RANK.get)


def inside(times, spans):
    """Which of the times fall inside any of the (start, end) spans."""
    m = np.zeros(len(times), bool)
    for a, b in spans:
        m |= (times >= a) & (times < b)
    return m


def spans(f, kinds):
    return [(s['start'], s['end']) for s in f['sections'] if s['kind'] in kinds]


# Pulse ------------------------------------------------------------------------------------------------------------

def onset_envelope(y, sr, hop=HOP):
    return librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop)


def tempo_relation(found, bpm, swing=0.5, grid=8):
    """How a tempo found blind relates to the planned one: 'same', 'double' or 'half' (all fair: a half-time feel makes
    any of them right); 'swing' (the tracker locked onto the long or short half of a swung pair, so the swing can be
    heard as the beat); 'cross' (3:2 or 4:3); or 'other'."""
    near = lambda ratios: any(abs(found / (bpm * r) - 1) < 0.04 for r in ratios)
    pair = 1 if grid == 8 else 0.5  # a swung pair, in beats
    for name, ratios in (('same', [1]), ('double', [2]), ('half', [0.5]),
                         ('swing', [k / (pair * part) for part in (swing, 1 - swing) for k in (0.5, 1, 2)] if swing > 0.52 else []),
                         ('cross', [1.5, 2 / 3, 3, 1 / 3, 0.75, 4 / 3])):
        if near(ratios):
            return name
    return 'other'


def pulse(env, sr, bpm, within=None, hop=HOP):
    """How strongly the onsets repeat at the beat period: the onset envelope's autocorrelation at that lag, next to
    its value at lag 0, averaged over the frames inside the spans `within` (pulse clarity, as in MIRtoolbox). Near 1 every beat
    repeats the last; near 0 nothing recurs at the beat."""
    T = librosa.feature.tempogram(onset_envelope=env, sr=sr, hop_length=hop)
    lag = 60 / bpm * sr / hop
    at = T[max(1, int(np.floor(lag)) - 1):int(np.ceil(lag)) + 2].max(axis=0)  # the beat's lag, give or take a frame
    if within is not None:
        at = at[inside(librosa.frames_to_time(np.arange(len(at)), sr=sr, hop_length=hop), within)]
    return float(at.mean())


def drum_spans(f):
    """Where the drums play: their sections, less the bars a move takes them out of (at most one move a section)."""
    out = []
    for s in f['sections']:
        if 'drums' not in s['layers']:
            continue
        a = s['start']
        for c in s.get('cuts', []):
            if 'drums' in c['out']:
                if c['start'] > a:
                    out.append((a, c['start']))
                a = c['end']
        if s['end'] > a:
            out.append((a, s['end']))
    return out


def pulse_check(f, env, sr):
    found = float(librosa.feature.tempo(onset_envelope=env, sr=sr, hop_length=HOP)[0])
    rel = tempo_relation(found, f['bpm'], f['hatSwing'], f['grid'])
    with_drums = drum_spans(f)
    p = pulse(env, sr, f['bpm'], with_drums) if with_drums else None
    status = worst('fail' if rel == 'other' else 'warn' if rel in ('swing', 'cross') else 'ok', grade(p, 0.4, 0.25) if p else 'n/a')
    text = f"tempo {found:.0f} found for {f['bpm']} ({rel})" + (f" · pulse {p:.2f}" if p else '')
    return {'status': status, 'text': text, 'values': {'tempo_found': found, 'tempo_ok': int(rel in ('same', 'double', 'half')), 'pulse': p}}


# Notes ------------------------------------------------------------------------------------------------------------

def chroma(y, sr, hop=2048):
    """Pitch-class strength per frame (12 × frames), not normalised, so loud frames count for more."""
    return librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=hop, norm=None)


def best_key(c):
    """The Krumhansl–Kessler key that best matches a chroma vector: (tonic 0–11, 'major' or 'minor', correlation)."""
    r, tonic, q = max((float(np.corrcoef(c, np.roll(p, t))[0, 1]), t, q) for q, p in KK.items() for t in range(12))
    return tonic, q, r


def sounding(notes, times, ring=0.25):
    """12 × len(times): which pitch classes the notes [(start, length, midi or [midis])] sound at each time, counting
    `ring` seconds after each note ends."""
    S = np.zeros((12, len(times)), bool)
    for t, d, m in notes:
        on = (times >= t) & (times < t + d + ring)
        for x in m if isinstance(m, list) else [m]:
            S[x % 12] |= on
    return S


def on_plan(C, S):
    """The share of the chroma on the pitch classes the plan has sounding at that moment."""
    return float((C * S).sum() / max(C.sum(), 1e-12))


def notes_check(f, C, sr, hop=2048):
    """Are the notes heard the notes planned? Also where the harmony centres (Krumhansl–Kessler), for information:
    a loop that never plays its I chord can centre elsewhere, which is the music, not a fault."""
    t = librosa.frames_to_time(np.arange(C.shape[1]), sr=sr, hop_length=hop)
    S = sounding([n for k in ('keys', 'pad', 'bass', 'lead') for n in f['notes'][k]], t)
    share = on_plan(C, S)
    tonal = [s for s in f['sections'] if {'keys', 'pad', 'bass', 'lead'} & set(s['layers'])]
    per = [(on_plan(C[:, m], S[:, m]), s['kind']) for s in tonal if (m := inside(t, [(s['start'], s['end'])])).any()]
    low, low_kind = min(per)
    tonic, q, r = best_key(C[:, inside(t, spans(f, {'A'}))].sum(axis=1))
    loop = ' '.join(dict.fromkeys(name for at, name in f['chords'] if any(a <= at < b for a, b in spans(f, {'A'}))))
    text = (f"{share:.0%} on planned notes, lowest {low_kind} {low:.0%} · A centres on {NOTE_NAMES[tonic]} {q} (r {r:.2f}), "
            f"planned {NOTE_NAMES[f['key']]} {f['mode']}, loop {loop}")
    return {'status': grade(low, 0.7, 0.55), 'text': text, 'values': {'on_plan': share, 'on_plan_low': low, 'centre_r': r, 'centre_is_key': int(tonic == f['key'])}}


# Swing ------------------------------------------------------------------------------------------------------------

def onset_times(y, sr, hop=64):
    """Onset times in seconds, at 3 ms resolution for 22.05 kHz audio."""
    env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop, n_fft=512, n_mels=40)
    return librosa.onset.onset_detect(onset_envelope=env, sr=sr, hop_length=hop, units='time')


def swing(times, bpm, grid):
    """Where the off-beat notes land in their pair (0.5 is straight, 0.67 a triplet feel), measured from where the
    on-beat notes land so a lean of the whole kit cancels out, and how widely they scatter around that place in ms.
    A pair is a beat long on an 8th grid, half a beat on a 16th grid. None if there are too few notes to tell."""
    P = 60 / bpm * (1 if grid == 8 else 0.5)
    ph = (np.asarray(times) / P) % 1
    on = ph[(ph < 0.15) | (ph > 0.9)]
    on = np.where(on > 0.5, on - 1, on)
    off = ph[(ph > 0.4) & (ph < 0.8)]
    if len(on) < 8 or len(off) < 8:
        return None
    mid = np.median(off)
    return float(mid - np.median(on)), float(np.median(np.abs(off - mid)) * P * 1000)


def swing_check(f, onsets):
    heard, planned = swing(onsets, f['bpm'], f['grid']), swing([n[0] for n in f['notes']['drums']], f['bpm'], f['grid'])
    if not heard or not planned:
        return {'status': 'n/a', 'text': 'too few off-beat notes to measure', 'values': {}}
    d = heard[0] - planned[0]
    status = worst(grade(-abs(d), -0.03, -0.06), 'ok' if heard[0] >= 0.54 else 'warn')
    text = f"heard {heard[0]:.2f}, planned {planned[0]:.2f} ({f['grid']}ths) · scatter {heard[1]:.0f} ms, planned {planned[1]:.0f}"
    return {'status': status, 'text': text, 'values': {'swing_heard': heard[0], 'swing_planned': planned[0], 'swing_error': d, 'scatter_ms': heard[1]}}


# Melody -----------------------------------------------------------------------------------------------------------

def melody(lead, backing, sr, windows, hop=512):
    """While the lead plays: the share of its energy in time–frequency cells (mel bands) where it is louder than
    everything else, and its level against everything else in dB. None if the lead is silent."""
    mel = lambda y: librosa.feature.melspectrogram(y=y, sr=sr, n_fft=2048, hop_length=hop, n_mels=64, fmin=60, fmax=8000)
    L, B = mel(lead), mel(backing)
    playing = inside(librosa.frames_to_time(np.arange(L.shape[1]), sr=sr, hop_length=hop), windows)
    L, B = L[:, playing], B[:, playing]
    if L.sum() <= 0:
        return None
    return float(L[L > B].sum() / L.sum()), float(10 * np.log10(L.sum() / max(B.sum(), 1e-20)))


def melody_check(f, lead, backing, sr):
    m = melody(lead, backing, sr, [(t, t + d) for t, d, _ in f['notes']['lead']]) if f['notes']['lead'] else None
    if not m:
        return {'status': 'n/a', 'text': 'no lead', 'values': {}}
    text = f"{m[0]:.0%} of the lead audible · {m[1]:+.1f} dB against the rest · {f['lead']['voice']}"
    return {'status': grade(m[0], 0.5, 0.3), 'text': text, 'values': {'lead_audible': m[0], 'lead_db': m[1]}}


# Sections ---------------------------------------------------------------------------------------------------------

def energy_mean(db):
    return float(10 * np.log10(np.mean(10 ** (np.asarray(db) / 10))))


def contrast(a, b):
    """Whether B differs from A in loudness (LU), brightness, busyness or harmony, each a dict of those measures."""
    return (abs(b['lu'] - a['lu']) >= 1.5 or abs(np.log2(b['bright'] / a['bright'])) >= 0.2
            or abs(np.log2(max(b['busy'], 0.01) / max(a['busy'], 0.01))) >= 0.32 or float(a['chord'] @ b['chord']) <= 0.9)


def sections_check(f, feats):
    mt, mM, ct, cent, w, onsets, C, cht = (feats[k] for k in ('mt', 'mM', 'ct', 'cent', 'w', 'onsets', 'C', 'cht'))

    def measure(sp):
        if not sp:
            return None
        m, k = inside(mt - 0.2, sp), inside(ct, sp)  # a momentary reading covers the 0.4 s before it
        v = C[:, inside(cht, sp)].sum(axis=1)
        return {'lu': energy_mean(mM[m]), 'bright': float((cent[k] * w[k]).sum() / w[k].sum()),
                'busy': inside(onsets, sp).sum() / sum(b - a for a, b in sp), 'chord': v / np.linalg.norm(v)}

    A, B, intro, outro = (measure(spans(f, {k})) for k in ('A', 'B', 'intro', 'outro'))
    values, parts, status = {}, [], 'ok'
    if B:
        values = {'b_lu': B['lu'] - A['lu'], 'b_bright': B['bright'] / A['bright'], 'b_busy': B['busy'] / max(A['busy'], 0.01), 'b_chord': float(A['chord'] @ B['chord'])}
        parts.append(f"B vs A {values['b_lu']:+.1f} LU, brightness ×{values['b_bright']:.2f}, busyness ×{values['b_busy']:.2f}, harmony {values['b_chord']:.2f}")
        if not contrast(A, B):
            status, parts[-1] = 'warn', parts[-1] + ' (too close)'
    for name, s in (('intro', intro), ('outro', outro)):
        if s:
            values[f'{name}_lu'] = s['lu'] - A['lu']
            parts.append(f"{name} {values[f'{name}_lu']:+.1f} LU")
            if values[f'{name}_lu'] > -1:
                status = 'warn'
    return {'status': status, 'text': ' · '.join(parts), 'values': values}


# Mix --------------------------------------------------------------------------------------------------------------

def loudness(path):
    """ffmpeg's EBU R128 meter: integrated loudness (LUFS), loudness range (LU), true peak (dBTP), and the momentary
    loudness every 0.1 s as (times, LUFS)."""
    out = subprocess.run(['ffmpeg', '-nostats', '-hide_banner', '-i', str(path), '-af', 'ebur128=peak=true:framelog=info', '-f', 'null', '-'],
                         capture_output=True, text=True, check=True).stderr
    frames = np.array(re.findall(r't:\s*([\d.]+)\s+TARGET:\S+ LUFS\s+M:\s*(-?[\d.]+)', out), float)
    s = out[out.rindex('Summary:'):]
    peak = re.search(r'Peak:\s+(-?[\d.]+|-inf) dBFS', s)[1]
    return (float(re.search(r'I:\s+(-?[\d.]+) LUFS', s)[1]), float(re.search(r'LRA:\s+([\d.]+) LU', s)[1]),
            float('-inf') if peak == '-inf' else float(peak), frames[:, 0], frames[:, 1])


def spectrum(y, sr):
    return welch(y, sr, nperseg=8192)


def bands(f, p):
    """Each band's share of the energy, in dB."""
    return {k: float(10 * np.log10(p[(f >= a) & (f < b)].sum() / p.sum())) for k, (a, b) in BANDS.items()}


def tilt(f, p):
    """The spectrum's slope in dB per octave over octave bands 125 Hz–8 kHz: pink noise is −3, white noise 0."""
    fc = 125 * 2.0 ** np.arange(7)
    level = [10 * np.log10(p[(f >= c / np.sqrt(2)) & (f < c * np.sqrt(2))].mean()) for c in fc]
    return float(np.polyfit(np.log2(fc), level, 1)[0])


def mix_check(mix, sr, I, lra, peak):
    fr, p = spectrum(mix.mean(axis=1), sr)
    b, tl, corr = bands(fr, p), tilt(fr, p), float(np.corrcoef(mix[:, 0], mix[:, 1])[0, 1])
    status = worst('ok' if -20 <= I <= -12 else 'warn' if -23 <= I <= -9 else 'fail', grade(-peak, 0.5, 0), grade(corr, 0.2, 0))
    text = (f"{I:.1f} LUFS · range {lra:.1f} LU · peak {peak:.1f} dBTP · correlation {corr:.2f} · "
            f"low-mid {b['low-mid']:.1f} dB · presence {b['presence']:.1f} dB · tilt {tl:.1f} dB/oct")
    return {'status': status, 'text': text, 'values': {'lufs': I, 'lra': lra, 'peak': peak, 'correlation': corr, 'tilt': tl, **{f'band_{k}': v for k, v in b.items()}}}


def station_flags(results):
    """Low-mid (mud) and presence (harshness) more than 3 dB above the station's median, among 3 or more tracks."""
    by = {}
    for r in results:
        by.setdefault(r['station'], []).append(r)
    for group in by.values():
        if len(group) < 3:
            continue
        for band, word in (('band_low-mid', 'muddier'), ('band_presence', 'harsher')):
            med = np.median([r['checks']['mix']['values'][band] for r in group])
            for r in group:
                over = r['checks']['mix']['values'][band] - med
                if over > 3:
                    c = r['checks']['mix']
                    c['status'], c['text'] = worst(c['status'], 'warn'), c['text'] + f" · {word} than the station by {over:.1f} dB"


# One track --------------------------------------------------------------------------------------------------------

def section_features(mono, sr, env, C, mt, mM):
    """What sections_check compares: momentary loudness (mt, mM from loudness()), brightness, onsets and chroma."""
    feats = {'mt': mt, 'mM': mM, 'C': C, 'cht': librosa.frames_to_time(np.arange(C.shape[1]), sr=sr, hop_length=2048),
             'onsets': librosa.onset.onset_detect(onset_envelope=env, sr=sr, hop_length=HOP, units='time'),
             'cent': librosa.feature.spectral_centroid(y=mono, sr=sr, hop_length=512)[0],
             'w': librosa.feature.rms(y=mono, hop_length=512)[0] ** 2}
    feats['ct'] = librosa.frames_to_time(np.arange(len(feats['cent'])), sr=sr, hop_length=512)
    return feats


def hear(folder):
    folder = Path(folder)
    f = json.loads((folder / 'facts.json').read_text())
    mix, sr = sf.read(folder / 'mix.wav', dtype='float32')
    stems, ssr = {}, None
    for k in ('lead', 'harmony', 'drums', 'bed'):
        stems[k], ssr = sf.read(folder / f'{k}.wav', dtype='float32')
    mono = librosa.resample(mix.mean(axis=1), orig_sr=sr, target_sr=ssr)
    I, lra, peak, mt, mM = loudness(folder / 'mix.wav')
    env = onset_envelope(mono, ssr)
    C = chroma(stems['harmony'] + stems['lead'], ssr)
    feats = section_features(mono, ssr, env, C, mt, mM)
    checks = {
        'pulse': pulse_check(f, env, ssr),
        'notes': notes_check(f, C, ssr),
        'swing': swing_check(f, onset_times(stems['drums'], ssr)),
        'melody': melody_check(f, stems['lead'], stems['harmony'] + stems['drums'] + stems['bed'], ssr),
        'sections': sections_check(f, feats),
        'mix': mix_check(mix, sr, I, lra, peak),
    }
    return {'id': folder.name, 'station': f['station'], 'seed': f['seed'], 'title': f['title'], 'bpm': f['bpm'],
            'key': f"{NOTE_NAMES[f['key']]} {f['mode']}", 'seconds': f['seconds'], 'checks': checks,
            'plan': {k: v for k, v in (f.get('scores') or {}).items() if v is not None}}


def flat(r):
    return {**{f'{c}.{k}': v for c, check in r['checks'].items() for k, v in check['values'].items() if v is not None},
            **{f'judge.{k}': v for k, v in r.get('judge', {}).items()},
            **{f'plan.{k}': v for k, v in r.get('plan', {}).items()}}


def compare(results, path):
    """Mean of each measure for liked tracks beside disliked ones, largest gaps first (in pooled standard deviations)."""
    rated = {f"{r['station']}-{r['seed']}": r['rating'] for r in json.loads(Path(path).read_text()) if r.get('rating')}
    liked = [flat(r) for r in results if rated.get(r['id']) == 1]
    disliked = [flat(r) for r in results if rated.get(r['id']) == -1]
    print(f"\nratings: {len(liked)} liked, {len(disliked)} disliked among these tracks")
    if not liked or not disliked:
        print('  need both liked and disliked tracks to compare')
        return
    rows = []
    for k in sorted({k for r in liked + disliked for k in r}):
        a, b = [r[k] for r in liked if k in r], [r[k] for r in disliked if k in r]
        if a and b:
            sd = np.sqrt((np.var(a) + np.var(b)) / 2) or 1
            rows.append((abs(np.mean(a) - np.mean(b)) / sd, k, np.mean(a), np.mean(b)))
    print(f"  {'measure':26} {'liked':>9} {'disliked':>9}  gap (sd)")
    for gap, k, a, b in sorted(rows, reverse=True):
        print(f"  {k:26} {a:9.2f} {b:9.2f}  {gap:.1f}")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('paths', nargs='+')
    ap.add_argument('--json', action='store_true')
    ap.add_argument('--ratings')
    a = ap.parse_args()
    folders = sorted({p.parent for x in map(Path, a.paths) for p in ([x / 'facts.json'] if (x / 'facts.json').exists() else x.glob('*/facts.json'))})
    if not folders:
        sys.exit('no rendered tracks found; make some with: node tools/render.js <station> <seed>')
    with ProcessPoolExecutor(max_workers=min(len(folders), max(1, (os.cpu_count() or 2) - 2))) as ex:
        results = list(ex.map(hear, folders))
    station_flags(results)
    judged = folders[0].parent / 'judge.json'  # Audiobox Aesthetics scores from tools/judge.py, if it has run
    if judged.exists():
        scores = json.loads(judged.read_text())
        for r in results:
            if r['id'] in scores:
                r['judge'] = {k: v for k, v in scores[r['id']].items() if k != 'windows'}
    (folders[0].parent / 'report.json').write_text(json.dumps(results, indent=1, default=float))
    if a.json:
        print(json.dumps(results, indent=1, default=float))
    else:
        for r in results:
            print(f"\n{r['id']}  {r['title']}  {r['bpm']} bpm, {r['key']}, {r['seconds'] / 60:.1f} min")
            for name, c in r['checks'].items():
                print(f"  {c['status']:5} {name:9} {c['text']}")
        counts = {s: sum(c['status'] == s for r in results for c in r['checks'].values()) for s in ('ok', 'warn', 'fail')}
        print(f"\n{len(results)} tracks: {counts['ok']} ok, {counts['warn']} warn, {counts['fail']} fail → {folders[0].parent / 'report.json'}")
    if a.ratings:
        compare(results, a.ratings)
    sys.exit(1 if any(c['status'] == 'fail' for r in results for c in r['checks'].values()) else 0)


if __name__ == '__main__':
    main()
