import type { LevelMeta } from '../../lib/types';

const meta: LevelMeta = {
  id: 12,
  slug: 'thirteen-samples',
  title: 'Thirteen Samples',
  tier: 'WICKED',
  tagline: 'below Nyquist there is still truth, if you know the signal is sparse',
  brief: String.raw`A failing telemetry link delivered exactly **13 samples**, at random times within one second, of a signal known to be a sum of **3 tones** from the integer grid $f \in \{1, \dots, 40\}$ Hz:

$$y(t_m) = \sum_{j=1}^{3} A_j \cos(2\pi f_j t_m + \varphi_j) + \varepsilon_m, \qquad m = 1,\dots,13$$

Uniform sampling would demand 80 samples/second — Nyquist for a 40 Hz band. You have 13 samples, total. The system $y = Dc$ has 80 unknowns (a cosine and sine per candidate frequency) and 13 equations: infinitely many exact solutions, almost all of them garbage.

What closes the gap is **prior information**: only 3 of the 40 frequencies are real. Sparsity is not a hack — it is data you were given in the brief. Use it.`,
  recover: 'Recover the three frequencies (integers, Hz).',
  starterCode: String.raw`# GROUND TRUTH · CASE 12 — Thirteen Samples
t, y = data.t.to_numpy(), data.y.to_numpy()
fgrid = np.arange(1.0, 41.0)

# dictionary: cos & sin column per candidate frequency, unit-normalized
cols = []
for f in fgrid:
    cols.append(np.cos(2*np.pi*f*t)); cols.append(np.sin(2*np.pi*f*t))
D = np.stack(cols, axis=1)
D = D / np.linalg.norm(D, axis=0, keepdims=True)
print("system:", D.shape[0], "equations,", D.shape[1], "unknowns")

# least squares (minimum-norm) answer — dense nonsense, look:
c_l2, *_ = np.linalg.lstsq(D, y, rcond=None)
energy = c_l2[0::2]**2 + c_l2[1::2]**2
print("L2 'solution' spreads energy over", np.sum(energy > 0.01*energy.max()), "freqs")

# 13 equations, 80 unknowns. the thing that closes the gap is in the brief.
`,
  hints: {
    nudge: String.raw`Minimum-$\ell_2$ spreads energy everywhere; minimum-$\ell_1$ concentrates it. Solve the LASSO — a few dozen lines of plain numpy (ISTA), no sklearn needed.`,
    method: String.raw`ISTA: with step $\eta = 1/\|D\|_2^2$ and $\lambda \approx 0.05\!-\!0.1 \times \|D^\top y\|_\infty$, iterate

$$c \leftarrow \mathcal{S}_{\eta\lambda}\big(c - \eta\, D^\top(Dc - y)\big), \qquad \mathcal{S}_\tau(g) = \mathrm{sign}(g)\max(|g| - \tau, 0)$$

a few thousand times. Sum energy per frequency ($c_{\cos}^2 + c_{\sin}^2$), take the top 3. Sanity check: rebuild the 3-tone signal by least squares on the selected columns and \`overlay\` it against the 13 points — it should thread every sample.`,
    derivation: String.raw`Why $\ell_1$ and not $\ell_0$ (count nonzeros)? Because $\ell_0$ is a combinatorial search over $\binom{40}{3}$ supports, while $\ell_1$ is convex — and under conditions on the dictionary, they have the **same** solution. The relevant condition is incoherence: with *random* sample times, the columns of $D$ have small inner products with high probability, and compressed-sensing theory (Candès–Romberg–Tao / Donoho, 2006) guarantees exact recovery of $s$-sparse signals from $\mathcal{O}(s \log p)$ incoherent measurements. Here $s = 3$ tones (6 coefficients), $p = 80$: thirteen random-time samples sits near that edge — enough, but only because randomness scrambled the aliases.

The counterfactual: sample *uniformly* at 13 Hz and every frequency above 6.5 Hz folds exactly onto a low-frequency alias — information destroyed, no algorithm can undo it. Random sampling converts coherent aliasing into incoherent noise-like cross-talk that $\ell_1$ minimization can reject. Randomness is not sloppiness; it is a resource.

Soft thresholding is where sparsity enters mechanically: each ISTA step is a gradient step on $\tfrac12\|y - Dc\|^2$ followed by the proximal map of $\lambda\|c\|_1$, which shrinks every coefficient toward zero and zeroes the small ones — mass concentrates on the few columns that genuinely explain the data. This is MRI acceleration, radio astronomy imaging, and single-pixel cameras — the same math, wearing different hats.`,
  },
  xLabel: 't (s)',
  yLabel: 'y',
};

export default meta;
