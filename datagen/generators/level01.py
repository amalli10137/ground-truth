"""Level 1 — The Flatline. y = c + noise. Estimator: sample mean."""

import numpy as np

from datagen.common import field, make_pack, rng, truth_block

SEED = 1101
N = 200
C = 5.0
SIGMA = 0.8


def build() -> dict:
    g = rng(SEED)
    t = np.arange(N, dtype=float)
    y = C + g.normal(0.0, SIGMA, N)

    se_mean = SIGMA / np.sqrt(N)
    return make_pack(
        id=1,
        seed=SEED,
        kind="series",
        columns={"t": t, "y": y},
        truth=truth_block(
            {"c": C, "sigma": SIGMA},
            r"y_t = 5 + \varepsilon_t,\quad \varepsilon_t \sim \mathcal{N}(0,\,0.8^2)",
            curve_t=t,
            curve_y=np.full(N, C),
        ),
        grading={
            "mode": "parameter",
            "fields": [field("c", "constant c", C, 4 * se_mean)],
        },
    )
