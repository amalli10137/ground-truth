import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { columnsToCsv, downloadText } from '../lib/csv';
import { MathText } from '../lib/mathtext';
import {
  loadAttempts,
  loadHintsRevealed,
  saveAttempts,
  saveHintsRevealed,
} from '../lib/store';
import { useChartPalette } from '../lib/theme';
import type { LevelMeta, LevelPack, SolveRecord } from '../lib/types';
import { packUrl } from '../lib/types';
import type { FromWorker, OverlayData, PlotXYData, ShadeData } from '../worker/protocol';
import { pyRunner } from '../worker/pyRunner';
import { Chart, type ChartMode } from './Chart';
import { CodeLab, type ConsoleLine } from './CodeLab';
import { HintPanel } from './HintPanel';
import { ResidualChart } from './ResidualChart';
import { ScratchPlot } from './ScratchPlot';
import { SubmitPanel } from './SubmitPanel';
import { TruthReveal } from './TruthReveal';

const packCache = new Map<number, LevelPack>();
const MAX_CONSOLE_LINES = 800;

export function LevelView({
  meta,
  solvedRecord,
  onSolved,
}: {
  meta: LevelMeta;
  solvedRecord: SolveRecord | undefined;
  onSolved: (id: number, rec: SolveRecord) => void;
}) {
  const [pack, setPack] = useState<LevelPack | null>(packCache.get(meta.id) ?? null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [overlays, setOverlays] = useState<OverlayData[]>([]);
  const [shades, setShades] = useState<ShadeData[]>([]);
  const [scratch, setScratch] = useState<PlotXYData[]>([]);
  const [resid, setResid] = useState<{ t: number[]; r: number[]; rmse: number } | null>(null);
  const [consoleLines, setConsoleLines] = useState<ConsoleLine[]>([]);
  const [bootStage, setBootStage] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState<ChartMode>('data');
  const [selectedSeries, setSelectedSeries] = useState<string>('');
  const [hintsRevealed, setHintsRevealed] = useState<boolean[]>(() =>
    loadHintsRevealed(meta.id),
  );
  const [freshSolve, setFreshSolve] = useState(false);
  const attemptsRef = useRef(loadAttempts(meta.id));
  const pal = useChartPalette();

  const solved = Boolean(solvedRecord);

  useEffect(() => {
    if (pack) return;
    let cancelled = false;
    fetch(packUrl(meta.id))
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((p: LevelPack) => {
        packCache.set(meta.id, p);
        if (!cancelled) setPack(p);
      })
      .catch((e) => !cancelled && setLoadError(String(e)));
    return () => {
      cancelled = true;
    };
  }, [meta.id, pack]);

  // stream worker events into this level's UI
  useEffect(() => {
    const off = pyRunner.subscribe((e: FromWorker) => {
      switch (e.type) {
        case 'boot':
          setBootStage(e.stage);
          break;
        case 'ready':
          setBootStage(null);
          break;
        case 'stdout':
          setConsoleLines((prev) =>
            [...prev, { text: e.text, isErr: e.isErr }].slice(-MAX_CONSOLE_LINES),
          );
          break;
        case 'overlay':
          setOverlays((prev) => [...prev, { t: e.t, y: e.y, label: e.label, style: e.style }]);
          break;
        case 'shade':
          setShades((prev) => [
            ...prev.filter((s) => s.label !== e.label),
            { t: e.t, states: e.states, label: e.label },
          ]);
          break;
        case 'plotxy':
          setScratch((prev) => [...prev, { x: e.x, y: e.y, label: e.label, mode: e.mode }]);
          break;
        case 'residuals':
          setResid({ t: e.t, r: e.r, rmse: e.rmse });
          break;
        case 'clearOverlays':
          setOverlays([]);
          setShades([]);
          setResid(null);
          setScratch([]);
          break;
        case 'error':
          setConsoleLines((prev) =>
            [...prev, { text: e.traceback + '\n', isErr: true }].slice(-MAX_CONSOLE_LINES),
          );
          break;
        case 'fatal':
          setBootStage(null);
          setConsoleLines((prev) => [
            ...prev,
            { text: `[python runtime failed: ${e.message}]\n`, isErr: true },
          ]);
          break;
      }
    });
    return off;
  }, []);

  const columnsJson = useMemo(() => (pack ? JSON.stringify(pack.columns) : ''), [pack]);

  const handleRun = useCallback(
    async (code: string) => {
      if (!pack || running) return;
      setRunning(true);
      await pyRunner.run(code, meta.id, columnsJson);
      setRunning(false);
      setBootStage(null);
    },
    [pack, running, meta.id, columnsJson],
  );

  const handleStop = useCallback(() => {
    pyRunner.stop();
    setRunning(false);
    setBootStage(null);
  }, []);

  const clearOverlays = useCallback(() => {
    setOverlays([]);
    setShades([]);
    setResid(null);
    setScratch([]);
  }, []);

  const revealHint = (i: number) => {
    const next = hintsRevealed.map((v, j) => v || j === i);
    setHintsRevealed(next);
    saveHintsRevealed(meta.id, next);
  };

  const handleAttempt = (pass: boolean) => {
    attemptsRef.current += 1;
    saveAttempts(meta.id, attemptsRef.current);
    if (pass && !solved) {
      setFreshSolve(true);
      onSolved(meta.id, {
        at: Date.now(),
        attempts: attemptsRef.current,
        hintsUsed: hintsRevealed.filter(Boolean).length,
      });
    }
  };

  const runPredict = useCallback(
    async (holdoutT: number[]) => {
      if (!pack) return null;
      const code = (await import('../lib/store')).loadCode(meta.id) ?? meta.starterCode;
      return pyRunner.gradeFn(code, meta.id, columnsJson, holdoutT);
    },
    [pack, meta.id, meta.starterCode, columnsJson],
  );

  if (loadError)
    return (
      <div className="panel">
        Could not load level data ({loadError}). Run <code>npm run data</code> to generate the
        level packs, then reload.
      </div>
    );
  if (!pack) return <div className="panel">Loading case file…</div>;

  const panelSeries =
    pack.kind === 'panel' ? Object.keys(pack.columns).filter((k) => k !== 't') : [];
  const activeSeries = panelSeries.length
    ? panelSeries.includes(selectedSeries)
      ? selectedSeries
      : panelSeries[0]
    : undefined;

  return (
    <div>
      <div className="level-header">
        <span className="case-no">CASE {String(meta.id).padStart(2, '0')}</span>
        <h2>{meta.title}</h2>
        <span className="tagline">{meta.tagline}</span>
        {solved && <span className="cleared-badge">Cleared</span>}
      </div>

      <div className="panel">
        <MathText className="brief" text={meta.brief} />
        <div className="stats-row">
          <span>
            N = <b>{pack.stats.n}</b>
          </span>
          <span>
            mean = <b>{Number(pack.stats.mean.toPrecision(5))}</b>
          </span>
          <span>
            std = <b>{Number(pack.stats.std.toPrecision(5))}</b>
          </span>
          <span>
            min = <b>{Number(pack.stats.min.toPrecision(5))}</b>
          </span>
          <span>
            max = <b>{Number(pack.stats.max.toPrecision(5))}</b>
          </span>
          <button
            className="btn quiet"
            onClick={() =>
              downloadText(
                `${String(meta.id).padStart(2, '0')}-${meta.slug}.csv`,
                columnsToCsv(pack.columns),
                'text/csv',
              )
            }
          >
            Download CSV
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="chart-toolbar">
          <h3 style={{ margin: 0 }}>Observed Data</h3>
          {pack.spectrum && meta.chart?.spectrumToggle && (
            <button
              className="btn quiet"
              aria-pressed={mode === 'spectrum'}
              onClick={() => setMode(mode === 'data' ? 'spectrum' : 'data')}
            >
              {mode === 'data' ? 'View spectrum' : 'View time series'}
            </button>
          )}
          {panelSeries.length > 0 && (
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
              highlight{' '}
              <select value={activeSeries} onChange={(e) => setSelectedSeries(e.target.value)}>
                {panelSeries.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <div
          className="chart-wrap"
          role="img"
          aria-label={`Chart of observed data for ${meta.title}. ${pack.stats.n} points. Download the CSV for the raw values.`}
        >
          <Chart
            pack={pack}
            meta={meta}
            overlays={overlays}
            shades={shades}
            showTruth={solved}
            mode={mode}
            selectedSeries={activeSeries}
          />
          {solved && (
            <div className={`stamp${freshSolve ? ' fresh' : ''}`} aria-hidden="true">
              Ground Truth · Declassified
            </div>
          )}
        </div>
        <div className="legend">
          <span style={{ color: pal.series }}>
            <span className="swatch" /> observed
          </span>
          {mode === 'data' &&
            overlays.map((o, i) => (
              <span key={i} style={{ color: pal.overlays[i % pal.overlays.length] }}>
                <span className={`swatch${o.style !== 'solid' ? ' dash' : ''}`} /> {o.label}
              </span>
            ))}
          {mode === 'data' && solved && pack.truth.curve && (
            <span style={{ color: pal.red }}>
              <span className="swatch" /> ground truth
            </span>
          )}
        </div>
        {resid && mode === 'data' && <ResidualChart t={resid.t} r={resid.r} rmse={resid.rmse} />}
        <ScratchPlot series={scratch} />

        {solved && <TruthReveal pack={pack} />}
      </div>

      <div className="panel">
        <h3>Code Lab — Python</h3>
        <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: '0 0 8px' }}>
          <code>data</code> is a pandas DataFrame. <code>overlay(t, y, label=…)</code> plots a
          candidate on the chart; <code>overlay_fn(f)</code> evaluates a callable on the level
          grid; <code>residuals(y_hat)</code> shows observed − candidate;{' '}
          <code>plot_xy(x, y, mode=&quot;scatter&quot;|&quot;line&quot;)</code> draws a free-form
          scratch plot; <code>shade(states)</code> shades the chart background by a state path.{' '}
          <code>numpy/scipy/pandas</code> preloaded as <code>np</code>, <code>scipy</code>,{' '}
          <code>pd</code>.
        </p>
        <CodeLab
          levelId={meta.id}
          starterCode={meta.starterCode}
          running={running}
          bootStage={bootStage}
          consoleLines={consoleLines}
          onRun={handleRun}
          onStop={handleStop}
          onClearOverlays={clearOverlays}
        />
      </div>

      <SubmitPanel
        grading={pack.grading}
        solved={solved}
        recover={meta.recover}
        submitNote={meta.submitNote}
        runPredict={runPredict}
        onAttempt={handleAttempt}
      />

      <HintPanel hints={meta.hints} revealed={hintsRevealed} onReveal={revealHint} />
    </div>
  );
}
