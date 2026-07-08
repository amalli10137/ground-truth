"""Level 23 — The Market (final boss).

1000 days of GARCH(1,1) volatility clustering + Merton jumps + one hidden
regime shift (day 620: base variance x2.5, drift flips negative).

Distribution-mode grading: submit the 5th / 50th / 95th percentile of
tomorrow's close. Scored by mean pinball loss against 10,000 Monte Carlo
draws from the TRUE next-day distribution (model state known only to the
generator). lossMax = 1.10 x the loss of the exact true quantiles, so honest
uncertainty beats lucky point guesses. The intended pipeline — center at the
last price, width from EWMA/GARCH vol estimated on the current regime —
passes; an unconditional full-history vol fails (verified in tests).
"""

import numpy as np

from datagen.common import make_pack, rng, truth_block, _round_list

SEED = 3334  # chosen so the final state is hot: EWMA conditioning passes, flat history fails
N = 1000
DT = 1.0 / 252.0
A_G = 0.09          # GARCH arch coefficient
B_G = 0.88          # GARCH garch coefficient
OMEGA1 = 3.0e-6     # regime 1 base (uncond daily var 1e-4 -> vol 1.0%/day)
OMEGA2 = 7.5e-6     # regime 2: x2.5 (uncond vol ~1.58%/day)
MU1 = 0.0004
MU2 = -0.0004
SHIFT_DAY = 620
LAM = 6.0           # jumps / year
S_J = 0.05
S0 = 100.0
TAUS = [0.05, 0.5, 0.95]
N_DRAWS = 10_000


def simulate(g: np.random.Generator):
    """Returns (prices len N+1, final sigma2_next, last_price)."""
    r = np.empty(N)
    sig2 = OMEGA1 / (1 - A_G - B_G)
    eps_prev2 = sig2
    for i in range(N):
        omega = OMEGA1 if i < SHIFT_DAY else OMEGA2
        mu = MU1 if i < SHIFT_DAY else MU2
        sig2 = omega + A_G * eps_prev2 + B_G * sig2
        eps = np.sqrt(sig2) * g.normal()
        jump = 0.0
        k = g.poisson(LAM * DT)
        if k > 0:
            jump = g.normal(0.0, S_J * np.sqrt(k))
        r[i] = mu + eps + jump
        eps_prev2 = eps**2
    prices = S0 * np.exp(np.concatenate([[0.0], np.cumsum(r)]))
    sig2_next = OMEGA2 + A_G * eps_prev2 + B_G * sig2
    return prices, float(sig2_next)


def next_day_draws(last_price: float, sig2_next: float, g: np.random.Generator,
                   n: int = N_DRAWS) -> np.ndarray:
    z = g.normal(0.0, 1.0, n)
    k = g.poisson(LAM * DT, n)
    jump = np.where(k > 0, g.normal(0.0, 1.0, n) * S_J * np.sqrt(np.maximum(k, 1)), 0.0)
    r = MU2 + np.sqrt(sig2_next) * z + jump
    return last_price * np.exp(r)


def pinball(qs, taus, draws):
    loss = 0.0
    for q, tau in zip(qs, taus):
        d = draws - q
        loss += np.mean(np.where(d >= 0, tau * d, (tau - 1) * d))
    return loss / len(taus)


def build() -> dict:
    g = rng(SEED)
    prices, sig2_next = simulate(g)
    last = float(prices[-1])
    draws = next_day_draws(last, sig2_next, rng(SEED + 1))

    true_q = [float(np.quantile(draws, tau)) for tau in TAUS]
    loss_opt = pinball(true_q, TAUS, draws)
    loss_max = 1.10 * loss_opt

    t = np.arange(N + 1, dtype=float)
    return make_pack(
        id=23,
        seed=SEED,
        kind="series",
        columns={"t": t, "y": prices},
        truth=truth_block(
            {
                "omega1": OMEGA1, "omega2": OMEGA2, "alpha": A_G, "beta": B_G,
                "lambda": LAM, "sJ": S_J, "shift_day": float(SHIFT_DAY),
                "sigma_next_daily": float(np.sqrt(sig2_next)),
            },
            r"r_t = \mu_{\text{reg}} + \sigma_t z_t + J\,dN_t,\quad \sigma_t^2 = \omega_{\text{reg}} + 0.09\,\varepsilon_{t-1}^2 + 0.88\,\sigma_{t-1}^2,\quad \text{regime shift at } t = 620",
            states=[0] * (SHIFT_DAY + 1) + [1] * (N - SHIFT_DAY),
        ),
        grading={
            "mode": "distribution",
            "taus": TAUS,
            "draws": _round_list(draws),
            "lossMax": float(f"{loss_max:.8g}"),
            "trueQuantiles": [float(f"{q:.8g}") for q in true_q],
        },
    )
