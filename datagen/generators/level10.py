"""Level 10 — The Dying Chords. Sum of 3 damped cosines.

Fourier fails on damping (Lorentzian smearing). Intended method: matrix
pencil — Hankel matrix, SVD signal subspace, generalized eigenvalues give
the complex poles z_i = exp((-d_i + 2*pi*i*f_i) dt). NMR / modal analysis.

Function-mode grading: submit predict(t), evaluated on a hidden extension
of the time axis — only a true pole recovery extrapolates; overfitting the
shown window fails loudly.
"""

import numpy as np

from datagen.common import field, make_pack, rng, spectrum_of, truth_block
from datagen.estimators import matrix_pencil

SEED = 2010
N = 1000
DT = 0.001  # 1 s at 1 kHz
FREQS = np.array([55.0, 120.0, 210.0])
DAMPS = np.array([3.0, 6.0, 10.0])
AMPS = np.array([1.0, 0.7, 0.5])
PHIS = np.array([0.4, 2.0, 5.1])
SIGMA = 0.05


def signal(t):
    y = np.zeros_like(t)
    for a, d, f, p in zip(AMPS, DAMPS, FREQS, PHIS):
        y += a * np.exp(-d * t) * np.cos(2 * np.pi * f * t + p)
    return y


HOLDOUT_T = np.arange(N, N + 400) * DT  # 0.4 s beyond the recording


def pipeline_predict(t_obs: np.ndarray, y_obs: np.ndarray, t_new: np.ndarray) -> np.ndarray:
    """The intended reconstruction: matrix-pencil poles + least-squares amplitudes."""
    dt = t_obs[1] - t_obs[0]
    f_hat, d_hat = matrix_pencil(y_obs, dt, n_modes=3)
    cols = []
    for f, d in zip(f_hat[:3], d_hat[:3]):
        cols.append(np.exp(-d * t_obs) * np.cos(2 * np.pi * f * t_obs))
        cols.append(np.exp(-d * t_obs) * np.sin(2 * np.pi * f * t_obs))
    A = np.stack(cols, axis=1)
    coef, *_ = np.linalg.lstsq(A, y_obs, rcond=None)
    cols_new = []
    for f, d in zip(f_hat[:3], d_hat[:3]):
        cols_new.append(np.exp(-d * t_new) * np.cos(2 * np.pi * f * t_new))
        cols_new.append(np.exp(-d * t_new) * np.sin(2 * np.pi * f * t_new))
    return np.stack(cols_new, axis=1) @ coef


def mc_rmse_max(reps: int = 60) -> float:
    """rmseMax = 4x the RMS holdout error of the intended pipeline."""
    t = np.arange(N) * DT
    y_true_holdout = signal(HOLDOUT_T)
    errs = []
    for i in range(reps):
        g = rng(92_000 + i)
        y = signal(t) + g.normal(0.0, SIGMA, N)
        y_hat = pipeline_predict(t, y, HOLDOUT_T)
        errs.append(np.sqrt(np.mean((y_hat - y_true_holdout) ** 2)))
    return 4 * float(np.sqrt(np.mean(np.square(errs))))


def build() -> dict:
    g = rng(SEED)
    t = np.arange(N) * DT
    y = signal(t) + g.normal(0.0, SIGMA, N)
    rmse_max = mc_rmse_max()

    return make_pack(
        id=10,
        seed=SEED,
        kind="series",
        columns={"t": t, "y": y},
        spectrum=spectrum_of(y, DT),
        truth=truth_block(
            {
                "f1": FREQS[0], "f2": FREQS[1], "f3": FREQS[2],
                "d1": DAMPS[0], "d2": DAMPS[1], "d3": DAMPS[2],
            },
            r"y(t) = \sum_{i=1}^{3} A_i\, e^{-d_i t} \cos(2\pi f_i t + \varphi_i) + \varepsilon,\quad f = (55, 120, 210),\ d = (3, 6, 10)",
            curve_t=t,
            curve_y=signal(t),
        ),
        grading={
            "mode": "function",
            "holdout": {
                "t": [float(f"{v:.10g}") for v in HOLDOUT_T],
                "yTrue": [float(f"{v:.10g}") for v in signal(HOLDOUT_T)],
            },
            "rmseMax": float(f"{rmse_max:.6g}"),
        },
    )
