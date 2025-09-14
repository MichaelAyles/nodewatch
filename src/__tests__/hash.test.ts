import { 
  calculateHash, 
  calculatePackageHash, 
  generateCacheKey,
  ContentHasher,
  DeduplicationHelper,
  FileHasher
} from '../utils/hash';

describe('Hash Utilities', () => {
  describe('calculateHash', () => {
    test('should generate consistent hashes for same content', () => {
      const content = 'test content';
      const hash1 = calculateHash(content);
      const hash2 = calculateHash(content);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex length
    });

    test('should generate different hashes for different content', () => {
      const hash1 = calculateHash('content1');
      const hash2 = calculateHash('content2');
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('calculatePackageHash', () => {
    test('should generate consistent hashes for same file collection', () => {
      const files = new Map([
        ['file1.js', 'content1'],
        ['file2.js', 'content2'],
      ]);
      
      const hash1 = calculatePackageHash(files);
      const hash2 = calculatePackageHash(files);
      
      expect(hash1).toBe(hash2);
    });

    test('should generate same hash regardless of insertion order', () => {
      const files1 = new Map([
        ['file1.js', 'content1'],
        ['file2.js', 'content2'],
      ]);
      
      const files2 = new Map([
        ['file2.js', 'content2'],
        ['file1.js', 'content1'],
      ]);
      
      const hash1 = calculatePackageHash(files1);
      const hash2 = calculatePackageHash(files2);
      
      expect(hash1).toBe(hash2);
    });
  });

  describe('ContentHasher', () => {
    test('should normalize JavaScript code for consistent hashing', () => {
      const code1 = 'function test() { return 1; }';
      const code2 = `function test() {
        // This is a comment
        return 1;
      }`;
      
      const hash1 = ContentHasher.hashCode(code1);
      const hash2 = ContentHasher.hashCode(code2);
      
      expect(hash1).toBe(hash2);
    });

    test('should hash JSON with sorted keys', () => {
      const obj1 = { b: 2, a: 1 };
      const obj2 = { a: 1, b: 2 };
      
      const hash1 = ContentHasher.hashJSON(obj1);
      const hash2 = ContentHasher.hashJSON(obj2);
      
      expect(hash1).toBe(hash2);
    });
  });

  describe('FileHasher', () => {
    test('should calculate comprehensive file hash information', () => {
      const filePath = 'test.js';
      const content = 'function test() {\n  return "hello";\n}';
      
      const result = FileHasher.hashFile(filePath, content);
      
      expect(result.contentHash).toHaveLength(64);
      expect(result.size).toBeGreaterThan(0);
      expect(result.lines).toBe(3);
      expect(result.isText).toBe(true);
      expect(result.encoding).toBe('utf8');
    });

    test('should detect binary files', () => {
      const filePath = 'image.png';
      const content = '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR';
      
      const result = FileHasher.hashFile(filePath, content);
      
      expect(result.isText).toBe(false);
      expect(result.encoding).toBe('binary');
    });

    test('should detect duplicate files in package', () => {
      const files = new Map([
        ['file1.js', 'same content'],
        ['file2.js', 'different content'],
        ['file3.js', 'same content'], // duplicate of file1.js
      ]);
      
      const result = FileHasher.hashFiles(files);
      
      expect(result.fileCount).toBe(3);
      expect(result.uniqueFiles).toBe(2);
      expect(result.duplicateFiles).toHaveLength(1);
      expect(result.duplicateFiles[0]).toBe('file3.js');
    });

    test('should calculate consistent package hashes', () => {
      const files1 = new Map([
        ['a.js', 'content a'],
        ['b.js', 'content b'],
      ]);
      
      const files2 = new Map([
        ['b.js', 'content b'],
        ['a.js', 'content a'],
      ]);
      
      const result1 = FileHasher.hashFiles(files1);
      const result2 = FileHasher.hashFiles(files2);
      
      expect(result1.packageHash).toBe(result2.packageHash);
    });
  });

  describe('DeduplicationHelper', () => {
    beforeEach(() => {
      DeduplicationHelper.clearCaches();
    });

    test('should cache file hashes with detailed information', () => {
      const filePath = 'test.js';
      const content = 'test content';
      
      const result1 = DeduplicationHelper.getFileHash(filePath, content);
      const result2 = DeduplicationHelper.getFileHash(filePath, content);
      
      expect(result1).toEqual(result2);
      expect(result1.contentHash).toHaveLength(64);
      expect(result1.size).toBeGreaterThan(0);
      
      const stats = DeduplicationHelper.getCacheStats();
      expect(stats.fileHashes).toBe(1);
    });

    test('should cache package hashes with comprehensive results', () => {
      const packageName = 'test-package';
      const version = '1.0.0';
      const files = new Map([
        ['index.js', 'main content'],
        ['utils.js', 'utility content'],
      ]);
      
      const result1 = DeduplicationHelper.getPackageHash(packageName, version, files);
      const result2 = DeduplicationHelper.getPackageHash(packageName, version, files);
      
      expect(result1).toEqual(result2);
      expect(result1.packageHash).toHaveLength(64);
      expect(result1.fileCount).toBe(2);
      expect(result1.uniqueFiles).toBe(2);
      
      const stats = DeduplicationHelper.getCacheStats();
      expect(stats.packageHashes).toBe(1);
    });

    test('should track duplicate content across files', () => {
      const content = 'shared content';
      
      const result1 = DeduplicationHelper.getFileHash('file1.js', content);
      const result2 = DeduplicationHelper.getFileHash('file2.js', content);
      
      expect(result1.contentHash).toBe(result2.contentHash);
      
      const duplicates = DeduplicationHelper.findDuplicateContent(result1.contentHash);
      expect(duplicates).toContain('file1.js');
      expect(duplicates).toContain('file2.js');
    });

    test('should provide deduplication statistics', () => {
      // Add some files with duplicates
      DeduplicationHelper.getFileHash('file1.js', 'content A');
      DeduplicationHelper.getFileHash('file2.js', 'content B');
      DeduplicationHelper.getFileHash('file3.js', 'content A'); // duplicate
      DeduplicationHelper.getFileHash('file4.js', 'content C');
      
      const stats = DeduplicationHelper.getDeduplicationStats();
      
      expect(stats.totalFiles).toBe(4);
      expect(stats.uniqueContent).toBe(3);
      expect(stats.duplicateContent).toBe(1);
      expect(stats.spaceSavedBytes).toBeGreaterThan(0);
      expect(stats.cacheHitRate).toBe(0.25); // 1 duplicate out of 4 files
    });

    test('should prune cache when it grows too large', () => {
      // Fill cache with many entries
      for (let i = 0; i < 15; i++) {
        DeduplicationHelper.getFileHash(`file${i}.js`, `content ${i}`);
      }
      
      expect(DeduplicationHelper.getCacheStats().fileHashes).toBe(15);
      
      // Prune to max 10 entries
      DeduplicationHelper.pruneCache(10);
      
      expect(DeduplicationHelper.getCacheStats().fileHashes).toBe(10);
    });
  });
});