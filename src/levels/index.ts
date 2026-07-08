import type { LevelMeta, Tier } from '../lib/types';

/** Static index for the rail: every level is visible (locked ones show their name). */
export interface LevelIndexEntry {
  id: number;
  title: string;
  tier: Tier;
}

export const LEVEL_INDEX: LevelIndexEntry[] = [
  { id: 1, title: 'The Flatline', tier: 'FOUNDATIONS' },
  { id: 2, title: 'The Trend', tier: 'FOUNDATIONS' },
  { id: 3, title: 'One Pure Tone', tier: 'FOUNDATIONS' },
  { id: 4, title: 'Two Tones in the Noise', tier: 'FOUNDATIONS' },
  { id: 5, title: "The Drunkard's Drift", tier: 'FOUNDATIONS' },
  { id: 6, title: 'The Fading Memory', tier: 'FOUNDATIONS' },
  { id: 7, title: 'Geometric Motion', tier: 'FOUNDATIONS' },
  { id: 8, title: 'The Leak', tier: 'WICKED' },
  { id: 9, title: 'The Glissando', tier: 'WICKED' },
  { id: 10, title: 'The Dying Chords', tier: 'WICKED' },
  { id: 11, title: 'The Blur', tier: 'WICKED' },
  { id: 12, title: 'Thirteen Samples', tier: 'WICKED' },
  { id: 13, title: 'The Impostor', tier: 'STOCHASTIC HORRORS' },
  { id: 14, title: 'Fat Tails', tier: 'STOCHASTIC HORRORS' },
  { id: 15, title: 'The Jumps', tier: 'STOCHASTIC HORRORS' },
  { id: 16, title: 'Long Memory', tier: 'STOCHASTIC HORRORS' },
  { id: 17, title: 'The Two Faces', tier: 'STOCHASTIC HORRORS' },
  { id: 18, title: 'The Kalman Level', tier: 'STOCHASTIC HORRORS' },
  { id: 19, title: 'Self-Excitement', tier: 'STOCHASTIC HORRORS' },
  { id: 20, title: 'The Pair', tier: 'QUANT GAUNTLET' },
  { id: 21, title: 'The Correlation Mirage', tier: 'QUANT GAUNTLET' },
  { id: 22, title: 'The Strategy Factory', tier: 'QUANT GAUNTLET' },
  { id: 23, title: 'The Market', tier: 'QUANT GAUNTLET' },
];

const metaModules = import.meta.glob<{ default: LevelMeta }>('./meta/level*.ts', {
  eager: true,
});

export const LEVEL_METAS: Record<number, LevelMeta> = {};
for (const mod of Object.values(metaModules)) {
  LEVEL_METAS[mod.default.id] = mod.default;
}
