"""Winnability: intended estimators for the WICKED tier (levels 8-12)."""

import numpy as np

from datagen.estimators import (
    chirp_phase_fit,
    fit_gaussian_bump,
    hann_tone,
    lasso_top_freqs,
    matrix_pencil,
    peak_positions,
    wiener_deconvolve,
)
from datagen.tests.conftest import assert_within, cols, load_pack


def test_level08_hann_interpolation():
    p = load_pack(8)
    c = cols(p)
    dt = c["t"][1] - c["t"][0]
    f_hat, a_hat = hann_tone(c["y"], dt)
    assert_within(p, "f", f_hat)
    assert_within(p, "A", a_hat)


def test_level08_naive_peak_is_biased():
    """Documentation of the trap: raw peak reading misses the off-bin frequency."""
    p = load_pack(8)
    c = cols(p)
    dt = c["t"][1] - c["t"][0]
    n = len(c["y"])
    k = int(np.argmax(np.abs(np.fft.rfft(c["y"]))[1:])) + 1
    f_naive = k / (n * dt)
    true_f = p["truth"]["params"]["f"]
    tol_f = next(f["tol"] for f in p["grading"]["fields"] if f["name"] == "f")
    # the naive answer must be measurably worse than the tolerance is tight
    assert abs(f_naive - true_f) > tol_f


def test_level09_chirp():
    p = load_pack(9)
    c = cols(p)
    f0_hat, k_hat = chirp_phase_fit(c["y"], c["t"])
    assert_within(p, "f0", f0_hat)
    assert_within(p, "k", k_hat)


def test_level10_matrix_pencil_predicts_holdout():
    from datagen.generators.level10 import pipeline_predict, FREQS, DAMPS

    p = load_pack(10)
    c = cols(p)
    dt = c["t"][1] - c["t"][0]
    # pole recovery itself is sound
    f_hat, d_hat = matrix_pencil(c["y"], dt, n_modes=3)
    assert np.allclose(f_hat[:3], FREQS, atol=0.5)
    assert np.allclose(d_hat[:3], DAMPS, atol=1.0)
    # and the reconstruction beats the function-mode bar on the hidden extension
    ho = p["grading"]["holdout"]
    t_new, y_true = np.asarray(ho["t"]), np.asarray(ho["yTrue"])
    y_hat = pipeline_predict(c["t"], c["y"], t_new)
    rmse = float(np.sqrt(np.mean((y_hat - y_true) ** 2)))
    assert rmse <= p["grading"]["rmseMax"], (
        f"pipeline holdout RMSE {rmse:.4g} > bar {p['grading']['rmseMax']:.4g}"
    )


def test_level10_overfitting_the_window_fails():
    """A high-degree polynomial fits the shown data and explodes on the extension."""
    p = load_pack(10)
    c = cols(p)
    ho = p["grading"]["holdout"]
    t_new, y_true = np.asarray(ho["t"]), np.asarray(ho["yTrue"])
    coef = np.polyfit(c["t"], c["y"], 25)
    y_hat = np.polyval(coef, t_new)
    rmse = float(np.sqrt(np.mean((y_hat - y_true) ** 2)))
    assert rmse > 10 * p["grading"]["rmseMax"]


def test_level11_wiener_pipeline():
    p = load_pack(11)
    c = cols(p)
    t, y = c["t"], c["y"]
    s_hat = fit_gaussian_bump(t, y, 10.0, 30.0)
    assert_within(p, "sigma_w", s_hat)
    x_hat = wiener_deconvolve(t, y, s_hat, lam=1e-4)
    pk = peak_positions(t, x_hat, height=0.15 * float(x_hat.max()), min_sep_pts=15)
    assert_within(p, "n_sources", float(len(pk)))
    pair = pk[(pk > 40) & (pk < 65)]
    assert len(pair) == 2, "Wiener deconvolution failed to split the merged pair"
    assert_within(p, "delta", float(pair[1] - pair[0]))


def test_level11_naive_division_explodes():
    """The anti-lesson: unregularized spectral division amplifies noise wildly."""
    p = load_pack(11)
    c = cols(p)
    t, y = c["t"], c["y"]
    x_naive = wiener_deconvolve(t, y, 2.2, lam=1e-12)
    x_reg = wiener_deconvolve(t, y, 2.2, lam=1e-4)
    assert float(np.std(x_naive)) > 50 * float(np.std(x_reg))


def test_level12_l1_recovery():
    p = load_pack(12)
    c = cols(p)
    fgrid = np.arange(1.0, 41.0)
    rec = lasso_top_freqs(c["t"], c["y"], fgrid, 3)
    assert_within(p, "f1", float(rec[0]))
    assert_within(p, "f2", float(rec[1]))
    assert_within(p, "f3", float(rec[2]))
