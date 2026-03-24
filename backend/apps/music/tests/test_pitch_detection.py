"""
Regression tests for detect_pitch() when tweaking pYIN / RMS / frame settings.
Uses synthetic sine WAVs and silence.
"""
import os
import statistics

import numpy as np
from django.test import SimpleTestCase

from apps.music.services.pitch_detection import (
    _correct_subharmonic_bias,
    detect_pitch,
)
from .helpers import make_sine_wav, make_silent_wav


class PitchDetectionRegressionTests(SimpleTestCase):
    def test_median_frequency_near_target(self):
        path = make_sine_wav(440.0, duration_sec=2.0)
        self.addCleanup(os.remove, path)
        pairs = detect_pitch(path)
        self.assertGreater(len(pairs), 0)
        median_freq = statistics.median(f for _, f in pairs)
        self.assertAlmostEqual(median_freq, 440.0, delta=20.0)

    def test_silence_returns_empty(self):
        path = make_silent_wav(duration_sec=2.0)
        self.addCleanup(os.remove, path)
        self.assertEqual(detect_pitch(path), [])

    def test_rms_gate_drops_very_quiet_audio(self):
        path = make_sine_wav(440.0, duration_sec=2.0, amplitude=0.001)
        self.addCleanup(os.remove, path)
        self.assertEqual(detect_pitch(path, rms_threshold=0.01), [])

    def test_file_not_found_raises(self):
        with self.assertRaises(FileNotFoundError):
            detect_pitch("/nonexistent/path/audio.wav")


class SubharmonicBiasTests(SimpleTestCase):
    def test_doubles_isolated_low_spike(self):
        """Middle frame at ~half local median → doubled toward neighbors."""
        f0 = np.array([440.0, 220.0, 440.0], dtype=float)
        voiced = np.array([True, True, True])
        out = _correct_subharmonic_bias(f0, voiced, fmax=2000.0, window=3)
        self.assertAlmostEqual(out[1], 440.0, places=3)

    def test_does_not_double_real_descent(self):
        f0 = np.array([440.0, 330.0, 220.0], dtype=float)
        voiced = np.array([True, True, True])
        out = _correct_subharmonic_bias(f0, voiced, fmax=2000.0, window=3)
        self.assertAlmostEqual(out[1], 330.0, places=3)
