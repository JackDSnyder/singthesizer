"""
Load audio for analysis. Browser recordings are often WebM; librosa's audioread path
can fail depending on OS codecs. Prefer ffmpeg when available for reliable WebM → PCM.
"""

from __future__ import annotations

import logging
import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Tuple

import librosa
import numpy as np

logger = logging.getLogger(__name__)

DEFAULT_SAMPLE_RATE = 44100


def load_audio_mono(
    audio_path: Path, sample_rate: int = DEFAULT_SAMPLE_RATE
) -> Tuple[np.ndarray, int]:
    """
    Load audio as mono float32, resampled to ``sample_rate``.

    For ``.webm`` / ``.weba``, if ``ffmpeg`` is on PATH, decode via ffmpeg to a temp WAV
    first (most reliable). Otherwise fall back to ``librosa.load`` (may use audioread).
    """
    audio_path = Path(audio_path)
    if not audio_path.exists():
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    suffix = audio_path.suffix.lower()
    tmp_wav: str | None = None
    try:
        if suffix in (".webm", ".weba"):
            ff = shutil.which("ffmpeg")
            if ff is not None:
                fd, tmp_wav = tempfile.mkstemp(suffix=".wav")
                os.close(fd)
                try:
                    subprocess.run(
                        [
                            ff,
                            "-y",
                            "-i",
                            str(audio_path),
                            "-ac",
                            "1",
                            "-ar",
                            str(sample_rate),
                            "-f",
                            "wav",
                            tmp_wav,
                        ],
                        check=True,
                        capture_output=True,
                        text=True,
                    )
                except subprocess.CalledProcessError as e:
                    err = (e.stderr or e.stdout or "").strip() or repr(e)
                    raise RuntimeError(
                        f"ffmpeg could not decode WebM audio: {err[:500]}"
                    ) from e
                load_path = tmp_wav
            else:
                logger.warning(
                    "ffmpeg not found on PATH; decoding WebM via librosa/audioread "
                    "(install ffmpeg for more reliable WebM support, e.g. brew install ffmpeg)."
                )
                load_path = str(audio_path)
        else:
            load_path = str(audio_path)

        y, sr = librosa.load(load_path, sr=sample_rate, mono=True)
        return y, sr
    finally:
        if tmp_wav and os.path.isfile(tmp_wav):
            try:
                os.unlink(tmp_wav)
            except OSError:
                pass
