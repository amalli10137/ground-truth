import type { LevelMeta } from '../../lib/types';

const meta: LevelMeta = {
  id: 7,
  slug: 'geometric-motion',
  title: 'Geometric Motion',
  tier: 'FOUNDATIONS',
  tagline: 'four years of daily prices; one honest and one hopeless parameter',
  brief: String.raw`Four years of daily closes (1008 trading days) from a geometric Brownian motion:

$$dS_t = \mu S_t\,dt + \sigma S_t\,dW_t$$

Recover the annualized volatility $\sigma$ and drift $\mu$. Take $\Delta t = 1/252$ years per step.

Multiplicative noise breaks the additive toolkit; the first job is finding the transformation that restores it. And when you compute the standard errors, look closely at what each one depends on. One of these two parameters does not care how often you sample. It only cares how long you watched.`,
  recover: 'Recover annualized σ and μ.',
  starterCode: String.raw`# GROUND TRUTH · CASE 07 — Geometric Motion
s = data.y.to_numpy()
t = data.t.to_numpy()
dt = 1/252
print("first close:", s[0].round(2), " last close:", s[-1].round(2))
print("4 years, daily. recover sigma and mu, annualized.")
`,
  hints: {
    nudge: String.raw`Log-returns $r_t = \ln S_t - \ln S_{t-1}$ are iid Gaussian — this is case 5 in disguise, plus one Itô correction.`,
    method: String.raw`$r_t \sim \mathcal{N}\big((\mu - \sigma^2/2)\Delta t,\; \sigma^2 \Delta t\big)$. So $\hat\sigma = \mathrm{std}(r)/\sqrt{\Delta t}$ and $\hat\mu = \bar{r}/\Delta t + \hat\sigma^2/2$. Overlay $S_0 e^{\hat\mu t}$ against the path to eyeball the drift.`,
    derivation: String.raw`Itô's lemma on $\ln S$: $d\ln S = (\mu - \tfrac{\sigma^2}{2})dt + \sigma\,dW$, hence the estimators above. Standard errors:

$$\mathrm{SE}(\hat\sigma) \approx \frac{\sigma}{\sqrt{2N}} = \frac{0.35}{\sqrt{2016}} \approx 0.008 \qquad \text{(2% relative — easy)}$$

$$\mathrm{SE}(\hat\mu) \approx \frac{\sigma}{\sqrt{T}} = \frac{0.35}{\sqrt{4}} = 0.175 \qquad \text{(bigger than } \mu \text{ itself)}$$

**Merton's result**: $\bar{r}/\Delta t = \frac{\ln S_T - \ln S_0}{T}$ — the drift estimate depends only on the endpoints, so sampling more finely adds *nothing*. $\mathrm{SE}(\hat\mu) = \sigma/\sqrt{T}$ improves only with calendar time $T$. To know an equity-like drift to ±1% you'd need $\sim (0.35/0.01)^2 \approx 1200$ years of data. Volatility, by contrast, is estimated from the *quadratic variation*, which every extra sample refines.

This asymmetry is why the grader is strict about $\sigma$ and honest about $\mu$: the tolerance on $\mu$ is 4 standard errors wide, and 4 standard errors here is a barn door. That is not generosity. That is the truth.`,
  },
  xLabel: 't (years)',
  yLabel: 'S',
};

export default meta;
