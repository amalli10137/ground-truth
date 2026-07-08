import type { Progress, SolveRecord } from './types';

const KEY_PROGRESS = 'gt:progress';
const keyCode = (id: number) => `gt:code:${id}`;
const keyHints = (id: number) => `gt:hints:${id}`;
const keyAttempts = (id: number) => `gt:attempts:${id}`;
const KEY_CURRENT = 'gt:current';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full / private mode — game still playable, just not persisted */
  }
}

export const loadProgress = (): Progress => read<Progress>(KEY_PROGRESS, { solved: {} });

export function recordSolve(id: number, rec: SolveRecord) {
  const p = loadProgress();
  if (!p.solved[id]) p.solved[id] = rec;
  write(KEY_PROGRESS, p);
  return p;
}

export const loadCode = (id: number): string | null => read<string | null>(keyCode(id), null);
export const saveCode = (id: number, code: string) => write(keyCode(id), code);

/** hint tiers revealed, as booleans [nudge, method, derivation] */
export const loadHintsRevealed = (id: number): boolean[] =>
  read<boolean[]>(keyHints(id), [false, false, false]);
export const saveHintsRevealed = (id: number, revealed: boolean[]) =>
  write(keyHints(id), revealed);

export const loadAttempts = (id: number): number => read<number>(keyAttempts(id), 0);
export const saveAttempts = (id: number, n: number) => write(keyAttempts(id), n);

export const loadCurrentLevel = (): number => read<number>(KEY_CURRENT, 1);
export const saveCurrentLevel = (id: number) => write(KEY_CURRENT, id);
