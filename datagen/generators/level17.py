"""Level 17 — The Two Faces. 2-state hidden Markov regime switching.

Calm regime: low vol, mild positive drift. Panic: high vol, negative drift.
Intended method: Baum-Welch EM; Viterbi decode for the regime shading.
"""

import numpy as np

from datagen.common import field, make_pack, rng, truth_block
from datagen.estimators import hmm2_baum_welch

SEED = 2717
N = 1500
MU0, SIG0 = 0.0005, 0.008   # calm (daily log-return units)
MU1, SIG1 = -0.002, 0.025   # panic
P01, P10 = 0.02, 0.10       # calm->panic, panic->calm
S0 = 100.0


def simulate(g: np.random.Generator):
    states = np.zeros(N, dtype=int)
    s = 0
    for i in range(N):
        states[i] = s
        if s == 0 and g.uniform() < P01:
            s = 1
        elif s == 1 and g.uniform() < P10:
            s = 0
    mu = np.where(states == 0, MU0, MU1)
    sig = np.where(states == 0, SIG0, SIG1)
    r = mu + sig * g.normal(0.0, 1.0, N)
    return r, states


def mc_tols(reps: int = 40):
    errs = {"p01": [], "p10": [], "sigma0": [], "sigma1": []}
    for i in range(reps):
        g = rng(98_000 + i)
        r, _ = simulate(g)
        fit = hmm2_baum_welch(r)
        errs["p01"].append(fit["A"][0, 1] - P01)
        errs["p10"].append(fit["A"][1, 0] - P10)
        errs["sigma0"].append(fit["sigma"][0] - SIG0)
        errs["sigma1"].append(fit["sigma"][1] - SIG1)
    return {k: 4 * float(np.sqrt(np.mean(np.square(v)))) for k, v in errs.items()}


def build() -> dict:
    g = rng(SEED)
    r, states = simulate(g)
    price = S0 * np.exp(np.concatenate([[0.0], np.cumsum(r)]))
    t = np.arange(N + 1, dtype=float)
    tols = mc_tols()

    return make_pack(
        id=17,
        seed=SEED,
        kind="series",
        columns={"t": t, "y": price},
        truth=truth_block(
            {"p01": P01, "p10": P10, "sigma0": SIG0, "sigma1": SIG1},
            r"r_t \mid s_t \sim \mathcal{N}(\mu_{s_t}, \sigma_{s_t}^2),\quad P = \begin{pmatrix} 0.98 & 0.02 \\ 0.10 & 0.90 \end{pmatrix},\ \sigma = (0.008,\ 0.025)",
            states=np.concatenate([[0], states]),
        ),
        grading={
            "mode": "parameter",
            "fields": [
                field("p01", "P(calm → panic)", P01, tols["p01"]),
                field("p10", "P(panic → calm)", P10, tols["p10"]),
                field("sigma0", "calm vol σ₀ (daily)", SIG0, tols["sigma0"]),
                field("sigma1", "panic vol σ₁ (daily)", SIG1, tols["sigma1"]),
            ],
        },
    )
