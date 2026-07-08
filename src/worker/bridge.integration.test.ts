/**
 * Real-Pyodide integration test of bridge.py (runs under Node; needs network
 * on first run to fetch numpy/scipy/pandas). Excluded from `npm test`;
 * run with `npm run test:integration`.
 */
import { describe, expect, it, beforeAll } from 'vitest';
import bridgeSource from './bridge.py?raw';

interface Call {
  fn: string;
  args: unknown[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let py: any;
const calls: Call[] = [];
const toNums = (a: unknown): number[] => Array.from(a as ArrayLike<number>, Number);

beforeAll(async () => {
  // require() via Node to bypass vite's transform of the pyodide package
  const { createRequire } = await import('node:module');
  const { loadPyodide } = createRequire(import.meta.url)('pyodide');
  py = await loadPyodide();
  await py.loadPackage(['numpy', 'scipy', 'pandas']);
  py.registerJsModule('gt_host', {
    overlay: (t: unknown, y: unknown, label: string, style: string) =>
      calls.push({ fn: 'overlay', args: [toNums(t), toNums(y), label, style] }),
    residuals: (t: unknown, r: unknown, rmse: number) =>
      calls.push({ fn: 'residuals', args: [toNums(t), toNums(r), rmse] }),
    shade: (t: unknown, states: unknown, label: string) =>
      calls.push({ fn: 'shade', args: [toNums(t), toNums(states), label] }),
    clear_overlays: () => calls.push({ fn: 'clear', args: [] }),
  });
  await py.runPythonAsync(bridgeSource);
}, 240000);

describe('bridge.py', () => {
  it('builds the data DataFrame from columns JSON', async () => {
    py.globals.get('_gt_set_data')(JSON.stringify({ t: [0, 1, 2, 3], y: [1, 2, 3, 4] }));
    const n = await py.runPythonAsync('len(data)');
    expect(n).toBe(4);
    const mean = await py.runPythonAsync('float(data.y.mean())');
    expect(mean).toBeCloseTo(2.5);
  });

  it('overlay posts t/y/label/style to the host', async () => {
    calls.length = 0;
    await py.runPythonAsync('overlay(data.t, data.y * 2, label="x2", style="solid")');
    expect(calls).toHaveLength(1);
    expect(calls[0].fn).toBe('overlay');
    expect(calls[0].args[1]).toEqual([2, 4, 6, 8]);
    expect(calls[0].args[2]).toBe('x2');
  });

  it('overlay_fn evaluates a callable on the level grid', async () => {
    calls.length = 0;
    await py.runPythonAsync('overlay_fn(lambda t: t + 1, label="f")');
    expect(calls[0].args[0]).toEqual([0, 1, 2, 3]);
    expect(calls[0].args[1]).toEqual([1, 2, 3, 4]);
  });

  it('residuals posts observed - candidate and the correct RMSE', async () => {
    calls.length = 0;
    await py.runPythonAsync('residuals(np.zeros(len(data)))');
    const [, r, rmse] = calls[0].args as [number[], number[], number];
    expect(r).toEqual([1, 2, 3, 4]);
    expect(rmse).toBeCloseTo(Math.sqrt((1 + 4 + 9 + 16) / 4));
  });

  it('mismatched lengths raise a Python error (not a crash)', async () => {
    await expect(py.runPythonAsync('overlay([1,2,3], [1,2])')).rejects.toThrow(/lengths differ/);
    await expect(py.runPythonAsync('residuals([1.0])')).rejects.toThrow(/expected 4 values/);
  });

  it('a Python exception propagates with its traceback text', async () => {
    await expect(py.runPythonAsync('1/0')).rejects.toThrow(/ZeroDivisionError/);
  });

  it('_gt_call_predict evaluates predict(t) on a holdout grid', async () => {
    await py.runPythonAsync('def predict(t):\n    return 3*t');
    const out = JSON.parse(py.globals.get('_gt_call_predict')(JSON.stringify([1, 2, 10])));
    expect(out).toEqual([3, 6, 30]);
  });

  it('_gt_call_predict rejects non-finite output', async () => {
    await py.runPythonAsync('def predict(t):\n    return t / 0');
    expect(() => py.globals.get('_gt_call_predict')(JSON.stringify([1, 2]))).toThrow(
      /non-finite/,
    );
  });

  it('namespace reset clears user globals but keeps the bridge', async () => {
    await py.runPythonAsync('my_secret = 42');
    py.globals.get('_gt_reset_user_ns')();
    await expect(py.runPythonAsync('my_secret')).rejects.toThrow(/NameError/);
    const ok = await py.runPythonAsync('callable(overlay) and callable(residuals)');
    expect(ok).toBe(true);
  });

  it('level switching works: reset survives itself and repeats (regression)', async () => {
    // simulate the worker's ensureLevel sequence across three level switches
    for (const cols of [
      { t: [0, 1], y: [1, 2] },
      { t: [0, 1, 2], y: [3, 4, 5] },
      { t: [0], y: [9] },
    ]) {
      const reset = py.globals.get('_gt_reset_user_ns');
      expect(typeof reset).toBe('function'); // was undefined after first reset (bug)
      reset();
      py.globals.get('_gt_set_data')(JSON.stringify(cols));
      const n = await py.runPythonAsync('len(data)');
      expect(n).toBe(cols.t.length);
    }
    // the whole bridge API must survive repeated resets
    const ok = await py.runPythonAsync(
      'all(callable(f) for f in (overlay, overlay_fn, residuals, plot_xy, shade, ' +
        'clear_overlays, _gt_set_data, _gt_reset_user_ns, _gt_call_predict))',
    );
    expect(ok).toBe(true);
  });
});
