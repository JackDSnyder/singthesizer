"""
Key and scale helpers for any major key.
All functions are key-agnostic — pass any root pitch class to work with any major scale.
Also contains frequency-to-pitch conversion since that is music theory, not audio processing.
"""
import math
from typing import List, Tuple

ALL_PITCH_CLASSES: List[str] = [
    "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"
]

# Semitone intervals that define a major scale from its root
MAJOR_SCALE_INTERVALS: List[int] = [0, 2, 4, 5, 7, 9, 11]


def get_major_scale(root: str) -> List[str]:
    """
    Return the 7 pitch classes of the major scale starting on root.

    Args:
        root: Root pitch class, e.g. "C", "G", "D", "F#".

    Returns:
        List of 7 pitch class strings in scale order.
        e.g. get_major_scale("G") -> ["G", "A", "B", "C", "D", "E", "F#"]
    """
    if root not in ALL_PITCH_CLASSES:
        raise ValueError(f"Unknown pitch class: {root!r}. Must be one of {ALL_PITCH_CLASSES}")

    root_idx = ALL_PITCH_CLASSES.index(root)
    return [ALL_PITCH_CLASSES[(root_idx + interval) % 12] for interval in MAJOR_SCALE_INTERVALS]


def is_scale_note(pitch_class: str, scale: List[str]) -> bool:
    """
    Return True if pitch_class is a member of scale.

    Args:
        pitch_class: e.g. "C", "F#".
        scale: List of pitch class strings, e.g. from get_major_scale().
    """
    return pitch_class in scale


def round_to_scale(pitch_class: str, scale: List[str]) -> str:
    """
    Round pitch_class to the nearest note in scale by semitone distance.

    If pitch_class is already in scale it is returned unchanged.
    On ties (equidistant between two scale notes), the lower note wins.

    Args:
        pitch_class: e.g. "C#", "F#", "A#".
        scale: List of pitch class strings, e.g. from get_major_scale().

    Returns:
        The nearest pitch class from scale.
    """
    if pitch_class in scale:
        return pitch_class

    if pitch_class not in ALL_PITCH_CLASSES:
        raise ValueError(f"Unknown pitch class: {pitch_class!r}")

    note_idx = ALL_PITCH_CLASSES.index(pitch_class)

    best_pitch = scale[0]
    best_distance = 12

    for candidate in scale:
        candidate_idx = ALL_PITCH_CLASSES.index(candidate)
        # Circular semitone distance (shortest path around the chromatic circle)
        dist = abs(note_idx - candidate_idx)
        dist = min(dist, 12 - dist)
        # Lower note wins on ties (candidate_idx < note_idx means candidate is lower)
        if dist < best_distance or (dist == best_distance and candidate_idx < note_idx):
            best_distance = dist
            best_pitch = candidate

    return best_pitch


def frequency_to_pitch_class_and_octave(frequency: float) -> Tuple[str, int]:
    """
    Convert frequency (Hz) to pitch class and octave.

    Uses MIDI note formula: midi_note = 12 * log2(frequency / 440.0) + 69
    Pitch class is one of C, C#, D, D#, E, F, F#, G, G#, A, A#, B.
    Octave is (midi_note // 12) - 1 (scientific pitch notation).

    Args:
        frequency: Frequency in Hz. Should be > 0.

    Returns:
        (pitch_class, octave), e.g. ("A", 4) for 440 Hz.
    """
    if frequency <= 0:
        raise ValueError("frequency must be positive")

    # Cast frequency so math.log2 always sees a Python float (avoids numpy int octave from np.log2 paths).
    freq = float(frequency)
    midi_note = 12 * math.log2(freq / 440.0) + 69
    midi_int = int(round(midi_note))
    midi_int = max(0, min(127, midi_int))

    pitch_class = ALL_PITCH_CLASSES[midi_int % 12]
    octave = (midi_int // 12) - 1
    return (pitch_class, int(octave))


def pitch_tuple_to_midi(pitch_class: str, octave: int) -> int:
    """
    Convert (pitch_class, octave) to MIDI note number (0–127), matching the
    rounding convention used by ``frequency_to_pitch_class_and_octave`` (rounded MIDI).

    Args:
        pitch_class: e.g. "C", "A#".
        octave: Scientific pitch octave, e.g. 4 for middle C.

    Returns:
        MIDI note number, clamped to [0, 127].
    """
    if pitch_class not in ALL_PITCH_CLASSES:
        raise ValueError(f"Unknown pitch class: {pitch_class!r}")
    idx = ALL_PITCH_CLASSES.index(pitch_class)
    midi_int = idx + 12 * (int(octave) + 1)
    return max(0, min(127, midi_int))


def midi_to_pitch_class_and_octave(midi_note: float) -> Tuple[str, int]:
    """
    Convert a MIDI note number to (pitch_class, octave), matching
    ``frequency_to_pitch_class_and_octave`` after rounding to nearest integer MIDI.

    Args:
        midi_note: MIDI note (fractional allowed; rounded to nearest int).

    Returns:
        (pitch_class, octave), e.g. ("A", 4) for 69.
    """
    midi_int = int(round(float(midi_note)))
    midi_int = max(0, min(127, midi_int))
    pitch_class = ALL_PITCH_CLASSES[midi_int % 12]
    octave = (midi_int // 12) - 1
    return (pitch_class, int(octave))
