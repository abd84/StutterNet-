"""
Audio preprocessing for FluentNet inference.
Pipeline: load→mono→resample(16kHz)→pad/truncate(7s)→pre-emphasis→STFT→dB→[0,1]
Output tensor shape: (1, 1, 257, 701)
"""
import io
from math import gcd
import numpy as np
import soundfile as sf
import scipy.signal as ss
import torch

SR = 16_000
N_SAMPLES = 112_000   # 7s
N_FFT = 512
HOP = 160
WIN = 400
PRE_EMPH = 0.97
TARGET_T = 701


def audio_bytes_to_tensor(audio_bytes: bytes) -> torch.Tensor:
    # Load
    waveform, sr = sf.read(io.BytesIO(audio_bytes), dtype="float32", always_2d=False)
    # Mono
    if waveform.ndim == 2:
        waveform = waveform.mean(axis=1)
    # Resample
    if sr != SR:
        g = gcd(SR, sr)
        waveform = ss.resample_poly(waveform, SR // g, sr // g).astype(np.float32)
    # Pad/truncate
    if len(waveform) >= N_SAMPLES:
        waveform = waveform[:N_SAMPLES]
    else:
        waveform = np.pad(waveform, (0, N_SAMPLES - len(waveform)))
    # Pre-emphasis
    waveform = np.append(waveform[0], waveform[1:] - PRE_EMPH * waveform[:-1])
    # STFT
    window = ss.windows.hann(WIN)
    _, _, zxx = ss.stft(waveform, fs=SR, window=window,
                        nperseg=WIN, noverlap=WIN - HOP, nfft=N_FFT,
                        boundary="zeros", padded=True)
    mag = np.abs(zxx).astype(np.float32)  # (257, T)
    # Fix time axis to TARGET_T
    if mag.shape[1] >= TARGET_T:
        mag = mag[:, :TARGET_T]
    else:
        mag = np.pad(mag, ((0, 0), (0, TARGET_T - mag.shape[1])))
    # Amplitude → dB → min-max [0,1]
    ref = mag.max() if mag.max() > 0 else 1.0
    db = 20.0 * np.log10(np.maximum(mag / ref, 1e-10))
    lo, hi = db.min(), db.max()
    db = (db - lo) / (hi - lo) if hi > lo else np.zeros_like(db)
    # (1, 1, 257, 701)
    return torch.from_numpy(db.astype(np.float32)).unsqueeze(0).unsqueeze(0)
