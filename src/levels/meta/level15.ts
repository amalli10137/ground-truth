import type { LevelMeta } from '../../lib/types';

const meta: LevelMeta = {
  id: 15,
  slug: 'the-jumps',
  title: 'The Jumps',
  tier: 'STOCHASTIC HORRORS',
  tagline: 'two kinds of risk wearing one volatility',
  brief: String.raw`Eight years of daily prices from a **Merton jump-diffusion**: ordinary geometric Brownian motion, plus rare violent shocks arriving as a Poisson process:

$$\frac{dS}{S} = \mu\,dt + \sigma\,dW + (e^J - 1)\,dN_t, \qquad N_t \sim \mathrm{Poisson}(\lambda t),\quad J \sim \mathcal{N}(0, s_J^2)$$

Case 7's estimator will hand you one number that smears both risks together. But diffusive risk (continuous, hedgeable) and jump risk (discontinuous, gap-through-your-stop-loss) are different animals with different prices. Recover them **separately**: diffusive $\sigma$, jump intensity $\lambda$, jump size $s_J$.`,
  recover: 'Recover diffusive σ, jump intensity λ (per year), and jump size std s_J.',
  starterCode: String.raw`# GROUND TRUTH · CASE 15 — The Jumps
s = data.y.to_numpy()
r = np.diff(np.log(s))
dt = 1/252
print("case-7 all-in-one vol:", (r.std(ddof=1) * np.sqrt(252)).round(4))

# one number, two different risks blended inside it. separate them.
`,
  hints: {
    nudge: String.raw`Realized variance $\sum r_i^2$ sums *all* squared moves, jumps included. Bipower variation $\tfrac{\pi}{2}\sum |r_i||r_{i-1}|$ is immune (a jump gets multiplied by an ordinary neighbor, not by itself). The gap RV − BV *is* the jump variance $\lambda\,s_J^2$. To split it you need one more equation.`,
    method: String.raw`Two-stage. **σ**: bipower gives a slightly contaminated estimate at daily frequency; refine with threshold truncation — drop days with $|r| > 4\hat\sigma\sqrt{dt}$, recompute $\sigma$ from what's left, iterate twice. **λ and $s_J$**: daily returns are a mixture — most days $\mathcal{N}(m, \sigma^2 dt)$, jump days $\mathcal{N}(m, \sigma^2 dt + s_J^2)$ with weight $p = \lambda\,dt$. Fit the two-component mixture by EM (30 lines) or \`scipy.optimize\` MLE; then $\hat\lambda = \hat p/dt$ and $\hat s_J^2 = \hat v_1 - \hat v_0$.`,
    derivation: String.raw`Barndorff-Nielsen–Shephard theory: as $dt \to 0$, realized variance $\to \int \sigma^2 dt + \sum J^2$ (total quadratic variation) while bipower variation $\to \int \sigma^2 dt$ only, because a jump lands in a product $|r_i||r_{i+1}|$ next to an $O(\sqrt{dt})$ diffusive term, contributing $O(|J|\sqrt{dt}) \to 0$. The scaling constant $\pi/2 = (\mathbb{E}|Z|)^{-2}$ undoes $\mathbb{E}|Z| = \sqrt{2/\pi}$.

At *daily* sampling that vanishing term hasn't vanished: contamination $\approx \tfrac{\pi}{2}\cdot 2\lambda T\, \mathbb{E}|J|\,\mathbb{E}|r^{\text{diff}}|$ biases BV up by several percent — which is why the grader's intended pipeline finishes with truncation (Mancini): with jumps $\sim 7\times$ daily vol, a $4\sigma\sqrt{dt}$ threshold removes jump days almost surely while discarding only $6\times10^{-5}$ of Gaussian days.

The mixture likelihood for the second stage:

$$\mathcal{L} = \prod_t \left[ (1-p)\,\phi(r_t; m, v_0) + p\,\phi(r_t; m, v_0 + s_J^2) \right]$$

EM alternates soft-assigning each day a jump probability and reweighting the moments. Identifiability comes from kurtosis: the mixture's excess kurtosis is $\approx 3 p (s_J^2/v_0)^2$ at small $p$ — with $s_J^2/v_0 \approx 50$, unmissable. λ's tolerance is honest but wide: with only $\sim 64$ true jump days in 8 years, $\mathrm{SE}(\hat\lambda) \gtrsim \sqrt{\lambda/T} \approx 1$/yr is a Poisson-counting floor no estimator can beat.`,
  },
  xLabel: 't (years)',
  yLabel: 'S',
};

export default meta;
