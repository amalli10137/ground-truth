import type { LevelMeta } from '../../lib/types';

const meta: LevelMeta = {
  id: 8,
  slug: 'the-leak',
  title: 'The Leak',
  tier: 'WICKED',
  tagline: 'level 3 was a lie of kindness',
  brief: String.raw`One tone, sixteen seconds, decent SNR. You've done this before — case 3. So read the FFT peak and submit.

It will fail. This tone's frequency does **not** sit on an FFT bin. The energy *leaks* across the whole spectrum, the peak bin is biased by up to half a bin width, and the naive amplitude $2|X_k|/N$ reads low. The grader's tolerance is far tighter than half a bin, because a better estimator exists and you are going to find it.

$$y(t) = A\,\sin(2\pi f t + \varphi) + \varepsilon,\qquad f \notin \left\{\tfrac{k}{N\Delta t}\right\}$$`,
  recover: 'Recover f (Hz) and A — to better than bin resolution.',
  starterCode: String.raw`# GROUND TRUTH · CASE 08 — The Leak
t, y = data.t.to_numpy(), data.y.to_numpy()
N = len(y); dt = t[1] - t[0]

# exhibit A: the naive read (this is what the grader will reject)
X = np.fft.rfft(y)
k = np.argmax(np.abs(X[1:])) + 1
print("naive peak:", k/(N*dt), "Hz,  naive A:", 2*np.abs(X[k])/N)

# submit those numbers if you like. the grader will enjoy it.
`,
  hints: {
    nudge: String.raw`The peak is between bins. Two ideas compose: (1) taper the data with a window so the leakage decays fast, (2) the log-magnitude of three bins around the peak is locally a parabola — its vertex is the true frequency.`,
    method: String.raw`Multiply by a Hann window \`w = np.hanning(N)\`, FFT, find peak bin $k$. Quadratic interpolation on log-magnitudes $\alpha = \ln|X_{k-1}|, \beta = \ln|X_k|, \gamma = \ln|X_{k+1}|$:

$$\delta = \frac{1}{2}\,\frac{\alpha - \gamma}{\alpha - 2\beta + \gamma}, \qquad \hat{f} = \frac{k + \delta}{N \Delta t}$$

Amplitude needs two corrections: the Hann coherent gain $\overline{w} = 0.5$, and the main-lobe rolloff at offset $\delta$: $\hat A = \dfrac{2|X_k|}{N\,\overline{w}\, L(\delta)}$ with $L(\delta) = \mathrm{sinc}(\delta)/(1-\delta^2)$.`,
    derivation: String.raw`A finite record is the true signal times a rectangular window; the spectrum is the tone convolved with the window transform $W(f)$. For the rectangle, $|W|$ decays like $1/f$ with -13 dB sidelobes — energy smears everywhere, and if the tone lies at bin offset $\delta \in (-\tfrac12,\tfrac12)$ the peak bin reads $|W(\delta)| = |\mathrm{sinc}(\delta)|$ of the true amplitude: up to 36% low at $\delta = \tfrac12$ (the "picket fence" effect).

The Hann window $w_n = \tfrac12(1 - \cos\tfrac{2\pi n}{N})$ trades main-lobe width (2 bins instead of 1) for sidelobes at -31 dB falling as $1/f^3$, and — crucially — its main lobe is smooth and nearly Gaussian near the top, so $\ln|X|$ is locally parabolic and three-point quadratic interpolation of the vertex recovers $\delta$ with error $\ll 10^{-2}$ bins at this SNR.

Alternatives that also pass: zero-padding by 8–16× (dense frequency grid), the Chirp-Z transform zoomed on the peak, or a full nonlinear least-squares fit of $(A, f, \varphi)$ seeded by the interpolated estimate — the NLS fit achieves the Cramér–Rao bound $\mathrm{var}(\hat f) \geq \frac{12\,\sigma^2}{(2\pi)^2 A^2 N (N^2-1)\Delta t^2}$, and the tolerance here is 4× the *Monte-Carlo* RMS error of the windowed-interpolation method, which is within a small factor of that bound.`,
  },
  xLabel: 't (s)',
  yLabel: 'y',
  chart: { spectrumToggle: true },
};

export default meta;
