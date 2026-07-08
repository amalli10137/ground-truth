import { useEffect, useRef } from 'react';
import uPlot from 'uplot';
import { useChartPalette } from '../lib/theme';
import type { PlotXYData } from '../worker/protocol';

/** Free-form scratch plot fed by plot_xy() — series may have different x grids,
 * so each is drawn via a draw hook on shared scales. */
export function ScratchPlot({ series }: { series: PlotXYData[] }) {
  const pal = useChartPalette();
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || series.length === 0) return;

    let xMin = Infinity,
      xMax = -Infinity,
      yMin = Infinity,
      yMax = -Infinity;
    for (const s of series)
      for (let i = 0; i < s.x.length; i++) {
        if (Number.isFinite(s.x[i])) {
          xMin = Math.min(xMin, s.x[i]);
          xMax = Math.max(xMax, s.x[i]);
        }
        if (Number.isFinite(s.y[i])) {
          yMin = Math.min(yMin, s.y[i]);
          yMax = Math.max(yMax, s.y[i]);
        }
      }
    if (!Number.isFinite(xMin) || !Number.isFinite(yMin)) return;
    const padX = (xMax - xMin || 1) * 0.04;
    const padY = (yMax - yMin || 1) * 0.06;

    const opts: uPlot.Options = {
      width: wrap.clientWidth || 600,
      height: 240,
      pxAlign: false,
      cursor: { points: { show: false }, drag: { x: false, y: false } },
      legend: { show: false },
      scales: {
        x: { time: false, range: [xMin - padX, xMax + padX] },
        y: { range: [yMin - padY, yMax + padY] },
      },
      axes: [
        {
          stroke: pal.axis,
          font: '10px "IBM Plex Mono", monospace',
          grid: { stroke: pal.grid, width: 1 },
          ticks: { stroke: pal.grid, width: 1 },
        },
        {
          stroke: pal.axis,
          font: '10px "IBM Plex Mono", monospace',
          grid: { stroke: pal.grid, width: 1 },
          ticks: { stroke: pal.grid, width: 1 },
        },
      ],
      series: [{}, { show: false }],
      hooks: {
        draw: [
          (u) => {
            const ctx = u.ctx;
            ctx.save();
            ctx.beginPath();
            ctx.rect(u.bbox.left, u.bbox.top, u.bbox.width, u.bbox.height);
            ctx.clip();
            series.forEach((s, si) => {
              const color = pal.overlays[si % pal.overlays.length];
              ctx.strokeStyle = color;
              ctx.fillStyle = color;
              if (s.mode === 'line') {
                ctx.lineWidth = 1.5 * devicePixelRatio;
                ctx.beginPath();
                let started = false;
                for (let i = 0; i < s.x.length; i++) {
                  if (!Number.isFinite(s.y[i])) {
                    started = false;
                    continue;
                  }
                  const px = u.valToPos(s.x[i], 'x', true);
                  const py = u.valToPos(s.y[i], 'y', true);
                  if (started) ctx.lineTo(px, py);
                  else {
                    ctx.moveTo(px, py);
                    started = true;
                  }
                }
                ctx.stroke();
              } else {
                const r = 2.2 * devicePixelRatio;
                for (let i = 0; i < s.x.length; i++) {
                  if (!Number.isFinite(s.y[i]) || !Number.isFinite(s.x[i])) continue;
                  const px = u.valToPos(s.x[i], 'x', true);
                  const py = u.valToPos(s.y[i], 'y', true);
                  ctx.beginPath();
                  ctx.arc(px, py, r, 0, 2 * Math.PI);
                  ctx.fill();
                }
              }
            });
            ctx.restore();
          },
        ],
      },
    };
    const u = new uPlot(opts, [[xMin, xMax], [null, null]], wrap);
    const ro = new ResizeObserver(() => {
      if (wrap.clientWidth > 0) u.setSize({ width: wrap.clientWidth, height: 240 });
    });
    ro.observe(wrap);
    return () => {
      ro.disconnect();
      u.destroy();
    };
  }, [series, pal]);

  if (series.length === 0) return null;
  return (
    <div>
      <div className="stats-row" style={{ marginBottom: 4, marginTop: 10 }}>
        <span>scratch plot — plot_xy()</span>
      </div>
      <div ref={wrapRef} />
      <div className="legend">
        {series.map((s, i) => (
          <span key={i} style={{ color: pal.overlays[i % pal.overlays.length] }}>
            <span className="swatch" /> {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
