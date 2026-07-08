import type { LevelMeta } from '../../lib/types';

const meta: LevelMeta = {
  id: 14,
  slug: 'fat-tails',
  title: 'Fat Tails',
  tier: 'STOCHASTIC HORRORS',
  tagline: 'your variance estimator is lying to your face',
  brief: String.raw`A cumulative series whose increments are drawn from an **α-stable (Lévy) distribution** with tail index $\alpha < 2$:

$$P(|\xi| > x) \sim C\,x^{-\alpha}$$

For $\alpha < 2$ the variance is **infinite**. Not "large" — undefined. Compute the sample std and it will return a number, cheerfully, and that number converges to nothing: watch it as you feed in more data, and every so often a single new observation doubles it.

Recover the tail index $\alpha$. Then remember this case in 1987 and 2008, when "25-sigma events" hit portfolios whose sigmas were fictions exactly like this one.`,
  recover: 'Recover the tail index α.',
  starterCode: String.raw`# GROUND TRUTH · CASE 14 — Fat Tails
d = np.diff(data.y.to_numpy())

# watch the "variance" fail to converge:
running_std = [d[:n].std() for n in range(50, len(d), 50)]
plot_xy(np.arange(50, len(d), 50), running_std, label="running std", mode="line")

# a number came out. it will keep coming out. it converges to nothing.
`,
  hints: {
    nudge: String.raw`Moments fail; **order statistics** don't. A power-law tail is a straight line in log–log: plot $\log(\text{rank})$ against $\log|\xi|_{(k)}$ for the largest observations.`,
    method: String.raw`The Hill estimator. Sort $|\xi|$ descending, take the top $k$ (try $k \approx 150$ of $N = 1500$):

$$\hat\alpha_k = \left( \frac{1}{k} \sum_{i=1}^{k} \ln\frac{|\xi|_{(i)}}{|\xi|_{(k+1)}} \right)^{-1}$$

Plot $\hat\alpha_k$ against $k$ (the "Hill plot") and read the plateau. Small $k$: high variance. Large $k$: bias, because you've left the tail and entered the body of the distribution.`,
    derivation: String.raw`Conditional on exceeding a high threshold $u$, a power-law tail gives $\ln(|\xi|/u)$ an exponential distribution with mean $1/\alpha$ — that's the entire Hill estimator: an MLE of an exponential mean, applied to log-exceedances. Its asymptotic behavior: $\hat\alpha \approx \alpha\,(1 + Z/\sqrt{k})$, so $\mathrm{SE} \approx \alpha/\sqrt{k} \approx 0.13$ at $k = 150$. The tolerance is 4× the Monte-Carlo RMS error at that $k$, which folds in the bias from the stable distribution's tail not being *exactly* power-law until far out.

Why the variance is infinite: $\mathbb{E}[\xi^2] = \int x^2 f(x)\,dx$ with $f(x) \sim x^{-\alpha-1}$ diverges for $\alpha < 2$. The generalized CLT says sums of such increments converge not to a Gaussian but to an α-stable law — the walk you're looking at *is* the attractor, with flights of arbitrary scale.

Practical creed: **check that a moment exists before estimating it.** Diagnostics: the running-std plot (never flattens), the max-share statistic ($\max \xi_i^2 / \sum \xi_i^2$ doesn't vanish as $N$ grows), the log–log rank plot (straight tail). Gaussian risk models applied to $\alpha \approx 1.6$ increments underprice tail events by orders of magnitude; the 1987 crash was a "$20\sigma$" day under a Gaussian fit and roughly a 1-in-a-few-decades event under a stable one.`,
  },
  xLabel: 't',
  yLabel: 'x',
};

export default meta;
