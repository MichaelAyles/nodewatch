import { config } from '../config';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

const LOG_LEVEL_MAP: Record<string, LogLevel> = {
  error: LogLevel.ERROR,
  warn: LogLevel.WARN,
  info: LogLevel.INFO,
  debug: LogLevel.DEBUG,
};

class Logger {
  private level: LogLevel;

  constructor() {
    this.level = LOG_LEVEL_MAP[config.logLevel] ?? LogLevel.INFO;
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.level;
  }

  private formatMessage(level: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const baseMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    
    if (meta) {
      return `${baseMessage} ${JSON.stringify(meta, null, 2)}`;
    }
    
    return baseMessage;
  }

  error(message: string, meta?: any): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage('error', message, meta));
    }
  }

  warn(message: string, meta?: any): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage('warn', message, meta));
    }
  }

  info(message: string, meta?: any): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatMessage('info', message, meta));
    }
  }

  debug(message: string, meta?: any): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(this.formatMessage('debug', message, meta));
    }
  }

  // Specialized logging methods
  analysisStart(packageName: string, version: string): void {
    this.info(`Starting analysis`, { package: `${packageName}@${version}` });
  }

  analysisComplete(packageName: string, version: string, duration: number, score: number): void {
    this.info(`Analysis complete`, {
      package: `${packageName}@${version}`,
      duration: `${duration}ms`,
      score,
    });
  }

  analysisError(packageName: string, version: string, error: Error): void {
    this.error(`Analysis failed`, {
      package: `${packageName}@${version}`,
      error: error.message,
      stack: error.stack,
    });
  }

  cacheHit(key: string): void {
    this.debug(`Cache hit`, { key });
  }

  cacheMiss(key: string): void {
    this.debug(`Cache miss`, { key });
  }

  queueJob(jobId: string, packageName: string): void {
    this.debug(`Job queued`, { jobId, package: packageName });
  }

  workerStart(workerId: string): void {
    this.info(`Worker started`, { workerId });
  }

  workerStop(workerId: string): void {
    this.info(`Worker stopped`, { workerId });
  }

  apiRequest(method: string, path: string, ip?: string): void {
    this.info(`API request`, { method, path, ip });
  }

  apiError(method: string, path: string, error: Error, ip?: string): void {
    this.error(`API error`, {
      method,
      path,
      ip,
      error: error.message,
    });
  }
}

export const logger = new Logger();