"""
Time-ordered smoothing of beat-aligned Hz before scale quantization.
"""
import math
from typing import List, Tuple

# EMA weight on new log-sample; higher = follow input more closely (better for faster lines).
DEFAULT_EMA_ALPHA = 0.34


def smooth_beat_freq_pairs_ema(
    pairs: List[Tuple[float, float]],
    alpha: float = DEFAULT_EMA_ALPHA,
) -> List[Tuple[float, float]]:
    """
    Apply exponential moving average on log2(Hz) in **list order** (chronological
    frames from pitch detection).

    Args:
        pairs: Output of quantize_to_beats — (beat_slot, frequency_hz).
        alpha: Smoothing factor in (0, 1]; higher = less smoothing.

    Returns:
        New list of (beat_slot, smoothed_hz), same length and order as ``pairs``.
    """
    if not pairs:
        return []
    if not 0 < alpha <= 1:
        raise ValueError("alpha must be in (0, 1]")

    out: List[Tuple[float, float]] = []
    prev_log: float | None = None
    for slot, hz in pairs:
        h = float(hz)
        if not math.isfinite(h) or h <= 0:
            out.append((slot, h))
            prev_log = None
            continue
        log = math.log2(h)
        if prev_log is None:
            sm = log
        else:
            sm = alpha * log + (1.0 - alpha) * prev_log
        prev_log = sm
        out.append((slot, float(2.0**sm)))
    return out
