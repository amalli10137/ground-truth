import { describe, expect, it } from 'vitest';
import { gradeDistribution, gradeField, gradeParameter, pinballLoss, rmse } from './grading';

describe('gradeField', () => {
  it('accepts within target ± tol', () => {
    expect(gradeField({ name: 'a', label: 'a', target: 5, tol: 0.2 }, 5.19)).toBe(true);
    expect(gradeField({ name: 'a', label: 'a', target: 5, tol: 0.2 }, 5.21)).toBe(false);
    expect(gradeField({ name: 'a', label: 'a', target: 5, tol: 0.2 }, NaN)).toBe(false);
  });
  it('accepts inside range', () => {
    expect(gradeField({ name: 'a', label: 'a', range: [0.01, 0.1] }, 0.05)).toBe(true);
    expect(gradeField({ name: 'a', label: 'a', range: [0.01, 0.1] }, 0.2)).toBe(false);
  });
  it('rounds integer fields', () => {
    expect(gradeField({ name: 'k', label: 'k', target: 3, tol: 0.5, integer: true }, 3.2)).toBe(
      true,
    );
  });
});

describe('gradeParameter', () => {
  const fields = [
    { name: 'a', label: 'a', target: 1, tol: 0.1 },
    { name: 'b', label: 'b', target: 2, tol: 0.1 },
  ];
  it('passes only when all fields pass', () => {
    expect(gradeParameter(fields, { a: 1.05, b: 2.05 }).pass).toBe(true);
    const r = gradeParameter(fields, { a: 1.05, b: 2.5 });
    expect(r.pass).toBe(false);
    expect(r.results.find((x) => x.name === 'a')?.ok).toBe(true);
    expect(r.results.find((x) => x.name === 'b')?.ok).toBe(false);
  });
});

describe('rmse', () => {
  it('computes root mean squared error', () => {
    expect(rmse([0, 0], [3, 4])).toBeCloseTo(Math.sqrt(12.5));
  });
});

describe('pinball / distribution grading', () => {
  it('pinball loss is minimized at the true quantile', () => {
    // draws from uniform(0,1): tau-quantile is tau
    const draws = Array.from({ length: 10001 }, (_, i) => i / 10000);
    const atTrue = pinballLoss(0.9, 0.9, draws);
    const off = pinballLoss(0.5, 0.9, draws);
    expect(atTrue).toBeLessThan(off);
  });
  it('rejects non-monotone quantiles', () => {
    const grading = {
      mode: 'distribution' as const,
      taus: [0.05, 0.5, 0.95],
      draws: Array.from({ length: 1000 }, (_, i) => i / 1000),
      lossMax: 1e9,
      trueQuantiles: [0.05, 0.5, 0.95],
    };
    expect(gradeDistribution(grading, [0.9, 0.5, 0.95]).monotone).toBe(false);
    expect(gradeDistribution(grading, [0.9, 0.5, 0.95]).pass).toBe(false);
    expect(gradeDistribution(grading, [0.05, 0.5, 0.95]).pass).toBe(true);
  });
});
