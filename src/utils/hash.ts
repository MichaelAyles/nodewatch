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
 * Advanced file hashing with metadata
 */
export interface FileHashResult {
  contentHash: string;
  size: number;
  lines: number;
  isText: boolean;
  encoding?: string;
}

/**
 * Package hash result with detailed information
 */
export interface PackageHashResult {
  packageHash: string;
  fileCount: number;
  totalSize: number;
  uniqueFiles: number;
  duplicateFiles: string[];
  fileHashes: Map<string, FileHashResult>;
}

/**
 * Enhanced file hashing utilities
 */
export class FileHasher {
  /**
   * Calculate comprehensive hash information for a file
   */
  static hashFile(filePath: string, content: string): FileHashResult {
    const contentHash = calculateHash(content);
    const size = Buffer.byteLength(content, 'utf8');
    const lines = content.split('\n').length;
    const isText = this.isTextFile(filePath, content);
    
    return {
      contentHash,
      size,
      lines,
      isText,
      encoding: isText ? 'utf8' : 'binary',
    };
  }

  /**
   * Calculate hash for multiple files with deduplication detection
   */
  static hashFiles(files: Map<string, string>): PackageHashResult {
    const fileHashes = new Map<string, FileHashResult>();
    const contentToFiles = new Map<string, string[]>();
    let totalSize = 0;

    // Hash each file and track duplicates
    for (const [filePath, content] of files) {
      const hashResult = this.hashFile(filePath, content);
      fileHashes.set(filePath, hashResult);
      totalSize += hashResult.size;

      // Track files with identical content
      const existingFiles = contentToFiles.get(hashResult.contentHash) || [];
      existingFiles.push(filePath);
      contentToFiles.set(hashResult.contentHash, existingFiles);
    }

    // Find duplicates
    const duplicateFiles: string[] = [];
    for (const [hash, filePaths] of contentToFiles) {
      if (filePaths.length > 1) {
        duplicateFiles.push(...filePaths.slice(1)); // Keep first, mark rest as duplicates
      }
    }

    // Calculate package hash from sorted file hashes
    const sortedHashes = Array.from(fileHashes.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([path, result]) => `${path}:${result.contentHash}`);
    
    const packageHash = calculateHash(sortedHashes.join('|'));

    return {
      packageHash,
      fileCount: files.size,
      totalSize,
      uniqueFiles: contentToFiles.size,
      duplicateFiles,
      fileHashes,
    };
  }

  /**
   * Check if file is likely text-based
   */
  private static isTextFile(filePath: string, content: string): boolean {
    // Check file extension
    const textExtensions = [
      '.js', '.ts', '.jsx', '.tsx', '.json', '.md', '.txt', '.yml', '.yaml',
      '.xml', '.html', '.css', '.scss', '.less', '.sql', '.sh', '.py', '.rb',
      '.php', '.java', '.c', '.cpp', '.h', '.go', '.rs', '.swift', '.kt'
    ];
    
    const hasTextExtension = textExtensions.some(ext => 
      filePath.toLowerCase().endsWith(ext)
    );
    
    if (hasTextExtension) return true;

    // Check for binary content (null bytes, high ratio of non-printable chars)
    const nullBytes = (content.match(/\0/g) || []).length;
    if (nullBytes > 0) return false;

    // Check ratio of printable characters
    const printableChars = content.match(/[\x20-\x7E\n\r\t]/g) || [];
    const printableRatio = printableChars.length / content.length;
    
    return printableRatio > 0.7;
  }
}

/**
 * Deduplication helper class with enhanced caching
 */
export class DeduplicationHelper {
  private static fileHashes = new Map<string, FileHashResult>();
  private static packageHashes = new Map<string, PackageHashResult>();
  private static contentIndex = new Map<string, Set<string>>(); // hash -> file paths

  /**
   * Get or calculate file hash with caching
   */
  static getFileHash(filePath: string, content: string): FileHashResult {
    const key = `${filePath}:${content.length}`;
    
    if (!this.fileHashes.has(key)) {
      const result = FileHasher.hashFile(filePath, content);
      this.fileHashes.set(key, result);
      
      // Update content index
      const existingPaths = this.contentIndex.get(result.contentHash) || new Set();
      existingPaths.add(filePath);
      this.contentIndex.set(result.contentHash, existingPaths);
    }
    
    return this.fileHashes.get(key)!;
  }

  /**
   * Get or calculate package hash with caching
   */
  static getPackageHash(packageName: string, version: string, files: Map<string, string>): PackageHashResult {
    const key = `${packageName}@${version}`;
    
    if (!this.packageHashes.has(key)) {
      const result = FileHasher.hashFiles(files);
      this.packageHashes.set(key, result);
    }
    
    return this.packageHashes.get(key)!;
  }

  /**
   * Find files with identical content across packages
   */
  static findDuplicateContent(contentHash: string): string[] {
    const paths = this.contentIndex.get(contentHash);
    return paths ? Array.from(paths) : [];
  }

  /**
   * Get deduplication statistics
   */
  static getDeduplicationStats(): {
    totalFiles: number;
    uniqueContent: number;
    duplicateContent: number;
    spaceSavedBytes: number;
    cacheHitRate: number;
  } {
    let totalFiles = 0;
    let duplicateContent = 0;
    let spaceSavedBytes = 0;

    for (const [hash, paths] of this.contentIndex) {
      const pathCount = paths.size;
      totalFiles += pathCount;
      
      if (pathCount > 1) {
        duplicateContent += pathCount - 1;
        
        // Estimate space saved (assuming average file size)
        const avgFileSize = 1024; // 1KB average
        spaceSavedBytes += (pathCount - 1) * avgFileSize;
      }
    }

    return {
      totalFiles,
      uniqueContent: this.contentIndex.size,
      duplicateContent,
      spaceSavedBytes,
      cacheHitRate: totalFiles > 0 ? (duplicateContent / totalFiles) : 0,
    };
  }

  /**
   * Clear caches (useful for testing)
   */
  static clearCaches(): void {
    this.fileHashes.clear();
    this.packageHashes.clear();
    this.contentIndex.clear();
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): { 
    fileHashes: number; 
    packageHashes: number; 
    contentIndex: number;
  } {
    return {
      fileHashes: this.fileHashes.size,
      packageHashes: this.packageHashes.size,
      contentIndex: this.contentIndex.size,
    };
  }

  /**
   * Prune cache to keep only most recently used entries
   */
  static pruneCache(maxEntries: number = 10000): void {
    if (this.fileHashes.size > maxEntries) {
      const entries = Array.from(this.fileHashes.entries());
      this.fileHashes.clear();
      
      // Keep last N entries (simple LRU approximation)
      const keepEntries = entries.slice(-maxEntries);
      for (const [key, value] of keepEntries) {
        this.fileHashes.set(key, value);
      }
    }

    if (this.packageHashes.size > maxEntries / 10) {
      const entries = Array.from(this.packageHashes.entries());
      this.packageHashes.clear();
      
      const keepEntries = entries.slice(-Math.floor(maxEntries / 10));
      for (const [key, value] of keepEntries) {
        this.packageHashes.set(key, value);
      }
    }
  }
}