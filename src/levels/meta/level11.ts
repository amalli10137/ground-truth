import type { LevelMeta } from '../../lib/types';

const meta: LevelMeta = {
  id: 11,
  slug: 'the-blur',
  title: 'The Blur',
  tier: 'WICKED',
  tagline: 'the instrument smeared the truth before you ever saw it',
  brief: String.raw`A detector scanned a strip containing a handful of point sources, but its optics blur everything with a Gaussian kernel of unknown width:

$$y(t) = (x * k_{\sigma_w})(t) + \varepsilon, \qquad x(t) = \sum_i a_i\,\delta(t - p_i)$$

You can count some bumps directly. But intelligence says one of those bumps is **two sources**, unresolved. Recover: the kernel width $\sigma_w$, the total number of point sources, and the separation $\Delta$ of the hidden pair.

Deconvolution is the textbook ill-posed inverse problem. Divide the spectra and you divide by numbers arbitrarily close to zero — the noise at high frequency gets amplified by factors of $10^6$. **Try the naive division first and overlay it.** Seeing the explosion is the point of this case. Then regularize.`,
  recover: 'Recover σ_w, the number of sources, and the pair separation Δ.',
  submitNote: 'The number of sources is an integer. Δ is the gap between the two sources hiding in a single bump.',
  starterCode: String.raw`# GROUND TRUTH · CASE 11 — The Blur
t, y = data.t.to_numpy(), data.y.to_numpy()
N = len(y); dt = t[1] - t[0]

# the brief dares you to try naive deconvolution. take the dare:
sigma_w = 3.0   # <- a guess; earning the real value is part of the case
tk = (np.arange(N) - N//2) * dt
k = np.exp(-tk**2 / (2*sigma_w**2)); k /= k.sum()
K = np.fft.rfft(np.roll(k, -N//2))
x_naive = np.fft.irfft(np.fft.rfft(y) / (K + 1e-15), N)
overlay(t, x_naive, label="naive division (behold)", style="solid")
print("naive result std:", np.std(x_naive))
# that std should terrify you. proceed accordingly.
`,
  hints: {
    nudge: String.raw`Two separate sub-problems. (1) An isolated point source, blurred, *is a picture of the kernel* — fit it. (2) Division in frequency must be damped where $|K(f)|$ is small: replace $\tfrac{Y}{K}$ with $\tfrac{Y \bar K}{|K|^2 + \lambda}$.`,
    method: String.raw`Fit $a\,e^{-(t-m)^2/2s^2}$ to the isolated bump near $t \approx 20$ with \`curve_fit\` → $\hat\sigma_w$. Then Wiener-deconvolve: \`X = Y * np.conj(K) / (np.abs(K)**2 + lam)\` with $\lambda \sim 10^{-4}$, invert, and look at the region of the suspicious bump around $t \approx 50\!-\!55$: two spikes. \`scipy.signal.find_peaks\` gives their positions; the gap is $\Delta$. Vary $\lambda$ over decades and watch the trade-off: too small → noise; too big → still blurred.`,
    derivation: String.raw`In frequency, convolution is multiplication: $Y = K X + E$, so $\hat X_{\text{naive}} = Y/K = X + E/K$. A Gaussian kernel's transform is Gaussian: $K(f) = e^{-2\pi^2 \sigma_w^2 f^2}$, which reaches $10^{-8}$ by $f \approx 0.31$ cycles/unit — beyond that, $E/K$ multiplies the noise by $10^{8}$. Hence the fireworks you overlaid.

The Wiener filter is the least-squares answer to "invert what you can, suppress what you can't":

$$\hat X = \frac{\bar K}{|K|^2 + \lambda}\, Y$$

which equals $\tfrac{1}{K}$ where $|K|^2 \gg \lambda$ and rolls smoothly to zero where $|K|^2 \ll \lambda$. It is exactly the minimizer of the Tikhonov functional $\|K\hat x - y\|^2 + \lambda\|\hat x\|^2$ — regularization = admitting you cannot know everything, in exchange for knowing something.

Resolution: two sources at separation $\Delta = 5$ blurred by $\sigma_w = 2.2$ merge into one bump ($\Delta < 2\sigma_w\cdot\!\sqrt{\ln\ldots}$ — no dip survives). Deconvolution sharpens each source to an effective width set by the noise-imposed cutoff $f_c \approx \sqrt{\ln(1/\lambda)}/(2\pi\sigma_w)/\sqrt{2}$; at $\lambda = 10^{-4}$ that's enough to split $\Delta = 5$ cleanly. Tolerances: Monte Carlo over noise redraws of this exact pipeline.`,
  },
  xLabel: 'position',
  yLabel: 'intensity',
};

export default meta;
