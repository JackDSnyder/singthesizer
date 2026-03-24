"""Tests for EMA Hz smoothing and slot hysteresis."""
from django.test import SimpleTestCase

from apps.music.services.note_events import (
    DEFAULT_HYSTERESIS_SEMITONES,
    _apply_slot_hysteresis,
    generate_note_events,
)
from apps.music.services.pitch_smooth import (
    DEFAULT_EMA_ALPHA,
    smooth_beat_freq_pairs_ema,
)


class PitchSmoothEmaTests(SimpleTestCase):
    def test_constant_hz_unchanged(self):
        pairs = [(float(i) * 0.25, 440.0) for i in range(10)]
        out = smooth_beat_freq_pairs_ema(pairs, alpha=DEFAULT_EMA_ALPHA)
        self.assertEqual(len(out), len(pairs))
        for (_, a), (_, b) in zip(pairs, out):
            self.assertAlmostEqual(a, b, places=3)

    def test_step_response_blends(self):
        """After a Hz step, smoothed values move gradually (EMA)."""
        c_hz = 261.63
        d_hz = 293.66
        pairs = [(0.0, c_hz)] * 5 + [(1.0, d_hz)] * 5
        out = smooth_beat_freq_pairs_ema(pairs, alpha=0.5)
        # First D-frame should be between C and D (not full jump)
        first_d = out[5][1]
        self.assertGreater(first_d, c_hz)
        self.assertLess(first_d, d_hz)
        # Last frame approaches D
        self.assertAlmostEqual(out[-1][1], d_hz, delta=2.0)

    def test_empty_returns_empty(self):
        self.assertEqual(smooth_beat_freq_pairs_ema([]), [])

    def test_invalid_alpha_raises(self):
        with self.assertRaises(ValueError):
            smooth_beat_freq_pairs_ema([(0.0, 440.0)], alpha=0)
        with self.assertRaises(ValueError):
            smooth_beat_freq_pairs_ema([(0.0, 440.0)], alpha=1.5)


class SlotHysteresisTests(SimpleTestCase):
    def test_default_hysteresis_preserves_half_step(self):
        """E4–F4 is one semitone; default threshold <1 so we do not smear to E."""
        slot_pitch = {0.0: ("E", 4), 0.25: ("F", 4)}
        out = _apply_slot_hysteresis(
            slot_pitch, max_semitones=DEFAULT_HYSTERESIS_SEMITONES
        )
        self.assertEqual(out[0.0], ("E", 4))
        self.assertEqual(out[0.25], ("F", 4))

    def test_hysteresis_one_semitone_can_merge_when_explicit(self):
        slot_pitch = {0.0: ("E", 4), 0.25: ("F", 4)}
        out = _apply_slot_hysteresis(slot_pitch, max_semitones=1.0)
        self.assertEqual(out[0.25], ("E", 4))

    def test_hysteresis_keeps_two_semitone_step(self):
        """C4 and D4 differ by 2 — should not stick to C."""
        slot_pitch = {0.0: ("C", 4), 0.25: ("D", 4)}
        out = _apply_slot_hysteresis(
            slot_pitch, max_semitones=DEFAULT_HYSTERESIS_SEMITONES
        )
        self.assertEqual(out[0.0], ("C", 4))
        self.assertEqual(out[0.25], ("D", 4))

    def test_generate_note_events_hysteresis_disabled(self):
        slot_pitch = {0.0: ("E", 4), 0.25: ("F", 4)}
        tuples = [(s, pc, o) for s, (pc, o) in slot_pitch.items()]
        events = generate_note_events(tuples, hysteresis_semitones=0.0)
        self.assertEqual(len(events), 2)
        classes = [e["pitch_class"] for e in events]
        self.assertEqual(set(classes), {"E", "F"})
