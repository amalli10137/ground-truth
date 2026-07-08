"""Level 13 — The Impostor. Logistic map + tiny observation noise.

Looks exactly like noise-driven wandering; is actually deterministic chaos.
Intended method: delay embedding — plot x_{n+1} vs x_n, fit the parabola,
read off r. The winnability test also asserts the embedding is visually
clean (tiny residual around the parabola) at the chosen noise level.
"""

import numpy as np

from datagen.common import field, make_pack, rng, truth_block
from datagen.estimators import logistic_r_fit

SEED = 2313
N = 600
R = 3.92
X0 = 0.51
SIGMA_OBS = 0.004


def simulate(g: np.random.Generator) -> np.ndarray:
    x = np.empty(N)
    x[0] = X0
    for i in range(1, N):
        x[i] = R * x[i - 1] * (1 - x[i - 1])
    return x + g.normal(0.0, SIGMA_OBS, N)


def mc_tol(reps: int = 300) -> float:
    errs = []
    for i in range(reps):
        g = rng(94_000 + i)
        y = simulate(g)
        r_hat, _ = logistic_r_fit(y)
        errs.append(r_hat - R)
    return 4 * float(np.sqrt(np.mean(np.square(errs))))


def build() -> dict:
    g = rng(SEED)
    y = simulate(g)
    t = np.arange(N, dtype=float)
    tol_r = mc_tol()

    return make_pack(
        id=13,
        seed=SEED,
        kind="series",
        columns={"t": t, "y": y},
        truth=truth_block(
            {"r": R},
            r"x_{n+1} = r\,x_n(1 - x_n),\quad r = 3.92\ \text{(deterministic chaos, not noise)}",
        ),
        grading={
            "mode": "parameter",
            "fields": [
                field(
                    "r",
                    "logistic parameter r",
                    R,
                    tol_r,
                    help="if you believe it's stochastic, no parameter will save you",
                )
            ],
        },
    )
