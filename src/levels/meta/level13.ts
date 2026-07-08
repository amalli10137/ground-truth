import type { LevelMeta } from '../../lib/types';

const meta: LevelMeta = {
  id: 13,
  slug: 'the-impostor',
  title: 'The Impostor',
  tier: 'STOCHASTIC HORRORS',
  tagline: 'is it random? bet carefully.',
  brief: String.raw`This series wanders like every random walk you've tamed so far. The histogram is broad. The ACF of increments is unremarkable. Every tool from cases 5–7 will happily "estimate" its parameters and hand you confident nonsense.

The question this case actually asks: **is this process stochastic at all?** And if it's deterministic — recover its parameter.

The marginal statistics will not answer that question; they've already lied to you twice this tier. Find a view of the data that does.`,
  recover: 'Recover r (and your faith in scatter plots).',
  starterCode: String.raw`# GROUND TRUTH · CASE 13 — The Impostor
y = data.y.to_numpy()

# it *looks* stochastic:
d = np.diff(y)
print("increment mean:", d.mean().round(4), " std:", d.std().round(4))
print("lag-1 autocorr:", np.corrcoef(d[1:], d[:-1])[0,1].round(4))
# every test so far says "random-ish". but you've only asked the data
# one value at a time...
`,
  hints: {
    nudge: String.raw`Randomness and chaos look identical one value at a time — but not one *pair* at a time. Plot each value against the next: \`plot_xy(y[:-1], y[1:])\`. If a clean curve appears, this is a deterministic map — and the curve's shape names it. What one-parameter map on $[0,1]$ has a graph shaped like that?`,
    method: String.raw`It's the logistic map $x_{n+1} = r\,x_n(1 - x_n)$. Fit it by least squares on the embedding: regress $x_{n+1}$ on $[x_n,\ x_n^2]$ — the model predicts coefficients $(r, -r)$, so average: $\hat r = (\hat c_1 - \hat c_2)/2$. Overlay the fitted parabola on your scatter with \`plot_xy(xs, r*xs*(1-xs), mode="line")\` and enjoy the moment.`,
    derivation: String.raw`Why the fakery works: for $r$ in the chaotic band, the logistic map has sensitive dependence — the Lyapunov exponent $\lambda = \lim \frac1n \sum \ln|r(1 - 2x_i)| > 0$ — so trajectories decorrelate exponentially and pass casual tests of randomness. Marginal statistics cannot distinguish "unpredictable because random" from "unpredictable because chaotic".

The delay embedding can, and Takens' theorem says this is general: for a deterministic system, the delay vector $(x_n, x_{n-1}, \dots, x_{n-m+1})$ reconstructs the state space up to diffeomorphism. A 1-D map needs $m = 2$: the graph of $f$ simply *appears*.

The regression: with observation noise $\eta_n$ of std $\sigma_{\text{obs}}$, the embedding satisfies $x_{n+1} \approx r x_n - r x_n^2 + \eta$, a linear model in $(x, x^2)$, so least squares gives $\hat r$ with SE from the usual OLS formula — at $\sigma_{\text{obs}} = 0.004$ and $N = 600$, that's a four-decimal measurement of a "random walk's" hidden constant.

The lesson to carry into the finance tier: **stochastic is a modeling decision, not an observation.** Before estimating noise parameters, ask whether the noise is noise. (Real markets are genuinely stochastic — mostly — but regime structure hides in them the same way this parabola hid: in a conditional view of the data, not the marginal one.)`,
  },
  xLabel: 'n',
  yLabel: 'x',
};

export default meta;
