import React, { useState, useEffect, useCallback } from 'react';
import { api, StatsResponse, QueueStatsResponse, HealthMetricsResponse } from '../api';
import { usePolling } from '../hooks/usePolling';

export function StatsPage() {
  const [stats, setStats] = useState<StatsResponse['stats'] | null>(null);
  const [queue, setQueue] = useState<QueueStatsResponse['stats'] | null>(null);
  const [health, setHealth] = useState<HealthMetricsResponse['metrics'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [statsResp, queueResp, healthResp] = await Promise.all([
        api.getStats().catch(() => null),
        api.getQueueStats().catch(() => null),
        api.getHealthMetrics().catch(() => null),
      ]);
      if (statsResp?.stats) setStats(statsResp.stats);
      if (queueResp?.stats) setQueue(queueResp.stats);
      if (healthResp?.metrics) setHealth(healthResp.metrics);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  }, []);

  usePolling(fetchAll, 10000);

  if (loading) {
    return (
      <div className="empty-state">
        <div className="spinner" style={{ margin: '0 auto' }} />
      </div>
    );
  }

  if (error && !stats && !queue && !health) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div>
      {/* System overview */}
      {stats && (
        <>
          <div className="section-label">System overview</div>
          <div className="stats-grid" style={{ marginBottom: 24 }}>
            <StatCard value={fmt(stats.totalPackagesAnalyzed)} label="Total analyzed" />
            <StatCard value={fmt(stats.malwareDetected)} label="Malware detected" accent="danger" />
            <StatCard value={`${stats.successRate}%`} label="Success rate" accent="safe" />
            <StatCard value={`${stats.cacheHitRate}%`} label="Cache hit rate" />
            <StatCard value={fmt(stats.packagesAnalyzedToday)} label="Analyzed today" />
            <StatCard value={String(stats.currentlyAnalyzing)} label="Currently analyzing" />
          </div>
        </>
      )}

      {/* Queue status */}
      {queue && (
        <>
          <div className="section-label">Queue</div>
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="stats-grid">
              <div>
                <div className="stat-value">{queue.bullmq.waiting}</div>
                <div className="stat-label">Waiting</div>
              </div>
              <div>
                <div className="stat-value">{queue.bullmq.active}</div>
                <div className="stat-label">Active</div>
              </div>
              <div>
                <div className="stat-value">{queue.bullmq.completed}</div>
                <div className="stat-label">Completed</div>
              </div>
              <div>
                <div className="stat-value">{queue.bullmq.failed}</div>
                <div className="stat-label">Failed</div>
              </div>
              <div>
                <div className="stat-value">{queue.failureRate}%</div>
                <div className="stat-label">Failure rate</div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Health */}
      {health && (
        <>
          <div className="section-label">Health metrics</div>
          <div className="stats-grid">
            <StatCard
              value={`${health.safePackagePercentage}%`}
              label="Safe packages"
              accent="safe"
            />
            <StatCard
              value={`${health.threatDetectionRate}%`}
              label="Threat detection rate"
              accent="danger"
            />
            <StatCard
              value={`${health.analysisCoverage}%`}
              label="Analysis coverage"
            />
            <StatCard
              value={String(health.averageRiskScore)}
              label="Average risk score"
            />
            <StatCard value={fmt(health.totalPackages)} label="Total packages" />
            <StatCard value={fmt(health.totalThreats)} label="Total threats" />
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  value,
  label,
  accent,
}: {
  value: string;
  label: string;
  accent?: 'safe' | 'danger';
}) {
  const color = accent === 'safe' ? 'var(--color-safe)'
    : accent === 'danger' ? 'var(--color-danger)'
    : undefined;

  return (
    <div className="stat-card">
      <div className="stat-value" style={color ? { color } : undefined}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}
