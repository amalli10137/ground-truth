import { useEffect, useMemo, useRef } from 'react';
import uPlot from 'uplot';
import { useChartPalette, type ChartPalette } from '../lib/theme';
import type { LevelMeta, LevelPack } from '../lib/types';
import type { OverlayData, ShadeData } from '../worker/protocol';

const dashFor = (style: string): number[] =>
  style === 'solid' ? [] : style === 'dot' ? [2, 3] : [7, 5];

export type ChartMode = 'data' | 'spectrum';

interface ChartProps {
  pack: LevelPack;
  meta: LevelMeta;
  overlays: OverlayData[];
  shades: ShadeData[];
  showTruth: boolean;
  mode: ChartMode;
  selectedSeries?: string; // panel kind
  height?: number;
}

interface DrawState {
  overlays: OverlayData[];
  shades: ShadeData[];
  showTruth: boolean;
  pack: LevelPack;
  mode: ChartMode;
  pal: ChartPalette;
}

function drawShadeBands(u: uPlot, t: number[], states: number[], fill: string) {
  const ctx = u.ctx;
  ctx.save();
  ctx.fillStyle = fill;
  const top = u.bbox.top;
  const h = u.bbox.height;
  let start: number | null = null;
  for (let i = 0; i <= states.length; i++) {
    const on = i < states.length && states[i] > 0;
    if (on && start == null) start = i;
    if (!on && start != null) {
      const x0 = u.valToPos(t[start], 'x', true);
      const x1 = u.valToPos(t[Math.min(i, t.length - 1)], 'x', true);
      ctx.fillRect(x0, top, Math.max(x1 - x0, 1), h);
      start = null;
    }
  }
  ctx.restore();
}

function drawCurve(
  u: uPlot,
  t: number[],
  y: number[],
  stroke: string,
  width: number,
  dash: number[],
) {
  const ctx = u.ctx;
  ctx.save();
  ctx.beginPath();
  ctx.rect(u.bbox.left, u.bbox.top, u.bbox.width, u.bbox.height);
  ctx.clip();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = width * devicePixelRatio;
  ctx.setLineDash(dash.map((d) => d * devicePixelRatio));
  ctx.beginPath();
  let started = false;
  for (let i = 0; i < t.length; i++) {
    if (!Number.isFinite(y[i]) || !Number.isFinite(t[i])) {
      started = false;
      continue;
    }
    const px = u.valToPos(t[i], 'x', true);
    const py = u.valToPos(y[i], 'y', true);
    if (!started) {
      ctx.moveTo(px, py);
      started = true;
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.stroke();
  ctx.restore();
}

function axis(label: string | undefined, pal: ChartPalette): uPlot.Axis {
  return {
    stroke: pal.axis,
    label,
    labelFont: '12px "IBM Plex Mono", monospace',
    font: '10px "IBM Plex Mono", monospace',
    grid: { stroke: pal.grid, width: 1 },
    ticks: { stroke: pal.grid, width: 1 },
  };
}

export function Chart({
  pack,
  meta,
  overlays,
  shades,
  showTruth,
  mode,
  selectedSeries,
  height = 330,
}: ChartProps) {
  const pal = useChartPalette();
  const wrapRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);
  const justCreated = useRef(false);
  const drawState = useRef<DrawState>({ overlays, shades, showTruth, pack, mode, pal });
  drawState.current = { overlays, shades, showTruth, pack, mode, pal };

  const { data, seriesCfg, xLabel, yLabel } = useMemo(() => {
    if (mode === 'spectrum' && pack.spectrum) {
      return {
        data: [pack.spectrum.f, pack.spectrum.logmag] as uPlot.AlignedData,
        seriesCfg: [{ label: 'spectrum', stroke: pal.series, width: 1.4 }] as uPlot.Series[],
        xLabel: 'frequency',
        yLabel: 'log₁₀ |X(f)|',
      };
    }
    const t = pack.columns.t;
    if (pack.kind === 'events') {
      const count = t.map((_, i) => i + 1);
      return {
        data: [t, count] as uPlot.AlignedData,
        seriesCfg: [
          {
            label: 'N(t)',
            stroke: pal.series,
            width: 1.4,
            paths: uPlot.paths!.stepped!({ align: 1 }),
            points: { show: false },
          },
        ] as uPlot.Series[],
        xLabel: meta.xLabel ?? 't',
        yLabel: meta.yLabel ?? 'cumulative events N(t)',
      };
    }
    if (pack.kind === 'panel') {
      const names = Object.keys(pack.columns).filter((k) => k !== 't');
      const cfg: uPlot.Series[] = names.map((name) => ({
        label: name,
        stroke: name === selectedSeries ? pal.series : pal.seriesFaint,
        width: name === selectedSeries ? 1.8 : 0.9,
        points: { show: false },
      }));
      return {
        data: [t, ...names.map((n) => pack.columns[n])] as uPlot.AlignedData,
        seriesCfg: cfg,
        xLabel: meta.xLabel ?? 't',
        yLabel: meta.yLabel ?? 'y',
      };
    }
    const scatter = pack.kind === 'scatter';
    return {
      data: [t, pack.columns.y] as uPlot.AlignedData,
      seriesCfg: [
        {
          label: 'observed',
          stroke: pal.series,
          width: 1.4,
          points: scatter
            ? { show: true, size: 5, stroke: pal.series, fill: pal.series }
            : { show: false },
          ...(scatter ? { paths: () => null } : {}),
        },
      ] as uPlot.Series[],
      xLabel: meta.xLabel ?? 't',
      yLabel: meta.yLabel ?? 'y',
    };
  }, [pack, mode, selectedSeries, meta, pal]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const make = () => {
      const width = wrap.clientWidth || 600;
      const opts: uPlot.Options = {
        width,
        height,
        pxAlign: false,
        cursor: { points: { show: false } },
        legend: { show: false },
        scales: { x: { time: false } },
        axes: [axis(xLabel, pal), axis(yLabel, pal)],
        series: [{}, ...seriesCfg],
        hooks: {
          drawClear: [
            (u) => {
              const st = drawState.current;
              if (st.mode !== 'data') return;
              for (const s of st.shades) drawShadeBands(u, s.t, s.states, st.pal.shadePlay);
              if (st.showTruth && st.pack.truth.states && st.pack.columns.t)
                drawShadeBands(u, st.pack.columns.t, st.pack.truth.states, st.pal.shadeTruth);
            },
          ],
          draw: [
            (u) => {
              const st = drawState.current;
              if (st.mode !== 'data') return;
              st.overlays.forEach((o, i) =>
                drawCurve(
                  u,
                  o.t,
                  o.y,
                  st.pal.overlays[i % st.pal.overlays.length],
                  1.6,
                  dashFor(o.style),
                ),
              );
              if (st.showTruth && st.pack.truth.curve)
                drawCurve(u, st.pack.truth.curve.t, st.pack.truth.curve.y, st.pal.red, 2, []);
              if (st.pack.kind === 'events') {
                // event raster ticks along the bottom
                const ctx = u.ctx;
                ctx.save();
                ctx.strokeStyle = st.pal.series;
                ctx.lineWidth = 1 * devicePixelRatio;
                const y0 = u.bbox.top + u.bbox.height;
                for (const tv of st.pack.columns.t) {
                  const px = u.valToPos(tv, 'x', true);
                  if (px < u.bbox.left || px > u.bbox.left + u.bbox.width) continue;
                  ctx.beginPath();
                  ctx.moveTo(px, y0);
                  ctx.lineTo(px, y0 - 8 * devicePixelRatio);
                  ctx.stroke();
                }
                ctx.restore();
              }
            },
          ],
        },
      };
      return new uPlot(opts, data, wrap);
    };

    const u = make();
    plotRef.current = u;
    justCreated.current = true;
    const ro = new ResizeObserver(() => {
      if (wrap.clientWidth > 0) u.setSize({ width: wrap.clientWidth, height });
    });
    ro.observe(wrap);
    return () => {
      ro.disconnect();
      u.destroy();
      plotRef.current = null;
    };
  }, [data, seriesCfg, xLabel, yLabel, height, pal]);

  // overlays/shades/truth changed: repaint without rebuilding. Skip the render
  // that created the plot — a synchronous redraw() in the same task as the
  // uPlot constructor blanks the series.
  useEffect(() => {
    if (justCreated.current) {
      justCreated.current = false;
      return;
    }
    plotRef.current?.redraw();
  }, [overlays, shades, showTruth]);

  return <div ref={wrapRef} />;
}
