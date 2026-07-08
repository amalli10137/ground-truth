"""Level 9 — The Glissando. Linear chirp: sin(2*pi*(f0 t + k/2 t^2)) + noise.

The FFT smears a moving frequency. Intended method: analytic signal via
scipy.signal.hilbert, unwrap the phase, fit a quadratic (edges trimmed).
"""

import numpy as np

from datagen.common import field, make_pack, rng, spectrum_of, truth_block
from datagen.estimators import chirp_phase_fit

SEED = 1909
N = 2048
DT = 1.0 / 256.0  # T = 8 s, fs = 256 Hz
F0 = 18.0
K = 6.5           # Hz per second; ends at 70 Hz, well under Nyquist
A = 1.5
SIGMA = 0.6


def signal(t):
    return A * np.sin(2 * np.pi * (F0 * t + 0.5 * K * t**2))


def mc_tols(reps: int = 200) -> tuple[float, float]:
    t = np.arange(N) * DT
    errs_f0, errs_k = [], []
    for i in range(reps):
        g = rng(91_000 + i)
        y = signal(t) + g.normal(0.0, SIGMA, N)
        f0_hat, k_hat = chirp_phase_fit(y, t)
        errs_f0.append(f0_hat - F0)
        errs_k.append(k_hat - K)
    return 4 * float(np.sqrt(np.mean(np.square(errs_f0)))), 4 * float(
        np.sqrt(np.mean(np.square(errs_k)))
    )


def build() -> dict:
    g = rng(SEED)
    t = np.arange(N) * DT
    y = signal(t) + g.normal(0.0, SIGMA, N)
    tol_f0, tol_k = mc_tols()

    return make_pack(
        id=9,
        seed=SEED,
        kind="series",
        columns={"t": t, "y": y},
        spectrum=spectrum_of(y, DT),
        truth=truth_block(
            {"f0": F0, "k": K, "A": A, "sigma": SIGMA},
            r"y(t) = 1.5\,\sin\!\big(2\pi(18\,t + \tfrac{6.5}{2}t^2)\big) + \varepsilon,\quad \varepsilon\sim\mathcal{N}(0,\,0.6^2)",
            curve_t=t,
            curve_y=signal(t),
        ),
        grading={
            "mode": "parameter",
            "fields": [
                field("f0", "start frequency f₀", F0, tol_f0, unit="Hz"),
                field("k", "chirp rate k", K, tol_k, unit="Hz/s"),
            ],
        },
    )
