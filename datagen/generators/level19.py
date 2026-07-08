"""Level 19 — Self-Excitement. Hawkes process with exponential kernel.

lambda(t) = mu + sum_i alpha e^{-beta (t - t_i)}. Every event raises the
probability of the next. Intended method: MLE on the closed-form
log-likelihood (O(n) recursion). Branching ratio eta = alpha / beta.
"""

import numpy as np

from datagen.common import field, make_pack, rng, truth_block
from datagen.estimators import hawkes_fit, hawkes_simulate

SEED = 2933  # representative draw: N(600) ~ 906 vs expected 900; MLE lands near truth
MU = 0.5
ALPHA = 0.8
BETA = 1.2
ETA = ALPHA / BETA        # branching ratio ~ 0.667
T_END = 600.0
RATE = MU / (1 - ETA)     # stationary rate = 1.5 events/unit


def mc_tols(reps: int = 30):
    errs = {"eta": [], "beta": [], "mu": []}
    for i in range(reps):
        g = rng(100_000 + i)
        ts = hawkes_simulate(MU, ALPHA, BETA, T_END, g)
        mu_hat, a_hat, b_hat = hawkes_fit(ts, T_END)
        errs["eta"].append(a_hat / b_hat - ETA)
        errs["beta"].append(b_hat - BETA)
        errs["mu"].append(mu_hat - MU)
    return {k: 4 * float(np.sqrt(np.mean(np.square(v)))) for k, v in errs.items()}


def build() -> dict:
    g = rng(SEED)
    ts = hawkes_simulate(MU, ALPHA, BETA, T_END, g)
    tols = mc_tols()

    return make_pack(
        id=19,
        seed=SEED,
        kind="events",
        columns={"t": ts},
        truth=truth_block(
            {"eta": ETA, "beta": BETA, "mu": MU},
            r"\lambda(t) = \mu + \sum_{t_i < t} \alpha\, e^{-\beta (t - t_i)},\quad \mu = 0.5,\ \alpha = 0.8,\ \beta = 1.2,\ \eta = \alpha/\beta = 2/3",
            curve_t=np.linspace(0, T_END, 200),
            curve_y=RATE * np.linspace(0, T_END, 200),
        ),
        grading={
            "mode": "parameter",
            "fields": [
                field(
                    "eta", "branching ratio η = α/β", ETA, tols["eta"],
                    help="fraction of events caused by other events",
                ),
                field("beta", "decay β", BETA, tols["beta"], unit="1/time"),
                field("mu", "background rate μ", MU, tols["mu"], unit="events/time"),
            ],
        },
        stats_col="t",
    )
