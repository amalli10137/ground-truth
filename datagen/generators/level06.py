"""Level 6 — The Fading Memory. Stationary AR(1).

Estimator: lag-1 autocorrelation (equivalently OLS of x_t on x_{t-1}).
Differencing — correct on level 5 — is now wrong: it over-differences a
stationary series. SE(phi_hat) ~ sqrt((1-phi^2)/N).
"""

import numpy as np

from datagen.common import field, make_pack, rng, truth_block

SEED = 1606
N = 1500
PHI = 0.85
SIGMA_EPS = 1.0


def build() -> dict:
    g = rng(SEED)
    # start in stationarity
    x = np.empty(N)
    x[0] = g.normal(0.0, SIGMA_EPS / np.sqrt(1 - PHI**2))
    eps = g.normal(0.0, SIGMA_EPS, N)
    for i in range(1, N):
        x[i] = PHI * x[i - 1] + eps[i]
    t = np.arange(N, dtype=float)

    se_phi = np.sqrt((1 - PHI**2) / N)
    se_sig = SIGMA_EPS / np.sqrt(2 * N)
    return make_pack(
        id=6,
        seed=SEED,
        kind="series",
        columns={"t": t, "y": x},
        truth=truth_block(
            {"phi": PHI, "sigma_eps": SIGMA_EPS},
            r"x_t = 0.85\,x_{t-1} + \varepsilon_t,\quad \varepsilon_t \sim \mathcal{N}(0,\,1)",
            curve_t=t,
            curve_y=np.zeros(N),
        ),
        grading={
            "mode": "parameter",
            "fields": [
                field("phi", "memory φ", PHI, 4 * se_phi),
                field("sigma_eps", "innovation std σ", SIGMA_EPS, 4 * se_sig),
            ],
        },
    )
