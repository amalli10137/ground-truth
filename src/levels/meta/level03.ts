import type { LevelMeta } from '../../lib/types';

const meta: LevelMeta = {
  id: 3,
  slug: 'one-pure-tone',
  title: 'One Pure Tone',
  tier: 'FOUNDATIONS',
  tagline: 'the frequency domain opens',
  brief: String.raw`An acoustic pickup recorded 8 seconds at 64 Hz — 512 samples of a single pure tone in noise:

$$y(t) = A\,\sin(2\pi f t + \varphi) + \varepsilon, \qquad \varepsilon \sim \mathcal{N}(0, \sigma^2)$$

Recover the frequency $f$ and amplitude $A$.

You could fit sinusoids by trial and error. Don't. There is a transform that asks the data, all at once, "how much of every frequency do you contain?" — and for this level the answer lands exactly on one of its bins. Toggle **View spectrum** on the chart, or compute it yourself with \`np.fft.rfft\`.`,
  recover: 'Recover frequency f (Hz) and amplitude A.',
  starterCode: String.raw`# GROUND TRUTH · CASE 03 — One Pure Tone
t, y = data.t.to_numpy(), data.y.to_numpy()
N = len(y)
dt = t[1] - t[0]
print(f"{N} samples at {1/dt:.0f} Hz over {N*dt:.1f} s")

# eyeball the waveform, pick a representation, interrogate it.
# overlay a candidate tone when you have one:
# overlay_fn(lambda t: A*np.sin(2*np.pi*f*t + phi), label="candidate")
`,
  hints: {
    nudge: String.raw`Project the data onto sinusoids of every frequency at once: the discrete Fourier transform. The peak of $|X_k|$ names the frequency.`,
    method: String.raw`Compute \`X = np.fft.rfft(y)\` and \`freqs = np.fft.rfftfreq(N, dt)\`. The peak bin $k^\*$ gives $\hat{f} = f_{k^\*}$, and because this tone sits exactly on a bin, the amplitude is $\hat{A} = 2|X_{k^\*}|/N$. Phase, if you want the overlay to lock on: $\hat\varphi = \mathrm{angle}(X_{k^\*}) + \pi/2$ for a sine convention.`,
    derivation: String.raw`For $y_n = A\sin(2\pi f n\,\Delta t + \varphi)$ with $f$ exactly $k^\*/(N\Delta t)$, the DFT concentrates the tone into a single coefficient:

$$X_{k^\*} = \sum_{n=0}^{N-1} y_n e^{-2\pi i k^\* n/N} = \frac{N A}{2} e^{i(\varphi - \pi/2)}$$

so $|X_{k^\*}| = NA/2$, giving the estimator $\hat{A} = 2|X_{k^\*}|/N$ — this is why the factor of $2/N$ appears.

Noise: each DFT bin receives independent complex Gaussian noise with std $\sigma\sqrt{N/2}$ per real component, so

$$\mathrm{SE}(\hat{A}) \approx \sigma\sqrt{\frac{2}{N}} = 0.5\sqrt{\tfrac{2}{512}} \approx 0.031$$

while the tone's bin grows like $N$. That ratio — signal $\propto N$, noise $\propto \sqrt{N}$ — is **coherent integration gain**, and it is the engine behind the next level.

Frequency tolerance is half a bin, $\tfrac{1}{2}\cdot\tfrac{1}{N\Delta t} = 0.0625$ Hz: on-bin peak reading is exact. (Enjoy this; level 8 will revoke the courtesy.)`,
  },
  xLabel: 't (s)',
  yLabel: 'y',
  chart: { spectrumToggle: true },
};

export default meta;
