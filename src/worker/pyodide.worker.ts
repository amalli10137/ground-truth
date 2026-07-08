/// <reference lib="webworker" />
import bridgeSource from './bridge.py?raw';
import type { FromWorker, ToWorker } from './protocol';

const PYODIDE_VERSION = '0.26.4';
const CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

const post = (msg: FromWorker) => (self as unknown as Worker).postMessage(msg);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pyodide: any = null;
let bootPromise: Promise<void> | null = null;
let currentLevelId: number | null = null;

const toNums = (a: unknown): number[] => Array.from(a as ArrayLike<number>, Number);

async function boot(): Promise<void> {
  if (!bootPromise) {
    bootPromise = (async () => {
      post({ type: 'boot', stage: 'loading Pyodide runtime' });
      const mod = await import(/* @vite-ignore */ `${CDN}pyodide.mjs`);
      pyodide = await mod.loadPyodide({ indexURL: CDN });
      post({ type: 'boot', stage: 'loading numpy · scipy · pandas (first run only, ~40 MB)' });
      await pyodide.loadPackage(['numpy', 'scipy', 'pandas']);
      pyodide.setStdout({ batched: (s: string) => post({ type: 'stdout', text: s + '\n' }) });
      pyodide.setStderr({
        batched: (s: string) => post({ type: 'stdout', text: s + '\n', isErr: true }),
      });
      pyodide.registerJsModule('gt_host', {
        overlay: (t: unknown, y: unknown, label: string, style: string) =>
          post({ type: 'overlay', t: toNums(t), y: toNums(y), label, style }),
        residuals: (t: unknown, r: unknown, rmse: number) =>
          post({ type: 'residuals', t: toNums(t), r: toNums(r), rmse }),
        shade: (t: unknown, states: unknown, label: string) =>
          post({ type: 'shade', t: toNums(t), states: toNums(states), label }),
        plot_xy: (x: unknown, y: unknown, label: string, mode: string) =>
          post({
            type: 'plotxy',
            x: toNums(x),
            y: toNums(y),
            label,
            mode: mode === 'line' ? 'line' : 'scatter',
          }),
        clear_overlays: () => post({ type: 'clearOverlays' }),
      });
      post({ type: 'boot', stage: 'preparing lab bench' });
      await pyodide.runPythonAsync(bridgeSource);
    })();
  }
  return bootPromise;
}

function pyErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  // Trim pyodide's internal frames; keep from the player-visible traceback down.
  const lines = raw.split('\n');
  const start = lines.findIndex(
    (l) => l.includes('File "<exec>"') || l.includes('File "<string>"'),
  );
  const kept = start > 0 ? ['Traceback (most recent call last):', ...lines.slice(start)] : lines;
  return kept.join('\n').trimEnd();
}

async function ensureLevel(levelId: number, columnsJson: string) {
  if (currentLevelId === levelId) return;
  pyodide.globals.get('_gt_reset_user_ns')();
  const setData = pyodide.globals.get('_gt_set_data');
  setData(columnsJson);
  currentLevelId = levelId;
}

async function handleRun(msg: Extract<ToWorker, { type: 'run' }>) {
  await boot();
  post({ type: 'ready' });
  try {
    await ensureLevel(msg.levelId, msg.columnsJson);
    await pyodide.runPythonAsync(msg.code);
    post({ type: 'done' });
  } catch (err) {
    post({ type: 'error', traceback: pyErrorMessage(err) });
  }
}

async function handleGradeFn(msg: Extract<ToWorker, { type: 'gradeFn' }>) {
  await boot();
  post({ type: 'ready' });
  try {
    await ensureLevel(msg.levelId, msg.columnsJson);
    await pyodide.runPythonAsync(msg.code);
    const call = pyodide.globals.get('_gt_call_predict');
    const resultJson: string = call(JSON.stringify(msg.holdoutT));
    post({ type: 'fnResult', yHat: JSON.parse(resultJson) });
  } catch (err) {
    post({ type: 'error', traceback: pyErrorMessage(err) });
  }
}

self.onmessage = async (e: MessageEvent<ToWorker>) => {
  const msg = e.data;
  try {
    switch (msg.type) {
      case 'init':
        await boot();
        post({ type: 'ready' });
        break;
      case 'run':
        await handleRun(msg);
        break;
      case 'gradeFn':
        await handleGradeFn(msg);
        break;
    }
  } catch (err) {
    post({ type: 'fatal', message: String(err) });
  }
};
