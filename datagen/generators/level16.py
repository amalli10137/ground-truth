"""Level 16 — Long Memory. Fractional Brownian motion, H = 0.72.

Increments are correlated at ALL lags. Intended method: detrended
fluctuation analysis (DFA) — or R/S — on the increments.
"""

import numpy as np

from datagen.common import field, make_pack, rng, truth_block
from datagen.estimators import dfa_hurst, fgn_davies_harte

SEED = 2616
N = 2000
H = 0.72
SIGMA = 1.0


def mc_tol(reps: int = 100) -> float:
    errs = []
    for i in range(reps):
        g = rng(97_000 + i)
        d = fgn_davies_harte(N, H, SIGMA, g)
        h_hat, _, _ = dfa_hurst(d)
        errs.append(h_hat - H)
    return 4 * float(np.sqrt(np.mean(np.square(errs))))


def build() -> dict:
    g = rng(SEED)
    d = fgn_davies_harte(N, H, SIGMA, g)
    y = np.concatenate([[0.0], np.cumsum(d)])
    t = np.arange(N + 1, dtype=float)
    tol_h = mc_tol()

    return make_pack(
        id=16,
        seed=SEED,
        kind="series",
        columns={"t": t, "y": y},
        truth=truth_block(
            {"H": H},
            r"x_t = B_H(t),\quad \mathbb{E}\big[(B_H(t) - B_H(s))^2\big] = \sigma^2 |t-s|^{2H},\quad H = 0.72",
        ),
        grading={
            "mode": "parameter",
            "fields": [
                field(
                    "H",
                    "Hurst exponent H",
                    H,
                    tol_h,
                    help="H = 1/2 is an ordinary random walk; this is not that",
                )
            ],
        },
    )
