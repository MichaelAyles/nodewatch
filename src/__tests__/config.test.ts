import { config } from '../config';

describe('Configuration', () => {
  test('should load configuration successfully', () => {
    expect(config).toBeDefined();
    expect(config.port).toBeGreaterThan(0);
    expect(config.nodeEnv).toBeDefined();
  });

  test('should have required convex configuration', () => {
    expect(config.convex.url).toBeDefined();
    expect(config.convex.deployment).toBeDefined();
  });

  test('should have redis configuration', () => {
    expect(config.redis.url).toBeDefined();
    expect(config.redis.url).toContain('redis://');
  });

  test('should have analysis configuration with reasonable defaults', () => {
    expect(config.analysis.maxConcurrent).toBeGreaterThan(0);
    expect(config.analysis.timeoutMs).toBeGreaterThan(0);
    expect(config.analysis.cacheTtlHours).toBeGreaterThan(0);
  });

  test('should have sandbox configuration', () => {
    expect(config.sandbox.timeoutMs).toBeGreaterThan(0);
    expect(config.sandbox.memoryLimitMB).toBeGreaterThan(0);
  });
});