import * as crypto from 'crypto';

/**
 * Calculate SHA-256 hash of a string
 */
export function calculateHash(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Calculate SHA-256 hash of a buffer
 */
export function calculateBufferHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Calculate hash for a collection of files
 */
export function calculatePackageHash(files: Map<string, string>): string {
  // Sort files by path for consistent hashing
  const sortedFiles = Array.from(files.entries()).sort(([a], [b]) => a.localeCompare(b));
  
  const hash = crypto.createHash('sha256');
  
  for (const [filePath, content] of sortedFiles) {
    // Include both file path and content in hash
    hash.update(`${filePath}:${content}`, 'utf8');
  }
  
  return hash.digest('hex');
}

/**
 * Calculate hash for file metadata (path + size + modified time)
 */
export function calculateFileMetadataHash(filePath: string, size: number, mtime?: number): string {
  const content = `${filePath}:${size}:${mtime || 0}`;
  return calculateHash(content);
}

/**
 * Generate cache key for analysis results
 */
export function generateCacheKey(prefix: string, ...parts: string[]): string {
  const combined = parts.join(':');
  const hash = calculateHash(combined);
  return `${prefix}:${hash}`;
}

/**
 * Generate short hash (first 8 characters) for display purposes
 */
export function shortHash(hash: string): string {
  return hash.substring(0, 8);
}

/**
 * Verify hash integrity
 */
export function verifyHash(content: string, expectedHash: string): boolean {
  const actualHash = calculateHash(content);
  return actualHash === expectedHash;
}

/**
 * Calculate content similarity using hash comparison
 */
export function calculateSimilarity(hash1: string, hash2: string): number {
  if (hash1 === hash2) return 1.0;
  
  // For exact hash comparison, similarity is binary
  // In the future, we could implement fuzzy hashing for partial similarity
  return 0.0;
}

/**
 * Hash utilities for different content types
 */
export class ContentHasher {
  /**
   * Hash JavaScript/TypeScript code with normalization
   */
  static hashCode(code: string): string {
    // Normalize whitespace and remove comments for more stable hashing
    const normalized = code
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .replace(/\/\/.*$/gm, '') // Remove line comments
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    return calculateHash(normalized);
  }

  /**
   * Hash JSON with sorted keys
   */
  static hashJSON(obj: any): string {
    const sortedJSON = JSON.stringify(obj, Object.keys(obj).sort());
    return calculateHash(sortedJSON);
  }

  /**
   * Hash package.json with relevant fields only
   */
  static hashPackageJSON(packageJson: any): string {
    // Only hash fields that affect security analysis
    const relevantFields = {
      name: packageJson.name,
      version: packageJson.version,
      scripts: packageJson.scripts,
      dependencies: packageJson.dependencies,
      devDependencies: packageJson.devDependencies,
      main: packageJson.main,
      bin: packageJson.bin,
    };

    return this.hashJSON(relevantFields);
  }
}

/**
 * Deduplication helper class
 */
export class DeduplicationHelper {
  private static fileHashes = new Map<string, string>();
  private static packageHashes = new Map<string, string>();

  /**
   * Get or calculate file hash with caching
   */
  static getFileHash(filePath: string, content: string): string {
    const key = `${filePath}:${content.length}`;
    
    if (!this.fileHashes.has(key)) {
      const hash = calculateHash(content);
      this.fileHashes.set(key, hash);
    }
    
    return this.fileHashes.get(key)!;
  }

  /**
   * Get or calculate package hash with caching
   */
  static getPackageHash(packageName: string, version: string, files: Map<string, string>): string {
    const key = `${packageName}@${version}`;
    
    if (!this.packageHashes.has(key)) {
      const hash = calculatePackageHash(files);
      this.packageHashes.set(key, hash);
    }
    
    return this.packageHashes.get(key)!;
  }

  /**
   * Clear caches (useful for testing)
   */
  static clearCaches(): void {
    this.fileHashes.clear();
    this.packageHashes.clear();
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): { fileHashes: number; packageHashes: number } {
    return {
      fileHashes: this.fileHashes.size,
      packageHashes: this.packageHashes.size,
    };
  }
}