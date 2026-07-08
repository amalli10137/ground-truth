"""Level 12 — Thirteen Samples. 3 tones, 13 random-time samples, far below Nyquist.

Underdetermined: 13 equations, 80 unknowns. Sparsity is the prior that
closes the gap. Intended method: L1 recovery (LASSO via ISTA).
"""

import numpy as np

from datagen.common import field, make_pack, rng, truth_block
from datagen.estimators import lasso_top_freqs

SEED = 2221  # chosen so L1 recovery works across a wide lambda range (and OMP too)
M = 13
FGRID = np.arange(1.0, 41.0)  # 1..40 Hz — Nyquist for uniform sampling would need 80 S/s
TRUE_FREQS = np.array([7.0, 19.0, 31.0])
AMPS = np.array([1.2, 0.9, 0.7])
PHIS = np.array([0.9, 3.6, 1.7])
SIGMA = 0.01


def signal(t):
    y = np.zeros_like(t)
    for a, f, p in zip(AMPS, TRUE_FREQS, PHIS):
        y += a * np.cos(2 * np.pi * f * t + p)
    return y


def build() -> dict:
    g = rng(SEED)
    t = np.sort(g.uniform(0.0, 1.0, M))
    y = signal(t) + g.normal(0.0, SIGMA, M)

    # winnability is asserted in tests: LASSO must recover the exact support
    dense_t = np.linspace(0, 1, 800)
    return make_pack(
        id=12,
        seed=SEED,
        kind="scatter",
        columns={"t": t, "y": y},
        truth=truth_block(
            {"f1": TRUE_FREQS[0], "f2": TRUE_FREQS[1], "f3": TRUE_FREQS[2]},
            r"y(t) = \sum_{j=1}^{3} A_j \cos(2\pi f_j t + \varphi_j),\quad f \in \{1,\dots,40\}\ \mathrm{Hz},\ \ f = (7, 19, 31)",
            curve_t=dense_t,
            curve_y=signal(dense_t),
        ),
        grading={
            "mode": "parameter",
            "fields": [
                field("f1", "lowest frequency f₁", TRUE_FREQS[0], 0.5, unit="Hz", integer=True),
                field("f2", "middle frequency f₂", TRUE_FREQS[1], 0.5, unit="Hz", integer=True),
                field("f3", "highest frequency f₃", TRUE_FREQS[2], 0.5, unit="Hz", integer=True),
            ],
        },
    )


def check_recovery() -> bool:
    pack_cols = build()["columns"]
    t = np.asarray(pack_cols["t"])
    y = np.asarray(pack_cols["y"])
    rec = lasso_top_freqs(t, y, FGRID, 3)
    return np.allclose(rec, TRUE_FREQS)
