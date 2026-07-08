/** Messages between the main thread and the Pyodide worker. */

export type ToWorker =
  | { type: 'init' }
  | { type: 'run'; code: string; levelId: number; columnsJson: string }
  | {
      type: 'gradeFn';
      code: string;
      levelId: number;
      columnsJson: string;
      holdoutT: number[];
    };

export interface OverlayData {
  t: number[];
  y: number[];
  label: string;
  style: string;
}

export interface PlotXYData {
  x: number[];
  y: number[];
  label: string;
  mode: 'scatter' | 'line';
}

export interface ShadeData {
  t: number[];
  states: number[];
  label: string;
}

export type FromWorker =
  | { type: 'boot'; stage: string }
  | { type: 'ready' }
  | { type: 'stdout'; text: string; isErr?: boolean }
  | ({ type: 'overlay' } & OverlayData)
  | ({ type: 'shade' } & ShadeData)
  | ({ type: 'plotxy' } & PlotXYData)
  | { type: 'residuals'; t: number[]; r: number[]; rmse: number }
  | { type: 'clearOverlays' }
  | { type: 'error'; traceback: string }
  | { type: 'done' }
  | { type: 'fnResult'; yHat: number[] }
  | { type: 'fatal'; message: string };
