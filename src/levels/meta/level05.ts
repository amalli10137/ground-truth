import type { LevelMeta } from '../../lib/types';

const meta: LevelMeta = {
  id: 5,
  slug: 'the-drunkards-drift',
  title: "The Drunkard's Drift",
  tier: 'FOUNDATIONS',
  tagline: 'the first process with memory of its mistakes',
  brief: String.raw`Position log of an autonomous unit whose navigation drifts: 1000 steps of

$$x_t = x_{t-1} + \mu + \varepsilon_t, \qquad \varepsilon_t \sim \mathcal{N}(0, \sigma^2)$$

Recover the per-step drift $\mu$ and step noise $\sigma$.

Warning: everything you did in cases 1–2 assumed independent errors around a deterministic curve. This series is **not** that — each value carries the accumulated sum of all past noise. Fit a line to it directly and your standard errors will be fiction. There is a one-line transformation that turns this case back into case 1.`,
  recover: 'Recover drift μ and step std σ (per step).',
  starterCode: String.raw`# GROUND TRUTH · CASE 05 — The Drunkard's Drift
x = data.y.to_numpy()
t = data.t.to_numpy()

# the naive move (try it, watch the residuals lie to you):
b, a = np.polyfit(t, x, 1)
overlay_fn(lambda t: a + b*t, label="naive OLS line", style="dot")
residuals(a + b*t)

# the residuals look small. are they telling the truth?
`,
  hints: {
    nudge: String.raw`The *increments* $x_t - x_{t-1}$ are iid $\mathcal{N}(\mu, \sigma^2)$. Difference first; then you are back on case 1.`,
    method: String.raw`\`d = np.diff(x)\`; then $\hat\mu = $ \`d.mean()\` and $\hat\sigma = $ \`d.std(ddof=1)\`. The residuals of the naive line fit look small because a random walk *resembles* a trend on any single realization — the ACF of those residuals betrays the memory.`,
    derivation: String.raw`Differencing gives $d_t = x_t - x_{t-1} = \mu + \varepsilon_t$, iid — so

$$\hat\mu = \bar{d}, \quad \mathrm{SE}(\hat\mu) = \frac{\sigma}{\sqrt{N}} \approx 0.032; \qquad \hat\sigma^2 = \mathrm{var}(d), \quad \mathrm{SE}(\hat\sigma) \approx \frac{\sigma}{\sqrt{2N}} \approx 0.022$$

Note the asymmetry the brief promised: with $\sigma = 1$ and $\mu = 0.15$, the drift's own SE is a fifth of its value — barely a 6-sigma measurement after 1000 steps — while $\sigma$ is pinned to 2%. **Volatility is easy; drift is hard.** (Case 7 sharpens this into a theorem.)

Also note: $\hat\mu = \bar d = (x_N - x_0)/N$ — for a pure random walk the endpoints *are* the sufficient statistic for drift. The middle of the path adds nothing. Compare case 2, where endpoints-only was the worst thing you could do: whether the noise accumulates changes everything.`,
  },
  xLabel: 't (steps)',
  yLabel: 'x',
};

export default meta;
