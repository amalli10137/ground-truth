import type { LevelMeta } from '../../lib/types';

const meta: LevelMeta = {
  id: 19,
  slug: 'self-excitement',
  title: 'Self-Excitement',
  tier: 'STOCHASTIC HORRORS',
  tagline: 'every event recruits its own aftershocks',
  brief: String.raw`No curve this time — a list of **event times**. The chart shows the cumulative count $N(t)$ and a tick for each event. Notice the texture: events arrive in flurries, then go quiet. A Poisson process doesn't do that.

This is a **Hawkes process**: each event temporarily raises the intensity of future events,

$$\lambda(t) = \mu + \sum_{t_i < t} \alpha\, e^{-\beta (t - t_i)}$$

Recover the **branching ratio** $\eta = \alpha/\beta$ — the average number of direct aftershocks per event — plus the decay $\beta$ and background rate $\mu$. In market microstructure this is order-flow clustering: most trades are provoked by other trades; $\eta$ measures how close the book runs to criticality ($\eta \to 1$ = runaway cascades).`,
  recover: 'Recover η = α/β, β, and μ.',
  starterCode: String.raw`# GROUND TRUTH · CASE 19 — Self-Excitement
ts = data.t.to_numpy()      # event times on [0, 600]
T = 600.0
print(len(ts), "events; mean rate", len(ts)/T)

# a Poisson process would have exponential, INDEPENDENT gaps:
gaps = np.diff(ts)
print("gap cv (Poisson -> 1):", gaps.std()/gaps.mean())
plot_xy(gaps[:-1], gaps[1:], label="gap[n+1] vs gap[n]")

# flurries, then silence. quantify the contagion.
`,
  hints: {
    nudge: String.raw`For point processes the likelihood is $\prod_i \lambda(t_i)\,e^{-\int_0^T \lambda}$. With an exponential kernel, both pieces have closed forms — the sum over past events collapses into a one-line recursion.`,
    method: String.raw`Markov trick: $R(t) = \sum_{t_i<t} e^{-\beta(t - t_i)}$ satisfies $R(t_i^+) = e^{-\beta \Delta t_i}(R(t_{i-1}^+)) + 1$, giving $A_i$ in $O(n)$. Code the log-likelihood, then \`scipy.optimize.minimize\` over $(\log\mu, \log\alpha, \log\beta)$ (log-parameterize for positivity; reject $\alpha \ge \beta$). Report $\hat\eta = \hat\alpha/\hat\beta$. Sanity checks: the fitted $\hat\mu/(1-\hat\eta)$ should match the observed mean rate, and the *residual transform* $\Lambda(t_i)$ (integrated intensity between events) should be iid Exp(1).`,
    derivation: String.raw`Point-process likelihood: $\log\mathcal{L} = \sum_i \log\lambda(t_i) - \int_0^T \lambda(t)\,dt$. For the exponential kernel the compensator integrates exactly:

$$\int_0^T \lambda = \mu T + \frac{\alpha}{\beta}\sum_i \big(1 - e^{-\beta(T - t_i)}\big)$$

**Branching-process reading** (Hawkes–Oakes): the process is a Poisson cascade — immigrants arrive at rate $\mu$, each event spawns direct children at total expected number $\eta = \int \alpha e^{-\beta u}\,du = \alpha/\beta$. Mean rate $= \mu/(1-\eta)$: with $\eta = 2/3$, two-thirds of all events are endogenous — caused by the system, not the world. Criticality at $\eta = 1$ is a real phase transition: the cascade sizes get a power-law tail and the process loses stationarity.

Estimation error: MLE is asymptotically efficient; with $n \approx 900$ events the tolerances (4× Monte-Carlo RMS over full re-simulations, thinning algorithm and all) are a few percent for $\eta$. Note $\mu$ and $\eta$ are anti-correlated in the likelihood (a higher background explains away clustering), which the joint MLE handles and moment-matching hacks don't.

The finance connection is not decorative: mid-price changes, order arrivals and liquidations are routinely fit with Hawkes kernels, and estimated $\eta$ for equity order flow sits at $0.7\!-\!0.9$ — markets run hot. Flash crashes are what $\eta$ brushing 1 looks like from inside.`,
  },
  xLabel: 't',
  yLabel: 'N(t)',
};

export default meta;
