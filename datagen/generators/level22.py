"""Level 22 — The Strategy Factory. 100 backtests; 99 noise, 1 real edge.

Multiple-testing: the best of 99 coin-flip strategies looks brilliant.
Intended method: White's reality check / deflated Sharpe — compare the best
observed Sharpe against the distribution of the MAX of 100 null Sharpes.

Grading: the index of the real strategy (integer) AND a defensible
familywise error rate: stated alpha must be >= the achieved FWER p-value
(no overclaiming) and <= 0.10 (no rubber stamps). The seed is chosen so the
real strategy is identifiable — the test asserts it; on unlucky seeds the
generator itself fails loudly and a new seed must be chosen.
"""

import numpy as np

from datagen.common import make_pack, field, range_field, rng, truth_block

SEED = 3234  # chosen: true strategy is argmax, p_fwer ~ 0.008, and a noise impostor reaches Sharpe 2.1
N_STRATS = 100
T_DAYS = 504  # 2 years
SIGMA_D = 0.01
TRUE_IDX = 37          # 1-based index of the real strategy
SHARPE_TRUE = 3.0      # annualized
MU_D = SHARPE_TRUE * SIGMA_D / np.sqrt(252.0)


def simulate(g: np.random.Generator) -> np.ndarray:
    """Daily returns matrix (T x N). Column TRUE_IDX-1 has the edge."""
    R = g.normal(0.0, SIGMA_D, (T_DAYS, N_STRATS))
    R[:, TRUE_IDX - 1] += MU_D
    return R


def annual_sharpes(R: np.ndarray) -> np.ndarray:
    return R.mean(axis=0) / R.std(axis=0, ddof=1) * np.sqrt(252.0)


def max_null_sharpe_dist(n_sims: int = 20000) -> np.ndarray:
    """Distribution of max over 100 null annualized Sharpes (exact simulation)."""
    g = rng(202_200)
    # Sharpe of T iid N(0, s^2) days: mean/std * sqrt(252); simulate directly
    # in sufficient-statistic form for speed.
    z = g.normal(0.0, 1.0, (n_sims, N_STRATS))  # mean part
    chi = g.chisquare(T_DAYS - 1, (n_sims, N_STRATS))
    sharpe = (z / np.sqrt(T_DAYS)) / np.sqrt(chi / (T_DAYS - 1)) * np.sqrt(252.0)
    return sharpe.max(axis=1)


def build() -> dict:
    g = rng(SEED)
    R = simulate(g)
    sharpes = annual_sharpes(R)

    # the real strategy must be THE argmax on this seed, else change the seed
    assert int(np.argmax(sharpes)) == TRUE_IDX - 1, (
        f"seed {SEED}: real strategy (S={sharpes[TRUE_IDX-1]:.2f}) beaten by "
        f"strategy {int(np.argmax(sharpes))+1} (S={sharpes.max():.2f}) — change the seed"
    )

    # achieved FWER p-value: P(max of 100 null Sharpes >= observed best)
    null_max = max_null_sharpe_dist()
    p_fwer = float(np.mean(null_max >= sharpes[TRUE_IDX - 1]))
    assert p_fwer < 0.05, f"seed {SEED}: not identifiable at 5% (p={p_fwer:.3f})"
    alpha_lo = max(p_fwer, 0.001)

    equity = np.exp(np.cumsum(np.vstack([np.zeros(N_STRATS), R]), axis=0))
    t = np.arange(T_DAYS + 1, dtype=float)
    columns = {"t": t}
    for j in range(N_STRATS):
        columns[f"s{j+1:03d}"] = equity[:, j]

    return make_pack(
        id=22,
        seed=SEED,
        kind="panel",
        columns=columns,
        truth=truth_block(
            {
                "index": float(TRUE_IDX),
                "sharpe_true": SHARPE_TRUE,
                "p_fwer": p_fwer,
                "expected_max_null": float(np.median(null_max)),
            },
            r"99 \times \mathcal{N}(0, \sigma^2)\ \text{noise};\ \ 1\ \text{real edge at index } 37.\quad \mathbb{E}\big[\max_{99}\ \widehat{SR}_{\text{null}}\big] \approx 1.8",
        ),
        grading={
            "mode": "parameter",
            "fields": [
                field(
                    "index",
                    "index of the real strategy",
                    float(TRUE_IDX),
                    0.5,
                    integer=True,
                    help="1–100; or convince yourself none is identifiable — then check the derivation hint",
                ),
                range_field(
                    "alpha",
                    "your familywise error rate α",
                    alpha_lo,
                    0.10,
                    help="the FWER at which your identification is defensible: too small = overclaiming, too large = not a test",
                ),
            ],
        },
        stats_col="s001",  # never the true strategy: stats must not leak the answer
    )
