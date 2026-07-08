import type { LevelMeta } from '../../lib/types';

const meta: LevelMeta = {
  id: 23,
  slug: 'the-market',
  title: 'The Market',
  tier: 'QUANT GAUNTLET',
  tagline: 'final boss. predict tomorrow — as a distribution, like an adult.',
  brief: String.raw`One thousand days of a full synthetic market: **GARCH(1,1)** volatility clustering, **Merton jumps**, and **one hidden regime shift** somewhere in the record. Everything you've cleared was training for this chart.

The task is not to predict tomorrow's close. Nobody can, and the grader knows it. The task is to state tomorrow's close **as a distribution**: submit the 5th, 50th, and 95th percentiles of $S_{T+1}$.

Scoring is mean pinball loss against 10,000 hidden Monte-Carlo draws from the *true* next-day distribution — the one conditioned on the actual model state. The bar is 110% of the loss achieved by the exact true quantiles. A lucky point guess cannot pass; an honest, well-conditioned uncertainty band passes with room. Bring: case 5 (differencing), case 7 (log-returns), case 15 (jumps), case 17 (regimes).`,
  recover: 'Submit the 5th / 50th / 95th percentiles of tomorrow’s close.',
  submitNote: 'Quantiles must be non-decreasing.',
  starterCode: String.raw`# GROUND TRUTH · CASE 23 — The Market
s = data.y.to_numpy()
r = np.diff(np.log(s))
last = s[-1]
print("last close:", round(last, 3))

# exhibit 1: vol clusters. exhibit 2: something changed mid-record.
roll = pd.Series(r).rolling(21).std().to_numpy() * np.sqrt(252)
overlay(data.t.to_numpy()[1:], roll * last / np.nanmax(roll) , label="rolling vol (scaled)", style="dot")

# the grader scores three quantiles of TOMORROW's close.
# history matters only insofar as it describes tomorrow.
`,
  hints: {
    nudge: String.raw`Center near the last price (case 7 said drift is unknowable at this horizon). All the skill is in the **width** — and the width must reflect *current* volatility, not the 1000-day average. The record has two eras; only the recent one is tomorrow's.`,
    method: String.raw`EWMA (RiskMetrics) vol: $v_t = \lambda v_{t-1} + (1-\lambda) r_t^2$ with $\lambda \approx 0.94$, giving $\hat\sigma_{T+1}$ that automatically forgets the old regime. Then

$$\hat q_\tau = S_T\, e^{\hat\sigma_{T+1}\, \Phi^{-1}(\tau)}$$

for $\tau = 0.05, 0.5, 0.95$. Refinements that also fit within the bar: fit actual GARCH(1,1) by MLE on the recent era for a proper one-step forecast; widen the 5% tail a touch for jump risk (case 15). Overkill that won't help: any attempt to forecast the *sign* of tomorrow.`,
    derivation: String.raw`**Why pinball loss makes honesty optimal**: the expected pinball loss $\mathbb{E}[\ell_\tau(q)]$ is uniquely minimized at the true $\tau$-quantile — it is a *proper scoring rule* for quantiles. Differentiating $\mathbb{E}[(\tau - \mathbb{1}\{X < q\})(X - q)]$ gives the first-order condition $P(X < q) = \tau$. There is no strategy that beats reporting your true beliefs; the only way to score well is to have good beliefs. That is the entire ideology of this game in one loss function.

**Why EWMA is near-optimal here**: GARCH(1,1) one-step variance is $\sigma_{T+1}^2 = \omega + \alpha \varepsilon_T^2 + \beta \sigma_T^2$; with persistence $\alpha + \beta \approx 0.97$, the model is close to IGARCH, whose exact solution *is* an EWMA of squared returns. The regime shift is handled for free: EWMA's effective memory $\approx 1/(1-\lambda) \approx 17$ days barely sees the old era. The test suite verifies by Monte Carlo that this pipeline scores within the 110% band of the true quantiles — and that a full-history flat-σ band **fails**, because this particular market ends hot: the true next-day σ is roughly twice the unconditional estimate.

**Why the median is easy and the tails are the game**: the median contributes $\approx \mathbb{E}|X - m|/3$ of the loss regardless of your vol estimate; the 5/95 quantiles are where a wrong σ bleeds score quadratically. Under-dispersed intervals (the classic sin: standing in front of a regime shift with a long-run σ) get punished on every tail draw that escapes.

You have completed the syllabus: means (1–2), spectra (3–4, 8–12), stochastic processes (5–7, 13–19), and the multiple-hypothesis honesty of 20–22, all compiled into three numbers and a calibrated shrug. That shrug — *the correct width* — is the most employable object in quantitative finance. GROUND TRUTH · CASE FILE CLOSED.`,
  },
  xLabel: 't (days)',
  yLabel: 'close',
};

export default meta;
