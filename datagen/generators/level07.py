"""Level 7 — Geometric Motion. GBM sampled daily for 4 years.

Estimator: log-returns. sigma_hat from their std (SE ~ sigma/sqrt(2N), tight);
mu_hat = mean(logret)/dt + sigma^2/2 with Merton's result SE = sigma/sqrt(T_years)
— drift precision depends only on the calendar span, so its tolerance is
honestly, painfully wide.
"""

import numpy as np

from datagen.common import field, make_pack, rng, truth_block

SEED = 1707
DT = 1.0 / 252.0
YEARS = 4.0
N = int(round(YEARS / DT))  # 1008 steps
MU = 0.12
SIGMA = 0.35
S0 = 100.0


def build() -> dict:
    g = rng(SEED)
    z = g.normal(0.0, 1.0, N)
    logret = (MU - SIGMA**2 / 2) * DT + SIGMA * np.sqrt(DT) * z
    s = S0 * np.exp(np.concatenate([[0.0], np.cumsum(logret)]))
    t = np.arange(N + 1) * DT

    se_sigma = SIGMA / np.sqrt(2 * N)
    se_mu = SIGMA / np.sqrt(YEARS)
    return make_pack(
        id=7,
        seed=SEED,
        kind="series",
        columns={"t": t, "y": s},
        truth=truth_block(
            {"mu": MU, "sigma": SIGMA},
            r"dS_t = \mu S_t\,dt + \sigma S_t\,dW_t,\quad \mu = 0.12,\ \sigma = 0.35",
            curve_t=t,
            curve_y=S0 * np.exp(MU * t),
        ),
        grading={
            "mode": "parameter",
            "fields": [
                field("sigma", "volatility σ (annualized)", SIGMA, 4 * se_sigma),
                field(
                    "mu",
                    "drift μ (annualized)",
                    MU,
                    4 * se_mu,
                    help="yes, the tolerance is wide — that IS the lesson",
                ),
            ],
        },
    )
