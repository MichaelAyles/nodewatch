// Jest setup file for NodeWatch tests

import { config } from '../config';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.REDIS_URL = 'redis://localhost:6379/1'; // Use different DB for tests
process.env.CONVEX_URL = 'test-convex-url';
process.env.CONVEX_DEPLOYMENT = 'test-deployment';

// Mock external services in tests
jest.mock('openai');
jest.mock('dockerode');
jest.mock('ioredis');

// Global test timeout
jest.setTimeout(30000);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Global test utilities
(global as any).testUtils = {
  createMockPackage: (name: string, version: string = '1.0.0') => ({
    name,
    version,
    description: `Test package ${name}`,
    maintainer: {
      username: 'test-user',
      email: 'test@example.com',
      twoFactorAuth: true,
      accountAge: 365,
    },
    dependencies: {},
    devDependencies: {},
    scripts: {},
    downloadCount: 1000,
    publishDate: Date.now() - 86400000, // 1 day ago
    lastModified: Date.now() - 3600000,  // 1 hour ago
  }),

  createMockFiles: () => new Map([
    ['package.json', JSON.stringify({ name: 'test', version: '1.0.0' })],
    ['index.js', 'console.log("Hello World");'],
    ['lib/utils.js', 'module.exports = { helper: () => {} };'],
  ]),

  sleep: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
};

// Type declarations for global test utilities
declare global {
  namespace NodeJS {
    interface Global {
      testUtils: {
        createMockPackage: (name: string, version?: string) => any;
        createMockFiles: () => Map<string, string>;
        sleep: (ms: number) => Promise<void>;
      };
    }
  }
}