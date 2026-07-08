/** Shared schema between the datagen output (public/levels/NN.json) and the app. */

export type Tier = 'FOUNDATIONS' | 'WICKED' | 'STOCHASTIC HORRORS' | 'QUANT GAUNTLET';

export interface GradeField {
  name: string;
  label: string;
  unit?: string;
  /** target ± tol acceptance (tol computed as ~4×SE by datagen) */
  target?: number;
  tol?: number;
  /** alternative acceptance: any value inside [lo, hi] */
  range?: [number, number];
  integer?: boolean;
  help?: string;
}

export type Grading =
  | { mode: 'parameter'; fields: GradeField[] }
  | {
      mode: 'function';
      /** hidden holdout grid; overfitting the shown window fails here */
      holdout: { t: number[]; yTrue: number[] };
      rmseMax: number;
    }
  | {
      mode: 'distribution';
      taus: number[]; // e.g. [0.05, 0.5, 0.95]
      draws: number[]; // hidden MC draws of the target quantity
      lossMax: number; // pass threshold on mean pinball loss
      trueQuantiles: number[]; // revealed after solve
    };

export interface LevelPack {
  id: number;
  seed: number;
  kind: 'series' | 'scatter' | 'events' | 'panel';
  /** column name -> values; always has 't'; 'y' for single-series levels */
  columns: Record<string, number[]>;
  stats: { n: number; mean: number; std: number; min: number; max: number };
  /** precomputed log-magnitude FFT of observed y (signal-processing levels) */
  spectrum?: { f: number[]; logmag: number[] };
  truth: {
    params: Record<string, number>;
    equationLatex: string;
    /** noiseless generator curve / expected path, drawn in red on solve */
    curve?: { t: number[]; y: number[] };
    /** hidden discrete state path (HMM regimes etc.), revealed on solve */
    states?: number[];
  };
  grading: Grading;
}

export interface LevelHints {
  nudge: string;
  method: string;
  derivation: string;
}

export interface LevelMeta {
  id: number;
  slug: string;
  title: string;
  tier: Tier;
  /** one-line flavor shown in the rail tooltip / level header */
  tagline: string;
  /** the mission brief; supports $inline$ and $$display$$ KaTeX, **bold**, `code` */
  brief: string;
  /** short "what to recover" statement shown next to the submit panel */
  recover: string;
  starterCode: string;
  hints: LevelHints;
  xLabel?: string;
  yLabel?: string;
  chart?: {
    scatter?: boolean;
    events?: boolean;
    panel?: boolean;
    spectrumToggle?: boolean;
  };
  submitNote?: string;
}

export interface SolveRecord {
  at: number;
  attempts: number;
  hintsUsed: number;
}

export interface Progress {
  solved: Record<number, SolveRecord>;
}

export const TIERS: Tier[] = ['FOUNDATIONS', 'WICKED', 'STOCHASTIC HORRORS', 'QUANT GAUNTLET'];

export const packUrl = (id: number) =>
  `${import.meta.env.BASE_URL}levels/${String(id).padStart(2, '0')}.json`;
