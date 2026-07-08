"""Level 14 — Fat Tails. Levy alpha-stable increments, alpha = 1.6.

Sample variance never converges; std-based methods silently lie.
Intended method: Hill estimator on the top order statistics of |increments|.
"""

import numpy as np

from datagen.common import field, make_pack, rng, truth_block
from datagen.estimators import hill_alpha

SEED = 2414
N = 1500
ALPHA = 1.6
SCALE = 0.8
HILL_K = 150


def stable_rvs(g: np.random.Generator, n: int, alpha: float, scale: float) -> np.ndarray:
    """Chambers–Mallows–Stuck, symmetric case (beta = 0)."""
    v = g.uniform(-np.pi / 2, np.pi / 2, n)
    w = g.exponential(1.0, n)
    x = (np.sin(alpha * v) / np.cos(v) ** (1 / alpha)) * (
        np.cos(v - alpha * v) / w
    ) ** ((1 - alpha) / alpha)
    return scale * x


def mc_tol(reps: int = 300) -> float:
    errs = []
    for i in range(reps):
        g = rng(95_000 + i)
        d = stable_rvs(g, N, ALPHA, SCALE)
        errs.append(hill_alpha(d, HILL_K) - ALPHA)
    return 4 * float(np.sqrt(np.mean(np.square(errs))))


def build() -> dict:
    g = rng(SEED)
    d = stable_rvs(g, N, ALPHA, SCALE)
    y = np.concatenate([[0.0], np.cumsum(d)])
    t = np.arange(N + 1, dtype=float)
    tol_a = mc_tol()

    return make_pack(
        id=14,
        seed=SEED,
        kind="series",
        columns={"t": t, "y": y},
        truth=truth_block(
            {"alpha": ALPHA},
            r"x_t = x_{t-1} + \xi_t,\quad \xi_t \sim \text{S}\alpha\text{S}(\alpha = 1.6,\ c = 0.8)\ \ \text{— infinite variance}",
        ),
        grading={
            "mode": "parameter",
            "fields": [
                field(
                    "alpha",
                    "tail index α",
                    ALPHA,
                    tol_a,
                    help="2 = Gaussian; below 2, variance is infinite",
                )
            ],
        },
    )
