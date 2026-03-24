"""
Regression tests for quantization when tweaking BPM, grid, or key mapping.
Keeps coverage light — music-theory helpers are tested indirectly via the pipeline.
"""
from django.test import SimpleTestCase

from apps.music.services.quantization import quantize_to_beats, quantize_to_key


class QuantizationRegressionTests(SimpleTestCase):
    def test_beats_snap_to_sixteenth_grid(self):
        """Time → beat → slot; slots must land on the 0.25 grid."""
        result = quantize_to_beats([(0.52, 440.0)], bpm=120)
        self.assertAlmostEqual(result[0][0], 1.0)
        pairs = [(t * 0.1, 440.0) for t in range(20)]
        out = quantize_to_beats(pairs, bpm=120, grid=0.25)
        for slot, _ in out:
            self.assertAlmostEqual(round(slot % 0.25, 6), 0.0, places=5)

    def test_zero_bpm_rejected(self):
        with self.assertRaises(ValueError):
            quantize_to_beats([(0.5, 440.0)], bpm=0)

    def test_frequency_to_key_a4_c_major(self):
        """Hz → pitch after scale rounding (used after pitch detection)."""
        result = quantize_to_key([(1.0, 440.0)], key="C")
        self.assertEqual(result[0][1], "A")
        self.assertEqual(result[0][2], 4)
