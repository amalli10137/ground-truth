"""Level 20 — The Pair. Two cointegrated random walks.

a_t = gamma * b_t + c + z_t with z an AR(1); b a pure random walk. Each leg
is individually unpredictable; the spread mean-reverts. Intended method:
Engle-Granger two-step — OLS a on b, then AR(1) on the residual spread;
half-life = ln 2 / (-ln phi).
"""

import numpy as np

from datagen.common import field, make_pack, rng, truth_block

SEED = 3020
N = 1250  # 5 years daily
GAMMA = 1.6
C = 1.2
PHI_Z = 0.94
SIGMA_Z = 0.05
SIGMA_B = 0.012
B0 = 3.9
HALF_LIFE = float(np.log(2) / -np.log(PHI_Z))  # ~11.2 days


def simulate(g: np.random.Generator):
    b = B0 + np.cumsum(g.normal(0.0, SIGMA_B, N))
    z = np.empty(N)
    z[0] = g.normal(0.0, SIGMA_Z / np.sqrt(1 - PHI_Z**2))
    eps = g.normal(0.0, SIGMA_Z, N)
    for i in range(1, N):
        z[i] = PHI_Z * z[i - 1] + eps[i]
    a = GAMMA * b + C + z
    return a, b


def eg_two_step(a: np.ndarray, b: np.ndarray):
    gamma_hat, c_hat = np.polyfit(b, a, 1)
    s = a - gamma_hat * b - c_hat
    phi_hat = float(np.sum(s[1:] * s[:-1]) / np.sum(s[:-1] ** 2))
    hl = float(np.log(2) / -np.log(min(max(phi_hat, 1e-6), 0.999999)))
    return float(gamma_hat), hl


def mc_tols(reps: int = 200):
    errs = {"gamma": [], "halflife": []}
    for i in range(reps):
        g = rng(101_000 + i)
        a, b = simulate(g)
        gamma_hat, hl = eg_two_step(a, b)
        errs["gamma"].append(gamma_hat - GAMMA)
        errs["halflife"].append(hl - HALF_LIFE)
    return {k: 4 * float(np.sqrt(np.mean(np.square(v)))) for k, v in errs.items()}


def build() -> dict:
    g = rng(SEED)
    a, b = simulate(g)
    t = np.arange(N, dtype=float)
    tols = mc_tols()

    return make_pack(
        id=20,
        seed=SEED,
        kind="panel",
        columns={"t": t, "a": a, "b": b},
        truth=truth_block(
            {"gamma": GAMMA, "c": C, "halflife": HALF_LIFE},
            r"a_t = 1.6\,b_t + 1.2 + z_t,\quad z_t = 0.94\,z_{t-1} + \varepsilon_t\ \ \text{(spread half-life } \approx 11.2\text{ days)}",
        ),
        grading={
            "mode": "parameter",
            "fields": [
                field("gamma", "hedge ratio γ", GAMMA, tols["gamma"]),
                field(
                    "halflife", "spread half-life", HALF_LIFE, tols["halflife"], unit="days"
                ),
            ],
        },
        stats_col="a",
    )
