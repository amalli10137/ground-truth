import katex from 'katex';
import { useMemo } from 'react';
import type { LevelPack } from '../lib/types';

export function TruthReveal({ pack }: { pack: LevelPack }) {
  const html = useMemo(
    () =>
      katex.renderToString(pack.truth.equationLatex, {
        throwOnError: false,
        displayMode: true,
      }),
    [pack.truth.equationLatex],
  );
  return (
    <div className="truth-reveal">
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
        }}
      >
        Ground truth · declassified
      </div>
      <div className="math-display" dangerouslySetInnerHTML={{ __html: html }} />
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
        {Object.entries(pack.truth.params).map(([k, v]) => (
          <span key={k} style={{ marginRight: 16 }}>
            {k} = {Number(v.toPrecision(6))}
          </span>
        ))}
      </div>
    </div>
  );
}
