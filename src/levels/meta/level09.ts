import type { LevelMeta } from '../../lib/types';

const meta: LevelMeta = {
  id: 9,
  slug: 'the-glissando',
  title: 'The Glissando',
  tier: 'WICKED',
  tagline: 'the frequency is moving while you measure it',
  brief: String.raw`Eight seconds of a rising sweep:

$$y(t) = A\,\sin\!\big(2\pi(f_0 t + \tfrac{k}{2} t^2)\big) + \varepsilon$$

The instantaneous frequency is $f(t) = f_0 + k\,t$ — it climbs the whole recording. Take one big FFT and you'll see the energy smeared into a broad plateau (try the spectrum toggle; it's a lesson in itself). Recover the start frequency $f_0$ and the chirp rate $k$.

A signal whose frequency you can watch move needs a representation with a *time axis*. Or — slicker — a way to read the **phase** of the signal directly as a function of time.`,
  recover: 'Recover f₀ (Hz) and chirp rate k (Hz/s).',
  starterCode: String.raw`# GROUND TRUTH · CASE 09 — The Glissando
t, y = data.t.to_numpy(), data.y.to_numpy()
fs = 1 / (t[1] - t[0])
print(f"{len(y)} samples at {fs:.0f} Hz over {t[-1]:.1f} s")

# one big FFT smears a moving frequency — see the spectrum toggle.
# the model has just two parameters. earn them.
`,
  hints: {
    nudge: String.raw`Either watch frequency evolve (STFT ridge, then fit a line), or extract the instantaneous phase with the analytic signal — for this model the phase is exactly a quadratic in $t$.`,
    method: String.raw`\`z = scipy.signal.hilbert(y)\` gives the analytic signal; \`phase = np.unwrap(np.angle(z))\` is $2\pi(f_0 t + \tfrac{k}{2}t^2) + c$ plus noise. **Fit a quadratic to the phase** (\`np.polyfit(t, phase, 2)\`) rather than differentiating it — differentiation amplifies noise. Then $\hat k = 2c_2/(2\pi) = c_2/\pi$ and $\hat f_0 = c_1/(2\pi)$. Trim ~8% off each end first: the Hilbert transform is unreliable at the edges.`,
    derivation: String.raw`The analytic signal $z(t) = y(t) + i\,\mathcal{H}[y](t)$ of a narrowband signal $A\sin\theta(t)$ is $\approx A e^{i(\theta(t) - \pi/2)}$, so $\angle z$ unwraps to the full running phase

$$\theta(t) = 2\pi f_0\,t + \pi k\,t^2 + \text{const}$$

Fitting $\theta \approx c_2 t^2 + c_1 t + c_0$ by least squares gives $\hat f_0 = c_1/2\pi$, $\hat k = c_2/\pi$. Phase noise per sample is $\approx \sigma/A$ radians (small-angle), so this is a *linear* regression problem in disguise, and the SEs follow the polynomial-regression formulas — precision improves like $N^{3/2}$ for $f_0$ and $N^{5/2}$ for the curvature… enormous integration gain.

Why one FFT fails: the chirp occupies bandwidth $kT = 52$ Hz, so its spectral energy spreads across $\sim 830$ bins — peak height drops by that factor relative to a pure tone. The STFT trades time and frequency resolution ($\Delta f \approx f_s/n_{\mathrm{seg}}$ vs $\Delta t \approx n_{\mathrm{seg}}/f_s$); the ridge-then-fit route also passes the grader, since fitting a line through many noisy ridge points averages the per-frame error down. Both answers teach the same maxim: **match the representation to the physics.**

Edge trimming: $\mathcal{H}$ is a global convolution with $1/\pi t$; a finite record makes its ends wrap-contaminated. The tolerance was calibrated by Monte Carlo on the trimmed-quadratic-fit estimator.`,
  },
  xLabel: 't (s)',
  yLabel: 'y',
  chart: { spectrumToggle: true },
};

export default meta;
