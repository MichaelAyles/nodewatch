import React from 'react';
import { TrackedJob } from '../hooks/useJobTracker';

interface JobProgressProps {
  job: TrackedJob;
  onCancel: () => void;
}

const STAGES = [
  { key: 'queued', label: 'Queued' },
  { key: 'downloading', label: 'Downloading package' },
  { key: 'extracting', label: 'Extracting files' },
  { key: 'static', label: 'Static analysis' },
  { key: 'llm', label: 'LLM analysis' },
  { key: 'scoring', label: 'Risk scoring' },
];

function getActiveStageIndex(job: TrackedJob): number {
  if (job.phase === 'queued') return 0;
  if (job.stage) {
    const idx = STAGES.findIndex(s => s.key === job.stage);
    if (idx >= 0) return idx;
  }
  // Estimate from progress
  if (job.progress < 10) return 1;
  if (job.progress < 25) return 2;
  if (job.progress < 60) return 3;
  if (job.progress < 85) return 4;
  return 5;
}

function elapsed(startedAt: number): string {
  const sec = Math.floor((Date.now() - startedAt) / 1000);
  if (sec < 60) return `${sec}s`;
  return `${Math.floor(sec / 60)}m ${sec % 60}s`;
}

export function JobProgress({ job, onCancel }: JobProgressProps) {
  const activeIdx = getActiveStageIndex(job);
  const [, forceUpdate] = React.useState(0);

  // Tick the timer
  React.useEffect(() => {
    const id = setInterval(() => forceUpdate(n => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">
            Analyzing {job.packageName}@{job.version}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
            {elapsed(job.startedAt)} elapsed
          </div>
        </div>
        <button className="btn btn-secondary" onClick={onCancel} style={{ fontSize: 12, padding: '4px 12px' }}>
          Cancel
        </button>
      </div>

      <div className="progress-bar" style={{ marginBottom: 16 }}>
        <div className="progress-bar-fill" style={{ width: `${job.progress}%` }} />
      </div>

      <div className="stage-list">
        {STAGES.map((stage, i) => {
          let status: 'completed' | 'active' | 'pending';
          if (i < activeIdx) status = 'completed';
          else if (i === activeIdx) status = 'active';
          else status = 'pending';

          return (
            <div key={stage.key} className={`stage-item ${status}`}>
              <div className={`stage-dot ${status}`} />
              {stage.label}
              {status === 'completed' && (
                <span style={{ marginLeft: 'auto', fontSize: 11 }}>done</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
