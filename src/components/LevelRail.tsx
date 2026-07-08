import { LEVEL_INDEX } from '../levels';
import { TIERS, type Progress } from '../lib/types';

export function LevelRail({
  current,
  progress,
  onSelect,
}: {
  current: number;
  progress: Progress;
  onSelect: (id: number) => void;
}) {
  const isSolved = (id: number) => Boolean(progress.solved[id]);

  return (
    <nav className="rail" aria-label="Levels">
      {TIERS.map((tier) => (
        <div className="rail-tier" key={tier}>
          <span className="rail-tier-name">{tier}</span>
          <div className="rail-levels">
            {LEVEL_INDEX.filter((l) => l.tier === tier).map((l) => {
              const solved = isSolved(l.id);
              return (
                <button
                  key={l.id}
                  className={`rail-level${solved ? ' solved' : ''}`}
                  aria-current={current === l.id}
                  aria-label={`Level ${l.id}: ${l.title}${solved ? ' (cleared)' : ''}`}
                  title={l.title}
                  onClick={() => onSelect(l.id)}
                >
                  {String(l.id).padStart(2, '0')}
                  {solved ? ' ✓ ' : ' · '}
                  {l.title}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
