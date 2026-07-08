import { useState } from 'react';
import { LevelRail } from './components/LevelRail';
import { LevelView } from './components/LevelView';
import { Scoreboard } from './components/Scoreboard';
import { LEVEL_METAS } from './levels';
import { loadCurrentLevel, loadProgress, recordSolve, saveCurrentLevel } from './lib/store';
import { toggleTheme, useTheme } from './lib/theme';
import type { Progress, SolveRecord } from './lib/types';

export function App() {
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const [current, setCurrent] = useState(loadCurrentLevel);
  const [showScore, setShowScore] = useState(false);
  const theme = useTheme();

  const select = (id: number) => {
    setCurrent(id);
    saveCurrentLevel(id);
    setShowScore(false);
  };

  const handleSolved = (id: number, rec: SolveRecord) => {
    setProgress(recordSolve(id, rec));
  };

  const meta = LEVEL_METAS[current];

  return (
    <div className="app">
      <header className="masthead">
        <h1>GROUND TRUTH</h1>
        <span className="sub">Signal Recovery Unit · every dataset hides an equation</span>
        <span className="spacer" />
        <button
          className="btn quiet"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? '☾ Dark' : '☀ Light'}
        </button>
        <button className="btn quiet" onClick={() => setShowScore((s) => !s)}>
          {showScore ? 'Back to case' : 'Case record'}
        </button>
      </header>
      <LevelRail current={current} progress={progress} onSelect={select} />
      <main>
        {showScore ? (
          <Scoreboard progress={progress} />
        ) : meta ? (
          <LevelView
            key={meta.id}
            meta={meta}
            solvedRecord={progress.solved[meta.id]}
            onSolved={handleSolved}
          />
        ) : (
          <div className="panel">This case file has not been written yet.</div>
        )}
      </main>
    </div>
  );
}
