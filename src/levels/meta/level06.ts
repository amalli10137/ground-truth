import type { LevelMeta } from '../../lib/types';

const meta: LevelMeta = {
  id: 6,
  slug: 'the-fading-memory',
  title: 'The Fading Memory',
  tier: 'FOUNDATIONS',
  tagline: 'it remembers — but only for a while',
  brief: String.raw`A temperature anomaly series, 1500 ticks, mean-reverting:

$$x_t = \varphi\, x_{t-1} + \varepsilon_t, \qquad \varepsilon_t \sim \mathcal{N}(0, \sigma_\varepsilon^2), \quad |\varphi| < 1$$

Recover the memory coefficient $\varphi$ and the innovation std $\sigma_\varepsilon$.

Careful: the trick from case 5 is now a trap. Differencing a *stationary* AR(1) doesn't clean it — it manufactures spurious negative correlation. First diagnose (is this integrated, or merely persistent?), then estimate.`,
  recover: 'Recover φ and σ_ε.',
  starterCode: String.raw`# GROUND TRUTH · CASE 06 — The Fading Memory
x = data.y.to_numpy()
print("mean:", x.mean().round(3), " var:", x.var(ddof=1).round(3))

# before estimating anything: what KIND of process is this?
# every diagnostic you built in cases 1-5 is admissible.
`,
  hints: {
    nudge: String.raw`For an AR(1), $\mathrm{corr}(x_t, x_{t-k}) = \varphi^k$. The lag-1 autocorrelation *is* your estimator — or regress $x_t$ on $x_{t-1}$, which is the same thing.`,
    method: String.raw`$\hat\varphi = \sum x_t x_{t-1} / \sum x_{t-1}^2$ (OLS through the origin, since the mean is 0). Then $\hat\sigma_\varepsilon = \mathrm{std}(x_t - \hat\varphi x_{t-1})$. Check the fit: overlay the one-step prediction $\hat\varphi x_{t-1}$ and confirm the ACF of residuals is flat. Differencing would give increments with ACF$(1) = -\frac{1-\varphi}{2} \neq 0$ — structure you created yourself.`,
    derivation: String.raw`The Yule–Walker equation for AR(1): multiply $x_t = \varphi x_{t-1} + \varepsilon_t$ by $x_{t-1}$ and take expectations: $\gamma_1 = \varphi\,\gamma_0$, so $\varphi = \rho_1$, the lag-1 autocorrelation. The OLS estimator

$$\hat\varphi = \frac{\sum_{t} x_t x_{t-1}}{\sum_t x_{t-1}^2}, \qquad \mathrm{SE}(\hat\varphi) \approx \sqrt{\frac{1-\varphi^2}{N}} = \sqrt{\tfrac{1-0.7225}{1500}} \approx 0.014$$

is consistent and asymptotically normal for $|\varphi|<1$.

**Why differencing is now wrong:** case 5's walk is $\varphi = 1$, the knife's edge where variance diverges and differencing is *required*. For $\varphi<1$ the series is already stationary; $\Delta x_t = (\varphi - 1)x_{t-1} + \varepsilon_t$ still contains $x_{t-1}$ — you've thrown away signal and added structure.

**The OU connection:** AR(1) is the Euler discretization of the Ornstein–Uhlenbeck process $dx = -\theta x\,dt + \sigma\,dW$ with $\varphi = e^{-\theta \Delta t}$. Mean-reversion half-life: $t_{1/2} = \ln 2 / \theta = \Delta t \ln 2 / (-\ln \varphi) \approx 4.3$ ticks. File that formula — case 20 pays it out with interest.`,
  },
  xLabel: 't (ticks)',
  yLabel: 'x',
};

export default meta;
