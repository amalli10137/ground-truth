"""Winnability: intended estimators for STOCHASTIC HORRORS (levels 13-19)."""

import numpy as np

from datagen.estimators import (
    bipower_sigma,
    truncated_sigma,
    dfa_hurst,
    hill_alpha,
    hmm2_baum_welch,
    hmm2_viterbi,
    jump_mixture_em,
    kalman_fit,
    kalman_smooth,
    logistic_r_fit,
    hawkes_fit,
)
from datagen.tests.conftest import assert_within, cols, load_pack


def test_level13_delay_embedding():
    p = load_pack(13)
    c = cols(p)
    r_hat, resid_std = logistic_r_fit(c["y"])
    assert_within(p, "r", r_hat)
    # the parabola must be visually clean at the chosen noise level
    assert resid_std < 0.012, f"embedding parabola too fuzzy: resid std {resid_std:.4f}"


def test_level14_hill():
    p = load_pack(14)
    c = cols(p)
    d = np.diff(c["y"])
    assert_within(p, "alpha", hill_alpha(d, 150))


def test_level14_variance_lies():
    """Documentation of the trap: the sample std is dominated by a few points."""
    p = load_pack(14)
    d = np.diff(cols(p)["y"])
    full = np.std(d, ddof=1)
    trimmed = np.std(np.sort(np.abs(d))[: int(0.99 * len(d))], ddof=1)
    assert full > 2 * trimmed  # 1% of points carry most of the 'variance'


def test_level15_bipower_and_mixture():
    p = load_pack(15)
    c = cols(p)
    r = np.diff(np.log(c["y"]))
    dt = 1.0 / 252.0
    assert_within(p, "sigma", truncated_sigma(r, dt))
    lam_hat, sj_hat, _ = jump_mixture_em(r, dt)
    assert_within(p, "lam", lam_hat)
    assert_within(p, "sJ", sj_hat)


def test_level15_realized_var_is_contaminated():
    from datagen.estimators import realized_sigma

    p = load_pack(15)
    r = np.diff(np.log(cols(p)["y"]))
    dt = 1.0 / 252.0
    rv = realized_sigma(r, dt)
    true_sigma = p["truth"]["params"]["sigma"]
    tol = next(f["tol"] for f in p["grading"]["fields"] if f["name"] == "sigma")
    assert rv - true_sigma > tol  # naive RV overshoots beyond the tolerance


def test_level16_dfa():
    p = load_pack(16)
    d = np.diff(cols(p)["y"])
    h_hat, _, _ = dfa_hurst(d)
    assert_within(p, "H", h_hat)


def test_level17_baum_welch():
    p = load_pack(17)
    c = cols(p)
    r = np.diff(np.log(c["y"]))
    fit = hmm2_baum_welch(r)
    assert_within(p, "p01", float(fit["A"][0, 1]))
    assert_within(p, "p10", float(fit["A"][1, 0]))
    assert_within(p, "sigma0", float(fit["sigma"][0]))
    assert_within(p, "sigma1", float(fit["sigma"][1]))
    # Viterbi decode must broadly agree with the true regime path
    path = hmm2_viterbi(r, fit["mu"], fit["sigma"], fit["A"])
    true_states = np.asarray(p["truth"]["states"][1:])
    agreement = np.mean(path == true_states)
    assert agreement > 0.9, f"Viterbi agreement only {agreement:.2f}"


def test_level18_kalman_mle():
    p = load_pack(18)
    c = cols(p)
    phi, sw, sv = kalman_fit(c["y"])
    assert_within(p, "phi", phi)
    assert_within(p, "sigma_w", sw)
    assert_within(p, "sigma_v", sv)
    # smoothing must track the hidden truth far better than the raw data does
    _, xs = kalman_smooth(c["y"], phi, sw**2, sv**2)
    x_true = np.asarray(p["truth"]["curve"]["y"])
    rmse_smooth = np.sqrt(np.mean((xs - x_true) ** 2))
    rmse_raw = np.sqrt(np.mean((c["y"] - x_true) ** 2))
    assert rmse_smooth < 0.5 * rmse_raw


def test_level19_hawkes_mle():
    p = load_pack(19)
    ts = cols(p)["t"]
    mu_hat, a_hat, b_hat = hawkes_fit(ts, 600.0)
    assert_within(p, "eta", a_hat / b_hat)
    assert_within(p, "beta", b_hat)
    assert_within(p, "mu", mu_hat)
