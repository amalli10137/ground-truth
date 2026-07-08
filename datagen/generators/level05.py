"""Level 5 — The Drunkard's Drift. Random walk with drift.

Estimator: difference first. Increments are iid N(mu, sigma^2), so
mu_hat = mean(diff), sigma_hat = std(diff). sigma is easy (SE ~ sigma/sqrt(2N));
mu is hard (SE = sigma/sqrt(N) regardless of how long you watch per-step).
"""

import numpy as np

from datagen.common import field, make_pack, rng, truth_block

SEED = 1505
N = 1000
MU = 0.15
SIGMA = 1.0
X0 = 20.0


def build() -> dict:
    g = rng(SEED)
    steps = MU + g.normal(0.0, SIGMA, N)
    x = X0 + np.concatenate([[0.0], np.cumsum(steps)])
    t = np.arange(N + 1, dtype=float)

    se_mu = SIGMA / np.sqrt(N)
    se_sigma = SIGMA / np.sqrt(2 * N)
    return make_pack(
        id=5,
        seed=SEED,
        kind="series",
        columns={"t": t, "y": x},
        truth=truth_block(
            {"mu": MU, "sigma": SIGMA},
            r"x_t = x_{t-1} + \mu + \varepsilon_t,\quad \mu = 0.15,\ \varepsilon_t \sim \mathcal{N}(0,\,1)",
            curve_t=t,
            curve_y=X0 + MU * t,
        ),
        grading={
            "mode": "parameter",
            "fields": [
                field("mu", "drift μ (per step)", MU, 4 * se_mu),
                field("sigma", "step std σ", SIGMA, 4 * se_sigma),
            ],
        },
    )
