import React from 'react';

interface ScoreRingProps {
  score: number;
  riskLevel: string;
  size?: number;
}

function getScoreColor(riskLevel: string): string {
  switch (riskLevel) {
    case 'safe': return 'var(--color-safe)';
    case 'low': return 'var(--color-safe)';
    case 'medium': return 'var(--color-warning)';
    case 'high': return 'var(--color-danger)';
    case 'critical': return 'var(--color-danger)';
    default: return 'var(--color-text-muted)';
  }
}

export function ScoreRing({ score, riskLevel, size = 120 }: ScoreRingProps) {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreColor(riskLevel);

  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-border-light)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="score-ring-label">
        <div className="score-ring-value" style={{ color }}>{score}</div>
        <div className="score-ring-caption">{riskLevel}</div>
      </div>
    </div>
  );
}
