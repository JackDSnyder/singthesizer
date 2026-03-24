"""
Note events generation: converts beat-aligned (beat_slot, pitch_class, octave) tuples
into merged note event dicts with start, duration, pitch_class, and octave.
"""

from collections import Counter
from typing import Dict, List, Tuple

from .keys_scales import pitch_tuple_to_midi

# One sixteenth note — minimum duration to keep a note (shorter = dropped blip)
MIN_NOTE_DURATION = 0.25
GRID = 0.25
# Sticky pitch along the beat grid. Use <1 so adjacent semitone steps (e.g. E–F) are not merged.
DEFAULT_HYSTERESIS_SEMITONES = 0.99


def _apply_slot_hysteresis(
    slot_pitch: Dict[float, Tuple[str, int]],
    max_semitones: float = DEFAULT_HYSTERESIS_SEMITONES,
) -> Dict[float, Tuple[str, int]]:
    """
    Walk beat slots in time order; if the winning pitch is within ``max_semitones``
    of the last *accepted* pitch, keep the previous pitch (reduces boundary flicker).
    """
    if not slot_pitch:
        return slot_pitch
    sorted_slots = sorted(slot_pitch.keys())
    stable_midi: int | None = None
    stable_tuple: Tuple[str, int] | None = None
    result: Dict[float, Tuple[str, int]] = {}
    for slot in sorted_slots:
        pitch = slot_pitch[slot]
        midi = pitch_tuple_to_midi(pitch[0], pitch[1])
        if stable_midi is None:
            stable_midi = midi
            stable_tuple = pitch
            result[slot] = pitch
            continue
        if abs(midi - stable_midi) <= max_semitones:
            result[slot] = stable_tuple  # stable_tuple set whenever stable_midi is set
        else:
            stable_midi = midi
            stable_tuple = pitch
            result[slot] = pitch
    return result


def generate_note_events(
    beat_tuples: List[Tuple[float, str, int]],
    grid: float = GRID,
    min_duration: float = MIN_NOTE_DURATION,
    hysteresis_semitones: float = DEFAULT_HYSTERESIS_SEMITONES,
) -> List[Dict]:
    """
    Convert beat-aligned pitch tuples into merged note event dicts.

    Input is the output of quantize_to_key(): many frames per beat slot, consecutive
    slots with the same pitch should become one longer note. The process is:

    1. Group all frames by their beat_slot and majority-vote the pitch_class+octave.
    2. Walk the resulting slot sequence, merging consecutive runs of the same pitch.
    3. Drop any note whose duration < min_duration.
    4. Silence gaps (slots with no frames) end the current note.

    Args:
        beat_tuples: List of (beat_slot, pitch_class, octave) from quantize_to_key().
                     Multiple tuples may share the same beat_slot (one per pYIN frame).
        grid: Grid resolution in beats (must match quantize_to_beats grid, default 0.25).
        min_duration: Minimum note duration in beats; shorter notes are dropped.
        hysteresis_semitones: After majority vote per slot, sticky pitch threshold
            along the timeline (default 1.0). Set to 0 to disable.

    Returns:
        List of note event dicts:
        {
            "start": float,      # beats, multiple of grid
            "duration": float,   # beats, >= min_duration
            "pitch_class": str,  # e.g. "C", "D", "E"
            "octave": int        # e.g. 3, 4, 5
        }
    """
    if not beat_tuples:
        return []

    # --- Step 1: Majority-vote pitch per slot ---
    # Collect all (pitch_class, octave) votes for each beat_slot
    slot_votes: Dict[float, List[Tuple[str, int]]] = {}
    for beat_slot, pitch_class, octave in beat_tuples:
        slot_votes.setdefault(beat_slot, []).append((pitch_class, octave))

    # Pick the most common (pitch_class, octave) per slot
    slot_pitch: Dict[float, Tuple[str, int]] = {
        slot: Counter(votes).most_common(1)[0][0] for slot, votes in slot_votes.items()
    }

    if hysteresis_semitones > 0:
        slot_pitch = _apply_slot_hysteresis(
            slot_pitch, max_semitones=hysteresis_semitones
        )

    # --- Step 2: Walk slots in order, merging consecutive same-pitch runs ---
    sorted_slots = sorted(slot_pitch.keys())
    note_events: List[Dict] = []

    current_start: float | None = None
    current_pitch: Tuple[str, int] | None = None
    current_end: float | None = None

    def _flush(start: float, end: float, pitch: Tuple[str, int]) -> None:
        """Emit a note event if it meets the minimum duration."""
        duration = round(end - start, 10)
        if duration >= min_duration:
            # Native int/float so DRF JSONResponse never sees numpy scalars (int64 is not JSON-serializable).
            note_events.append(
                {
                    "start": float(start),
                    "duration": float(duration),
                    "pitch_class": str(pitch[0]),
                    "octave": int(pitch[1]),
                }
            )

    for i, slot in enumerate(sorted_slots):
        pitch = slot_pitch[slot]

        if current_start is None:
            # Starting fresh
            current_start = slot
            current_pitch = pitch
            current_end = slot + grid
        elif pitch == current_pitch and abs(slot - current_end) < 1e-9:
            # Same pitch, adjacent slot — extend the current note
            current_end = slot + grid
        else:
            # Pitch changed or there's a silence gap — flush the current note
            _flush(current_start, current_end, current_pitch)
            current_start = slot
            current_pitch = pitch
            current_end = slot + grid

    # Flush the final note
    if current_start is not None:
        _flush(current_start, current_end, current_pitch)

    return note_events
