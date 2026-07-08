"""Level 2 — The Trend. y = a + b t + noise. Estimator: OLS."""

import numpy as np

from datagen.common import field, make_pack, rng, truth_block

SEED = 1202
N = 250
A = -1.4
B = 0.85
SIGMA = 3.0
T_MAX = 10.0


def build() -> dict:
    g = rng(SEED)
    t = np.linspace(0.0, T_MAX, N)
    y = A + B * t + g.normal(0.0, SIGMA, N)

    stt = float(np.sum((t - t.mean()) ** 2))
    se_b = SIGMA / np.sqrt(stt)
    se_a = SIGMA * np.sqrt(1.0 / N + t.mean() ** 2 / stt)
    return make_pack(
        id=2,
        seed=SEED,
        kind="series",
        columns={"t": t, "y": y},
        truth=truth_block(
            {"a": A, "b": B, "sigma": SIGMA},
            r"y_t = -1.4 + 0.85\,t + \varepsilon_t,\quad \varepsilon_t \sim \mathcal{N}(0,\,3^2)",
            curve_t=t,
            curve_y=A + B * t,
        ),
        grading={
            "mode": "parameter",
            "fields": [
                field("a", "intercept a", A, 4 * se_a),
                field("b", "slope b", B, 4 * se_b),
            ],
        },
    )
