import type { LevelMeta } from '../../lib/types';

const meta: LevelMeta = {
  id: 22,
  slug: 'the-strategy-factory',
  title: 'The Strategy Factory',
  tier: 'QUANT GAUNTLET',
  tagline: '100 backtests walk into a bar. the bar is where they should stay.',
  brief: String.raw`A research team proudly delivers **100 strategy backtests** — two years of daily equity curves, \`s001\` through \`s100\`. Several look spectacular. The team wants capital allocated to the best one.

Here is what they didn't tell you: **99 of these are pure noise.** Coin flips with a P&L axis. Exactly one has a real (modest) edge.

The best of 99 coin-flip Sharpe ratios is *expected* to be around 1.8 annualized. Eyeballing the leaderboard is worthless. Your deliverables: (1) the index of the real strategy, and (2) the **familywise error rate** $\alpha$ at which your identification actually holds up — too small is overclaiming, too large isn't a test. On some other draw of this world, no answer would be defensible; part of the job is knowing whether you're in that world.`,
  recover: 'Recover the real strategy’s index and state a defensible FWER α.',
  submitNote:
    'α is graded as a range: it must be at least the achieved p-value of your best-of-100 test (no overclaiming) and at most 0.10.',
  starterCode: String.raw`# GROUND TRUTH · CASE 22 — The Strategy Factory
names = sorted(c for c in data.columns if c != "t")
E = data[names].to_numpy()
R = np.diff(np.log(E), axis=0)          # daily returns, 504 x 100
sharpes = R.mean(0) / R.std(0, ddof=1) * np.sqrt(252)

order = np.argsort(sharpes)[::-1]
for i in order[:8]:
    print(f"{names[i]}  Sharpe {sharpes[i]:+.2f}")
# tempting, right? one question before you allocate:
# how many strategies did the factory test?
`,
  hints: {
    nudge: String.raw`The question is never "is this Sharpe big?" — it's "is this Sharpe big *given that I picked the maximum of 100 tries*?" You need the distribution of $\max_{100} \widehat{SR}_{\text{null}}$, not of $\widehat{SR}$.`,
    method: String.raw`White's reality check by simulation: a null strategy's annualized Sharpe over $T$ days is $\approx \mathcal{N}(0, 252/T)$ — std $\approx 0.707$ here. Simulate (or bootstrap from the curves themselves) many panels of 100 null Sharpes, record the max each time. Your achieved FWER p-value is $P(\max_{100} \ge \widehat{SR}_{\text{best,obs}})$. If that p is small (it is, on this seed — but check!), the argmax is your index and any stated $\alpha \ge p$ (up to 0.10) is defensible.`,
    derivation: String.raw`Extreme-value arithmetic: for $n$ independent $\mathcal{N}(0, \sigma_S^2)$ Sharpes, $\mathbb{E}[\max] \approx \sigma_S\big((1-\gamma)\Phi^{-1}(1 - \tfrac1n) + \gamma\,\Phi^{-1}(1 - \tfrac{1}{ne})\big)$ (Bailey–López de Prado's Expected Maximum Sharpe, $\gamma \approx 0.5772$). With $\sigma_S = 0.707, n = 100$: $\mathbb{E}[\max] \approx 1.77$, and the 95th percentile of the max sits near $2.4$. This is the **Deflated Sharpe Ratio** idea: a backtest's Sharpe must clear the *expected best of your trial count*, not zero. Selection bias isn't a small correction — it's the whole first-order effect.

FWER logic: testing 100 hypotheses at per-test $\alpha = 0.05$ yields $\approx 5$ false discoveries per panel — someone always looks brilliant. Controlling the *familywise* rate means calibrating against the max-statistic distribution (equivalent to Bonferroni/Šidák at this independence level: per-test $p \cdot 100 \lesssim \alpha$).

The uncomfortable epistemology, which is the real cargo of this level: the defensible $\alpha$ is a property of **the data plus your honesty about the search**, not of your conviction. If the team had run 10,000 backtests instead of 100, $\mathbb{E}[\max]$ rises to $\approx 2.7$ and this same winner would be unidentifiable — *identical returns, different truth*, because the trial count is part of the evidence. This is why "how many things did you try?" is the first question a good allocator asks, and why unreported trials are the finance version of $p$-hacking. Harvey–Liu–Zhu estimate most published factors fail exactly this test.`,
  },
  xLabel: 't (days)',
  yLabel: 'equity',
};

export default meta;
