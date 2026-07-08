import type { LevelMeta } from '../../lib/types';

const meta: LevelMeta = {
  id: 10,
  slug: 'the-dying-chords',
  title: 'The Dying Chords',
  tier: 'WICKED',
  tagline: 'three notes, all of them dying',
  brief: String.raw`A struck structure rings down: one second at 1 kHz of

$$y(t) = \sum_{i=1}^{3} A_i\, e^{-d_i t} \cos(2\pi f_i t + \varphi_i) + \varepsilon$$

Recover all three frequencies $f_i$ **and** all three damping rates $d_i$.

The FFT gives you smeared Lorentzian humps — damping widens each line, the widths overlap, and peak positions shift. You could try nonlinear least squares in 12 parameters and pray about initialization. Or you could use the strange and beautiful fact that *sums of damped exponentials satisfy a linear recurrence*, and read the poles out of an eigenvalue problem. This is how NMR spectroscopy and modal analysis actually work.`,
  recover:
    'Recover the poles, then prove it: define predict(t) reconstructing the clean signal. It is graded on a hidden extension of the time axis — 0.4 s beyond the recording. Only genuine poles extrapolate.',
  submitNote:
    'Overfitting alert: anything that merely memorizes the shown window (splines, high-degree polynomials) will detonate on the extension.',
  starterCode: String.raw`# GROUND TRUTH · CASE 10 — The Dying Chords
t, y = data.t.to_numpy(), data.y.to_numpy()
N = len(y); dt = t[1] - t[0]
print(f"{N} samples over {N*dt:.2f} s; spectrum toggle shows the smeared humps")

# when you have the modes, prove it:
# def predict(t):
#     t = np.asarray(t, dtype=float)
#     return ...   # your reconstructed clean signal
# then use "Grade predict(t)" in the submission panel
`,
  hints: {
    nudge: String.raw`$y_n = \sum_i c_i z_i^n$ with poles $z_i = e^{(-d_i + 2\pi i f_i)\Delta t}$. Six poles (3 conjugate pairs) means the singular values of the Hankel matrix split: six large, the rest noise. The poles live in the signal subspace.`,
    method: String.raw`Matrix pencil: build Hankel $Y$ (rows = length-$(L{+}1)$ windows, $L \approx N/3$), SVD it, keep the top $M = 6$ right singular vectors $V$. Form $V_1$ ($V$ minus last row) and $V_2$ ($V$ minus first row); the eigenvalues of $\mathrm{pinv}(V_1)V_2$ are the poles $z_i$. Then $f_i = \angle z_i / (2\pi \Delta t)$ and $d_i = -\ln|z_i| / \Delta t$. Verify by reconstructing and overlaying: solve a linear system for the amplitudes via \`np.linalg.lstsq\` on the Vandermonde of the poles.`,
    derivation: String.raw`Each damped cosine is $\tfrac{A_i}{2}(e^{s_i t} + e^{\bar s_i t})$ with $s_i = -d_i + 2\pi i f_i$; sampled, $y_n = \sum_{j=1}^{6} c_j z_j^n$, $z_j = e^{s_j \Delta t}$. Such a sequence obeys a 6-term linear recurrence, so every length-7 window lies in a fixed 6-dimensional subspace — that is why $\mathrm{rank}(\text{Hankel}) = 6$ in the noiseless case, and why the SVD spectrum you printed has a cliff after six.

The shift structure does the rest: if $V$ spans the signal subspace, deleting the first vs. last row corresponds to advancing time by one sample, so $V_1 Z \approx V_2$ where $Z$'s eigenvalues are the poles — a generalized eigenproblem solved by $\mathrm{eig}(\mathrm{pinv}(V_1) V_2)$. The SVD truncation is what buys noise robustness over classical Prony (1795!), which inverts the recurrence directly and shatters at any realistic SNR.

Reading the answer: $|z|$ carries decay, $\angle z$ carries frequency:

$$\hat d_i = -\frac{\ln |z_i|}{\Delta t}, \qquad \hat f_i = \frac{\angle z_i}{2\pi \Delta t}$$

Tolerances are 4× the Monte-Carlo RMS error of this exact pipeline. Note $d_3$'s tolerance is the loosest: that mode dies fastest, so it offers the fewest effective samples — the uncertainty principle again, wearing overalls.`,
  },
  xLabel: 't (s)',
  yLabel: 'y',
  chart: { spectrumToggle: true },
};

export default meta;
