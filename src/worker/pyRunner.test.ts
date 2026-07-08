import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FromWorker, ToWorker } from './protocol';

/** Stub Worker: scripted responses per incoming message type. */
class StubWorker {
  static instances: StubWorker[] = [];
  static script: (msg: ToWorker, reply: (m: FromWorker) => void) => void = () => {};
  onmessage: ((ev: MessageEvent<FromWorker>) => void) | null = null;
  onerror: ((ev: ErrorEvent) => void) | null = null;
  terminated = false;

  constructor() {
    StubWorker.instances.push(this);
  }

  postMessage(msg: ToWorker) {
    queueMicrotask(() => {
      if (this.terminated) return;
      StubWorker.script(msg, (m) => this.onmessage?.({ data: m } as MessageEvent<FromWorker>));
    });
  }

  terminate() {
    this.terminated = true;
  }
}

beforeEach(() => {
  StubWorker.instances = [];
  vi.stubGlobal('Worker', StubWorker);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

async function freshRunner() {
  vi.resetModules();
  const mod = await import('./pyRunner');
  return mod.pyRunner;
}

describe('pyRunner protocol', () => {
  it('streams events and resolves run() on done', async () => {
    const runner = await freshRunner();
    StubWorker.script = (msg, reply) => {
      if (msg.type === 'run') {
        reply({ type: 'ready' });
        reply({ type: 'stdout', text: 'hello\n' });
        reply({ type: 'overlay', t: [0, 1], y: [1, 2], label: 'c', style: 'dash' });
        reply({ type: 'done' });
      }
    };
    const events: FromWorker[] = [];
    const off = runner.subscribe((e) => events.push(e));
    await runner.run('print("hello")', 1, '{}');
    off();
    expect(events.map((e) => e.type)).toEqual(['ready', 'stdout', 'overlay', 'done']);
  });

  it('a Python exception surfaces as an error event and still resolves', async () => {
    const runner = await freshRunner();
    StubWorker.script = (msg, reply) => {
      if (msg.type === 'run') {
        reply({ type: 'ready' });
        reply({ type: 'error', traceback: 'ZeroDivisionError: division by zero' });
      }
    };
    const events: FromWorker[] = [];
    const off = runner.subscribe((e) => events.push(e));
    await runner.run('1/0', 1, '{}');
    off();
    expect(events.some((e) => e.type === 'error')).toBe(true);
  });

  it('gradeFn resolves with yHat on fnResult and null on error', async () => {
    const runner = await freshRunner();
    StubWorker.script = (msg, reply) => {
      if (msg.type === 'gradeFn') {
        reply({ type: 'ready' });
        reply({ type: 'fnResult', yHat: [1, 2, 3] });
      }
    };
    expect(await runner.gradeFn('def predict(t): ...', 1, '{}', [0, 1, 2])).toEqual([1, 2, 3]);

    StubWorker.script = (msg, reply) => {
      if (msg.type === 'gradeFn') reply({ type: 'error', traceback: 'NameError' });
    };
    expect(await runner.gradeFn('oops', 1, '{}', [0])).toBeNull();
  });

  it('stop() terminates the worker and a new run boots a fresh one', async () => {
    const runner = await freshRunner();
    StubWorker.script = (msg, reply) => {
      if (msg.type === 'run') reply({ type: 'done' });
    };
    await runner.run('x=1', 1, '{}');
    expect(StubWorker.instances.length).toBe(1);
    runner.stop();
    expect(StubWorker.instances[0].terminated).toBe(true);
    await runner.run('x=1', 1, '{}');
    expect(StubWorker.instances.length).toBe(2);
  });
});
