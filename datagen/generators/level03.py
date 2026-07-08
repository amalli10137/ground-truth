"""Level 3 — One Pure Tone. Bin-centered sinusoid + noise. Estimator: FFT peak."""

import numpy as np

from datagen.common import field, make_pack, rng, spectrum_of, truth_block

SEED = 1303
N = 512
DT = 1.0 / 64.0  # fs = 64 Hz, T = 8 s, bin spacing 0.125 Hz
F = 4.0          # k = 32: exactly on-bin
A = 2.3
PHI = 0.7
SIGMA = 0.5


def build() -> dict:
    g = rng(SEED)
    t = np.arange(N) * DT
    y = A * np.sin(2 * np.pi * F * t + PHI) + g.normal(0.0, SIGMA, N)

    bin_spacing = 1.0 / (N * DT)
    se_amp = SIGMA * np.sqrt(2.0 / N)
    return make_pack(
        id=3,
        seed=SEED,
        kind="series",
        columns={"t": t, "y": y},
        spectrum=spectrum_of(y, DT),
        truth=truth_block(
            {"f": F, "A": A, "phi": PHI, "sigma": SIGMA},
            r"y(t) = 2.3\,\sin(2\pi\cdot 4.0\,t + 0.7) + \varepsilon,\quad \varepsilon \sim \mathcal{N}(0,\,0.5^2)",
            curve_t=t,
            curve_y=A * np.sin(2 * np.pi * F * t + PHI),
        ),
        grading={
            "mode": "parameter",
            "fields": [
                field("f", "frequency f", F, bin_spacing / 2, unit="Hz"),
                field("A", "amplitude A", A, 4 * se_amp),
            ],
        },
    )
