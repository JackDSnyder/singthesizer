"""
Audio file → note_events: same steps as ``analyze_audio_view`` (tests import this to avoid drift).
"""
from pathlib import Path
from typing import Any, Dict, List, Union

from .note_events import generate_note_events
from .pitch_detection import detect_pitch
from .pitch_smooth import smooth_beat_freq_pairs_ema
from .quantization import quantize_to_beats, quantize_to_key


def note_events_from_audio_path(
    audio_path: Union[str, Path],
    bpm: int,
    key: str,
) -> List[Dict[str, Any]]:
    """
    Run pitch detection, beat alignment, smoothing, scale quantization, and note merging.

    Returns:
        List of note event dicts (empty if no voiced pitch frames).
    """
    path = Path(audio_path)
    pitch_pairs = detect_pitch(path)
    if not pitch_pairs:
        return []
    beat_pairs = quantize_to_beats(pitch_pairs, bpm=bpm)
    beat_pairs = smooth_beat_freq_pairs_ema(beat_pairs)
    key_pairs = quantize_to_key(beat_pairs, key=key)
    return generate_note_events(key_pairs)
