import { useEffect, useState, useCallback } from 'react';
import { getWebSocketClient, SystemStats, QueueStats } from '../../utils/websocket-client';

interface UseWebSocketReturn {
  connected: boolean;
  stats: SystemStats | null;
  queueStats: QueueStats | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  subscribeToStats: () => void;
  unsubscribeFromStats: () => void;
}

export function useWebSocket(autoConnect: boolean = true): UseWebSocketReturn {
  const [connected, setConnected] = useState(false);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  
  const client = getWebSocketClient();

  const connect = useCallback(async () => {
    try {
      await client.connect();
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }, [client]);

  const disconnect = useCallback(() => {
    client.disconnect();
  }, [client]);

  const subscribeToStats = useCallback(() => {
    client.subscribeToStats();
  }, [client]);

  const unsubscribeFromStats = useCallback(() => {
    client.unsubscribeFromStats();
  }, [client]);

  useEffect(() => {
    // Set up event handlers
    client.setOnConnectionChange(setConnected);
    client.setOnStatsUpdate(setStats);
    client.setOnQueueUpdate(setQueueStats);

    // Auto-connect if requested
    if (autoConnect && !client.connected) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      if (!autoConnect) {
        disconnect();
      }
    };
  }, [client, autoConnect, connect, disconnect]);

  return {
    connected,
    stats,
    queueStats,
    connect,
    disconnect,
    subscribeToStats,
    unsubscribeFromStats,
  };
}

// Hook for stats-only subscription
export function useStatsWebSocket() {
  const { connected, stats, queueStats, subscribeToStats, unsubscribeFromStats } = useWebSocket();

  useEffect(() => {
    if (connected) {
      subscribeToStats();
    }

    return () => {
      if (connected) {
        unsubscribeFromStats();
      }
    };
  }, [connected, subscribeToStats, unsubscribeFromStats]);

  return {
    connected,
    stats,
    queueStats,
  };
}