"""
Regression tests for generate_note_events() when tweaking merge / vote / min-duration logic.
"""
from django.test import SimpleTestCase

from apps.music.services.note_events import generate_note_events, GRID


class NoteEventsRegressionTests(SimpleTestCase):
    def test_merge_consecutive_same_pitch(self):
        tuples = [(slot, "A", 4) for slot in [0.0, 0.25, 0.5, 0.75]]
        events = generate_note_events(tuples)
        self.assertEqual(len(events), 1)
        self.assertAlmostEqual(events[0]["duration"], 1.0)
        self.assertEqual(events[0]["pitch_class"], "A")

    def test_silence_gap_splits_note(self):
        tuples = [(0.0, "A", 4), (0.5, "A", 4)]
        events = generate_note_events(tuples)
        self.assertEqual(len(events), 2)

    def test_majority_vote_per_slot(self):
        tuples = [(0.0, "A", 4), (0.0, "A", 4), (0.0, "A", 4), (0.0, "G", 4)]
        events = generate_note_events(tuples)
        self.assertEqual(len(events), 1)
        self.assertEqual(events[0]["pitch_class"], "A")

    def test_two_distinct_notes_in_sequence(self):
        c_slots = [(s, "C", 4) for s in [0.0, 0.25, 0.5, 0.75]]
        d_slots = [(s, "D", 4) for s in [1.0, 1.25, 1.5, 1.75]]
        events = generate_note_events(c_slots + d_slots)
        self.assertEqual(len(events), 2)
        self.assertEqual(events[0]["pitch_class"], "C")
        self.assertEqual(events[1]["pitch_class"], "D")
        self.assertAlmostEqual(events[0]["duration"], 1.0)
        self.assertGreaterEqual(events[0]["duration"], GRID)
