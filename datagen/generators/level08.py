"""Level 8 — The Leak. A sinusoid between FFT bins.

Naive on-bin peak reading is now biased (spectral leakage). Intended method:
Hann window + quadratic interpolation of log-magnitude around the peak.
Tolerances calibrated by Monte Carlo over noise redraws.
"""

import numpy as np

from datagen.common import field, make_pack, rng, spectrum_of, truth_block
from datagen.estimators import hann_tone

SEED = 1808
N = 1024
DT = 1.0 / 64.0  # T = 16 s, bin spacing 0.0625 Hz
F = 7.5285       # 120.456 bins: solidly off-bin
A = 1.8
PHI = 1.1
SIGMA = 0.4


def signal(t):
    return A * np.sin(2 * np.pi * F * t + PHI)


def mc_tols(reps: int = 300) -> tuple[float, float]:
    t = np.arange(N) * DT
    errs_f, errs_a = [], []
    for i in range(reps):
        g = rng(90_000 + i)
        y = signal(t) + g.normal(0.0, SIGMA, N)
        f_hat, a_hat = hann_tone(y, DT)
        errs_f.append(f_hat - F)
        errs_a.append(a_hat - A)
    return 4 * float(np.sqrt(np.mean(np.square(errs_f)))), 4 * float(
        np.sqrt(np.mean(np.square(errs_a)))
    )


def build() -> dict:
    g = rng(SEED)
    t = np.arange(N) * DT
    y = signal(t) + g.normal(0.0, SIGMA, N)
    tol_f, tol_a = mc_tols()

    return make_pack(
        id=8,
        seed=SEED,
        kind="series",
        columns={"t": t, "y": y},
        spectrum=spectrum_of(y, DT),
        truth=truth_block(
            {"f": F, "A": A, "sigma": SIGMA},
            r"y(t) = 1.8\,\sin(2\pi\cdot 7.5285\,t + 1.1) + \varepsilon,\quad \varepsilon\sim\mathcal{N}(0,\,0.4^2)",
            curve_t=t,
            curve_y=signal(t),
        ),
        grading={
            "mode": "parameter",
            "fields": [
                field("f", "frequency f", F, tol_f, unit="Hz"),
                field("A", "amplitude A", A, tol_a),
            ],
        },
    )
