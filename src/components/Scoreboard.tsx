import { LEVEL_INDEX } from '../levels';
import { loadCode } from '../lib/store';
import { downloadText } from '../lib/csv';
import type { Progress } from '../lib/types';

function exportNotebook(progress: Progress) {
  const solvedLevels = LEVEL_INDEX.filter((l) => progress.solved[l.id]);
  const parts = [
    '"""GROUND TRUTH — your inference cookbook.',
    'Auto-exported from the code lab: one recipe per declassified case."""',
    '',
  ];
  for (const l of solvedLevels) {
    const code = loadCode(l.id);
    parts.push(
      '# ' + '='.repeat(70),
      `# CASE ${String(l.id).padStart(2, '0')} — ${l.title} [${l.tier}]`,
      '# ' + '='.repeat(70),
      code?.trim() || '# (no saved code)',
      '',
    );
  }
  downloadText('ground-truth-cookbook.py', parts.join('\n'), 'text/x-python');
}

export function Scoreboard({ progress }: { progress: Progress }) {
  const solvedCount = Object.keys(progress.solved).length;
  return (
    <div className="panel">
      <h3>Case Record</h3>
      <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
        {solvedCount} / {LEVEL_INDEX.length} cases cleared. Par = attempts + hint tiers used.
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table className="score">
          <thead>
            <tr>
              <th>Case</th>
              <th>Title</th>
              <th>Status</th>
              <th>Attempts</th>
              <th>Hints</th>
              <th>Par</th>
            </tr>
          </thead>
          <tbody>
            {LEVEL_INDEX.map((l) => {
              const rec = progress.solved[l.id];
              return (
                <tr key={l.id}>
                  <td>{String(l.id).padStart(2, '0')}</td>
                  <td>{l.title}</td>
                  <td style={{ color: rec ? 'var(--cleared-green)' : 'var(--ink-faint)' }}>
                    {rec ? 'CLEARED' : '—'}
                  </td>
                  <td>{rec ? rec.attempts : ''}</td>
                  <td>{rec ? rec.hintsUsed : ''}</td>
                  <td>{rec ? rec.attempts + rec.hintsUsed : ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {solvedCount > 0 && (
        <div style={{ marginTop: 10 }}>
          <button className="btn" onClick={() => exportNotebook(progress)}>
            Export cookbook (.py)
          </button>
        </div>
      )}
    </div>
  );
}
