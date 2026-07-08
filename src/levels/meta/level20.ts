import type { LevelMeta } from '../../lib/types';

const meta: LevelMeta = {
  id: 20,
  slug: 'the-pair',
  title: 'The Pair',
  tier: 'QUANT GAUNTLET',
  tagline: 'two drunks, one dog leash',
  brief: String.raw`Two log-price series, \`a\` and \`b\` (use the highlight picker). Run your case-5 toolkit on either one alone: a textbook random walk, drift ≈ 0, increments unpredictable. Individually they are noise.

Together they are not. They share a **common stochastic trend** — some linear combination $a_t - \gamma\,b_t$ is *stationary* and mean-reverting. That combination is the tradeable object: when the spread stretches, it snaps back, with a half-life you can measure.

Recover the hedge ratio $\gamma$ and the spread's mean-reversion half-life. Overlay the stationarized spread to see what you've built. This is pairs trading, stated honestly: the alpha is the cointegration, and everything depends on $\gamma$ and that half-life being real.`,
  recover: 'Recover hedge ratio γ and spread half-life (days).',
  starterCode: String.raw`# GROUND TRUTH · CASE 20 — The Pair
a, b = data.a.to_numpy(), data.b.to_numpy()

# each leg alone: unforecastable
for name, x in [("a", a), ("b", b)]:
    d = np.diff(x)
    print(name, "increment lag-1 autocorr:", np.corrcoef(d[1:], d[:-1])[0,1].round(3))

# separately: two textbook random walks. the brief claims that
# together they are something more. verify — or refute — that claim.
`,
  hints: {
    nudge: String.raw`Engle–Granger step one: OLS of $a$ on $b$ gives $\hat\gamma$. Step two: the *residual* of that regression is a new time series — test it with your case-6 tools.`,
    method: String.raw`$\hat\gamma, \hat c$ from \`np.polyfit(b, a, 1)\`; spread $s_t = a_t - \hat\gamma b_t - \hat c$. Overlay $s_t$ (it oscillates around zero — stationary). Fit AR(1): $\hat\varphi = \sum s_t s_{t-1} / \sum s_{t-1}^2$, then

$$t_{1/2} = \frac{\ln 2}{-\ln \hat\varphi}$$

Sanity: difference the spread and check you *haven't* over-differenced (case 6's lesson); and eyeball that the spread crosses zero dozens of times while each leg never comes home.`,
    derivation: String.raw`Cointegration (Engle & Granger, 1987 — the Nobel one): $a$ and $b$ are each I(1) — integrated, variance growing without bound — but a linear combination is I(0). The regression of one I(1) series on another is usually the classic *spurious regression* trap… except when they are cointegrated, in which case OLS is **superconsistent**: $\hat\gamma$ converges at rate $T$ instead of $\sqrt{T}$, because the residual variance is bounded while $\mathrm{var}(b)$ grows like $T$. That's why the tolerance on $\gamma$ is so tight, and why step one may be an ordinary regression despite both variables wandering.

The half-life comes from the AR(1)/OU correspondence you filed in case 6: $s_{t+k}$ reverts as $\varphi^k$, so the expected time for a displacement to halve is $\ln 2 / (-\ln\varphi) \approx 11$ days here. For trading, that number *is* the product spec: it sets the holding period, the capital velocity, and — via how many independent reversion cycles fit in your backtest — the statistical power of any claim that the strategy works.

Formal rigor note: a full Engle–Granger test would check the residual for a unit root with an ADF test at cointegration-adjusted critical values (the residual is *fitted*, so ordinary Dickey–Fuller tables are too lenient). The grader doesn't demand the test statistic, but run it mentally: with a half-life this short and $N = 1250$, the reversion is overwhelming. When you meet a live pair whose fitted half-life is 3 months on 2 years of data — that mental test should scream.`,
  },
  xLabel: 't (days)',
  yLabel: 'log price',
};

export default meta;
