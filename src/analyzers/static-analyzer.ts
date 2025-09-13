import * as crypto from 'crypto';

export interface StaticAnalysisResult {
  suspicious_patterns: Array<{
    pattern: string;
    file: string;
    line: number;
    severity: 'low' | 'medium' | 'high';
    description: string;
  }>;
  risk_indicators: {
    uses_eval: boolean;
    uses_dynamic_require: boolean;
    makes_network_calls: boolean;
    accesses_filesystem: boolean;
    has_obfuscated_code: boolean;
    has_base64_strings: boolean;
    modifies_prototype: boolean;
  };
  score: number; // 0-100
}

export class StaticAnalyzer {
  private suspiciousPatterns = [
    {
      pattern: /eval\s*\(/g,
      severity: 'high' as const,
      description: 'Uses eval() which can execute arbitrary code'
    },
    {
      pattern: /new\s+Function\s*\(/g,
      severity: 'high' as const,
      description: 'Creates functions from strings dynamically'
    },
    {
      pattern: /require\s*\(\s*[`'"]\s*child_process/g,
      severity: 'high' as const,
      description: 'Spawns child processes'
    },
    {
      pattern: /\.exec\s*\(/g,
      severity: 'medium' as const,
      description: 'Executes system commands'
    },
    {
      pattern: /process\.env\./g,
      severity: 'low' as const,
      description: 'Accesses environment variables'
    },
    {
      pattern: /Buffer\.from\s*\(\s*['"`]([A-Za-z0-9+/=]{50,})/g,
      severity: 'medium' as const,
      description: 'Contains large base64 encoded strings'
    },
    {
      pattern: /\.__proto__\s*=/g,
      severity: 'high' as const,
      description: 'Modifies prototype chain (potential prototype pollution)'
    },
    {
      pattern: /fs\.(write|append|unlink|rmdir)/g,
      severity: 'medium' as const,
      description: 'Writes or deletes files'
    },
    {
      pattern: /(http|net|dgram|tls)\.(request|createServer|connect)/g,
      severity: 'medium' as const,
      description: 'Makes network connections'
    },
    {
      pattern: /crypto\.(createCipher|createDecipher)/g,
      severity: 'low' as const,
      description: 'Uses cryptographic operations'
    }
  ];

  async analyze(files: Map<string, string>): Promise<StaticAnalysisResult> {
    const result: StaticAnalysisResult = {
      suspicious_patterns: [],
      risk_indicators: {
        uses_eval: false,
        uses_dynamic_require: false,
        makes_network_calls: false,
        accesses_filesystem: false,
        has_obfuscated_code: false,
        has_base64_strings: false,
        modifies_prototype: false,
      },
      score: 0
    };

    for (const [filePath, content] of files) {
      // Skip non-JS/TS files
      if (!this.isJavaScriptFile(filePath)) continue;

      // Check each pattern
      for (const { pattern, severity, description } of this.suspiciousPatterns) {
        const matches = Array.from(content.matchAll(pattern));
        for (const match of matches) {
          const line = this.getLineNumber(content, match.index || 0);
          result.suspicious_patterns.push({
            pattern: match[0],
            file: filePath,
            line,
            severity,
            description
          });

          // Update risk indicators
          if (pattern.source.includes('eval')) result.risk_indicators.uses_eval = true;
          if (pattern.source.includes('require')) result.risk_indicators.uses_dynamic_require = true;
          if (pattern.source.includes('http|net')) result.risk_indicators.makes_network_calls = true;
          if (pattern.source.includes('fs\\.')) result.risk_indicators.accesses_filesystem = true;
          if (pattern.source.includes('Base64')) result.risk_indicators.has_base64_strings = true;
          if (pattern.source.includes('__proto__')) result.risk_indicators.modifies_prototype = true;
        }
      }

      // Check for obfuscation
      if (this.isObfuscated(content)) {
        result.risk_indicators.has_obfuscated_code = true;
        result.suspicious_patterns.push({
          pattern: 'obfuscated code detected',
          file: filePath,
          line: 0,
          severity: 'high',
          description: 'Code appears to be obfuscated'
        });
      }
    }

    // Calculate score
    result.score = this.calculateScore(result);

    return result;
  }

  private isJavaScriptFile(filename: string): boolean {
    return /\.(js|jsx|ts|tsx|mjs|cjs)$/.test(filename);
  }

  private getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
  }

  private isObfuscated(content: string): boolean {
    // Simple heuristics for obfuscation detection
    const indicators = [
      // Very long lines
      content.split('\n').some(line => line.length > 500),
      // High ratio of special characters
      (content.match(/[^\w\s]/g)?.length || 0) / content.length > 0.4,
      // Hex strings
      /\\x[0-9a-f]{2}/gi.test(content),
      // Unicode escapes
      /\\u[0-9a-f]{4}/gi.test(content),
      // Excessive array notation
      /\[['"]\w+['"]\]/g.test(content) && (content.match(/\[['"]\w+['"]\]/g)?.length || 0) > 20
    ];

    return indicators.filter(Boolean).length >= 2;
  }

  private calculateScore(result: StaticAnalysisResult): number {
    let score = 0;

    // Add points for each suspicious pattern
    for (const pattern of result.suspicious_patterns) {
      switch (pattern.severity) {
        case 'high': score += 20; break;
        case 'medium': score += 10; break;
        case 'low': score += 5; break;
      }
    }

    // Add points for risk indicators
    const indicators = result.risk_indicators;
    if (indicators.uses_eval) score += 25;
    if (indicators.uses_dynamic_require) score += 15;
    if (indicators.makes_network_calls) score += 10;
    if (indicators.accesses_filesystem) score += 10;
    if (indicators.has_obfuscated_code) score += 30;
    if (indicators.has_base64_strings) score += 10;
    if (indicators.modifies_prototype) score += 20;

    return Math.min(100, score);
  }
}