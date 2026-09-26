"""Each measure in hear.py, on synthetic sound with a known answer.

    python3 -m unittest discover tools
"""
import tempfile
import unittest
from pathlib import Path

import librosa
import numpy as np
import soundfile as sf
from scipy.signal import butter, lfilter

import hear

SR = 22050


def noise(seconds, sr=SR, seed=2, pink=False):
    """Unit-RMS white noise, or pink (equal energy per octave)."""
    x = np.random.default_rng(seed).standard_normal(int(seconds * sr))
    if pink:
        X, f = np.fft.rfft(x), np.fft.rfftfreq(len(x), 1 / sr)
        X[0], X[1:] = 0, X[1:] / np.sqrt(f[1:])
        x = np.fft.irfft(X, len(x))
    return x / np.sqrt(np.mean(x ** 2))


def hits(times, seconds, sr=SR, seed=1):
    """Short noise bursts, like closed hi-hats, at the given times."""
    y, r, n = np.zeros(int(seconds * sr)), np.random.default_rng(seed), int(0.04 * sr)
    for t in times:
        i = int(round(t * sr))
        y[i:i + n] += (r.standard_normal(n) * np.exp(-np.arange(n) / (0.006 * sr)))[:max(0, len(y) - i)]
    return y


def tones(notes, seconds, sr=SR, amp=0.2):
    """Notes [(start, length, midi or [midis])] as tones with four falling partials and a slow decay."""
    y = np.zeros(int(seconds * sr))
    for t0, d, m in notes:
        t = np.arange(int(d * sr)) / sr
        env = np.minimum(1, t / 0.01) * np.exp(-t / (1.5 * d))
        for x in m if isinstance(m, list) else [m]:
            f0 = 440 * 2 ** ((x - 69) / 12)
            v = amp * env * sum(np.sin(2 * np.pi * f0 * k * t) / k for k in range(1, 5) if f0 * k < sr / 2)
            i = int(t0 * sr)
            y[i:i + len(t)] += v[:len(y) - i]
    return y


def momentary(y, sr=SR):
    """The loudness meter's momentary readings (times, LUFS) for a mono signal played on both sides."""
    with tempfile.TemporaryDirectory() as d:
        p = Path(d) / 'x.wav'
        sf.write(p, np.stack([y, y], 1), sr)
        return hear.loudness(p)


class Pulse(unittest.TestCase):
    spb = 60 / 84
    beats = np.arange(1, 40) * spb

    def test_finds_the_tempo_of_a_click_track(self):
        env = hear.onset_envelope(hits(self.beats, 30) + 0.001 * noise(30), SR)
        found = float(librosa.feature.tempo(onset_envelope=env, sr=SR, hop_length=hear.HOP)[0])
        self.assertIn(hear.tempo_relation(found, 84), ('same', 'double', 'half'))
        self.assertEqual(hear.tempo_relation(found, 100), 'other')

    def test_a_steady_swung_kit_has_a_strong_pulse(self):
        y = hits(self.beats, 30, seed=1) + 0.4 * hits(self.beats + 0.64 * self.spb, 30, seed=2) + 0.001 * noise(30)
        self.assertGreater(hear.pulse(hear.onset_envelope(y, SR), SR, 84), 0.5)

    def test_as_many_hits_at_random_times_have_none(self):
        times = np.sort(np.random.default_rng(3).uniform(0.5, 29, 2 * len(self.beats)))
        self.assertLess(hear.pulse(hear.onset_envelope(hits(times, 30) + 0.001 * noise(30), SR), SR, 84), 0.3)


class Notes(unittest.TestCase):
    # E♭ major, I–vi–ii–V, two seconds a chord, twice, with each root in the bass
    CHORDS = [(i * 2.0 + 8.0 * rep, 2.0, c) for rep in range(2) for i, c in enumerate([[63, 67, 70, 74], [60, 63, 67, 70], [65, 68, 72, 75], [58, 62, 65, 68]])]
    PLAN = CHORDS + [(t, d, c[0] - 24) for t, d, c in CHORDS]

    def audio(self, shift=0):
        return tones([(t, d, [x + shift for x in m] if isinstance(m, list) else m + shift) for t, d, m in self.PLAN], 17)

    def share(self, y):
        C = hear.chroma(y, SR)
        return hear.on_plan(C, hear.sounding(self.PLAN, librosa.frames_to_time(np.arange(C.shape[1]), sr=SR, hop_length=2048)))

    def test_notes_played_as_planned_pass(self):
        self.assertGreaterEqual(self.share(self.audio()), 0.7)

    def test_notes_a_semitone_off_fail(self):
        self.assertLess(self.share(self.audio(shift=1)), 0.55)

    def test_a_progression_centres_where_its_notes_do_despite_the_partials(self):
        # counted note by note, I–vi–ii–V centres on E♭ major; each tone's third partial must not pull it to B♭
        self.assertEqual(hear.best_key(hear.chroma(self.audio(), SR).sum(axis=1))[:2], (3, 'major'))


class Swing(unittest.TestCase):
    def heard(self, amount, grid, bpm=90, lean=0.012):
        P = 60 / bpm * (1 if grid == 8 else 0.5)
        k = np.arange(1, int(58 / P))
        y = hits(np.concatenate([k * P, (k + amount) * P]) + lean, 60) + 0.001 * noise(60)
        return hear.swing(hear.onset_times(y, SR), bpm, grid)[0]

    def test_hears_eighth_note_swing_under_a_late_kit(self):
        self.assertAlmostEqual(self.heard(0.64, 8), 0.64, delta=0.02)

    def test_hears_sixteenth_note_swing(self):
        self.assertAlmostEqual(self.heard(0.58, 16), 0.58, delta=0.02)

    def test_hears_straight_time_as_straight(self):
        self.assertAlmostEqual(self.heard(0.5, 8), 0.5, delta=0.02)


class Melody(unittest.TestCase):
    NOTES = [(1 + 0.5 * i, 0.45, 76 + [0, 2, 4, 7, 4, 2][i % 6]) for i in range(24)]

    def share(self, amp):
        return hear.melody(tones(self.NOTES, 14, amp=amp), 0.1 * noise(14), SR, [(t, t + d) for t, d, _ in self.NOTES])[0]

    def test_a_lead_20_db_above_the_noise_in_its_band_is_audible(self):
        self.assertGreater(self.share(0.1), 0.8)

    def test_a_lead_14_db_under_the_noise_in_its_band_is_buried(self):
        self.assertLess(self.share(0.002), 0.3)


class Sections(unittest.TestCase):
    F = {'sections': [{'kind': k, 'start': 8.0 * i, 'end': 8.0 * (i + 1)} for i, k in enumerate(['intro', 'A', 'B', 'A', 'outro'])]}

    @staticmethod
    def part(level, cutoff, every, chord, seed):
        """Eight seconds of noise low-passed at `cutoff` Hz, a hit every `every` seconds and a held chord, all at `level`."""
        b, a = butter(2, cutoff / (SR / 2))
        n = lfilter(b, a, noise(8, seed=seed))
        return level * (0.5 * n / np.sqrt(np.mean(n ** 2)) + hits(np.arange(0.1, 8, every), 8, seed=seed) + tones([(0, 8, chord)], 8, amp=1))

    def check(self, b):
        quiet, a = self.part(0.02, 800, 9, [60, 64, 67], 1), lambda seed: self.part(0.05, 1000, 0.7, [60, 64, 67], seed)
        y = np.concatenate([quiet, a(2), b, a(4), quiet])
        mt, mM = momentary(y)[3:]
        return hear.sections_check(self.F, hear.section_features(y, SR, hear.onset_envelope(y, SR), hear.chroma(y, SR), mt, mM))

    def test_a_louder_brighter_busier_b_on_another_chord_contrasts(self):
        r = self.check(self.part(0.1, 5000, 0.35, [65, 69, 72], 3))
        self.assertEqual(r['status'], 'ok', r['text'])
        self.assertGreater(r['values']['b_lu'], 1.5)

    def test_a_b_twice_as_loud_as_a_reads_6_lu_louder(self):
        self.assertAlmostEqual(self.check(self.part(0.1, 1000, 0.7, [60, 64, 67], 3))['values']['b_lu'], 6.02, delta=0.4)

    def test_a_b_made_like_a_is_too_close(self):
        r = self.check(self.part(0.05, 1000, 0.7, [60, 64, 67], 3))
        self.assertEqual(r['status'], 'warn')
        self.assertIn('too close', r['text'])


class Mix(unittest.TestCase):
    def test_loudness_rises_6_db_when_the_signal_doubles(self):
        y = 0.05 * noise(10, pink=True)
        self.assertAlmostEqual(momentary(2 * y)[0] - momentary(y)[0], 6.02, delta=0.15)

    def test_momentary_readings_line_up_with_time(self):
        y = 0.05 * noise(20, pink=True)
        y[10 * SR:] *= 2
        t, m = momentary(y)[3:]
        first, second = hear.inside(t - 0.2, [(1, 9)]), hear.inside(t - 0.2, [(11, 19)])
        self.assertAlmostEqual(hear.energy_mean(m[second]) - hear.energy_mean(m[first]), 6.02, delta=0.3)

    def test_true_peak_of_a_half_scale_sine(self):
        y = 0.5 * np.sin(2 * np.pi * 997 * np.arange(5 * SR) / SR)
        self.assertAlmostEqual(momentary(y)[2], -6.0, delta=0.3)

    def test_tilt_is_0_for_white_noise_and_minus_3_for_pink(self):
        self.assertAlmostEqual(hear.tilt(*hear.spectrum(noise(30, 44100), 44100)), 0, delta=0.5)
        self.assertAlmostEqual(hear.tilt(*hear.spectrum(noise(30, 44100, pink=True), 44100)), -3, delta=0.5)

    def test_band_shares_follow_bandwidth_for_white_noise_and_octaves_for_pink(self):
        white, pink = (hear.bands(*hear.spectrum(noise(30, 44100, pink=p), 44100)) for p in (False, True))
        self.assertAlmostEqual(white['low-mid'] - white['presence'], 10 * np.log10(380 / 4000), delta=0.3)
        self.assertAlmostEqual(pink['low-mid'] - pink['presence'], 10 * np.log10(np.log2(500 / 120) / np.log2(6000 / 2000)), delta=0.3)


if __name__ == '__main__':
    unittest.main()
