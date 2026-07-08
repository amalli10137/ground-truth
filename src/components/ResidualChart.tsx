import { useEffect, useRef } from 'react';
import uPlot from 'uplot';
import { useChartPalette } from '../lib/theme';

export function ResidualChart({ t, r, rmse }: { t: number[]; r: number[]; rmse: number }) {
  const pal = useChartPalette();
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const opts: uPlot.Options = {
      width: wrap.clientWidth || 600,
      height: 130,
      pxAlign: false,
      cursor: { points: { show: false } },
      legend: { show: false },
      scales: { x: { time: false } },
      axes: [
        {
          stroke: pal.axis,
          font: '10px "IBM Plex Mono", monospace',
          grid: { stroke: pal.grid, width: 1 },
          ticks: { stroke: pal.grid, width: 1 },
        },
        {
          stroke: pal.axis,
          label: 'residual',
          labelFont: '11px "IBM Plex Mono", monospace',
          font: '10px "IBM Plex Mono", monospace',
          grid: { stroke: pal.grid, width: 1 },
          ticks: { stroke: pal.grid, width: 1 },
        },
      ],
      series: [
        {},
        {
          stroke: pal.axis,
          width: 1,
          points: { show: t.length <= 300, size: 3, stroke: pal.axis, fill: pal.axis },
        },
      ],
      hooks: {
        draw: [
          (u) => {
            const ctx = u.ctx;
            const y0 = u.valToPos(0, 'y', true);
            if (y0 >= u.bbox.top && y0 <= u.bbox.top + u.bbox.height) {
              ctx.save();
              ctx.strokeStyle = pal.zero;
              ctx.setLineDash([4, 4]);
              ctx.beginPath();
              ctx.moveTo(u.bbox.left, y0);
              ctx.lineTo(u.bbox.left + u.bbox.width, y0);
              ctx.stroke();
              ctx.restore();
            }
          },
        ],
      },
    };
    const u = new uPlot(opts, [t, r], wrap);
    const ro = new ResizeObserver(() => {
      if (wrap.clientWidth > 0) u.setSize({ width: wrap.clientWidth, height: 130 });
    });
    ro.observe(wrap);
    return () => {
      ro.disconnect();
      u.destroy();
    };
  }, [t, r, pal]);

  return (
    <div>
      <div className="stats-row" style={{ marginBottom: 4 }}>
        <span>
          residuals (observed − candidate) · RMSE = <b>{rmse.toPrecision(5)}</b>
        </span>
      </div>
      <div ref={wrapRef} />
    </div>
  );
}
