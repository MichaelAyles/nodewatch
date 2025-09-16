import io from 'socket.io-client';
import { browserLogger as logger } from './browser-logger';

export interface SystemStats {
  totalPackagesAnalyzed: number;
  malwareDetected: number;
  currentlyAnalyzing: number;
  queueDepth: number;
  analysisRate: number;
  packagesAnalyzedToday: number;
  recentMalwareCount: number;
  successRate: number;
  cacheHitRate: number;
  lastScanTime: number;
  completedPackages: number;
  failedPackages: number;
  pendingPackages: number;
}

export interface QueueStats {
  currentlyAnalyzing: number;
  queueDepth: number;
  timestamp: number;
}

export class WebSocketClient {
  private socket: any | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnected = false;
  
  // Event callbacks
  private onStatsUpdate?: (stats: SystemStats) => void;
  private onQueueUpdate?: (queueStats: QueueStats) => void;
  private onConnectionChange?: (connected: boolean) => void;

  constructor(private serverUrl: string = '') {
    // Use current host if no URL provided
    if (!serverUrl) {
      this.serverUrl = window.location.origin;
    }
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(this.serverUrl, {
          transports: ['websocket', 'polling'],
          timeout: 10000,
          reconnection: true,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: this.reconnectDelay,
        });

        this.socket.on('connect', () => {
          logger.info('WebSocket connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.onConnectionChange?.(true);
          resolve();
        });

        this.socket.on('disconnect', (reason: string) => {
          logger.info(`WebSocket disconnected: ${reason}`);
          this.isConnected = false;
          this.onConnectionChange?.(false);
        });

        this.socket.on('connect_error', (error: Error) => {
          logger.error('WebSocket connection error:', error);
          this.isConnected = false;
          this.onConnectionChange?.(false);
          
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            reject(new Error(`Failed to connect after ${this.maxReconnectAttempts} attempts`));
          }
        });

        this.socket.on('stats-update', (stats: SystemStats) => {
          logger.info('Received stats update via WebSocket');
          this.onStatsUpdate?.(stats);
        });

        this.socket.on('queue-update', (queueStats: QueueStats) => {
          logger.info('Received queue update via WebSocket');
          this.onQueueUpdate?.(queueStats);
        });

        // Set a timeout for initial connection
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('WebSocket connection timeout'));
          }
        }, 10000);

      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.onConnectionChange?.(false);
    }
  }

  subscribeToStats(): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('subscribe-stats');
      logger.info('Subscribed to stats updates');
    }
  }

  unsubscribeFromStats(): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('unsubscribe-stats');
      logger.info('Unsubscribed from stats updates');
    }
  }

  // Event handler setters
  setOnStatsUpdate(callback: (stats: SystemStats) => void): void {
    this.onStatsUpdate = callback;
  }

  setOnQueueUpdate(callback: (queueStats: QueueStats) => void): void {
    this.onQueueUpdate = callback;
  }

  setOnConnectionChange(callback: (connected: boolean) => void): void {
    this.onConnectionChange = callback;
  }

  // Getters
  get connected(): boolean {
    return this.isConnected;
  }

  get socketId(): string | undefined {
    return this.socket?.id;
  }
}

// Singleton instance for global use
let globalWebSocketClient: WebSocketClient | null = null;

export function getWebSocketClient(serverUrl?: string): WebSocketClient {
  if (!globalWebSocketClient) {
    globalWebSocketClient = new WebSocketClient(serverUrl);
  }
  return globalWebSocketClient;
}

export function closeWebSocketClient(): void {
  if (globalWebSocketClient) {
    globalWebSocketClient.disconnect();
    globalWebSocketClient = null;
  }
}