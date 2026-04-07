import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { useJobTracker } from '../hooks/useJobTracker';
import { JobProgress } from './JobProgress';
import { ResultView } from './ResultView';

interface RecentPackage {
  name: string;
  version: string;
  riskScore: number;
  riskLevel: string;
  analysisStatus: string;
  shortDescription: string;
}

export function SearchPage() {
  const [query, setQuery] = useState('');
  const [recentPackages, setRecentPackages] = useState<RecentPackage[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const { job, startAnalysis, reset } = useJobTracker();

  const loadRecent = useCallback(async () => {
    try {
      const resp = await api.getRecentPackages();
      setRecentPackages(resp.packages || []);
    } catch {
      // Non-critical, silently ignore
    } finally {
      setRecentLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecent();
  }, [loadRecent]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    // Parse "package@version" format
    const atIdx = trimmed.lastIndexOf('@');
    let name: string;
    let version: string | undefined;

    if (atIdx > 0) {
      name = trimmed.slice(0, atIdx);
      version = trimmed.slice(atIdx + 1);
    } else {
      name = trimmed;
    }

    startAnalysis(name, version);
  };

  const handleRecentClick = (pkg: RecentPackage) => {
    setQuery(pkg.name);
    startAnalysis(pkg.name);
  };

  // Show result view when completed
  if (job?.phase === 'completed' && job.result) {
    return (
      <ResultView
        result={job.result}
        onBack={() => {
          reset();
          setQuery('');
        }}
      />
    );
  }

  return (
    <div>
      {/* Search */}
      <div className="search-container">
        <form className="search-form" onSubmit={handleSubmit}>
          <input
            className="search-input"
            type="text"
            placeholder="Package name, e.g. lodash or express@4.18.2"
            value={query}
            onChange={e => setQuery(e.target.value)}
            disabled={job !== null && job.phase !== 'idle' && job.phase !== 'failed'}
            autoFocus
          />
          <button
            className="btn btn-primary"
            type="submit"
            disabled={!query.trim() || (job !== null && job.phase !== 'idle' && job.phase !== 'failed')}
          >
            Analyze
          </button>
        </form>
      </div>

      {/* Error */}
      {job?.phase === 'failed' && (
        <div className="error-message">
          {job.error || 'Analysis failed'}
          <button
            onClick={reset}
            style={{
              marginLeft: 12,
              background: 'none',
              border: 'none',
              color: 'var(--color-danger)',
              cursor: 'pointer',
              textDecoration: 'underline',
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* In-progress job */}
      {job && (job.phase === 'queued' || job.phase === 'running') && (
        <JobProgress job={job} onCancel={reset} />
      )}

      {/* Recent analyses */}
      {!job && (
        <div>
          <div className="section-label">Recent packages</div>
          {recentLoading ? (
            <div className="empty-state">
              <div className="spinner" style={{ margin: '0 auto' }} />
            </div>
          ) : recentPackages.length === 0 ? (
            <div className="empty-state">
              No recent analyses. Submit a package above to get started.
            </div>
          ) : (
            <div className="card">
              <div className="recent-list">
                {recentPackages.map(pkg => (
                  <div
                    key={`${pkg.name}@${pkg.version}`}
                    className="recent-item"
                    onClick={() => handleRecentClick(pkg)}
                  >
                    <div>
                      <span className="recent-item-name">{pkg.name}</span>
                      <span className="recent-item-version">@{pkg.version}</span>
                      {pkg.shortDescription && (
                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                          {pkg.shortDescription}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <ScoreBarInline score={pkg.riskScore} />
                      <span className={`risk-badge ${pkg.riskLevel}`}>
                        {pkg.riskLevel}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ScoreBarInline({ score }: { score: number }) {
  const color = score < 20 ? 'var(--color-safe)'
    : score < 50 ? 'var(--color-warning)'
    : 'var(--color-danger)';

  return (
    <div className="score-bar-inline">
      <span style={{ fontSize: 12, color: 'var(--color-text-muted)', minWidth: 20, textAlign: 'right' }}>
        {score}
      </span>
      <div className="score-bar-track">
        <div
          className="score-bar-fill"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
    </div>
  );
}
