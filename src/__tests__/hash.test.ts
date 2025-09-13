import { 
  calculateHash, 
  calculatePackageHash, 
  generateCacheKey,
  ContentHasher,
  DeduplicationHelper 
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

  describe('DeduplicationHelper', () => {
    beforeEach(() => {
      DeduplicationHelper.clearCaches();
    });

    test('should cache file hashes', () => {
      const filePath = 'test.js';
      const content = 'test content';
      
      const hash1 = DeduplicationHelper.getFileHash(filePath, content);
      const hash2 = DeduplicationHelper.getFileHash(filePath, content);
      
      expect(hash1).toBe(hash2);
      
      const stats = DeduplicationHelper.getCacheStats();
      expect(stats.fileHashes).toBe(1);
    });

    test('should cache package hashes', () => {
      const packageName = 'test-package';
      const version = '1.0.0';
      const files = new Map([['index.js', 'content']]);
      
      const hash1 = DeduplicationHelper.getPackageHash(packageName, version, files);
      const hash2 = DeduplicationHelper.getPackageHash(packageName, version, files);
      
      expect(hash1).toBe(hash2);
      
      const stats = DeduplicationHelper.getCacheStats();
      expect(stats.packageHashes).toBe(1);
    });
  });
});