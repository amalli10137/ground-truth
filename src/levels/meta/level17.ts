import type { LevelMeta } from '../../lib/types';

const meta: LevelMeta = {
  id: 17,
  slug: 'the-two-faces',
  title: 'The Two Faces',
  tier: 'STOCHASTIC HORRORS',
  tagline: 'the market has moods, and the moods have a matrix',
  brief: String.raw`Six years of daily prices from a **two-regime hidden Markov process**. Each day the market is secretly in one of two states — *calm* (low vol, mild drift up) or *panic* (high vol, drift down) — and the state itself follows a Markov chain you never observe:

$$r_t \mid s_t \sim \mathcal{N}(\mu_{s_t}, \sigma_{s_t}^2), \qquad P(s_{t+1} = j \mid s_t = i) = A_{ij}$$

Look at the chart: you can *see* the moods — stretches of quiet grind and bursts of violence. Your eyes are doing inference. This case asks you to do it honestly: recover the transition probabilities $A_{01}, A_{10}$ and both volatilities, then **decode the hidden state path** and paint it on the chart with \`shade(...)\`.`,
  recover: 'Recover P(calm→panic), P(panic→calm), σ₀, σ₁ (daily units).',
  starterCode: String.raw`# GROUND TRUTH · CASE 17 — The Two Faces
s = data.y.to_numpy()
r = np.diff(np.log(s))

# crude mood-detector: rolling volatility
roll = pd.Series(r).rolling(20).std().to_numpy()
crude = (roll > np.nanmedian(roll) * 1.5).astype(int)
shade(np.concatenate([[0], crude]), label="crude vol filter")
# crude, laggy, and it can't produce transition probabilities.
# do it properly — the machinery has a name, and the hints know it.
`,
  hints: {
    nudge: String.raw`Chicken-and-egg: if you knew the states you'd estimate the parameters by sorting days into two buckets; if you knew the parameters you'd infer the states by Bayes. EM alternates exactly those two steps until they agree with each other.`,
    method: String.raw`Baum–Welch. **E-step**: forward–backward recursions give $\gamma_t(s) = P(s_t = s \mid r_{1:T})$ and pairwise $\xi_t(i,j)$; scale $\alpha_t$ to sum to 1 at each step or you'll underflow. **M-step**: $\hat\mu_s, \hat\sigma_s$ = $\gamma$-weighted mean/std; $\hat A_{ij} = \sum_t \xi_t(i,j) / \sum_t \gamma_t(i)$. Initialize by splitting days on $|r_t|$ vs its median. ~50 iterations. Then Viterbi (max-product recursion) for the single best state path → \`shade(path)\`. Compare it with the crude rolling-vol filter: EM finds sharp edges.`,
    derivation: String.raw`The complete-data log-likelihood is linear in the sufficient statistics $\mathbb{1}[s_t = i]$ and $\mathbb{1}[s_t = i, s_{t+1} = j]$, so the EM lower bound is maximized by replacing them with their posterior expectations $\gamma, \xi$ — that's the entire M-step. The forward-backward pass computes those posteriors in $O(TK^2)$ by dynamic programming:

$$\alpha_t(j) = \Big[\sum_i \alpha_{t-1}(i) A_{ij}\Big] b_j(r_t), \qquad \beta_t(i) = \sum_j A_{ij}\, b_j(r_{t+1})\, \beta_{t+1}(j)$$

Each EM iteration increases the likelihood (monotone convergence); the label-swap symmetry is fixed by naming the low-σ state "calm".

What the numbers *mean*: expected calm-spell length $= 1/A_{01} = 50$ days; expected panic length $= 1/A_{10} = 10$ days; long-run panic fraction $= \frac{A_{01}}{A_{01} + A_{10}} = \tfrac16$. The persistence is why regime models beat single-σ models at short-horizon risk: conditional on today being panic, tomorrow's vol is $\sim 3\times$ the unconditional average.

Tolerances: 4× Monte-Carlo RMS of Baum–Welch across simulations — note $A_{10}$'s tolerance is wider than $A_{01}$'s, because panic is rarer: fewer exits from panic to count. On solve, the true regime ribbon appears in red behind the chart; hold your Viterbi shading next to it.`,
  },
  xLabel: 't (days)',
  yLabel: 'price',
};

export default meta;
