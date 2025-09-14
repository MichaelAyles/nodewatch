/**
 * Deobfuscation utilities for analyzing encoded and obfuscated content
 */

export interface DeobfuscationResult {
  originalContent: string;
  deobfuscatedContent: string;
  encodingTypes: string[];
  entropy: number;
  suspiciousStrings: string[];
  confidence: number;
}

export interface EncodedString {
  content: string;
  encoding: 'base64' | 'hex' | 'unicode' | 'url' | 'unknown';
  decoded: string;
  confidence: number;
}

export class DeobfuscationEngine {
  private readonly MIN_ENCODED_LENGTH = 8;
  private readonly MAX_ENTROPY_THRESHOLD = 7.5;
  private readonly MIN_ENTROPY_THRESHOLD = 3.0;

  /**
   * Analyze and deobfuscate content
   */
  async deobfuscate(content: string): Promise<DeobfuscationResult> {
    const originalContent = content;
    let deobfuscatedContent = content;
    const encodingTypes: string[] = [];
    const suspiciousStrings: string[] = [];

    // Detect and decode encoded strings
    const encodedStrings = this.detectEncodedStrings(content);
    for (const encoded of encodedStrings) {
      if (encoded.confidence > 0.5) { // Lowered threshold
        encodingTypes.push(encoded.encoding);
        deobfuscatedContent = deobfuscatedContent.replace(encoded.content, encoded.decoded);
        
        // Check if decoded content contains suspicious patterns
        if (this.isSuspiciousString(encoded.decoded)) {
          suspiciousStrings.push(encoded.decoded);
        }
      }
    }

    // Apply JavaScript deobfuscation patterns
    const jsDeobfuscated = this.deobfuscateJavaScript(deobfuscatedContent);
    if (jsDeobfuscated !== deobfuscatedContent) {
      deobfuscatedContent = jsDeobfuscated;
      encodingTypes.push('javascript_obfuscation');
    }

    // Calculate entropy
    const entropy = this.calculateEntropy(originalContent);

    // Determine confidence based on findings
    const confidence = this.calculateConfidence(encodingTypes, suspiciousStrings, entropy);

    return {
      originalContent,
      deobfuscatedContent,
      encodingTypes,
      entropy,
      suspiciousStrings,
      confidence
    };
  }

  /**
   * Detect various types of encoded strings in content
   */
  detectEncodedStrings(content: string): EncodedString[] {
    const results: EncodedString[] = [];

    // Base64 detection
    results.push(...this.detectBase64Strings(content));
    
    // Hex detection
    results.push(...this.detectHexStrings(content));
    
    // Unicode escape detection
    results.push(...this.detectUnicodeEscapes(content));
    
    // URL encoding detection
    results.push(...this.detectUrlEncoding(content));

    return results.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Detect Base64 encoded strings
   */
  private detectBase64Strings(content: string): EncodedString[] {
    const results: EncodedString[] = [];
    
    // Base64 pattern: look for base64-like strings in quotes or standalone
    const base64Pattern = /([A-Za-z0-9+/]{12,}={0,2})/g;
    
    let match;
    while ((match = base64Pattern.exec(content)) !== null) {
      const candidate = match[1];
      
      if (candidate.length < this.MIN_ENCODED_LENGTH) continue;
      
      try {
        const decoded = Buffer.from(candidate, 'base64').toString('utf-8');
        
        // Validate that it's likely Base64 (not just random chars that happen to match)
        const isValid = this.isValidBase64(candidate);
        const isPrintable = this.isPrintableText(decoded);
        
        if (isValid && isPrintable) {
          const confidence = this.calculateBase64Confidence(candidate, decoded);
          
          results.push({
            content: candidate,
            encoding: 'base64',
            decoded,
            confidence
          });
        }
      } catch (error) {
        // Invalid Base64, skip
      }
    }

    return results;
  }

  /**
   * Detect hexadecimal encoded strings
   */
  private detectHexStrings(content: string): EncodedString[] {
    const results: EncodedString[] = [];
    
    // Hex patterns: continuous hex digits, optionally prefixed
    const hexPatterns = [
      /(?:["'])?(0x[0-9a-fA-F]{8,})(?:["'])?/g,  // 0x prefix
      /(\\x[0-9a-fA-F]{2}){3,}/g,               // \x prefix (common in strings)
      /(?:["'])?([0-9a-fA-F]{16,})(?:["'])?/g   // Raw hex (longer sequences)
    ];

    for (const pattern of hexPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const fullMatch = match[0];
        let candidate = match[1] || match[0]; // Extract content, fallback to full match
        
        try {
          let hexString = candidate;
          
          // Clean up quotes and prefixes
          hexString = hexString.replace(/["']/g, '');
          if (hexString.startsWith('0x')) {
            hexString = hexString.slice(2);
          } else if (hexString.includes('\\x')) {
            hexString = hexString.replace(/\\x/g, '');
          }
          
          // Must be even length for valid hex
          if (hexString.length % 2 !== 0) continue;
          if (hexString.length < this.MIN_ENCODED_LENGTH) continue;
          
          const decoded = Buffer.from(hexString, 'hex').toString('utf-8');
          
          if (this.isPrintableText(decoded)) {
            const confidence = this.calculateHexConfidence(hexString, decoded);
            
            results.push({
              content: fullMatch,
              encoding: 'hex',
              decoded,
              confidence
            });
          }
        } catch (error) {
          // Invalid hex, skip
        }
      }
    }

    return results;
  }

  /**
   * Detect Unicode escape sequences
   */
  private detectUnicodeEscapes(content: string): EncodedString[] {
    const results: EncodedString[] = [];
    
    // Unicode escape patterns - look for sequences in quotes or standalone
    const unicodePattern = /((?:\\u[0-9a-fA-F]{4}){3,})/g;
    
    let match;
    while ((match = unicodePattern.exec(content)) !== null) {
      const candidate = match[0];
      
      try {
        const decoded = candidate.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => {
          return String.fromCharCode(parseInt(hex, 16));
        });
        
        if (this.isPrintableText(decoded)) {
          const confidence = this.calculateUnicodeConfidence(candidate, decoded);
          
          results.push({
            content: candidate,
            encoding: 'unicode',
            decoded,
            confidence
          });
        }
      } catch (error) {
        // Invalid unicode, skip
      }
    }

    return results;
  }

  /**
   * Detect URL encoded strings
   */
  private detectUrlEncoding(content: string): EncodedString[] {
    const results: EncodedString[] = [];
    
    // URL encoding pattern: %XX sequences
    const urlPattern = /(?:%[0-9a-fA-F]{2}){3,}/g;
    
    let match;
    while ((match = urlPattern.exec(content)) !== null) {
      const candidate = match[0];
      
      try {
        const decoded = decodeURIComponent(candidate);
        
        if (this.isPrintableText(decoded) && decoded !== candidate) {
          const confidence = this.calculateUrlConfidence(candidate, decoded);
          
          results.push({
            content: candidate,
            encoding: 'url',
            decoded,
            confidence
          });
        }
      } catch (error) {
        // Invalid URL encoding, skip
      }
    }

    return results;
  }

  /**
   * Deobfuscate common JavaScript obfuscation patterns
   */
  deobfuscateJavaScript(content: string): string {
    let deobfuscated = content;

    // Pattern 1: String concatenation obfuscation
    // "he" + "llo" -> "hello"
    deobfuscated = this.deobfuscateStringConcatenation(deobfuscated);

    // Pattern 2: Array-based string obfuscation
    // var a = ["hello", "world"]; a[0] + a[1]
    deobfuscated = this.deobfuscateArrayStrings(deobfuscated);

    // Pattern 3: Character code obfuscation
    // String.fromCharCode(104, 101, 108, 108, 111) -> "hello"
    deobfuscated = this.deobfuscateCharCodes(deobfuscated);

    // Pattern 4: Eval obfuscation
    // eval(atob("base64string"))
    deobfuscated = this.deobfuscateEvalPatterns(deobfuscated);

    // Pattern 5: Property access obfuscation
    // window["eval"] -> window.eval
    deobfuscated = this.deobfuscatePropertyAccess(deobfuscated);

    return deobfuscated;
  }

  /**
   * Deobfuscate string concatenation patterns
   */
  private deobfuscateStringConcatenation(content: string): string {
    let result = content;
    let changed = true;
    
    // Keep applying until no more changes (handles chained concatenations)
    while (changed) {
      const before = result;
      
      // Match patterns like "str1" + "str2"
      result = result.replace(/"([^"]*?)"\s*\+\s*"([^"]*?)"/g, (match, str1, str2) => {
        return `"${str1}${str2}"`;
      });
      
      // Match patterns like 'str1' + 'str2'
      result = result.replace(/'([^']*?)'\s*\+\s*'([^']*?)'/g, (match, str1, str2) => {
        return `'${str1}${str2}'`;
      });
      
      changed = result !== before;
    }
    
    return result;
  }

  /**
   * Deobfuscate array-based string patterns
   */
  private deobfuscateArrayStrings(content: string): string {
    // This is a simplified version - real implementation would need AST parsing
    // for complex cases
    
    // Match simple array declarations and usage
    const arrayPattern = /var\s+(\w+)\s*=\s*\[(.*?)\].*?\1\[(\d+)\]/g;
    
    return content.replace(arrayPattern, (match, varName, arrayContent, index) => {
      try {
        const items = arrayContent.split(',').map((item: string) => item.trim().replace(/['"]/g, ''));
        const idx = parseInt(index);
        
        if (idx >= 0 && idx < items.length) {
          return `"${items[idx]}"`;
        }
      } catch (error) {
        // Parsing failed, return original
      }
      
      return match;
    });
  }

  /**
   * Deobfuscate String.fromCharCode patterns
   */
  private deobfuscateCharCodes(content: string): string {
    const charCodePattern = /String\.fromCharCode\s*\(\s*([\d\s,]+)\s*\)/g;
    
    return content.replace(charCodePattern, (match, codes) => {
      try {
        const charCodes = codes.split(',').map((code: string) => parseInt(code.trim()));
        const decoded = String.fromCharCode(...charCodes);
        
        // Only replace if result is printable
        if (this.isPrintableText(decoded)) {
          return `"${decoded}"`;
        }
      } catch (error) {
        // Invalid char codes, return original
      }
      
      return match;
    });
  }

  /**
   * Deobfuscate eval patterns
   */
  private deobfuscateEvalPatterns(content: string): string {
    // Match eval(atob(...)) patterns
    const evalAtobPattern = /eval\s*\(\s*atob\s*\(\s*["']([^"']+)["']\s*\)\s*\)/g;
    
    return content.replace(evalAtobPattern, (match, base64) => {
      try {
        const decoded = Buffer.from(base64, 'base64').toString('utf-8');
        
        if (this.isPrintableText(decoded)) {
          return `/* DEOBFUSCATED: ${decoded.slice(0, 100)}... */`;
        }
      } catch (error) {
        // Invalid base64, return original
      }
      
      return match;
    });
  }

  /**
   * Deobfuscate property access patterns
   */
  private deobfuscatePropertyAccess(content: string): string {
    // Match patterns like window["eval"] or obj["prop"]
    const propAccessPattern = /(\w+)\["([^"]+)"\]/g;
    
    return content.replace(propAccessPattern, (match, obj, prop) => {
      // Only replace if property name is a valid identifier
      if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(prop)) {
        return `${obj}.${prop}`;
      }
      
      return match;
    });
  }

  /**
   * Calculate string entropy (measure of randomness)
   */
  calculateEntropy(str: string): number {
    if (str.length === 0) return 0;

    const frequency: { [char: string]: number } = {};
    
    // Count character frequencies
    for (const char of str) {
      frequency[char] = (frequency[char] || 0) + 1;
    }

    // Calculate entropy using Shannon's formula
    let entropy = 0;
    const length = str.length;
    
    for (const count of Object.values(frequency)) {
      const probability = count / length;
      entropy -= probability * Math.log2(probability);
    }

    return entropy;
  }

  /**
   * Check if a string contains suspicious patterns
   */
  private isSuspiciousString(str: string): boolean {
    const suspiciousPatterns = [
      /eval\s*\(/i,
      /exec\s*\(/i,
      /spawn\s*\(/i,
      /child_process/i,
      /fs\.write/i,
      /require\s*\(\s*["']child_process["']\s*\)/i,
      /process\.env/i,
      /\.password/i,
      /\.token/i,
      /api[_-]?key/i,
      /secret/i,
      /credential/i,
      /http[s]?:\/\/(?!api\.example\.com)[^\s"']+/i, // Exclude benign example URLs
      /ftp:\/\/[^\s"']+/i,
      /ssh:\/\/[^\s"']+/i,
      /rm\s+-rf/i,
      /curl.*\|.*bash/i,
      /wget.*\|.*sh/i
    ];

    return suspiciousPatterns.some(pattern => pattern.test(str));
  }

  /**
   * Validate if string is likely Base64
   */
  private isValidBase64(str: string): boolean {
    // Base64 should be divisible by 4 (with padding)
    if (str.length % 4 !== 0) return false;
    
    // Should only contain valid Base64 characters
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    return base64Regex.test(str);
  }

  /**
   * Check if text contains mostly printable characters
   */
  private isPrintableText(str: string): boolean {
    if (str.length === 0) return false;
    
    let printableCount = 0;
    
    for (const char of str) {
      const code = char.charCodeAt(0);
      
      // Printable ASCII range (32-126) plus common whitespace
      if ((code >= 32 && code <= 126) || code === 9 || code === 10 || code === 13) {
        printableCount++;
      }
    }
    
    // At least 80% should be printable
    return (printableCount / str.length) >= 0.8;
  }

  /**
   * Calculate confidence for Base64 detection
   */
  private calculateBase64Confidence(encoded: string, decoded: string): number {
    let confidence = 0.5; // Base confidence
    
    // Length factor (longer strings more likely to be intentional encoding)
    if (encoded.length > 50) confidence += 0.2;
    if (encoded.length > 100) confidence += 0.1;
    
    // Decoded content quality
    if (this.isPrintableText(decoded)) confidence += 0.2;
    if (this.isSuspiciousString(decoded)) confidence += 0.3;
    
    // Entropy check (Base64 should have reasonable entropy)
    const entropy = this.calculateEntropy(encoded);
    if (entropy > 4 && entropy < 6) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Calculate confidence for hex detection
   */
  private calculateHexConfidence(encoded: string, decoded: string): number {
    let confidence = 0.4; // Lower base confidence than Base64
    
    // Length and format factors
    if (encoded.startsWith('0x') || encoded.includes('\\x')) confidence += 0.2;
    if (encoded.length > 40) confidence += 0.2;
    
    // Decoded content quality
    if (this.isPrintableText(decoded)) confidence += 0.2;
    if (this.isSuspiciousString(decoded)) confidence += 0.3;
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Calculate confidence for Unicode detection
   */
  private calculateUnicodeConfidence(encoded: string, decoded: string): number {
    let confidence = 0.6; // Higher confidence for Unicode escapes
    
    // Unicode escapes are very specific format
    if (encoded.length > 30) confidence += 0.2;
    
    // Decoded content quality
    if (this.isPrintableText(decoded)) confidence += 0.1;
    if (this.isSuspiciousString(decoded)) confidence += 0.2;
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Calculate confidence for URL encoding detection
   */
  private calculateUrlConfidence(encoded: string, decoded: string): number {
    let confidence = 0.5;
    
    // URL encoding factors
    if (encoded.length > 30) confidence += 0.1;
    
    // Decoded content quality
    if (this.isPrintableText(decoded)) confidence += 0.2;
    if (this.isSuspiciousString(decoded)) confidence += 0.3;
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Calculate overall confidence based on findings
   */
  private calculateConfidence(encodingTypes: string[], suspiciousStrings: string[], entropy: number): number {
    let confidence = 0.1; // Base confidence
    
    // Encoding detection factor
    confidence += encodingTypes.length * 0.25;
    
    // Suspicious content factor (higher weight for suspicious strings)
    confidence += suspiciousStrings.length * 0.4;
    
    // Entropy factor (high entropy suggests obfuscation)
    if (entropy > this.MAX_ENTROPY_THRESHOLD) {
      confidence += 0.3;
    } else if (entropy < this.MIN_ENTROPY_THRESHOLD) {
      confidence += 0.1; // Very low entropy also suspicious
    }
    
    return Math.min(confidence, 1.0);
  }
}

/**
 * Utility functions for string analysis
 */
export class StringAnalyzer {
  /**
   * Analyze string patterns for suspicious characteristics
   */
  static analyzeString(str: string): {
    entropy: number;
    hasEncodedContent: boolean;
    suspiciousPatterns: string[];
    obfuscationScore: number;
  } {
    const deobfuscator = new DeobfuscationEngine();
    
    const entropy = deobfuscator.calculateEntropy(str);
    const encodedStrings = deobfuscator.detectEncodedStrings(str);
    const hasEncodedContent = encodedStrings.length > 0;
    
    const suspiciousPatterns: string[] = [];
    
    // Check for various suspicious patterns
    const patterns = [
      { name: 'eval_usage', regex: /eval\s*\(/gi },
      { name: 'base64_decode', regex: /atob\s*\(/gi },
      { name: 'hex_decode', regex: /parseInt\s*\([^,]+,\s*16\)/gi },
      { name: 'char_code_usage', regex: /fromCharCode/gi },
      { name: 'dynamic_require', regex: /require\s*\(\s*[^"'`][^)]*\)/gi },
      { name: 'process_access', regex: /process\s*\[\s*["'][^"']+["']\s*\]/gi },
      { name: 'child_process', regex: /child_process/gi },
      { name: 'file_system', regex: /fs\.(write|unlink|rmdir)/gi }
    ];
    
    for (const pattern of patterns) {
      if (pattern.regex.test(str)) {
        suspiciousPatterns.push(pattern.name);
      }
    }
    
    // Calculate obfuscation score
    let obfuscationScore = 0;
    
    // High entropy suggests obfuscation
    if (entropy > 6) obfuscationScore += 0.5;
    else if (entropy > 4.5) obfuscationScore += 0.3;
    
    // Encoded content suggests obfuscation
    if (hasEncodedContent) obfuscationScore += 0.4;
    
    // Suspicious patterns suggest obfuscation
    obfuscationScore += suspiciousPatterns.length * 0.15;
    
    // String length factor (very long strings often obfuscated)
    if (str.length > 1000) obfuscationScore += 0.15;
    if (str.length > 5000) obfuscationScore += 0.1;
    
    obfuscationScore = Math.min(obfuscationScore, 1.0);
    
    return {
      entropy,
      hasEncodedContent,
      suspiciousPatterns,
      obfuscationScore
    };
  }

  /**
   * Extract all string literals from JavaScript code
   */
  static extractStringLiterals(code: string): string[] {
    const strings: string[] = [];
    
    // Simple regex-based extraction (for production, use proper AST parsing)
    const stringPatterns = [
      /"([^"\\]|\\.)*"/g,  // Double quoted strings
      /'([^'\\]|\\.)*'/g,  // Single quoted strings
      /`([^`\\]|\\.)*`/g   // Template literals
    ];
    
    for (const pattern of stringPatterns) {
      let match;
      while ((match = pattern.exec(code)) !== null) {
        // Remove quotes and add to collection
        const str = match[0].slice(1, -1);
        if (str.length > 5) { // Only include meaningful strings
          strings.push(str);
        }
      }
    }
    
    return strings;
  }
}