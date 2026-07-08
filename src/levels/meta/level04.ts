import type { LevelMeta } from '../../lib/types';

const meta: LevelMeta = {
  id: 4,
  slug: 'two-tones-in-the-noise',
  title: 'Two Tones in the Noise',
  tier: 'FOUNDATIONS',
  tagline: 'one of them you cannot see. find it anyway.',
  brief: String.raw`Sixteen seconds at 128 Hz. Two sinusoids, both drowned in **unit-variance** noise:

$$y(t) = A_1 \sin(2\pi f_1 t + \varphi_1) + A_2 \sin(2\pi f_2 t + \varphi_2) + \varepsilon,\qquad \varepsilon\sim\mathcal{N}(0,1)$$

The second tone has amplitude well below the noise level — invisible in the time domain by construction. Recover $f_1, A_1, f_2, A_2$.

The point of this case: the FFT doesn't just *organize* the data, it *concentrates* it. $N = 2048$ samples of coherent signal pile into one bin while the noise spreads across a thousand.`,
  recover: 'Recover f₁, A₁, f₂, A₂ (both tones are on-bin).',
  starterCode: String.raw`# GROUND TRUTH · CASE 04 — Two Tones in the Noise
t, y = data.t.to_numpy(), data.y.to_numpy()
N = len(y); dt = t[1] - t[0]
print(f"{N} samples at {1/dt:.0f} Hz")
print("time-domain std:", y.std().round(3), "— tone 2 is far below this")

# the spectrum toggle above shows you what to chase. reproduce it,
# quantify it, and mind the units of whatever you read off.
`,
  hints: {
    nudge: String.raw`Same transform as last time — but look at what the noise does in the spectrum vs. what a coherent tone does as $N$ grows.`,
    method: String.raw`Take the FFT, convert to amplitude with $2|X_k|/N$, and pick the two largest peaks (skip the DC bin). Both tones are on-bin, so peak reading is exact for $f$, and $\hat A = 2|X_k|/N$ is unbiased. Sanity-check by overlaying the reconstructed two-tone signal and running \`residuals\` — RMSE should drop to ≈ the noise σ = 1.`,
    derivation: String.raw`Coherent integration: a tone of amplitude $A$ contributes $|X_{k^\*}| = NA/2$ — it grows **linearly** in $N$. White noise contributes to every bin independently with $\mathbb{E}|X_k^{\text{noise}}|^2 = N\sigma^2$, i.e. magnitude $\propto \sqrt{N}$.

In amplitude units ($2|X_k|/N$), the noise floor scales as

$$\sigma_{\text{floor}} = \sigma\sqrt{\frac{2}{N}} = \sqrt{\tfrac{2}{2048}} \approx 0.031$$

so the $A_2 = 0.35$ tone stands $\approx 11$ standard deviations above the floor — trivially detectable in the spectrum, though invisible in the waveform: in the time domain its SNR is $A_2/\sigma = 0.35$, but the FFT gives a processing gain of $\sqrt{N/2} \approx 32\times$.

The maximum of $\sim 1000$ noise bins (Rayleigh-distributed) reaches only $\approx \sigma_{\text{floor}}\sqrt{2\ln 1000} \approx 0.12$, so false peaks stay well below $A_2$. This is how radar, GPS, and gravitational-wave detectors pull signals out of noise that dwarfs them: **watch longer, integrate coherently**.`,
  },
  xLabel: 't (s)',
  yLabel: 'y',
  chart: { spectrumToggle: true },
};

export default meta;
