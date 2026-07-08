import type { LevelMeta } from '../../lib/types';

const meta: LevelMeta = {
  id: 2,
  slug: 'the-trend',
  title: 'The Trend',
  tier: 'FOUNDATIONS',
  tagline: 'a line, buried in weather',
  brief: String.raw`A drift gauge sampled 250 times over 10 seconds. The generator is a straight line plus heavy Gaussian noise:

$$y_t = a + b\,t + \varepsilon_t, \qquad \varepsilon_t \sim \mathcal{N}(0, \sigma^2)$$

Recover the intercept $a$ and slope $b$.

A field tech once "estimated" the slope by connecting the first and last points. The tolerance on this level is set at 4 standard errors of the **best** estimator — endpoint-connecting is roughly $\sqrt{N/6}$ times noisier, so it will fail here about as often as it works. Use all the data.`,
  recover: 'Recover intercept a and slope b.',
  starterCode: String.raw`# GROUND TRUTH · CASE 02 — The Trend
t, y = data.t.to_numpy(), data.y.to_numpy()

# the tempting-but-terrible estimator:
b_endpoints = (y[-1] - y[0]) / (t[-1] - t[0])
print("endpoint slope:", b_endpoints)

# your turn: use ALL 250 points, then overlay your line
overlay_fn(lambda t: 0.0 + b_endpoints * t, label="endpoints", style="dot")
`,
  hints: {
    nudge: String.raw`Two points determine a line; 250 points determine it $\sqrt{\text{much}}$ better. Minimize the squared error over **all** points.`,
    method: String.raw`Ordinary least squares. \`b, a = np.polyfit(t, y, 1)\` (or the closed form $\hat{b} = \mathrm{cov}(t,y)/\mathrm{var}(t)$, $\hat{a} = \bar{y} - \hat{b}\,\bar{t}$). Overlay the fitted line and run \`residuals(a + b*t)\` — structureless residuals mean the linear model is right.`,
    derivation: String.raw`OLS minimizes $\sum_t (y_t - a - b t)^2$. Setting both partial derivatives to zero:

$$\hat{b} = \frac{\sum_t (t - \bar{t})(y_t - \bar{y})}{\sum_t (t - \bar{t})^2}, \qquad \hat{a} = \bar{y} - \hat{b}\,\bar{t}$$

With $S_{tt} = \sum_t (t-\bar{t})^2$, the standard errors are

$$\mathrm{SE}(\hat{b}) = \frac{\sigma}{\sqrt{S_{tt}}}, \qquad \mathrm{SE}(\hat{a}) = \sigma\sqrt{\tfrac{1}{N} + \tfrac{\bar{t}^2}{S_{tt}}}$$

Why endpoints-only is terrible: $\hat{b}_{\text{ends}} = \frac{y_N - y_1}{t_N - t_1}$ has variance $\frac{2\sigma^2}{(t_N-t_1)^2}$, while OLS achieves $\frac{\sigma^2}{S_{tt}} \approx \frac{12\,\sigma^2}{N\,(t_N-t_1)^2}$ for evenly spaced $t$. The ratio is $N/6 \approx 42$ in variance — the endpoint estimator throws away a factor of $\sqrt{42} \approx 6.5$ in precision, because it uses two measurements and discards 248.`,
  },
  xLabel: 't (s)',
  yLabel: 'y',
};

export default meta;
