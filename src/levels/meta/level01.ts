import type { LevelMeta } from '../../lib/types';

const meta: LevelMeta = {
  id: 1,
  slug: 'the-flatline',
  title: 'The Flatline',
  tier: 'FOUNDATIONS',
  tagline: 'a constant, wearing a disguise of noise',
  brief: String.raw`A pressure sensor on a decommissioned pipeline has been transmitting for 200 ticks. Engineering swears the line is dead — the true signal is a **constant**. The noise says otherwise, loudly.

Your first case is the simplest inverse problem there is: the data were generated as $y_t = c + \varepsilon_t$ with $\varepsilon_t \sim \mathcal{N}(0, \sigma^2)$. Recover $c$.

Use the lab below. \`data\` is a DataFrame with columns \`t\` and \`y\`. Try \`overlay_fn(lambda t: np.full_like(t, YOUR_GUESS))\` to draw your candidate flatline over the data, and \`residuals(...)\` to see what's left over. When the residuals look like pure noise centered on zero, you're done.`,
  recover: 'Recover the constant c.',
  starterCode: String.raw`# GROUND TRUTH · CASE 01 — The Flatline
# data: DataFrame with columns t, y
print(data.describe())

guess = 4.0   # <- refine me
overlay_fn(lambda t: np.full_like(t, guess), label=f"c = {guess}")
residuals(np.full(len(data), guess))
`,
  hints: {
    nudge: String.raw`Every $y_t$ is the same constant plus independent noise. What single number is closest to all of them at once, in the squared-error sense?`,
    method: String.raw`The sample mean $\hat{c} = \frac{1}{N}\sum_t y_t$ is the least-squares estimator of a constant: it minimizes $\sum_t (y_t - c)^2$. It is also the maximum-likelihood estimator under Gaussian noise. Compute \`data.y.mean()\`, overlay it, and check the residuals have no structure.`,
    derivation: String.raw`Minimize the sum of squared errors:

$$\frac{d}{dc}\sum_{t=1}^{N} (y_t - c)^2 = -2\sum_{t=1}^{N}(y_t - c) = 0 \;\Rightarrow\; \hat{c} = \frac{1}{N}\sum_{t=1}^{N} y_t$$

Its sampling distribution: $\hat{c} \sim \mathcal{N}\!\left(c, \; \sigma^2/N\right)$, so the standard error is

$$\mathrm{SE}(\hat{c}) = \frac{\sigma}{\sqrt{N}} \approx \frac{0.8}{\sqrt{200}} \approx 0.057.$$

The grader accepts anything within $4\,\mathrm{SE}$ of the true $c$. With $N = 200$ points the mean will land inside that window essentially every time — this level is a free introduction to a theme: **precision grows like $\sqrt{N}$, and every later level will make $N$ work harder for you.**`,
  },
  xLabel: 't (ticks)',
  yLabel: 'y',
};

export default meta;
