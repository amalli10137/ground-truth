"""Level 11 — The Blur. Sparse point sources convolved with a Gaussian PSF + noise.

Ill-posed inverse problem: naive spectral division Y/K explodes at high
frequency. Intended method: estimate the PSF width from an isolated source,
then Wiener/Tikhonov-deconvolve to resolve the merged pair.
"""

import numpy as np

from datagen.common import field, make_pack, rng, truth_block
from datagen.estimators import fit_gaussian_bump, peak_positions, wiener_deconvolve

SEED = 2111
N = 1000
DT = 0.1  # t in [0, 100)
SIGMA_W = 2.2    # PSF width — the parameter to recover
POSITIONS = np.array([20.0, 50.0, 55.0, 80.0])
HEIGHTS = np.array([60.0, 55.0, 48.0, 36.0])
DELTA = 5.0      # separation of the merged pair
SIGMA_N = 0.008


def clean_signal(t):
    """The blurred (noiseless) observation."""
    y = np.zeros_like(t)
    for p, h in zip(POSITIONS, HEIGHTS):
        y += h * DT * np.exp(-((t - p) ** 2) / (2 * SIGMA_W**2)) / (
            np.sqrt(2 * np.pi) * SIGMA_W
        )
    return y


def run_pipeline(t, y):
    """The intended estimator: PSF from the isolated bump, Wiener for the pair."""
    s_hat = fit_gaussian_bump(t, y, 10.0, 30.0)
    x_hat = wiener_deconvolve(t, y, s_hat, lam=1e-4)
    pk = peak_positions(t, x_hat, height=0.15 * float(x_hat.max()), min_sep_pts=15)
    n_spikes = len(pk)
    pair = pk[(pk > 40) & (pk < 65)]
    delta_hat = float(pair[-1] - pair[0]) if len(pair) >= 2 else float("nan")
    return s_hat, n_spikes, delta_hat


def mc_tols(reps: int = 100) -> tuple[float, float]:
    t = np.arange(N) * DT
    clean = clean_signal(t)
    errs_s, errs_delta = [], []
    for i in range(reps):
        g = rng(93_000 + i)
        y = clean + g.normal(0.0, SIGMA_N, N)
        s_hat, n_spikes, delta_hat = run_pipeline(t, y)
        assert n_spikes == 4, f"pipeline found {n_spikes} spikes in MC rep {i}"
        errs_s.append(s_hat - SIGMA_W)
        errs_delta.append(delta_hat - DELTA)
    return 4 * float(np.sqrt(np.mean(np.square(errs_s)))), max(
        4 * float(np.sqrt(np.mean(np.square(errs_delta)))), 2 * DT
    )


def build() -> dict:
    g = rng(SEED)
    t = np.arange(N) * DT
    y = clean_signal(t) + g.normal(0.0, SIGMA_N, N)
    tol_s, tol_delta = mc_tols()

    return make_pack(
        id=11,
        seed=SEED,
        kind="series",
        columns={"t": t, "y": y},
        truth=truth_block(
            {"sigma_w": SIGMA_W, "n_sources": 4.0, "delta": DELTA},
            r"y = (x * k_{\sigma_w})(t) + \varepsilon,\quad x = \textstyle\sum_{i=1}^{4} a_i\,\delta(t - p_i),\ \sigma_w = 2.2,\ p_3 - p_2 = 5.0",
            curve_t=t,
            curve_y=clean_signal(t),
        ),
        grading={
            "mode": "parameter",
            "fields": [
                field("sigma_w", "PSF width σ_w", SIGMA_W, tol_s),
                field("n_sources", "number of point sources", 4.0, 0.5, integer=True),
                field(
                    "delta",
                    "separation of the hidden pair Δ",
                    DELTA,
                    tol_delta,
                    help="the two sources hiding inside one bump",
                ),
            ],
        },
    )
