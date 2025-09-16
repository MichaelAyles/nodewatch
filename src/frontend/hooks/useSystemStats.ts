import { useState, useEffect, useCallback } from 'react';
import { getApiClient, SystemStats, ApiResponse } from '../../utils/api-client';
import { useStatsWebSocket } from './useWebSocket';

interface UseSystemStatsReturn {
  stats: SystemStats | null;
  loading: boolean;
  error: string | null;
  cached: boolean;
  stale: boolean;
  lastUpdated: number | null;
  refresh: () => Promise<void>;
  connected: boolean; // WebSocket connection status
}

export function useSystemStats(enableRealTime: boolean = true): UseSystemStatsReturn {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState(false);
  const [stale, setStale] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const apiClient = getApiClient();
  
  // WebSocket integration for real-time updates
  const { connected, stats: wsStats } = useStatsWebSocket();

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response: ApiResponse<SystemStats> = await apiClient.getSystemStats();
      
      if (response.success && response.data) {
        setStats(response.data);
        setCached(response.cached || false);
        setStale(response.stale || false);
        setLastUpdated(response.timestamp || Date.now());
      } else {
        setError(response.error || 'Failed to fetch system stats');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  const refresh = useCallback(async () => {
    await fetchStats();
  }, [fetchStats]);

  // Initial fetch
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Handle WebSocket updates
  useEffect(() => {
    if (enableRealTime && wsStats && connected) {
      setStats(wsStats);
      setCached(false);
      setStale(false);
      setLastUpdated(Date.now());
    }
  }, [enableRealTime, wsStats, connected]);

  // Auto-refresh fallback when WebSocket is not connected
  useEffect(() => {
    if (!enableRealTime || !connected) {
      const interval = setInterval(() => {
        if (!loading) {
          fetchStats();
        }
      }, 30000); // Refresh every 30 seconds

      return () => clearInterval(interval);
    }
  }, [enableRealTime, connected, loading, fetchStats]);

  return {
    stats,
    loading,
    error,
    cached,
    stale,
    lastUpdated,
    refresh,
    connected: enableRealTime ? connected : false,
  };
}

// Hook for queue stats specifically
export function useQueueStats(enableRealTime: boolean = true) {
  const [queueStats, setQueueStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiClient = getApiClient();
  const { connected, queueStats: wsQueueStats } = useStatsWebSocket();

  const fetchQueueStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.getQueueStats();
      
      if (response.success && response.data) {
        setQueueStats(response.data);
      } else {
        setError(response.error || 'Failed to fetch queue stats');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  // Initial fetch
  useEffect(() => {
    fetchQueueStats();
  }, [fetchQueueStats]);

  // Handle WebSocket updates
  useEffect(() => {
    if (enableRealTime && wsQueueStats && connected) {
      setQueueStats(wsQueueStats);
    }
  }, [enableRealTime, wsQueueStats, connected]);

  // Auto-refresh fallback
  useEffect(() => {
    if (!enableRealTime || !connected) {
      const interval = setInterval(() => {
        if (!loading) {
          fetchQueueStats();
        }
      }, 15000); // Refresh every 15 seconds

      return () => clearInterval(interval);
    }
  }, [enableRealTime, connected, loading, fetchQueueStats]);

  return {
    queueStats,
    loading,
    error,
    connected: enableRealTime ? connected : false,
    refresh: fetchQueueStats,
  };
}