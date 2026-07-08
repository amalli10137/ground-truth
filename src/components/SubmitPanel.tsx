import { useState } from 'react';
import { gradeDistribution, gradeParameter, rmse, type FieldResult } from '../lib/grading';
import type { Grading } from '../lib/types';

interface SubmitPanelProps {
  grading: Grading;
  solved: boolean;
  recover: string;
  submitNote?: string;
  /** run the player's predict(t) on the holdout grid (function mode) */
  runPredict?: (holdoutT: number[]) => Promise<number[] | null>;
  /** called on every graded attempt */
  onAttempt: (pass: boolean) => void;
}

type Verdict =
  | { kind: 'none' }
  | { kind: 'parameter'; pass: boolean; results: FieldResult[] }
  | { kind: 'function'; pass: boolean; rmse: number; max: number }
  | { kind: 'function-error' }
  | { kind: 'distribution'; pass: boolean; loss: number; max: number; monotone: boolean };

export function SubmitPanel({
  grading,
  solved,
  recover,
  submitNote,
  runPredict,
  onAttempt,
}: SubmitPanelProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [verdict, setVerdict] = useState<Verdict>({ kind: 'none' });
  const [busy, setBusy] = useState(false);

  const setValue = (name: string, v: string) => setValues((prev) => ({ ...prev, [name]: v }));

  const submitParameter = () => {
    if (grading.mode !== 'parameter') return;
    const answers: Record<string, number> = {};
    for (const f of grading.fields) answers[f.name] = parseFloat(values[f.name] ?? '');
    const res = gradeParameter(grading.fields, answers);
    setVerdict({ kind: 'parameter', ...res });
    onAttempt(res.pass);
  };

  const submitFunction = async () => {
    if (grading.mode !== 'function' || !runPredict) return;
    setBusy(true);
    const yHat = await runPredict(grading.holdout.t);
    setBusy(false);
    if (!yHat) {
      setVerdict({ kind: 'function-error' });
      return;
    }
    const e = rmse(yHat, grading.holdout.yTrue);
    const pass = e <= grading.rmseMax;
    setVerdict({ kind: 'function', pass, rmse: e, max: grading.rmseMax });
    onAttempt(pass);
  };

  const submitDistribution = () => {
    if (grading.mode !== 'distribution') return;
    const qs = grading.taus.map((tau) => parseFloat(values[`q${Math.round(tau * 100)}`] ?? ''));
    if (qs.some((q) => !Number.isFinite(q))) return;
    const res = gradeDistribution(grading, qs);
    setVerdict({ kind: 'distribution', ...res, max: grading.lossMax });
    onAttempt(res.pass);
  };

  return (
    <div className="panel">
      <h3>Submit Findings {solved && <span className="cleared-badge">Cleared</span>}</h3>
      <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: '0 0 10px' }}>{recover}</p>

      {grading.mode === 'parameter' && (
        <form
          className="submit-grid"
          onSubmit={(e) => {
            e.preventDefault();
            submitParameter();
          }}
        >
          {grading.fields.map((f) => (
            <div className="field" key={f.name}>
              <label htmlFor={`fld-${f.name}`}>
                {f.label}
                {f.unit ? ` (${f.unit})` : ''}
              </label>
              <input
                id={`fld-${f.name}`}
                inputMode="decimal"
                autoComplete="off"
                disabled={solved}
                value={values[f.name] ?? ''}
                onChange={(e) => setValue(f.name, e.target.value)}
              />
              {f.help && (
                <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{f.help}</span>
              )}
            </div>
          ))}
          <button className="btn primary" type="submit" disabled={solved}>
            Submit
          </button>
        </form>
      )}

      {grading.mode === 'function' && (
        <div>
          <p style={{ fontSize: 13 }}>
            Define <code>predict(t)</code> in the lab. It will be evaluated on a{' '}
            <b>hidden extension</b> of the time axis — a fit that only memorizes the shown window
            will fail. Passing bar: RMSE ≤ {grading.rmseMax.toPrecision(3)}.
          </p>
          <button className="btn primary" disabled={solved || busy} onClick={submitFunction}>
            {busy ? 'Grading…' : 'Grade predict(t)'}
          </button>
        </div>
      )}

      {grading.mode === 'distribution' && (
        <form
          className="submit-grid"
          onSubmit={(e) => {
            e.preventDefault();
            submitDistribution();
          }}
        >
          {grading.taus.map((tau) => {
            const key = `q${Math.round(tau * 100)}`;
            return (
              <div className="field" key={key}>
                <label htmlFor={`fld-${key}`}>{Math.round(tau * 100)}th percentile</label>
                <input
                  id={`fld-${key}`}
                  inputMode="decimal"
                  autoComplete="off"
                  disabled={solved}
                  value={values[key] ?? ''}
                  onChange={(e) => setValue(key, e.target.value)}
                />
              </div>
            );
          })}
          <button className="btn primary" type="submit" disabled={solved}>
            Submit forecast
          </button>
        </form>
      )}

      {submitNote && (
        <p style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 8 }}>{submitNote}</p>
      )}

      {verdict.kind === 'parameter' && !solved && (
        <div className={`verdict ${verdict.pass ? 'pass' : 'fail'}`} role="status">
          {verdict.results.map((r) => (
            <div key={r.name}>
              {r.ok ? '✓' : '✗'} {r.label}: {r.ok ? 'within tolerance' : 'outside tolerance'}
            </div>
          ))}
          {!verdict.pass && <div>— estimate rejected. Refine and resubmit.</div>}
        </div>
      )}
      {verdict.kind === 'function' && !solved && (
        <div className={`verdict ${verdict.pass ? 'pass' : 'fail'}`} role="status">
          holdout RMSE = {verdict.rmse.toPrecision(4)} (bar: ≤ {verdict.max.toPrecision(3)}) —{' '}
          {verdict.pass ? 'accepted' : 'rejected'}
        </div>
      )}
      {verdict.kind === 'function-error' && (
        <div className="verdict fail" role="status">
          predict(t) raised an error on the holdout grid — see console.
        </div>
      )}
      {verdict.kind === 'distribution' && !solved && (
        <div className={`verdict ${verdict.pass ? 'pass' : 'fail'}`} role="status">
          {!verdict.monotone && <div>✗ quantiles must be non-decreasing</div>}
          <div>
            mean pinball loss = {verdict.loss.toPrecision(4)} (bar: ≤ {verdict.max.toPrecision(4)})
            — {verdict.pass ? 'accepted' : 'rejected'}
          </div>
        </div>
      )}
      {solved && (
        <div className="verdict pass" role="status">
          ✓ Findings verified. Ground truth declassified below.
        </div>
      )}
    </div>
  );
}
