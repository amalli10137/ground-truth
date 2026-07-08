"""Level 15 — The Jumps. Merton jump-diffusion, daily for 8 years.

Realized variance is contaminated by jumps; bipower variation is not.
Intended method: threshold-truncated realized variance for the diffusive
sigma (bipower as the diagnostic that jumps exist), then a two-component
Gaussian mixture (EM) on daily returns for jump intensity and jump size.
"""

import numpy as np

from datagen.common import field, make_pack, rng, truth_block
from datagen.estimators import jump_mixture_em, truncated_sigma

SEED = 2515
DT = 1.0 / 252.0
N = 2016  # 8 years
MU = 0.08
SIGMA = 0.18       # diffusive, annualized
LAM = 8.0          # jumps per year (rare and violent)
S_J = 0.08         # jump size std (log-return units)
S0 = 100.0


def simulate(g: np.random.Generator) -> np.ndarray:
    """Returns daily log-returns."""
    z = g.normal(0.0, 1.0, N)
    njump = g.poisson(LAM * DT, N)
    jumps = np.array([g.normal(0.0, S_J * np.sqrt(k)) if k > 0 else 0.0 for k in njump])
    return (MU - SIGMA**2 / 2) * DT + SIGMA * np.sqrt(DT) * z + jumps


def mc_tols(reps: int = 60):
    errs = {"sigma": [], "lam": [], "sJ": []}
    for i in range(reps):
        g = rng(96_000 + i)
        r = simulate(g)
        errs["sigma"].append(truncated_sigma(r, DT) - SIGMA)
        lam_hat, sj_hat, _ = jump_mixture_em(r, DT)
        errs["lam"].append(lam_hat - LAM)
        errs["sJ"].append(sj_hat - S_J)
    return {k: 4 * float(np.sqrt(np.mean(np.square(v)))) for k, v in errs.items()}


def build() -> dict:
    g = rng(SEED)
    r = simulate(g)
    s = S0 * np.exp(np.concatenate([[0.0], np.cumsum(r)]))
    t = np.arange(N + 1) * DT
    tols = mc_tols()

    return make_pack(
        id=15,
        seed=SEED,
        kind="series",
        columns={"t": t, "y": s},
        truth=truth_block(
            {"sigma": SIGMA, "lam": LAM, "sJ": S_J},
            r"\frac{dS}{S} = \mu\,dt + \sigma\,dW + (e^{J}-1)\,dN_t,\quad \sigma = 0.18,\ \lambda = 8/\mathrm{yr},\ J \sim \mathcal{N}(0,\,0.08^2)",
        ),
        grading={
            "mode": "parameter",
            "fields": [
                field("sigma", "diffusive σ (annualized)", SIGMA, tols["sigma"]),
                field("lam", "jump intensity λ", LAM, tols["lam"], unit="per year"),
                field("sJ", "jump size std s_J", S_J, tols["sJ"]),
            ],
        },
    )
