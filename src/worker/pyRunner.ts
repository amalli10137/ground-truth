import type { FromWorker, ToWorker } from './protocol';

export type RunnerStatus = 'cold' | 'booting' | 'ready' | 'running';
export type RunnerListener = (e: FromWorker) => void;

/**
 * Main-thread handle on the Pyodide worker. Singleton: one Python runtime
 * shared across levels (the worker resets the user namespace on level switch).
 * stop() hard-terminates the worker (no SharedArrayBuffer interrupt without
 * cross-origin isolation) — the next run boots a fresh runtime.
 */
class PyRunner {
  private worker: Worker | null = null;
  private listeners = new Set<RunnerListener>();
  status: RunnerStatus = 'cold';

  subscribe(fn: RunnerListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(e: FromWorker) {
    for (const fn of this.listeners) fn(e);
  }

  private ensureWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(new URL('./pyodide.worker.ts', import.meta.url), {
        type: 'module',
      });
      this.status = 'booting';
      this.worker.onmessage = (ev: MessageEvent<FromWorker>) => {
        const msg = ev.data;
        if (msg.type === 'ready') this.status = 'running';
        if (msg.type === 'done' || msg.type === 'error' || msg.type === 'fnResult')
          this.status = 'ready';
        if (msg.type === 'fatal') this.status = 'cold';
        this.emit(msg);
      };
      this.worker.onerror = (ev) => {
        this.status = 'cold';
        this.emit({ type: 'fatal', message: ev.message || 'worker crashed' });
      };
    }
    return this.worker;
  }

  private send(msg: ToWorker) {
    this.ensureWorker().postMessage(msg);
  }

  /** Run player code; events stream to subscribers; resolves when done or errored. */
  run(code: string, levelId: number, columnsJson: string): Promise<void> {
    return new Promise((resolve) => {
      const off = this.subscribe((e) => {
        if (e.type === 'done' || e.type === 'error' || e.type === 'fatal') {
          off();
          resolve();
        }
      });
      this.send({ type: 'run', code, levelId, columnsJson });
    });
  }

  /** Run player code then evaluate their predict(t) on the holdout grid. */
  gradeFn(
    code: string,
    levelId: number,
    columnsJson: string,
    holdoutT: number[],
  ): Promise<number[] | null> {
    return new Promise((resolve) => {
      const off = this.subscribe((e) => {
        if (e.type === 'fnResult') {
          off();
          resolve(e.yHat);
        } else if (e.type === 'error' || e.type === 'fatal') {
          off();
          resolve(null);
        }
      });
      this.send({ type: 'gradeFn', code, levelId, columnsJson, holdoutT });
    });
  }

  /** Hard stop: kill the runtime. Next run boots fresh. */
  stop() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.status = 'cold';
    this.emit({ type: 'stdout', text: '[stopped — Python runtime reset]\n', isErr: true });
    this.emit({ type: 'done' });
  }
}

export const pyRunner = new PyRunner();
