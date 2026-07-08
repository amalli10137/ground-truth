import type { GradeField, Grading } from './types';

export interface FieldResult {
  name: string;
  label: string;
  ok: boolean;
}

export function gradeField(field: GradeField, value: number): boolean {
  if (!Number.isFinite(value)) return false;
  const v = field.integer ? Math.round(value) : value;
  if (field.range) return v >= field.range[0] && v <= field.range[1];
  if (field.target != null && field.tol != null) return Math.abs(v - field.target) <= field.tol;
  return false;
}

export function gradeParameter(
  fields: GradeField[],
  answers: Record<string, number>,
): { pass: boolean; results: FieldResult[] } {
  const results = fields.map((f) => ({
    name: f.name,
    label: f.label,
    ok: gradeField(f, answers[f.name]),
  }));
  return { pass: results.every((r) => r.ok), results };
}

export function rmse(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    s += d * d;
  }
  return Math.sqrt(s / a.length);
}

/** mean pinball loss of quantile q at level tau over draws */
export function pinballLoss(q: number, tau: number, draws: number[]): number {
  let s = 0;
  for (const x of draws) s += x >= q ? tau * (x - q) : (1 - tau) * (q - x);
  return s / draws.length;
}

export function gradeDistribution(
  grading: Extract<Grading, { mode: 'distribution' }>,
  qs: number[],
): { pass: boolean; loss: number; monotone: boolean } {
  const monotone = qs.every((q, i) => i === 0 || q >= qs[i - 1]);
  let loss = 0;
  for (let i = 0; i < grading.taus.length; i++)
    loss += pinballLoss(qs[i], grading.taus[i], grading.draws);
  loss /= grading.taus.length;
  return { pass: monotone && loss <= grading.lossMax, loss, monotone };
}
