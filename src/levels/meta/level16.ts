import type { LevelMeta } from '../../lib/types';

const meta: LevelMeta = {
  id: 16,
  slug: 'long-memory',
  title: 'Long Memory',
  tier: 'STOCHASTIC HORRORS',
  tagline: 'H = ½ is a knife’s edge, and this walk is not on it',
  brief: String.raw`A path of **fractional Brownian motion**: Gaussian, zero drift, but with increments correlated at *every* lag:

$$\mathbb{E}\big[(B_H(t) - B_H(s))^2\big] = \sigma^2\,|t - s|^{2H}$$

Ordinary Brownian motion is the single point $H = \tfrac12$ of a one-parameter family. $H > \tfrac12$: persistent — moves tend to continue; variance grows *faster* than $t$. $H < \tfrac12$: anti-persistent. The lag-1 ACF of increments will look mild; the dependence hides in the *aggregate* — it decays like a power law, summing to infinity.

Recover the Hurst exponent $H$.`,
  recover: 'Recover the Hurst exponent H.',
  starterCode: String.raw`# GROUND TRUTH · CASE 16 — Long Memory
y = data.y.to_numpy()
d = np.diff(y)
print("increments: mean", d.mean().round(4), " std", d.std(ddof=1).round(4))
print("lag-1 autocorr:", np.corrcoef(d[1:], d[:-1])[0,1].round(4))

# mild, isn't it? the dependence here doesn't live at any single lag —
# which is exactly why lag-by-lag tools won't see it.
`,
  hints: {
    nudge: String.raw`Self-similarity is a scaling law, and scaling laws are straight lines in log–log. Measure how *something* (variance of $k$-lag differences, rescaled range, detrended fluctuation) grows with window size; the slope is $H$ or a simple function of it.`,
    method: String.raw`DFA: integrate the (mean-removed) increments, split into windows of length $n$, remove a linear fit per window, compute the RMS fluctuation $F(n)$, repeat over a geometric ladder of $n$. Then $F(n) \propto n^{H}$ for fGn — fit the log–log slope over $n \approx 8$ to $N/10$. R/S analysis (Hurst's original, from Nile flood records) also passes: rescaled range grows like $n^H$.`,
    derivation: String.raw`The increment process (fractional Gaussian noise) has autocovariance

$$\gamma(k) = \frac{\sigma^2}{2}\left(|k+1|^{2H} - 2|k|^{2H} + |k-1|^{2H}\right) \sim \sigma^2 H(2H-1)\,k^{2H-2}$$

For $H = 0.72$ the correlations decay like $k^{-0.56}$ — so slowly that $\sum_k \gamma(k) = \infty$. Consequence: the variance of a partial sum of $n$ increments is not $n\gamma(0)$ but $\sigma^2 n^{2H}$, and the sample mean of $n$ increments has SE $\propto n^{H-1}$ instead of $n^{-1/2}$. **Every** estimator you've built on iid assumptions quietly loses power here; with $H = 0.72$, "a thousand samples" carries the effective information of roughly $1000^{2(1-H)} \approx 48$ independent ones for level-estimation purposes.

DFA works because integrating fGn gives fBm, whose windowed, detrended RMS scales as $n^{H}$; detrending kills the low-order polynomial contamination that wrecks naive variance-scaling estimates. The tolerance is 4× the Monte-Carlo RMS of DFA at these settings (the generator uses exact Davies–Harte circulant-embedding simulation, so the target is honest fBm, not an approximation).

Why finance cares: volatility (not price) shows $H \approx 0.1$ (rough volatility, anti-persistent) while volume and order flow show $H > 0.7$; and a risk model that assumes $\sqrt{t}$ scaling under $H = 0.72$ underestimates 1-year risk relative to 1-day risk by a factor $t^{H-1/2} \approx 3.4\times$.`,
  },
  xLabel: 't',
  yLabel: 'B_H(t)',
};

export default meta;
