import { useState } from 'react';
import { MathText } from '../lib/mathtext';
import type { LevelHints } from '../lib/types';

const TIER_NAMES = ['Nudge', 'Method', 'Full derivation'] as const;

export function HintPanel({
  hints,
  revealed,
  onReveal,
}: {
  hints: LevelHints;
  revealed: boolean[];
  onReveal: (i: number) => void;
}) {
  // already-revealed hints start collapsed when you come back to a level;
  // a freshly revealed hint opens
  const [expanded, setExpanded] = useState<boolean[]>([false, false, false]);
  const bodies = [hints.nudge, hints.method, hints.derivation];

  const reveal = (i: number) => {
    onReveal(i);
    setExpanded((prev) => prev.map((v, j) => (j === i ? true : v)));
  };

  const toggle = (i: number) =>
    setExpanded((prev) => prev.map((v, j) => (j === i ? !v : v)));

  return (
    <div className="panel">
      <h3>Field Support</h3>
      <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: '0 0 6px' }}>
        Three tiers, revealed separately. Hint usage is logged on your case record.
      </p>
      {TIER_NAMES.map((name, i) => (
        <div className="hint" key={name}>
          {revealed[i] ? (
            <>
              <button
                className="hint-toggle"
                aria-expanded={expanded[i]}
                onClick={() => toggle(i)}
              >
                <span aria-hidden="true">{expanded[i] ? '▾' : '▸'}</span> Tier {i + 1} — {name}
              </button>
              {expanded[i] && <MathText className="hint-body" text={bodies[i]} />}
            </>
          ) : (
            <>
              <div className="hint-title">
                Tier {i + 1} — {name}
              </div>
              <button className="btn quiet" style={{ marginTop: 6 }} onClick={() => reveal(i)}>
                Reveal {name.toLowerCase()}
              </button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
