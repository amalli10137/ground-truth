"""Intended estimators for the trickier levels.

Used twice: (1) by generators to calibrate tolerances via Monte Carlo
(tol = 4 x RMS error of the intended method over noise redraws), and
(2) by the winnability tests against the exact shipped packs.
"""

from __future__ import annotations

import numpy as np


# ---------- level 8: off-bin tone via Hann window + quadratic interpolation ----------

def hann_tone(y: np.ndarray, dt: float) -> tuple[float, float]:
    """Return (f_hat, A_hat) for a single off-bin tone in noise."""
    n = len(y)
    w = np.hanning(n)
    X = np.fft.rfft(y * w)
    mag = np.abs(X)
    k = int(np.argmax(mag[1:-1])) + 1
    a, b, c = np.log(mag[k - 1]), np.log(mag[k]), np.log(mag[k + 1])
    delta = 0.5 * (a - c) / (a - 2 * b + c)
    f_hat = (k + delta) / (n * dt)
    # Hann main-lobe response at bin offset delta (continuous approximation)
    sinc = np.sinc(delta)  # sin(pi x)/(pi x)
    lobe = sinc / (1 - delta**2)
    A_hat = 2 * mag[k] / (n * np.mean(w) * lobe) / 1.0
    return float(f_hat), float(A_hat)


# ---------- level 9: linear chirp via analytic-signal phase fit ----------

def chirp_phase_fit(y: np.ndarray, t: np.ndarray) -> tuple[float, float]:
    """Return (f0_hat, k_hat) for sin(2*pi*(f0 t + k/2 t^2)) + noise."""
    from scipy.signal import hilbert

    z = hilbert(y)
    phase = np.unwrap(np.angle(z))
    n = len(t)
    lo, hi = int(0.08 * n), int(0.92 * n)  # trim Hilbert edge effects
    c2, c1, _ = np.polyfit(t[lo:hi], phase[lo:hi], 2)
    return float(c1 / (2 * np.pi)), float(c2 / np.pi)


# ---------- level 10: damped cosines via matrix pencil ----------

def matrix_pencil(y: np.ndarray, dt: float, n_modes: int) -> tuple[np.ndarray, np.ndarray]:
    """Return (freqs, dampings) of n_modes damped cosines (Hua–Sarkar pencil).

    freqs in Hz (positive, sorted), dampings in 1/time-unit.
    """
    n = len(y)
    L = n // 3
    m = 2 * n_modes  # conjugate pairs
    # Hankel data matrix (n-L) x (L+1)
    idx = np.arange(n - L)[:, None] + np.arange(L + 1)[None, :]
    Y = y[idx]
    _, _, Vh = np.linalg.svd(Y, full_matrices=False)
    V = Vh.conj().T[:, :m]  # (L+1) x m signal subspace
    V1, V2 = V[:-1, :], V[1:, :]
    z = np.linalg.eigvals(np.linalg.pinv(V1) @ V2)
    f = np.angle(z) / (2 * np.pi * dt)
    d = -np.log(np.maximum(np.abs(z), 1e-12)) / dt
    keep = f > 0
    order = np.argsort(f[keep])
    return f[keep][order], d[keep][order]


# ---------- level 11: PSF fit + Wiener deconvolution ----------

def fit_gaussian_bump(t: np.ndarray, y: np.ndarray, lo: float, hi: float) -> float:
    """Fit a * exp(-(t-m)^2 / (2 s^2)) on a window; return s (the PSF width)."""
    from scipy.optimize import curve_fit

    sel = (t >= lo) & (t <= hi)
    ts, ys = t[sel], y[sel]
    m0 = ts[np.argmax(ys)]

    def model(t, a, m, s):
        return a * np.exp(-((t - m) ** 2) / (2 * s**2))

    p, _ = curve_fit(model, ts, ys, p0=[float(ys.max()), float(m0), 2.0])
    return float(abs(p[2]))


def wiener_deconvolve(t: np.ndarray, y: np.ndarray, sigma_w: float, lam: float = 1e-3) -> np.ndarray:
    """Wiener/Tikhonov deconvolution with a Gaussian kernel of width sigma_w."""
    n = len(y)
    dt = t[1] - t[0]
    # unit-area Gaussian kernel, centered, wrapped for FFT
    tk = (np.arange(n) - n // 2) * dt
    k = np.exp(-(tk**2) / (2 * sigma_w**2))
    k /= k.sum()
    K = np.fft.rfft(np.roll(k, -(n // 2)))
    Y = np.fft.rfft(y)
    denom = np.abs(K) ** 2 + lam
    X = Y * np.conj(K) / denom
    return np.fft.irfft(X, n)


def peak_positions(t: np.ndarray, x: np.ndarray, height: float, min_sep_pts: int) -> np.ndarray:
    from scipy.signal import find_peaks

    pk, _ = find_peaks(x, height=height, distance=min_sep_pts)
    return t[pk]


# ---------- level 12: sparse tones via ISTA (L1) ----------

def build_tone_dictionary(t: np.ndarray, fgrid: np.ndarray) -> np.ndarray:
    cols = []
    for f in fgrid:
        cols.append(np.cos(2 * np.pi * f * t))
        cols.append(np.sin(2 * np.pi * f * t))
    D = np.stack(cols, axis=1)
    return D / np.linalg.norm(D, axis=0, keepdims=True)


def ista_lasso(D: np.ndarray, y: np.ndarray, lam_rel: float = 0.08,
               n_iter: int = 4000) -> np.ndarray:
    """min 1/2||y-Dc||^2 + lam||c||_1 via ISTA; lam relative to ||D^T y||_inf."""
    Dty = D.T @ y
    lam = lam_rel * np.max(np.abs(Dty))
    step = 1.0 / np.linalg.norm(D, 2) ** 2
    c = np.zeros(D.shape[1])
    for _ in range(n_iter):
        g = c - step * (D.T @ (D @ c) - Dty)
        c = np.sign(g) * np.maximum(np.abs(g) - step * lam, 0.0)
    return c


def lasso_top_freqs(t: np.ndarray, y: np.ndarray, fgrid: np.ndarray, n_tones: int) -> np.ndarray:
    D = build_tone_dictionary(t, fgrid)
    c = ista_lasso(D, y)
    energy = c[0::2] ** 2 + c[1::2] ** 2
    top = np.argsort(energy)[::-1][:n_tones]
    return np.sort(fgrid[top])


# ---------- level 13: logistic map via delay embedding ----------

def logistic_r_fit(x: np.ndarray) -> tuple[float, float]:
    """Fit x_{n+1} = r x_n (1 - x_n) by least squares on the embedding.

    Returns (r_hat, residual_std) — residual_std certifies the parabola is clean.
    """
    x0, x1 = x[:-1], x[1:]
    A = np.stack([x0, x0**2], axis=1)
    coef, *_ = np.linalg.lstsq(A, x1, rcond=None)
    r_hat = float((coef[0] - coef[1]) / 2.0)
    resid = x1 - A @ coef
    return r_hat, float(np.std(resid))


# ---------- level 14: alpha-stable tail via Hill estimator ----------

def hill_alpha(x: np.ndarray, k: int) -> float:
    """Hill estimator of the tail index on |x| using the top-k order statistics."""
    a = np.sort(np.abs(np.asarray(x, dtype=float)))[::-1]
    top = a[: k + 1]
    return float(k / np.sum(np.log(top[:-1] / top[k])))


# ---------- level 15: jumps — bipower variation + 2-component mixture EM ----------

def bipower_sigma(r: np.ndarray, dt: float) -> float:
    """Annualized diffusive sigma from bipower variation (jump-robust)."""
    bv = (np.pi / 2.0) * np.sum(np.abs(r[1:]) * np.abs(r[:-1]))
    return float(np.sqrt(bv / (len(r) * dt)))

def realized_sigma(r: np.ndarray, dt: float) -> float:
    return float(np.sqrt(np.sum(r**2) / (len(r) * dt)))

def jump_mixture_em(r: np.ndarray, dt: float, n_iter: int = 400):
    """EM for r ~ (1-p) N(m, v0) + p N(m, v0 + vj). Returns (lambda_hat, sJ_hat, v0)."""
    r = np.asarray(r, dtype=float)
    m = float(np.mean(r))
    v_all = float(np.var(r))
    p = 0.1
    v0 = 0.5 * v_all
    vj = 2.0 * v_all
    for _ in range(n_iter):
        pdf0 = np.exp(-((r - m) ** 2) / (2 * v0)) / np.sqrt(2 * np.pi * v0)
        pdf1 = np.exp(-((r - m) ** 2) / (2 * (v0 + vj))) / np.sqrt(2 * np.pi * (v0 + vj))
        w1 = p * pdf1 / ((1 - p) * pdf0 + p * pdf1 + 1e-300)
        w0 = 1.0 - w1
        m = float(np.sum(r * (w0 + w1)) / len(r))
        p = float(np.mean(w1))
        v0_new = float(np.sum(w0 * (r - m) ** 2) / (np.sum(w0) + 1e-12))
        v1_new = float(np.sum(w1 * (r - m) ** 2) / (np.sum(w1) + 1e-12))
        v0 = v0_new
        vj = max(v1_new - v0, 1e-10)
    lam = p / dt
    sJ = float(np.sqrt(vj))
    return lam, sJ, v0


# ---------- level 16: fractional Gaussian noise + DFA ----------

def fgn_davies_harte(n: int, h: float, sigma: float, g: np.random.Generator) -> np.ndarray:
    """Exact fGn simulation via circulant embedding."""
    k = np.arange(n)
    gamma = 0.5 * sigma**2 * (
        np.abs(k + 1) ** (2 * h) - 2 * np.abs(k) ** (2 * h) + np.abs(k - 1) ** (2 * h)
    )
    row = np.concatenate([gamma, gamma[1:-1][::-1]])
    lam = np.fft.fft(row).real
    lam = np.maximum(lam, 0.0)
    m = len(row)
    z = g.normal(size=m) + 1j * g.normal(size=m)
    w = np.fft.fft(np.sqrt(lam / m) * z)
    return w[:n].real

def dfa_hurst(x: np.ndarray, min_win: int = 8, max_frac: float = 0.1):
    """DFA-1 on the cumulative sum of x; returns (H_hat, log_n, log_F)."""
    y = np.cumsum(x - np.mean(x))
    n = len(y)
    wins = np.unique(np.geomspace(min_win, int(n * max_frac), 18).astype(int))
    logs = []
    for w in wins:
        nseg = n // w
        segs = y[: nseg * w].reshape(nseg, w)
        t = np.arange(w)
        # detrend each segment linearly
        tm = t - t.mean()
        denom = np.sum(tm**2)
        beta = (segs @ tm) / denom
        alpha = segs.mean(axis=1)
        resid = segs - (alpha[:, None] + beta[:, None] * tm[None, :])
        f = np.sqrt(np.mean(resid**2))
        logs.append((np.log(w), np.log(f)))
    logs = np.asarray(logs)
    slope, _ = np.polyfit(logs[:, 0], logs[:, 1], 1)
    return float(slope), logs[:, 0], logs[:, 1]


# ---------- level 17: 2-state Gaussian HMM (Baum-Welch + Viterbi) ----------

def hmm2_baum_welch(r: np.ndarray, n_iter: int = 120):
    """EM for a 2-state Gaussian HMM. State 0 = lower sigma. Returns dict."""
    r = np.asarray(r, dtype=float)
    n = len(r)
    lo, hi = np.abs(r) < np.median(np.abs(r)), np.abs(r) >= np.median(np.abs(r))
    mu = np.array([np.mean(r[lo]), np.mean(r[hi])])
    sig = np.array([np.std(r[lo]) + 1e-6, np.std(r[hi]) + 1e-6])
    A = np.array([[0.95, 0.05], [0.10, 0.90]])
    pi0 = np.array([0.5, 0.5])
    for _ in range(n_iter):
        B = np.stack(
            [np.exp(-((r - mu[s]) ** 2) / (2 * sig[s] ** 2)) / (np.sqrt(2 * np.pi) * sig[s])
             for s in range(2)], axis=1) + 1e-300
        # forward (scaled)
        alpha = np.zeros((n, 2)); c = np.zeros(n)
        alpha[0] = pi0 * B[0]; c[0] = alpha[0].sum(); alpha[0] /= c[0]
        for i in range(1, n):
            alpha[i] = (alpha[i - 1] @ A) * B[i]
            c[i] = alpha[i].sum(); alpha[i] /= c[i]
        # backward
        beta = np.zeros((n, 2)); beta[-1] = 1.0
        for i in range(n - 2, -1, -1):
            beta[i] = (A @ (B[i + 1] * beta[i + 1])) / c[i + 1]
        gam = alpha * beta; gam /= gam.sum(axis=1, keepdims=True)
        xi_num = np.zeros((2, 2))
        for i in range(n - 1):
            xi = alpha[i][:, None] * A * (B[i + 1] * beta[i + 1])[None, :] / c[i + 1]
            xi_num += xi
        A = xi_num / xi_num.sum(axis=1, keepdims=True)
        pi0 = gam[0]
        for s in range(2):
            wsum = gam[:, s].sum()
            mu[s] = np.sum(gam[:, s] * r) / wsum
            sig[s] = np.sqrt(np.sum(gam[:, s] * (r - mu[s]) ** 2) / wsum) + 1e-8
        if sig[0] > sig[1]:  # keep state 0 = calm
            mu, sig = mu[::-1].copy(), sig[::-1].copy()
            A = A[::-1, ::-1].copy(); pi0 = pi0[::-1].copy()
            gam = gam[:, ::-1]
    return {"mu": mu, "sigma": sig, "A": A, "gamma": gam}

def hmm2_viterbi(r: np.ndarray, mu, sig, A, pi0=None) -> np.ndarray:
    r = np.asarray(r, dtype=float); n = len(r)
    if pi0 is None:
        pi0 = np.array([0.5, 0.5])
    logB = np.stack(
        [-((r - mu[s]) ** 2) / (2 * sig[s] ** 2) - np.log(sig[s]) for s in range(2)], axis=1)
    logA = np.log(A + 1e-300)
    d = np.zeros((n, 2)); ptr = np.zeros((n, 2), dtype=int)
    d[0] = np.log(pi0 + 1e-300) + logB[0]
    for i in range(1, n):
        cand = d[i - 1][:, None] + logA
        ptr[i] = np.argmax(cand, axis=0)
        d[i] = cand[ptr[i], [0, 1]] + logB[i]
    path = np.zeros(n, dtype=int)
    path[-1] = int(np.argmax(d[-1]))
    for i in range(n - 2, -1, -1):
        path[i] = ptr[i + 1][path[i + 1]]
    return path


# ---------- level 18: linear-Gaussian state space (Kalman) MLE ----------

def kalman_loglik(y: np.ndarray, phi: float, q: float, rvar: float) -> float:
    """Log-likelihood of y under x_t = phi x_{t-1} + N(0,q), y_t = x_t + N(0,rvar)."""
    n = len(y)
    x = 0.0
    P = q / max(1 - phi**2, 1e-6)
    ll = 0.0
    for i in range(n):
        S = P + rvar
        v = y[i] - x
        ll += -0.5 * (np.log(2 * np.pi * S) + v * v / S)
        K = P / S
        x = x + K * v
        P = (1 - K) * P
        x = phi * x
        P = phi * phi * P + q
    return float(ll)

def kalman_fit(y: np.ndarray):
    """MLE of (phi, sigma_w, sigma_v) by Nelder-Mead on the filter likelihood."""
    from scipy.optimize import minimize

    def nll(theta):
        phi = np.tanh(theta[0])
        q = np.exp(theta[1])
        rv = np.exp(theta[2])
        return -kalman_loglik(y, phi, q, rv)

    v = float(np.var(y))
    x0 = [np.arctanh(0.9), np.log(0.1 * v), np.log(0.5 * v)]
    res = minimize(nll, x0, method="Nelder-Mead",
                   options={"maxiter": 2000, "xatol": 1e-6, "fatol": 1e-8})
    phi = float(np.tanh(res.x[0]))
    return phi, float(np.exp(res.x[1] / 2)), float(np.exp(res.x[2] / 2))

def kalman_smooth(y: np.ndarray, phi: float, q: float, rvar: float):
    """RTS smoother; returns (filtered, smoothed) state means."""
    n = len(y)
    xf = np.zeros(n); Pf = np.zeros(n)
    xp = np.zeros(n); Pp = np.zeros(n)
    x = 0.0; P = q / max(1 - phi**2, 1e-6)
    for i in range(n):
        xp[i] = phi * x if i > 0 else x
        Pp[i] = phi * phi * P + q if i > 0 else P
        S = Pp[i] + rvar
        K = Pp[i] / S
        x = xp[i] + K * (y[i] - xp[i])
        P = (1 - K) * Pp[i]
        xf[i] = x; Pf[i] = P
    xs = xf.copy(); Ps = Pf.copy()
    for i in range(n - 2, -1, -1):
        J = Pf[i] * phi / Pp[i + 1]
        xs[i] = xf[i] + J * (xs[i + 1] - xp[i + 1])
        Ps[i] = Pf[i] + J * (Ps[i + 1] - Pp[i + 1]) * J
    return xf, xs


# ---------- level 19: Hawkes process (exponential kernel) ----------

def hawkes_simulate(mu: float, alpha: float, beta: float, T: float,
                    g: np.random.Generator) -> np.ndarray:
    """Ogata thinning for lambda(t) = mu + sum alpha e^{-beta (t - t_i)}."""
    ts = []
    t = 0.0
    lam_star = mu
    while True:
        t += g.exponential(1.0 / lam_star)
        if t > T:
            break
        lam_t = mu + sum(alpha * np.exp(-beta * (t - ti)) for ti in ts[-200:]
                         if t - ti < 50.0 / beta)
        if g.uniform() <= lam_t / lam_star:
            ts.append(t)
            lam_star = lam_t + alpha
        else:
            lam_star = lam_t
    return np.asarray(ts)

def hawkes_loglik(ts: np.ndarray, T: float, mu: float, alpha: float, beta: float) -> float:
    """Exact log-likelihood with the O(n) recursion A_i = e^{-b dt}(1 + A_{i-1})."""
    n = len(ts)
    A = np.zeros(n)
    for i in range(1, n):
        A[i] = np.exp(-beta * (ts[i] - ts[i - 1])) * (1 + A[i - 1])
    ll = np.sum(np.log(mu + alpha * A))
    ll -= mu * T
    ll += (alpha / beta) * np.sum(np.exp(-beta * (T - ts)) - 1.0)
    return float(ll)

def hawkes_fit(ts: np.ndarray, T: float):
    """MLE; returns (mu, alpha, beta)."""
    from scipy.optimize import minimize

    rate = len(ts) / T

    def nll(theta):
        mu, alpha, beta = np.exp(theta)
        if alpha / beta >= 0.999:
            return 1e12
        return -hawkes_loglik(ts, T, mu, alpha, beta)

    x0 = np.log([0.5 * rate, 0.5, 1.0])
    res = minimize(nll, x0, method="Nelder-Mead",
                   options={"maxiter": 4000, "xatol": 1e-7, "fatol": 1e-9})
    mu, alpha, beta = np.exp(res.x)
    return float(mu), float(alpha), float(beta)


def truncated_sigma(r: np.ndarray, dt: float, c: float = 4.0, n_pass: int = 3) -> float:
    """Jump-robust sigma via threshold truncation (Mancini): drop |r| > c*sigma*sqrt(dt),
    iterating from a bipower initial guess."""
    sig = bipower_sigma(r, dt)
    for _ in range(n_pass):
        u = c * sig * np.sqrt(dt)
        keep = np.abs(r) < u
        sig = float(np.sqrt(np.sum(r[keep] ** 2) / (keep.sum() * dt)))
    return sig
