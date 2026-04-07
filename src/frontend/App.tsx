import React, { useState } from 'react';
import { SearchPage } from './components/SearchPage';
import { StatsPage } from './components/StatsPage';

type View = 'analyze' | 'stats';

export function App() {
  const [view, setView] = useState<View>('analyze');

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="app-header-left">
          <div className="app-logo" onClick={() => setView('analyze')}>
            node<span>watch</span>
          </div>
          <nav className="app-nav">
            <button
              className={view === 'analyze' ? 'active' : ''}
              onClick={() => setView('analyze')}
            >
              Analyze
            </button>
            <button
              className={view === 'stats' ? 'active' : ''}
              onClick={() => setView('stats')}
            >
              System
            </button>
          </nav>
        </div>
      </header>
      <main className="app-main">
        {view === 'analyze' && <SearchPage />}
        {view === 'stats' && <StatsPage />}
      </main>
    </div>
  );
}
