"""End-to-end guardrail: ``note_events_from_audio_path`` (same as analyze-audio view)."""
import os

from django.test import SimpleTestCase

from apps.music.services.pipeline import note_events_from_audio_path
from .helpers import make_sine_wav, make_silent_wav


def run_pipeline(wav_path: str, bpm: int = 120, key: str = "C"):
    return note_events_from_audio_path(wav_path, bpm=bpm, key=key)


class PipelineRegressionTests(SimpleTestCase):
    def test_sine_yields_expected_note_in_key(self):
        path = make_sine_wav(440.0, duration_sec=2.0)
        self.addCleanup(os.remove, path)
        events = run_pipeline(path, bpm=120, key="C")
        self.assertGreater(len(events), 0)
        for event in events:
            self.assertEqual(event["pitch_class"], "A")
            self.assertEqual(event["octave"], 4)

    def test_silence_yields_no_notes(self):
        path = make_silent_wav(duration_sec=2.0)
        self.addCleanup(os.remove, path)
        self.assertEqual(run_pipeline(path), [])

    def test_bpm_change_does_not_change_pitch_class(self):
        """Quantization timing only — pitch class/octave should stay stable."""
        path = make_sine_wav(440.0, duration_sec=2.0)
        self.addCleanup(os.remove, path)
        for bpm in (80, 120):
            events = run_pipeline(path, bpm=bpm, key="C")
            for event in events:
                self.assertEqual(event["pitch_class"], "A")
                self.assertEqual(event["octave"], 4)
