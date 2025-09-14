import { redisCache } from './redis';
import { logger } from './logger';
import { config } from '../config';
import { 
  FileHashResult, 
  PackageHashResult, 
  DeduplicationHelper,
  calculateHash 
} from './hash';
import { AnalysisResult } from '../types';

/**
 * Cache key prefixes for different data types
 */
export const CACHE_KEYS = {
  FILE_HASH: 'fh',           // File hash results
  PACKAGE_HASH: 'ph',        // Package hash results  
  ANALYSIS_RESULT: 'ar',     // Complete analysis results
  CONTENT_DEDUP: 'cd',       // Content deduplication mapping
  STATS: 'stats',            // Cache statistics
} as const;

/**
 * Cache TTL values in seconds
 */
export const CACHE_TTL = {
  FILE_HASH: 24 * 60 * 60,        // 24 hours
  PACKAGE_HASH: 12 * 60 * 60,     // 12 hours
  ANALYSIS_RESULT: 7 * 24 * 60 * 60, // 7 days
  CONTENT_DEDUP: 24 * 60 * 60,    // 24 hours
  STATS: 60 * 60,                 // 1 hour
} as const;

/**
 * Cache statistics interface
 */
export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalKeys: number;
  memoryUsage: number;
  deduplicationSavings: {
    totalFiles: number;
    uniqueContent: number;
    duplicateContent: number;
    spaceSavedBytes: number;
  };
}

/**
 * Content deduplication cache manager
 */
export class ContentDeduplicationCache {
  private hitCount = 0;
  private missCount = 0;

  /**
   * Generate cache key for file hash
   */
  private generateFileHashKey(filePath: string, contentLength: number): string {
    const key = `${filePath}:${contentLength}`;
    return `${CACHE_KEYS.FILE_HASH}:${calculateHash(key).substring(0, 16)}`;
  }

  /**
   * Generate cache key for package hash
   */
  private generatePackageHashKey(packageName: string, version: string): string {
    return `${CACHE_KEYS.PACKAGE_HASH}:${packageName}:${version}`;
  }

  /**
   * Generate cache key for analysis result
   */
  private generateAnalysisKey(packageHash: string): string {
    return `${CACHE_KEYS.ANALYSIS_RESULT}:${packageHash}`;
  }

  /**
   * Generate cache key for content deduplication
   */
  private generateContentDedupKey(contentHash: string): string {
    return `${CACHE_KEYS.CONTENT_DEDUP}:${contentHash}`;
  }

  /**
   * Cache file hash result
   */
  async cacheFileHash(
    filePath: string, 
    content: string, 
    result: FileHashResult
  ): Promise<boolean> {
    try {
      const key = this.generateFileHashKey(filePath, content.length);
      const success = await redisCache.set(key, result, CACHE_TTL.FILE_HASH);
      
      if (success) {
        // Also cache content deduplication mapping
        await this.cacheContentMapping(result.contentHash, filePath);
        logger.debug('Cached file hash', { filePath, contentHash: result.contentHash });
      }
      
      return success;
    } catch (error) {
      logger.error('Failed to cache file hash', { filePath, error });
      return false;
    }
  }

  /**
   * Get cached file hash result
   */
  async getCachedFileHash(filePath: string, contentLength: number): Promise<FileHashResult | null> {
    try {
      const key = this.generateFileHashKey(filePath, contentLength);
      const result = await redisCache.get<FileHashResult>(key);
      
      if (result) {
        this.hitCount++;
        logger.cacheHit(key);
        return result;
      } else {
        this.missCount++;
        logger.cacheMiss(key);
        return null;
      }
    } catch (error) {
      logger.error('Failed to get cached file hash', { filePath, error });
      this.missCount++;
      return null;
    }
  }

  /**
   * Cache package hash result
   */
  async cachePackageHash(
    packageName: string, 
    version: string, 
    result: PackageHashResult
  ): Promise<boolean> {
    try {
      const key = this.generatePackageHashKey(packageName, version);
      const success = await redisCache.set(key, result, CACHE_TTL.PACKAGE_HASH);
      
      if (success) {
        logger.debug('Cached package hash', { 
          package: `${packageName}@${version}`, 
          packageHash: result.packageHash 
        });
      }
      
      return success;
    } catch (error) {
      logger.error('Failed to cache package hash', { packageName, version, error });
      return false;
    }
  }

  /**
   * Get cached package hash result
   */
  async getCachedPackageHash(packageName: string, version: string): Promise<PackageHashResult | null> {
    try {
      const key = this.generatePackageHashKey(packageName, version);
      const result = await redisCache.get<PackageHashResult>(key);
      
      if (result) {
        this.hitCount++;
        logger.cacheHit(key);
        return result;
      } else {
        this.missCount++;
        logger.cacheMiss(key);
        return null;
      }
    } catch (error) {
      logger.error('Failed to get cached package hash', { packageName, version, error });
      this.missCount++;
      return null;
    }
  }

  /**
   * Cache complete analysis result by package hash
   */
  async cacheAnalysisResult(packageHash: string, result: AnalysisResult): Promise<boolean> {
    try {
      const key = this.generateAnalysisKey(packageHash);
      const success = await redisCache.set(key, result, CACHE_TTL.ANALYSIS_RESULT);
      
      if (success) {
        logger.debug('Cached analysis result', { 
          packageHash, 
          package: `${result.metadata.name}@${result.metadata.version}`,
          score: result.overallScore 
        });
      }
      
      return success;
    } catch (error) {
      logger.error('Failed to cache analysis result', { packageHash, error });
      return false;
    }
  }

  /**
   * Get cached analysis result by package hash
   */
  async getCachedAnalysisResult(packageHash: string): Promise<AnalysisResult | null> {
    try {
      const key = this.generateAnalysisKey(packageHash);
      const result = await redisCache.get<AnalysisResult>(key);
      
      if (result) {
        this.hitCount++;
        logger.cacheHit(key);
        
        // Mark as cache hit in result
        result.cacheHit = true;
        
        return result;
      } else {
        this.missCount++;
        logger.cacheMiss(key);
        return null;
      }
    } catch (error) {
      logger.error('Failed to get cached analysis result', { packageHash, error });
      this.missCount++;
      return null;
    }
  }

  /**
   * Cache content deduplication mapping
   */
  private async cacheContentMapping(contentHash: string, filePath: string): Promise<void> {
    try {
      const key = this.generateContentDedupKey(contentHash);
      const existing = await redisCache.get<string[]>(key) || [];
      
      if (!existing.includes(filePath)) {
        existing.push(filePath);
        await redisCache.set(key, existing, CACHE_TTL.CONTENT_DEDUP);
      }
    } catch (error) {
      logger.error('Failed to cache content mapping', { contentHash, filePath, error });
    }
  }

  /**
   * Get files with identical content
   */
  async getFilesWithContent(contentHash: string): Promise<string[]> {
    try {
      const key = this.generateContentDedupKey(contentHash);
      return await redisCache.get<string[]>(key) || [];
    } catch (error) {
      logger.error('Failed to get files with content', { contentHash, error });
      return [];
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<CacheStats> {
    try {
      const totalRequests = this.hitCount + this.missCount;
      const hitRate = totalRequests > 0 ? this.hitCount / totalRequests : 0;
      
      // Get Redis memory usage (approximate)
      const keys = await redisCache.keys(`${CACHE_KEYS.FILE_HASH}:*`);
      const totalKeys = keys.length;
      
      // Get deduplication stats from in-memory helper
      const dedupStats = DeduplicationHelper.getDeduplicationStats();
      
      return {
        hits: this.hitCount,
        misses: this.missCount,
        hitRate,
        totalKeys,
        memoryUsage: totalKeys * 1024, // Rough estimate
        deduplicationSavings: dedupStats,
      };
    } catch (error) {
      logger.error('Failed to get cache stats', error);
      return {
        hits: this.hitCount,
        misses: this.missCount,
        hitRate: 0,
        totalKeys: 0,
        memoryUsage: 0,
        deduplicationSavings: {
          totalFiles: 0,
          uniqueContent: 0,
          duplicateContent: 0,
          spaceSavedBytes: 0,
        },
      };
    }
  }

  /**
   * Clear all cache entries
   */
  async clearCache(): Promise<boolean> {
    try {
      const patterns = [
        `${CACHE_KEYS.FILE_HASH}:*`,
        `${CACHE_KEYS.PACKAGE_HASH}:*`,
        `${CACHE_KEYS.ANALYSIS_RESULT}:*`,
        `${CACHE_KEYS.CONTENT_DEDUP}:*`,
      ];

      for (const pattern of patterns) {
        const keys = await redisCache.keys(pattern);
        if (keys.length > 0) {
          for (const key of keys) {
            await redisCache.del(key);
          }
        }
      }

      // Reset counters
      this.hitCount = 0;
      this.missCount = 0;

      logger.info('Cache cleared successfully');
      return true;
    } catch (error) {
      logger.error('Failed to clear cache', error);
      return false;
    }
  }

  /**
   * Warm cache with commonly used packages
   */
  async warmCache(popularPackages: string[]): Promise<void> {
    logger.info('Starting cache warm-up', { packageCount: popularPackages.length });
    
    // This would be implemented to pre-populate cache with popular packages
    // For now, just log the intent
    for (const pkg of popularPackages.slice(0, 10)) { // Limit to first 10
      logger.debug('Would warm cache for package', { package: pkg });
    }
    
    logger.info('Cache warm-up completed');
  }

  /**
   * Implement LRU eviction policy
   */
  async evictLRU(maxEntries: number = 10000): Promise<number> {
    try {
      const keys = await redisCache.keys(`${CACHE_KEYS.FILE_HASH}:*`);
      
      if (keys.length <= maxEntries) {
        return 0;
      }

      // Sort keys by last access time (this is simplified - Redis doesn't track this by default)
      // In production, you'd use Redis OBJECT IDLETIME or implement your own tracking
      const keysToEvict = keys.slice(0, keys.length - maxEntries);
      
      let evictedCount = 0;
      for (const key of keysToEvict) {
        const success = await redisCache.del(key);
        if (success) evictedCount++;
      }

      logger.info('LRU eviction completed', { evictedCount, remainingKeys: keys.length - evictedCount });
      return evictedCount;
    } catch (error) {
      logger.error('Failed to evict LRU entries', error);
      return 0;
    }
  }
}

// Export singleton instance
export const contentCache = new ContentDeduplicationCache();