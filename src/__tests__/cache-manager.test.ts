import { ContentDeduplicationCache, CACHE_KEYS, CACHE_TTL } from '../utils/cache-manager';
import { FileHashResult, PackageHashResult } from '../utils/hash';
import { AnalysisResult } from '../types';

// Mock Redis cache
jest.mock('../utils/redis', () => ({
  redisCache: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
  },
}));

// Mock logger
jest.mock('../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    cacheHit: jest.fn(),
    cacheMiss: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

import { redisCache } from '../utils/redis';
import { logger } from '../utils/logger';

describe('ContentDeduplicationCache', () => {
  let cache: ContentDeduplicationCache;
  const mockRedisCache = redisCache as jest.Mocked<typeof redisCache>;

  beforeEach(() => {
    cache = new ContentDeduplicationCache();
    jest.clearAllMocks();
  });

  describe('File Hash Caching', () => {
    test('should cache file hash result successfully', async () => {
      const filePath = 'test.js';
      const content = 'test content';
      const hashResult: FileHashResult = {
        contentHash: 'abc123',
        size: 12,
        lines: 1,
        isText: true,
        encoding: 'utf8',
      };

      mockRedisCache.set.mockResolvedValue(true);

      const success = await cache.cacheFileHash(filePath, content, hashResult);

      expect(success).toBe(true);
      expect(mockRedisCache.set).toHaveBeenCalledWith(
        expect.stringContaining(CACHE_KEYS.FILE_HASH),
        hashResult,
        CACHE_TTL.FILE_HASH
      );
    });

    test('should retrieve cached file hash result', async () => {
      const filePath = 'test.js';
      const contentLength = 12;
      const hashResult: FileHashResult = {
        contentHash: 'abc123',
        size: 12,
        lines: 1,
        isText: true,
        encoding: 'utf8',
      };

      mockRedisCache.get.mockResolvedValue(hashResult);

      const result = await cache.getCachedFileHash(filePath, contentLength);

      expect(result).toEqual(hashResult);
      expect(mockRedisCache.get).toHaveBeenCalledWith(
        expect.stringContaining(CACHE_KEYS.FILE_HASH)
      );
      expect(logger.cacheHit).toHaveBeenCalled();
    });

    test('should handle cache miss for file hash', async () => {
      const filePath = 'test.js';
      const contentLength = 12;

      mockRedisCache.get.mockResolvedValue(null);

      const result = await cache.getCachedFileHash(filePath, contentLength);

      expect(result).toBeNull();
      expect(logger.cacheMiss).toHaveBeenCalled();
    });
  });

  describe('Package Hash Caching', () => {
    test('should cache package hash result successfully', async () => {
      const packageName = 'test-package';
      const version = '1.0.0';
      const hashResult: PackageHashResult = {
        packageHash: 'pkg123',
        fileCount: 2,
        totalSize: 1024,
        uniqueFiles: 2,
        duplicateFiles: [],
        fileHashes: new Map(),
      };

      mockRedisCache.set.mockResolvedValue(true);

      const success = await cache.cachePackageHash(packageName, version, hashResult);

      expect(success).toBe(true);
      expect(mockRedisCache.set).toHaveBeenCalledWith(
        `${CACHE_KEYS.PACKAGE_HASH}:${packageName}:${version}`,
        hashResult,
        CACHE_TTL.PACKAGE_HASH
      );
    });

    test('should retrieve cached package hash result', async () => {
      const packageName = 'test-package';
      const version = '1.0.0';
      const hashResult: PackageHashResult = {
        packageHash: 'pkg123',
        fileCount: 2,
        totalSize: 1024,
        uniqueFiles: 2,
        duplicateFiles: [],
        fileHashes: new Map(),
      };

      mockRedisCache.get.mockResolvedValue(hashResult);

      const result = await cache.getCachedPackageHash(packageName, version);

      expect(result).toEqual(hashResult);
      expect(logger.cacheHit).toHaveBeenCalled();
    });
  });

  describe('Analysis Result Caching', () => {
    test('should cache analysis result successfully', async () => {
      const packageHash = 'pkg123';
      const analysisResult: AnalysisResult = {
        packageId: 'test-id',
        overallScore: 25,
        riskLevel: 'low',
        stages: {
          static: { 
            score: 20, 
            suspiciousPatterns: [], 
            riskIndicators: {} as any,
            obfuscationScore: 0,
            typosquattingScore: 0,
            integrityFlags: [],
            confidence: 0.9
          },
        },
        metadata: {
          name: 'test-package',
          version: '1.0.0',
        },
        processingTime: 1000,
        cacheHit: false,
      };

      mockRedisCache.set.mockResolvedValue(true);

      const success = await cache.cacheAnalysisResult(packageHash, analysisResult);

      expect(success).toBe(true);
      expect(mockRedisCache.set).toHaveBeenCalledWith(
        `${CACHE_KEYS.ANALYSIS_RESULT}:${packageHash}`,
        analysisResult,
        CACHE_TTL.ANALYSIS_RESULT
      );
    });

    test('should retrieve cached analysis result and mark as cache hit', async () => {
      const packageHash = 'pkg123';
      const analysisResult: AnalysisResult = {
        packageId: 'test-id',
        overallScore: 25,
        riskLevel: 'low',
        stages: {
          static: { 
            score: 20, 
            suspiciousPatterns: [], 
            riskIndicators: {} as any,
            obfuscationScore: 0,
            typosquattingScore: 0,
            integrityFlags: [],
            confidence: 0.9
          },
        },
        metadata: {
          name: 'test-package',
          version: '1.0.0',
        },
        processingTime: 1000,
        cacheHit: false,
      };

      mockRedisCache.get.mockResolvedValue(analysisResult);

      const result = await cache.getCachedAnalysisResult(packageHash);

      expect(result).toBeDefined();
      expect(result!.cacheHit).toBe(true);
      expect(logger.cacheHit).toHaveBeenCalled();
    });
  });

  describe('Content Deduplication', () => {
    test('should get files with identical content', async () => {
      const contentHash = 'content123';
      const filePaths = ['file1.js', 'file2.js'];

      mockRedisCache.get.mockResolvedValue(filePaths);

      const result = await cache.getFilesWithContent(contentHash);

      expect(result).toEqual(filePaths);
      expect(mockRedisCache.get).toHaveBeenCalledWith(
        `${CACHE_KEYS.CONTENT_DEDUP}:${contentHash}`
      );
    });

    test('should return empty array when no files found', async () => {
      const contentHash = 'content123';

      mockRedisCache.get.mockResolvedValue(null);

      const result = await cache.getFilesWithContent(contentHash);

      expect(result).toEqual([]);
    });
  });

  describe('Cache Management', () => {
    test('should get cache statistics', async () => {
      mockRedisCache.keys.mockResolvedValue(['key1', 'key2', 'key3']);

      const stats = await cache.getCacheStats();

      expect(stats).toBeDefined();
      expect(stats.totalKeys).toBe(3);
      expect(stats.hitRate).toBeGreaterThanOrEqual(0);
      expect(stats.memoryUsage).toBeGreaterThan(0);
    });

    test('should clear cache successfully', async () => {
      mockRedisCache.keys
        .mockResolvedValueOnce(['fh:key1', 'fh:key2'])
        .mockResolvedValueOnce(['ph:key1'])
        .mockResolvedValueOnce(['ar:key1'])
        .mockResolvedValueOnce(['cd:key1']);
      
      mockRedisCache.del.mockResolvedValue(true);

      const success = await cache.clearCache();

      expect(success).toBe(true);
      expect(mockRedisCache.del).toHaveBeenCalledTimes(5); // Total keys across all patterns
    });

    test('should perform LRU eviction', async () => {
      const keys = Array.from({ length: 15 }, (_, i) => `fh:key${i}`);
      mockRedisCache.keys.mockResolvedValue(keys);
      mockRedisCache.del.mockResolvedValue(true);

      const evictedCount = await cache.evictLRU(10);

      expect(evictedCount).toBe(5); // 15 - 10 = 5 evicted
      expect(mockRedisCache.del).toHaveBeenCalledTimes(5);
    });

    test('should handle warm cache operation', async () => {
      const popularPackages = ['lodash', 'express', 'react'];

      await cache.warmCache(popularPackages);

      expect(logger.info).toHaveBeenCalledWith(
        'Starting cache warm-up',
        { packageCount: 3 }
      );
      expect(logger.info).toHaveBeenCalledWith('Cache warm-up completed');
    });
  });

  describe('Error Handling', () => {
    test('should handle Redis errors gracefully', async () => {
      const filePath = 'test.js';
      const contentLength = 12;

      mockRedisCache.get.mockRejectedValue(new Error('Redis connection failed'));

      const result = await cache.getCachedFileHash(filePath, contentLength);

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to get cached file hash',
        expect.objectContaining({ filePath, error: expect.any(Error) })
      );
    });

    test('should handle cache set errors gracefully', async () => {
      const filePath = 'test.js';
      const content = 'test content';
      const hashResult: FileHashResult = {
        contentHash: 'abc123',
        size: 12,
        lines: 1,
        isText: true,
        encoding: 'utf8',
      };

      mockRedisCache.set.mockRejectedValue(new Error('Redis write failed'));

      const success = await cache.cacheFileHash(filePath, content, hashResult);

      expect(success).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to cache file hash',
        expect.objectContaining({ filePath, error: expect.any(Error) })
      );
    });
  });
});