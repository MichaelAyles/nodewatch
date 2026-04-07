import dotenv from 'dotenv';

// Load environment variables from .env.local and .env files
dotenv.config({ path: '.env.local' });
dotenv.config();

export interface Config {
  // Server Configuration
  port: number;
  nodeEnv: string;
  logLevel: string;

  // Database Configuration
  database: {
    url: string;
  };

  // Redis Configuration
  redis: {
    url: string;
    password?: string;
  };

  // LLM Configuration
  llm: {
    anthropic: {
      apiKey?: string;
      model: string;
    };
    openrouter: {
      apiKey?: string;
      baseUrl: string;
      preferredModel: string;
      maxTokens: number;
    };
    local: {
      url: string;
      model: string;
    };
  };

  // Cost Tracking
  costTracking: {
    enabled: boolean;
    alertThresholdUsd: number;
    dailyBudgetUsd: number;
  };

  // Admin Dashboard
  admin: {
    enabled: boolean;
    username: string;
    password: string;
  };

  // Analysis Configuration
  analysis: {
    maxConcurrent: number;
    timeoutMs: number;
    cacheTtlHours: number;
    maxFileSizeMB: number;
  };

  // Sandbox Configuration
  sandbox: {
    timeoutMs: number;
    memoryLimitMB: number;
    dockerSocketPath: string;
  };

  // Rate Limiting
  rateLimits: {
    npmRegistry: number;
    llmApi: number;
    apiPerHour: number;
  };

  // Monitoring
  monitoring: {
    enabled: boolean;
    metricsPort: number;
    webhookSecret: string;
  };
}

function getEnvVar(name: string, defaultValue?: string): string {
  const value = process.env[name];
  if (!value && defaultValue === undefined) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value || defaultValue || '';
}

function getEnvNumber(name: string, defaultValue: number): number {
  const value = process.env[name];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be a number`);
  }
  return parsed;
}

function getEnvBoolean(name: string, defaultValue: boolean): boolean {
  const value = process.env[name];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
}

const nodeEnv = getEnvVar('NODE_ENV', 'development');

export const config: Config = {
  port: getEnvNumber('PORT', 3000),
  nodeEnv,
  logLevel: getEnvVar('LOG_LEVEL', 'info'),

  database: {
    url: getEnvVar('DATABASE_URL', ''),
  },

  redis: {
    url: getEnvVar('REDIS_URL', 'redis://localhost:6379'),
    password: process.env.REDIS_PASSWORD,
  },

  llm: {
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: getEnvVar('LLM_MODEL', 'claude-sonnet-4-6'),
    },
    openrouter: {
      apiKey: process.env.OPENROUTER_API_KEY,
      baseUrl: getEnvVar('OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1'),
      preferredModel: getEnvVar('OPENROUTER_PREFERRED_MODEL', 'openrouter/sonoma-sky-alpha'),
      maxTokens: getEnvNumber('OPENROUTER_MAX_TOKENS', 4000),
    },
    local: {
      url: getEnvVar('LOCAL_LLM_URL', 'http://localhost:11434'),
      model: getEnvVar('LOCAL_LLM_MODEL', 'llama3'),
    },
  },

  costTracking: {
    enabled: getEnvBoolean('ENABLE_COST_TRACKING', true),
    alertThresholdUsd: parseFloat(getEnvVar('COST_ALERT_THRESHOLD_USD', '50.00')),
    dailyBudgetUsd: parseFloat(getEnvVar('DAILY_BUDGET_USD', '100.00')),
  },

  admin: {
    enabled: getEnvBoolean('ADMIN_ENABLED', true),
    username: getEnvVar('ADMIN_USERNAME', 'admin'),
    password: getEnvVar('ADMIN_PASSWORD', 'change-me-in-production'),
  },

  analysis: {
    maxConcurrent: getEnvNumber('MAX_CONCURRENT_ANALYSES', 5),
    timeoutMs: getEnvNumber('ANALYSIS_TIMEOUT_MS', 300000),
    cacheTtlHours: getEnvNumber('CACHE_TTL_HOURS', 24),
    maxFileSizeMB: getEnvNumber('MAX_FILE_SIZE_MB', 10),
  },

  sandbox: {
    timeoutMs: getEnvNumber('SANDBOX_TIMEOUT_MS', 120000),
    memoryLimitMB: getEnvNumber('SANDBOX_MEMORY_LIMIT_MB', 512),
    dockerSocketPath: getEnvVar('DOCKER_SOCKET_PATH', '/var/run/docker.sock'),
  },

  rateLimits: {
    npmRegistry: getEnvNumber('NPM_REGISTRY_RATE_LIMIT', 100),
    llmApi: getEnvNumber('LLM_API_RATE_LIMIT', 60),
    apiPerHour: getEnvNumber('API_RATE_LIMIT_PER_HOUR', 1000),
  },

  monitoring: {
    enabled: getEnvBoolean('ENABLE_METRICS', true),
    metricsPort: getEnvNumber('METRICS_PORT', 9090),
    webhookSecret: getEnvVar('WEBHOOK_SECRET', 'default-secret'),
  },
};

// Validate configuration
export function validateConfig(): void {
  const errors: string[] = [];

  // Database validation is optional — pipeline degrades gracefully without it

  if (config.nodeEnv === 'production') {
    if (!config.llm.anthropic.apiKey && !config.llm.openrouter.apiKey) {
      console.warn('Warning: No LLM API key configured. Analysis will use mock results.');
    }

    if (config.admin.password === 'change-me-in-production') {
      console.warn('Warning: ADMIN_PASSWORD should be changed from default in production');
    }
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

// Initialize and validate configuration
try {
  validateConfig();
  console.log(`Configuration loaded for ${config.nodeEnv} environment`);
} catch (error) {
  console.error('Configuration error:', error);
  process.exit(1);
}