// Browser-compatible logger that doesn't depend on Node.js modules

export interface Logger {
  info: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  debug: (message: string, ...args: any[]) => void;
  apiRequest: (method: string, url: string, ip?: string) => void;
  apiError: (method: string, url: string, error: any, ip?: string) => void;
}

class BrowserLogger implements Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  info(message: string, ...args: any[]): void {
    if (this.isDevelopment) {
      console.log(`[INFO] ${message}`, ...args);
    }
  }

  error(message: string, ...args: any[]): void {
    console.error(`[ERROR] ${message}`, ...args);
  }

  warn(message: string, ...args: any[]): void {
    if (this.isDevelopment) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  debug(message: string, ...args: any[]): void {
    if (this.isDevelopment) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }

  apiRequest(method: string, url: string, ip?: string): void {
    if (this.isDevelopment) {
      console.log(`[API] ${method} ${url}${ip ? ` from ${ip}` : ''}`);
    }
  }

  apiError(method: string, url: string, error: any, ip?: string): void {
    console.error(`[API ERROR] ${method} ${url}${ip ? ` from ${ip}` : ''}`, error);
  }
}

export const browserLogger = new BrowserLogger();