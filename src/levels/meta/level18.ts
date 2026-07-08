import type { LevelMeta } from '../../lib/types';

const meta: LevelMeta = {
  id: 18,
  slug: 'the-kalman-level',
  title: 'The Kalman Level',
  tier: 'STOCHASTIC HORRORS',
  tagline: 'the signal is in there. filter accordingly.',
  brief: String.raw`A slow, persistent hidden state, observed through a sensor whose noise is **three times larger** than the state's own innovations:

$$x_t = \varphi\,x_{t-1} + w_t, \qquad y_t = x_t + v_t, \qquad w \sim \mathcal{N}(0, \sigma_w^2),\ v \sim \mathcal{N}(0, \sigma_v^2)$$

You see only $y$. The chart looks like fuzz with a vague undertow. Somewhere inside it is a smooth trajectory — and at the end of this case the true one will be drawn in red, so your reconstruction will be judged by your own eyes as well as the grader.

Recover $\varphi$, $\sigma_w$, $\sigma_v$, and overlay your best estimate of the hidden path (filtered *and* smoothed — the difference between them is the lesson).`,
  recover: 'Recover φ, σ_w, σ_v.',
  starterCode: String.raw`# GROUND TRUTH · CASE 18 — The Kalman Level
y = data.y.to_numpy()
print("observed std:", y.std(ddof=1).round(3))

# somewhere inside this fuzz is a smooth trajectory. when you have an
# estimate of it, show your work: overlay(data.t, your_estimate)
`,
  hints: {
    nudge: String.raw`The Kalman filter doesn't just estimate the state — as a by-product it computes the **exact likelihood** of the observations for any $(\varphi, \sigma_w, \sigma_v)$, via the one-step prediction errors. So: wrap the filter in an optimizer.`,
    method: String.raw`Maximum likelihood through the filter: each step's innovation $v_t = y_t - \hat x_{t|t-1}$ is Gaussian with known variance $S_t$, so $\log \mathcal{L} = -\tfrac12 \sum_t \big(\log 2\pi S_t + v_t^2/S_t\big)$. Minimize $-\log\mathcal{L}$ with \`scipy.optimize.minimize\` (Nelder–Mead; parameterize $\varphi = \tanh(\theta_1)$, variances $= e^{\theta_2}, e^{\theta_3}$ to stay in-bounds). Then run the **RTS smoother** backwards for $\hat x_{t|T}$ and overlay filtered vs smoothed.`,
    derivation: String.raw`The prediction-error decomposition $p(y_{1:T}) = \prod_t p(y_t \mid y_{1:t-1})$ is what makes state-space MLE exact rather than approximate: each conditional is Gaussian with mean and variance the filter already computed. This works for *any* linear-Gaussian model and is the backbone of structural time-series packages.

Filter recursions (scalar case): predict $\hat x_{t|t-1} = \varphi \hat x_{t-1|t-1}$, $P_{t|t-1} = \varphi^2 P_{t-1|t-1} + \sigma_w^2$; update with gain $K_t = P_{t|t-1}/(P_{t|t-1} + \sigma_v^2)$. The gain *is* the signal-to-noise dial: with $\sigma_v \gg \sigma_w$, $K$ is small and the filter trusts its model more than the data — that's why the filtered path is calm while the observations rage.

The smoother $\hat x_{t|T} = \hat x_{t|t} + J_t(\hat x_{t+1|T} - \hat x_{t+1|t})$ folds *future* observations into each state estimate; its error variance is strictly smaller than the filter's except at $t = T$ where they agree. Visually: the filtered path lags turns (it hasn't seen the future), the smoothed one doesn't. Offline analysis should always smooth; only live trading is condemned to filter.

Identifiability caution baked into the tolerances: $(\sigma_w, \sigma_v)$ trade off against $\varphi$ through the observed autocovariances, so the likelihood surface has a shallow valley — the MC-calibrated tolerances are correspondingly asymmetric ($\varphi$ tight, noise stds looser). EM (state-space flavor) also passes if you prefer it to Nelder–Mead.`,
  },
  xLabel: 't',
  yLabel: 'y (observed)',
};

export default meta;
