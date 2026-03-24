"""
Pitch detection using probabilistic YIN (pYIN) via librosa.
Produces (timestamp, frequency) pairs from an audio file.
Music-theory conversion (frequency → pitch class/octave) lives in keys_scales.py.
"""
from __future__ import annotations

from pathlib import Path
from typing import List, Tuple, Union

import librosa
import numpy as np

from .audio_io import DEFAULT_SAMPLE_RATE, load_audio_mono

# Defaults matching Phase 2: WAV, 44.1 kHz
HOP_LENGTH = 512
FRAME_LENGTH = 2048
# Frequency range for singing (C2 to C7)
FMIN = librosa.note_to_hz("C2")
FMAX = librosa.note_to_hz("C7")
# Librosa default ~35.9 oct/s; raise slightly so faster melodies (e.g. short notes) track better.
PYIN_MAX_TRANSITION_RATE = 60.0
# Optional extra drop for low voiced_prob (0 = off). Humming often fails strict voiced_flag.
DEFAULT_VOICED_PROB_MIN = 0.0
# If voiced_flag is False but prob is at least this, still keep the frame (helps hum / soft voice).
VOICED_PROB_OR_FALLBACK = 0.06
# Frame RMS gate; humming is quieter than full voice — keep default lenient.
DEFAULT_RMS_THRESHOLD = 0.004


def _correct_subharmonic_bias(
    f0: np.ndarray,
    voiced_flag: np.ndarray,
    fmax: float,
    window: int = 5,
) -> np.ndarray:
    """
    When local median pitch is much higher than f0[i], try doubling f0 (subharmonic fix).
    Conservative thresholds to avoid breaking real downward leaps.
    """
    out = np.asarray(f0, dtype=float).copy()
    n = len(out)
    half = max(1, window // 2)
    for i in range(n):
        if not bool(voiced_flag[i]) or not np.isfinite(out[i]) or out[i] <= 0:
            continue
        f = float(out[i])
        doubled = 2.0 * f
        if doubled > fmax:
            continue
        lo = max(0, i - half)
        hi = min(n, i + half + 1)
        neigh: List[float] = []
        for j in range(lo, hi):
            if j == i:
                continue
            if not bool(voiced_flag[j]):
                continue
            v = out[j]
            if np.isfinite(v) and float(v) > 0:
                neigh.append(float(v))
        if len(neigh) < 2:
            continue
        neigh.sort()
        med = neigh[len(neigh) // 2]
        if med <= 0:
            continue
        # Local contour is clearly higher; doubling lands near it → likely subharmonic lock.
        if med / f >= 1.45 and 0.75 * med <= doubled <= 1.35 * med:
            out[i] = doubled
    return out


def detect_pitch(
    audio_path: Union[str, Path],
    sample_rate: int = DEFAULT_SAMPLE_RATE,
    confidence_threshold: float = DEFAULT_VOICED_PROB_MIN,
    rms_threshold: float = DEFAULT_RMS_THRESHOLD,
) -> List[Tuple[float, float]]:
    """
    Run pYIN (probabilistic YIN) pitch detection on a WAV file.

    Args:
        audio_path: Path to a WAV file (e.g. 44.1 kHz).
        sample_rate: Sample rate to load/resample to (default 44100).
        confidence_threshold: If > 0, drop frames whose voiced probability is below
            this value. Default 0 disables this filter.
        rms_threshold: Drop frames whose frame RMS is below this value (0 to disable).

    Returns:
        List of (timestamp_seconds, frequency_hz). Keeps frames with finite f0 when
        ``voiced_flag`` is true or ``voiced_prob`` >= ``VOICED_PROB_OR_FALLBACK``.
    """
    audio_path = Path(audio_path)
    if not audio_path.exists():
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    y, sr = load_audio_mono(audio_path, sample_rate=sample_rate)
    y = np.asarray(y, dtype=float)

    f0, voiced_flag, voiced_prob = librosa.pyin(
        y,
        fmin=FMIN,
        fmax=FMAX,
        sr=sr,
        frame_length=FRAME_LENGTH,
        hop_length=HOP_LENGTH,
        max_transition_rate=PYIN_MAX_TRANSITION_RATE,
        fill_na=np.nan,
        center=True,
    )
    f0 = _correct_subharmonic_bias(f0, voiced_flag, FMAX)
    times = librosa.frames_to_time(np.arange(len(f0)), sr=sr, hop_length=HOP_LENGTH)
    rms = librosa.feature.rms(
        y=y, frame_length=FRAME_LENGTH, hop_length=HOP_LENGTH, center=True
    )[0]

    result: List[Tuple[float, float]] = []
    n = min(len(times), len(f0), len(rms), len(voiced_flag), len(voiced_prob))
    for i in range(n):
        t = times[i]
        freq = f0[i]
        energy = rms[i]
        if not np.isfinite(freq) or freq <= 0.0:
            continue
        vp = float(voiced_prob[i]) if np.isfinite(voiced_prob[i]) else 0.0
        voiced = bool(voiced_flag[i])
        if not voiced and vp < VOICED_PROB_OR_FALLBACK:
            continue
        if confidence_threshold > 0.0 and (not np.isfinite(vp) or vp < confidence_threshold):
            continue
        if rms_threshold > 0 and energy < rms_threshold:
            continue
        result.append((float(t), float(freq)))
    return result
