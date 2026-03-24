"""
Shared test helpers for the music app test suite.
"""
import tempfile

import numpy as np
import soundfile as sf


def make_sine_wav(
    freq_hz: float,
    duration_sec: float = 2.0,
    sample_rate: int = 44100,
    amplitude: float = 0.5,
) -> str:
    """
    Write a pure-tone sine wave WAV to a temp file and return its path.

    The caller is responsible for deleting the file after use, e.g.:
        path = make_sine_wav(440.0)
        self.addCleanup(os.remove, path)
    """
    n_samples = int(sample_rate * duration_sec)
    t = np.linspace(0, duration_sec, n_samples, endpoint=False)
    y = amplitude * np.sin(2 * np.pi * freq_hz * t)
    tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    sf.write(tmp.name, y, sample_rate)
    tmp.close()
    return tmp.name


def make_silent_wav(duration_sec: float = 2.0, sample_rate: int = 44100) -> str:
    """Write an all-zeros WAV to a temp file and return its path."""
    n_samples = int(sample_rate * duration_sec)
    y = np.zeros(n_samples, dtype=np.float32)
    tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    sf.write(tmp.name, y, sample_rate)
    tmp.close()
    return tmp.name
