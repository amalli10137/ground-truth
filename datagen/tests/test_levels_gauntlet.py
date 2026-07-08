"""Winnability: intended estimators for the QUANT GAUNTLET (levels 20-23)."""

import numpy as np

from datagen.tests.conftest import assert_within, cols, load_pack


def test_level20_engle_granger():
    from datagen.generators.level20 import eg_two_step

    p = load_pack(20)
    c = cols(p)
    gamma_hat, hl = eg_two_step(c["a"], c["b"])
    assert_within(p, "gamma", gamma_hat)
    assert_within(p, "halflife", hl)


def test_level20_legs_individually_useless():
    """Each leg is a random walk: its own increments carry ~no predictability."""
    p = load_pack(20)
    c = cols(p)
    for leg in ("a", "b"):
        d = np.diff(c[leg])
        rho = np.corrcoef(d[1:], d[:-1])[0, 1]
        assert abs(rho) < 0.1


def test_level21_marchenko_pastur():
    p = load_pack(21)
    c = cols(p)
    names = [k for k in c if k != "t"]
    R = np.column_stack([np.diff(np.log(c[k])) for k in names])
    corr = np.corrcoef(R, rowvar=False)
    eig = np.sort(np.linalg.eigvalsh(corr))[::-1]
    edge = (1 + np.sqrt(R.shape[1] / R.shape[0])) ** 2
    n_above = int(np.sum(eig > edge))
    assert_within(p, "n_factors", float(n_above))
    assert_within(p, "mp_edge", edge)
    # the bulk must actually hug the MP law: 4th eigenvalue below the edge
    assert eig[3] < edge


def test_level22_reality_check():
    from datagen.generators.level22 import annual_sharpes, max_null_sharpe_dist

    p = load_pack(22)
    c = cols(p)
    names = sorted(k for k in c if k != "t")
    R = np.column_stack([np.diff(np.log(c[k])) for k in names])
    sharpes = annual_sharpes(R)
    best = int(np.argmax(sharpes))  # 0-based
    assert_within(p, "index", float(best + 1))
    # the achieved FWER p-value must make the stated-alpha range honest
    null_max = max_null_sharpe_dist()
    p_fwer = float(np.mean(null_max >= sharpes[best]))
    fields = {f["name"]: f for f in p["grading"]["fields"]}
    lo, hi = fields["alpha"]["range"]
    assert lo <= max(p_fwer, 0.001) <= hi
    # and several NOISE strategies must look "good" naively (the trap is real)
    assert np.sum(np.delete(sharpes, best) > 1.0) >= 3


def test_level23_ewma_pipeline_beats_bar():
    """Spec: verify by MC that EWMA vol + last-price center is near-optimal."""
    p = load_pack(23)
    c = cols(p)
    grading = p["grading"]
    draws = np.asarray(grading["draws"])
    taus = grading["taus"]

    r = np.diff(np.log(c["y"]))
    # RiskMetrics EWMA on the full history; the recent regime dominates by decay
    lam = 0.94
    v = r[0] ** 2
    for x in r[1:]:
        v = lam * v + (1 - lam) * x**2
    sig = np.sqrt(v)
    last = c["y"][-1]
    from scipy.stats import norm

    qs = [float(last * np.exp(sig * norm.ppf(tau))) for tau in taus]

    def pinball(qs):
        loss = 0.0
        for q, tau in zip(qs, taus):
            d = draws - q
            loss += np.mean(np.where(d >= 0, tau * d, (tau - 1) * d))
        return loss / len(taus)

    loss_ewma = pinball(qs)
    assert loss_ewma <= grading["lossMax"], (
        f"EWMA pipeline loss {loss_ewma:.5f} > bar {grading['lossMax']:.5f}"
    )

    # near-optimality: within the 10% band of the true-quantile loss
    loss_opt = pinball(grading["trueQuantiles"])
    assert loss_ewma <= 1.10 * loss_opt

    # the unconditional strategy (full-history flat vol) must FAIL:
    sig_flat = np.std(r, ddof=1)
    qs_flat = [float(last * np.exp(sig_flat * norm.ppf(tau))) for tau in taus]
    assert pinball(qs_flat) > grading["lossMax"], "conditioning on the regime must matter"


def test_level23_point_guess_loses_to_honest_intervals():
    """A lucky point guess (all three quantiles = last price) must fail."""
    p = load_pack(23)
    grading = p["grading"]
    draws = np.asarray(grading["draws"])
    last = cols(p)["y"][-1]

    loss = 0.0
    for tau in grading["taus"]:
        d = draws - last
        loss += np.mean(np.where(d >= 0, tau * d, (tau - 1) * d))
    loss /= len(grading["taus"])
    assert loss > grading["lossMax"]
