"""Level 4 — Two Tones in the Noise. Two on-bin sinusoids buried in unit noise.

Estimator: FFT peak-picking; coherent integration gain ~ N/2 pulls the weak
tone far above the noise floor even though it is invisible in the time domain.
"""

import numpy as np

from datagen.common import field, make_pack, rng, spectrum_of, truth_block

SEED = 1404
N = 2048
DT = 1.0 / 128.0  # fs = 128 Hz, T = 16 s, bin spacing 0.0625 Hz
F1, A1, PHI1 = 12.0, 1.0, 2.1       # k = 192
F2, A2, PHI2 = 33.4375, 0.35, 4.4   # k = 535
SIGMA = 1.0


def build() -> dict:
    g = rng(SEED)
    t = np.arange(N) * DT
    clean = A1 * np.sin(2 * np.pi * F1 * t + PHI1) + A2 * np.sin(2 * np.pi * F2 * t + PHI2)
    y = clean + g.normal(0.0, SIGMA, N)

    bin_spacing = 1.0 / (N * DT)
    se_amp = SIGMA * np.sqrt(2.0 / N)
    return make_pack(
        id=4,
        seed=SEED,
        kind="series",
        columns={"t": t, "y": y},
        spectrum=spectrum_of(y, DT),
        truth=truth_block(
            {"f1": F1, "A1": A1, "f2": F2, "A2": A2, "sigma": SIGMA},
            r"y(t) = 1.0\,\sin(2\pi\cdot 12\,t + \varphi_1) + 0.35\,\sin(2\pi\cdot 33.4375\,t + \varphi_2) + \varepsilon,\ \ \varepsilon\sim\mathcal{N}(0,1)",
            curve_t=t,
            curve_y=clean,
        ),
        grading={
            "mode": "parameter",
            "fields": [
                field("f1", "frequency f₁", F1, bin_spacing / 2, unit="Hz"),
                field("A1", "amplitude A₁", A1, 4 * se_amp),
                field("f2", "frequency f₂", F2, bin_spacing / 2, unit="Hz"),
                field("A2", "amplitude A₂", A2, 4 * se_amp),
            ],
        },
    )
