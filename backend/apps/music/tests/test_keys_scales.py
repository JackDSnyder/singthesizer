"""
Tests for MIDI helpers and consistency with frequency_to_pitch_class_and_octave.
"""
import math

from django.test import SimpleTestCase

from apps.music.services.keys_scales import (
    frequency_to_pitch_class_and_octave,
    midi_to_pitch_class_and_octave,
    pitch_tuple_to_midi,
)


class KeysScalesMidiTests(SimpleTestCase):
    def test_pitch_tuple_to_midi_a4(self):
        self.assertEqual(pitch_tuple_to_midi("A", 4), 69)

    def test_midi_round_trip(self):
        for pc, oct_ in [("C", 4), ("A", 4), ("G", 3), ("F#", 5)]:
            m = pitch_tuple_to_midi(pc, oct_)
            out = midi_to_pitch_class_and_octave(m)
            self.assertEqual(out, (pc, oct_))

    def test_frequency_matches_pitch_tuple_midi(self):
        """Rounded MIDI from Hz should match tuple conversion."""
        for freq in (261.63, 440.0, 523.25):
            pc, oct_ = frequency_to_pitch_class_and_octave(freq)
            midi_from_hz = int(
                round(12 * math.log2(freq / 440.0) + 69)
            )
            midi_from_hz = max(0, min(127, midi_from_hz))
            self.assertEqual(pitch_tuple_to_midi(pc, oct_), midi_from_hz)
