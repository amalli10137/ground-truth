"""Winnability: run the intended estimator for levels 1-7 on the shipped packs."""

import numpy as np

from datagen.tests.conftest import assert_within, cols, load_pack


def fft_peak(y, dt, k_exclude_below=1):
    X = np.fft.rfft(y)
    mag = np.abs(X)
    mag[:k_exclude_below] = 0.0
    k = int(np.argmax(mag))
    f = k / (len(y) * dt)
    amp = 2.0 * mag[k] / len(y)
    return f, amp, k


def test_level01_mean():
    p = load_pack(1)
    c = cols(p)
    assert_within(p, "c", float(np.mean(c["y"])))


def test_level02_ols():
    p = load_pack(2)
    c = cols(p)
    b, a = np.polyfit(c["t"], c["y"], 1)
    assert_within(p, "a", float(a))
    assert_within(p, "b", float(b))


def test_level02_endpoints_would_be_terrible():
    """The anti-lesson: endpoint slope is far noisier than OLS (documented, not graded)."""
    p = load_pack(2)
    c = cols(p)
    t, y = c["t"], c["y"]
    slope_endpoints = (y[-1] - y[0]) / (t[-1] - t[0])
    b_ols, _ = np.polyfit(t, y, 1)
    fields = {f["name"]: f for f in p["grading"]["fields"]}
    # OLS passes with 4-SE tolerance; the endpoint estimator's SE is ~sqrt(N/6)x larger
    assert abs(b_ols - fields["b"]["target"]) <= fields["b"]["tol"]


def test_level03_fft():
    p = load_pack(3)
    c = cols(p)
    dt = c["t"][1] - c["t"][0]
    f, amp, _ = fft_peak(c["y"], dt)
    assert_within(p, "f", f)
    assert_within(p, "A", amp)


def test_level04_two_tones():
    p = load_pack(4)
    c = cols(p)
    dt = c["t"][1] - c["t"][0]
    y = c["y"]
    X = np.fft.rfft(y)
    mag = np.abs(X)
    mag[0] = 0.0
    order = np.argsort(mag)[::-1]
    # two largest peaks, separated
    k1 = int(order[0])
    k2 = next(int(k) for k in order[1:] if abs(int(k) - k1) > 3)
    peaks = sorted([k1, k2])
    n = len(y)
    f1, a1 = peaks[0] / (n * dt), 2 * mag[peaks[0]] / n
    f2, a2 = peaks[1] / (n * dt), 2 * mag[peaks[1]] / n
    assert_within(p, "f1", f1)
    assert_within(p, "A1", a1)
    assert_within(p, "f2", f2)
    assert_within(p, "A2", a2)


def test_level05_difference_first():
    p = load_pack(5)
    c = cols(p)
    d = np.diff(c["y"])
    assert_within(p, "mu", float(np.mean(d)))
    assert_within(p, "sigma", float(np.std(d, ddof=1)))


def test_level06_ar1():
    p = load_pack(6)
    c = cols(p)
    x = c["y"]
    x0, x1 = x[:-1], x[1:]
    phi = float(np.sum(x0 * x1) / np.sum(x0 * x0))
    resid = x1 - phi * x0
    sig = float(np.std(resid, ddof=1))
    assert_within(p, "phi", phi)
    assert_within(p, "sigma_eps", sig)


def test_level07_gbm_log_returns():
    p = load_pack(7)
    c = cols(p)
    t, s = c["t"], c["y"]
    dt = float(np.mean(np.diff(t)))
    r = np.diff(np.log(s))
    sigma = float(np.std(r, ddof=1) / np.sqrt(dt))
    mu = float(np.mean(r) / dt + sigma**2 / 2)
    assert_within(p, "sigma", sigma)
    assert_within(p, "mu", mu)
