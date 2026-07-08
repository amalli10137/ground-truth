"""Level 18 — The Kalman Level. Hidden AR(1) observed through heavy noise.

x_t = phi x_{t-1} + w_t,  y_t = x_t + v_t.  Intended method: maximize the
Kalman-filter likelihood over (phi, sigma_w, sigma_v); overlay filtered vs
smoothed state. The red reveal is the true hidden trajectory.
"""

import numpy as np

from datagen.common import field, make_pack, rng, truth_block
from datagen.estimators import kalman_fit

SEED = 2818
N = 800
PHI = 0.97
SIGMA_W = 0.6
SIGMA_V = 2.0


def simulate(g: np.random.Generator):
    x = np.empty(N)
    x[0] = g.normal(0.0, SIGMA_W / np.sqrt(1 - PHI**2))
    w = g.normal(0.0, SIGMA_W, N)
    for i in range(1, N):
        x[i] = PHI * x[i - 1] + w[i]
    y = x + g.normal(0.0, SIGMA_V, N)
    return x, y


def mc_tols(reps: int = 30):
    errs = {"phi": [], "sigma_w": [], "sigma_v": []}
    for i in range(reps):
        g = rng(99_000 + i)
        _, y = simulate(g)
        phi, sw, sv = kalman_fit(y)
        errs["phi"].append(phi - PHI)
        errs["sigma_w"].append(sw - SIGMA_W)
        errs["sigma_v"].append(sv - SIGMA_V)
    return {k: 4 * float(np.sqrt(np.mean(np.square(v)))) for k, v in errs.items()}


def build() -> dict:
    g = rng(SEED)
    x, y = simulate(g)
    t = np.arange(N, dtype=float)
    tols = mc_tols()

    return make_pack(
        id=18,
        seed=SEED,
        kind="series",
        columns={"t": t, "y": y},
        truth=truth_block(
            {"phi": PHI, "sigma_w": SIGMA_W, "sigma_v": SIGMA_V},
            r"x_t = 0.97\,x_{t-1} + w_t,\ \ y_t = x_t + v_t,\quad w \sim \mathcal{N}(0, 0.6^2),\ v \sim \mathcal{N}(0, 2^2)",
            curve_t=t,
            curve_y=x,
        ),
        grading={
            "mode": "parameter",
            "fields": [
                field("phi", "state memory φ", PHI, tols["phi"]),
                field("sigma_w", "process noise σ_w", SIGMA_W, tols["sigma_w"]),
                field("sigma_v", "measurement noise σ_v", SIGMA_V, tols["sigma_v"]),
            ],
        },
    )
