"""
Quantization services: convert raw pitch detection output to beat-aligned,
scale-constrained (pitch_class, octave) tuples.
"""
from typing import List, Tuple

from .keys_scales import frequency_to_pitch_class_and_octave, get_major_scale, round_to_scale

# Default grid resolution: sixteenth notes (0.25 beats)
DEFAULT_GRID = 0.25


def quantize_to_beats(
    pitch_pairs: List[Tuple[float, float]],
    bpm: int,
    grid: float = DEFAULT_GRID,
) -> List[Tuple[float, float]]:
    """
    Convert (timestamp_seconds, frequency_hz) pairs to beat-grid-aligned positions.

    Each timestamp is converted to a beat position using BPM, then snapped to the
    nearest grid slot (default: sixteenth note = 0.25 beats).

    Args:
        pitch_pairs: Output of detect_pitch() — list of (seconds, Hz).
        bpm: Project BPM (beats per minute).
        grid: Grid resolution in beats (default 0.25 = sixteenth note).

    Returns:
        List of (beat_slot, frequency_hz). beat_slot is always a clean multiple of grid.
    """
    if bpm <= 0:
        raise ValueError("bpm must be positive")
    if grid <= 0:
        raise ValueError("grid must be positive")

    result: List[Tuple[float, float]] = []
    beats_per_second = bpm / 60.0

    for seconds, freq in pitch_pairs:
        beat = seconds * beats_per_second
        slot = round(beat / grid) * grid
        result.append((slot, freq))

    return result


def quantize_to_key(
    beat_freq_pairs: List[Tuple[float, float]],
    key: str = "C",
) -> List[Tuple[float, str, int]]:
    """
    Convert (beat_slot, frequency_hz) pairs to (beat_slot, pitch_class, octave) tuples,
    rounding each detected pitch to the nearest note in the given major scale.

    Args:
        beat_freq_pairs: Output of quantize_to_beats() — list of (beat_slot, Hz).
        key: Root note of the major scale to use (e.g. "C", "G", "D"). Defaults to "C".

    Returns:
        List of (beat_slot, pitch_class, octave).
        pitch_class is guaranteed to be a member of the major scale for key.
    """
    scale = get_major_scale(key)
    result: List[Tuple[float, str, int]] = []

    for beat_slot, freq in beat_freq_pairs:
        pitch_class, octave = frequency_to_pitch_class_and_octave(freq)
        pitch_class = round_to_scale(pitch_class, scale)
        result.append((beat_slot, pitch_class, octave))

    return result
