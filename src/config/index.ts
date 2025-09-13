import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface Config {
  // Server Configuration
  port: number;
  nodeEnv: string;
  logLevel: string;

  // Database Configuration
  convex: {
    url: string;
    deployment: string;
  };

  // Redis Configuration
  redis: {
    url: string;
    password?: string;
  };

  // LLM Configuration
  llm: {
    openai: {
      apiKey?: string;
      model: string;
      maxTokens: number;
    };
    anthropic: {
      apiKey?: string;
      model: string;
      maxTokens: number;
    };
    local: {
      url: string;
      model: string;
    };
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
  if (!value && !defaultValue) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value || defaultValue!;
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

export const config: Config = {
  port: getEnvNumber('PORT', 3000),
  nodeEnv: getEnvVar('NODE_ENV', 'development'),
  logLevel: getEnvVar('LOG_LEVEL', 'info'),

  convex: {
    url: getEnvVar('CONVEX_URL'),
    deployment: getEnvVar('CONVEX_DEPLOYMENT'),
  },

  redis: {
    url: getEnvVar('REDIS_URL', 'redis://localhost:6379'),
    password: process.env.REDIS_PASSWORD,
  },

  llm: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: getEnvVar('OPENAI_MODEL', 'gpt-4'),
      maxTokens: getEnvNumber('OPENAI_MAX_TOKENS', 4000),
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: getEnvVar('ANTHROPIC_MODEL', 'claude-3-sonnet-20240229'),
      maxTokens: getEnvNumber('ANTHROPIC_MAX_TOKENS', 4000),
    },
    local: {
      url: getEnvVar('LOCAL_LLM_URL', 'http://localhost:11434'),
      model: getEnvVar('LOCAL_LLM_MODEL', 'llama3'),
    },
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

  if (!config.convex.url) {
    errors.push('CONVEX_URL is required');
  }

  if (!config.convex.deployment) {
    errors.push('CONVEX_DEPLOYMENT is required');
  }

  if (config.nodeEnv === 'production') {
    if (!config.llm.openai.apiKey && !config.llm.anthropic.apiKey) {
      errors.push('At least one LLM API key (OPENAI_API_KEY or ANTHROPIC_API_KEY) is required in production');
    }

    if (config.monitoring.webhookSecret === 'default-secret') {
      errors.push('WEBHOOK_SECRET should be changed from default in production');
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