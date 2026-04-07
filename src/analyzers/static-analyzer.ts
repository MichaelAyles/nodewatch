import * as crypto from 'crypto';
import { 
  StaticAnalysisResult, 
  SuspiciousPattern, 
  RiskIndicators, 
  PatternType, 
  Severity 
} from '../types';
import { DeobfuscationEngine, StringAnalyzer } from '../utils/deobfuscation';

// Enhanced pattern detection interfaces
export interface ObfuscationAnalysis {
  isObfuscated: boolean;
  confidence: number;
  techniques: ObfuscationTechnique[];
  deobfuscatedSamples: string[];
}

export interface TyposquattingAnalysis {
  isTyposquat: boolean;
  similarity: number;
  targetPackage?: string;
  confidence: number;
  suspiciousIndicators: string[];
}

export interface IntegrityAnalysis {
  hasIntegrityIssues: boolean;
  mismatches: string[];
  confidence: number;
  repositoryUrl?: string;
}

export interface MaintainerAnalysis {
  hasOwnershipChanges: boolean;
  newMaintainer: boolean;
  suspiciousChanges: string[];
  riskLevel: Severity;
}

export type ObfuscationTechnique = 
  | 'string_encoding' 
  | 'variable_mangling' 
  | 'control_flow' 
  | 'dead_code' 
  | 'packing' 
  | 'eval_chains';

// Popular package names for typosquatting detection
const POPULAR_PACKAGES = [
  'react', 'lodash', 'express', 'axios', 'moment', 'jquery', 'bootstrap',
  'vue', 'angular', 'webpack', 'babel', 'eslint', 'typescript', 'jest',
  'mocha', 'chai', 'sinon', 'request', 'commander', 'chalk', 'debug',
  'fs-extra', 'glob', 'rimraf', 'mkdirp', 'yargs', 'inquirer', 'ora'
];

export class EnhancedStaticAnalyzer {
  private deobfuscationEngine = new DeobfuscationEngine();
  
  private suspiciousPatterns = [
    // Code execution patterns
    {
      pattern: /eval\s*\(/g,
      type: 'eval' as PatternType,
      severity: 'high' as Severity,
      description: 'Uses eval() which can execute arbitrary code'
    },
    {
      pattern: /new\s+Function\s*\(/g,
      type: 'eval' as PatternType,
      severity: 'high' as Severity,
      description: 'Creates functions from strings dynamically'
    },
    {
      pattern: /setTimeout\s*\(\s*['"`]/g,
      type: 'eval' as PatternType,
      severity: 'medium' as Severity,
      description: 'Uses setTimeout with string (code execution)'
    },
    {
      pattern: /setInterval\s*\(\s*['"`]/g,
      type: 'eval' as PatternType,
      severity: 'medium' as Severity,
      description: 'Uses setInterval with string (code execution)'
    },

    // Process and system access
    {
      pattern: /require\s*\(\s*[`'"]\s*child_process/g,
      type: 'dynamic_require' as PatternType,
      severity: 'high' as Severity,
      description: 'Spawns child processes'
    },
    {
      pattern: /child_process.*\.exec\s*\(|execSync\s*\(/g,
      type: 'dynamic_require' as PatternType,
      severity: 'medium' as Severity,
      description: 'Executes system commands via child_process'
    },
    {
      pattern: /\.spawn\s*\(/g,
      type: 'dynamic_require' as PatternType,
      severity: 'medium' as Severity,
      description: 'Spawns new processes'
    },
    {
      pattern: /process\.exit\s*\(/g,
      type: 'dynamic_require' as PatternType,
      severity: 'low' as Severity,
      description: 'Forces process termination'
    },

    // Network operations
    {
      pattern: /(http|https)\.request\s*\(/g,
      type: 'network_call' as PatternType,
      severity: 'medium' as Severity,
      description: 'Makes HTTP requests'
    },
    {
      pattern: /fetch\s*\(\s*['"`]https?:/g,
      type: 'network_call' as PatternType,
      severity: 'medium' as Severity,
      description: 'Makes fetch requests to external URLs'
    },
    {
      pattern: /WebSocket\s*\(/g,
      type: 'network_call' as PatternType,
      severity: 'medium' as Severity,
      description: 'Creates WebSocket connections'
    },
    {
      pattern: /net\.(createServer|connect)/g,
      type: 'network_call' as PatternType,
      severity: 'medium' as Severity,
      description: 'Creates network servers or connections'
    },

    // File system operations
    {
      pattern: /fs\.(write|append|unlink|rmdir|rm)/g,
      type: 'file_operation' as PatternType,
      severity: 'medium' as Severity,
      description: 'Writes or deletes files'
    },
    {
      pattern: /fs\.chmod\s*\(/g,
      type: 'file_operation' as PatternType,
      severity: 'medium' as Severity,
      description: 'Changes file permissions'
    },
    {
      pattern: /fs\.access\s*\(/g,
      type: 'file_operation' as PatternType,
      severity: 'low' as Severity,
      description: 'Checks file access permissions'
    },

    // Prototype pollution
    {
      pattern: /\.__proto__\s*=/g,
      type: 'prototype_pollution' as PatternType,
      severity: 'high' as Severity,
      description: 'Modifies prototype chain (prototype pollution)'
    },
    {
      pattern: /Object\.prototype\s*\[/g,
      type: 'prototype_pollution' as PatternType,
      severity: 'high' as Severity,
      description: 'Modifies Object.prototype'
    },
    {
      pattern: /Object\.prototype\[/g,
      type: 'prototype_pollution' as PatternType,
      severity: 'high' as Severity,
      description: 'Modifies Object.prototype'
    },
    {
      pattern: /constructor\.prototype\s*\[/g,
      type: 'prototype_pollution' as PatternType,
      severity: 'medium' as Severity,
      description: 'Modifies constructor prototype'
    },

    // Obfuscation indicators — only flag patterns that are genuinely suspicious,
    // not bare \x or \u which are common in regex ranges, i18n, and char maps
    {
      pattern: /Buffer\.from\s*\(\s*['"`]([A-Za-z0-9+/=]{50,})/g,
      type: 'obfuscation' as PatternType,
      severity: 'medium' as Severity,
      description: 'Contains large base64 encoded strings'
    },
    {
      pattern: /atob\s*\(\s*['"`]/g,
      type: 'obfuscation' as PatternType,
      severity: 'medium' as Severity,
      description: 'Decodes base64 strings'
    },

    // Dynamic require patterns
    {
      pattern: /require\s*\(\s*[^'"`]/g,
      type: 'dynamic_require' as PatternType,
      severity: 'medium' as Severity,
      description: 'Uses dynamic require with variables'
    },
    {
      pattern: /import\s*\(\s*[^'"`]/g,
      type: 'dynamic_require' as PatternType,
      severity: 'medium' as Severity,
      description: 'Uses dynamic import with variables'
    },

    // Environment access
    {
      pattern: /process\.env\./g,
      type: 'file_operation' as PatternType,
      severity: 'low' as Severity,
      description: 'Accesses environment variables'
    },
    {
      pattern: /process\.argv/g,
      type: 'file_operation' as PatternType,
      severity: 'low' as Severity,
      description: 'Accesses command line arguments'
    },

    // Crypto operations
    {
      pattern: /crypto\.(createCipher|createDecipher)/g,
      type: 'obfuscation' as PatternType,
      severity: 'low' as Severity,
      description: 'Uses cryptographic operations'
    },
    {
      pattern: /crypto\.randomBytes/g,
      type: 'obfuscation' as PatternType,
      severity: 'low' as Severity,
      description: 'Generates random bytes'
    }
  ];

  async analyze(
    files: Map<string, string>, 
    packageName?: string,
    packageMetadata?: any
  ): Promise<StaticAnalysisResult> {
    const result: StaticAnalysisResult = {
      suspiciousPatterns: [],
      riskIndicators: {
        uses_eval: false,
        uses_dynamic_require: false,
        makes_network_calls: false,
        accesses_filesystem: false,
        has_obfuscated_code: false,
        has_base64_strings: false,
        modifies_prototype: false,
      },
      obfuscationScore: 0,
      typosquattingScore: 0,
      integrityFlags: [],
      score: 0,
      confidence: 0.9
    };

    // Analyze each file for suspicious patterns
    for (const [filePath, content] of files) {
      // Skip minified files — they trigger false positives on everything
      const isMinified = this.isMinifiedFile(filePath, content);

      // Skip non-JS/TS files for pattern analysis
      if (this.isJavaScriptFile(filePath)) {
        await this.analyzeFilePatterns(filePath, content, result);
      }

      // Skip deobfuscation on minified files and non-JS files — too noisy
      if (!isMinified && this.isJavaScriptFile(filePath)) {
        // Only run deobfuscation if the file has genuinely suspicious encoded content
        // (not just regex patterns or character mapping tables)
        const strippedContent = this.stripLegitimateEncodings(content);
        const deobfuscationResult = await this.deobfuscationEngine.deobfuscate(strippedContent);

        if (deobfuscationResult.confidence > 0.5 && deobfuscationResult.suspiciousStrings.length > 0) {
          result.riskIndicators.has_obfuscated_code = true;
          result.obfuscationScore = Math.max(result.obfuscationScore, deobfuscationResult.confidence * 100);

          // One finding per file for encoded content (not per-match)
          result.suspiciousPatterns.push({
            type: 'obfuscation',
            file: filePath,
            line: 0,
            snippet: deobfuscationResult.suspiciousStrings[0]?.substring(0, 100) || '',
            severity: 'high',
            description: `Suspicious encoded content: ${deobfuscationResult.encodingTypes.join(', ')}`,
            confidence: deobfuscationResult.confidence
          });
        }

        // Legacy obfuscation analysis — only for techniques not covered by deob engine
        const legacyObfuscationAnalysis = this.analyzeObfuscation(content);
        if (legacyObfuscationAnalysis.isObfuscated) {
          result.riskIndicators.has_obfuscated_code = true;
          result.obfuscationScore = Math.max(result.obfuscationScore, legacyObfuscationAnalysis.confidence * 100);

          result.suspiciousPatterns.push({
            type: 'obfuscation',
            file: filePath,
            line: 0,
            snippet: content.substring(0, 100),
            severity: 'high',
            description: `Obfuscated code detected (${legacyObfuscationAnalysis.techniques.join(', ')})`,
            confidence: legacyObfuscationAnalysis.confidence
          });
        }
      }
    }

    // Analyze package-level indicators
    if (packageName) {
      const typosquattingAnalysis = this.analyzeTyposquatting(packageName);
      result.typosquattingScore = typosquattingAnalysis.similarity * 100;
      
      if (typosquattingAnalysis.isTyposquat) {
        result.suspiciousPatterns.push({
          type: 'obfuscation',
          file: 'package.json',
          line: 0,
          snippet: packageName,
          severity: 'high',
          description: `Possible typosquatting of '${typosquattingAnalysis.targetPackage}'`,
          confidence: typosquattingAnalysis.confidence
        });
      }

      // Analyze tarball integrity if metadata available
      if (packageMetadata) {
        const integrityAnalysis = this.analyzeIntegrity(files, packageMetadata);
        result.integrityFlags = integrityAnalysis.mismatches;
        
        if (integrityAnalysis.hasIntegrityIssues) {
          result.suspiciousPatterns.push({
            type: 'obfuscation',
            file: 'package',
            line: 0,
            snippet: 'tarball content mismatch',
            severity: 'high',
            description: 'Tarball content differs from repository',
            confidence: integrityAnalysis.confidence
          });
        }
      }
    }

    // Calculate final scores
    result.score = this.calculateScore(result);
    result.confidence = this.calculateConfidence(result);

    return result;
  }

  private async analyzeFilePatterns(
    filePath: string,
    content: string,
    result: StaticAnalysisResult
  ): Promise<void> {
    // Analyze suspicious patterns — one finding per pattern type per file
    const seenTypes = new Set<string>();
    for (const { pattern, type, severity, description } of this.suspiciousPatterns) {
      if (seenTypes.has(type + description)) continue;
      const match = content.match(pattern);
      if (match) {
        seenTypes.add(type + description);
        const line = this.getLineNumber(content, match.index || 0);
        const snippet = this.extractSnippet(content, match.index || 0);

        result.suspiciousPatterns.push({
          type,
          file: filePath,
          line,
          snippet,
          severity,
          description,
          confidence: 0.8
        });

        this.updateRiskIndicators(type, result.riskIndicators);
      }
    }

    // Enhanced string analysis for JavaScript files
    if (this.isJavaScriptFile(filePath)) {
      await this.analyzeStringLiterals(filePath, content, result);
    }
  }

  /**
   * Analyze string literals for suspicious content and obfuscation
   */
  private async analyzeStringLiterals(
    filePath: string,
    content: string,
    result: StaticAnalysisResult
  ): Promise<void> {
    // Skip minified files — they produce massive false positive noise
    if (this.isMinifiedFile(filePath, content)) return;

    const stringLiterals = StringAnalyzer.extractStringLiterals(content);

    // Aggregate findings per file instead of per string
    let hasHighEntropy = false;
    let hasSuspiciousPatterns: string[] = [];
    let maxObfuscationScore = 0;

    for (const literal of stringLiterals) {
      const analysis = StringAnalyzer.analyzeString(literal);

      if (analysis.entropy > 6) hasHighEntropy = true;
      if (analysis.suspiciousPatterns.length > 0) {
        hasSuspiciousPatterns.push(...analysis.suspiciousPatterns);
      }
      maxObfuscationScore = Math.max(maxObfuscationScore, analysis.obfuscationScore);
    }

    // Deduplicated suspicious patterns per file
    const uniquePatterns = [...new Set(hasSuspiciousPatterns)];
    if (uniquePatterns.length > 0) {
      result.suspiciousPatterns.push({
        type: 'obfuscation',
        file: filePath,
        line: 0,
        snippet: '',
        severity: 'high',
        description: `Suspicious patterns in strings: ${uniquePatterns.join(', ')}`,
        confidence: 0.8
      });
    }

    if (maxObfuscationScore > 0.7) {
      result.riskIndicators.has_obfuscated_code = true;
      result.obfuscationScore = Math.max(result.obfuscationScore, maxObfuscationScore * 100);
    }
  }

  private updateRiskIndicators(type: PatternType, indicators: RiskIndicators): void {
    switch (type) {
      case 'eval':
        indicators.uses_eval = true;
        break;
      case 'dynamic_require':
        indicators.uses_dynamic_require = true;
        break;
      case 'network_call':
        indicators.makes_network_calls = true;
        break;
      case 'file_operation':
        indicators.accesses_filesystem = true;
        break;
      case 'obfuscation':
        indicators.has_obfuscated_code = true;
        indicators.has_base64_strings = true;
        break;
      case 'prototype_pollution':
        indicators.modifies_prototype = true;
        break;
    }
  }

  /**
   * Advanced obfuscation detection with multiple techniques
   */
  private analyzeObfuscation(content: string): ObfuscationAnalysis {
    const techniques: ObfuscationTechnique[] = [];
    const deobfuscatedSamples: string[] = [];
    let confidence = 0;

    // String encoding detection
    if (this.detectStringEncoding(content)) {
      techniques.push('string_encoding');
      confidence += 0.3;
    }

    // Variable mangling detection
    if (this.detectVariableMangling(content)) {
      techniques.push('variable_mangling');
      confidence += 0.2;
    }

    // Control flow obfuscation
    if (this.detectControlFlowObfuscation(content)) {
      techniques.push('control_flow');
      confidence += 0.3;
    }

    // Dead code injection
    if (this.detectDeadCode(content)) {
      techniques.push('dead_code');
      confidence += 0.1;
    }

    // Packing detection
    if (this.detectPacking(content)) {
      techniques.push('packing');
      confidence += 0.4;
    }

    // Eval chains
    if (this.detectEvalChains(content)) {
      techniques.push('eval_chains');
      confidence += 0.4;
    }

    // Try to deobfuscate samples
    if (techniques.length > 0) {
      deobfuscatedSamples.push(...this.attemptDeobfuscation(content));
    }

    return {
      isObfuscated: confidence > 0.2, // Lowered threshold
      confidence: Math.min(confidence, 1.0),
      techniques,
      deobfuscatedSamples
    };
  }

  private detectStringEncoding(content: string): boolean {
    // Strip out regex patterns and character mapping objects first —
    // these legitimately use hex/unicode escapes (e.g. lodash's deburr)
    const stripped = this.stripLegitimateEncodings(content);

    const indicators = [
      // Hex encoding outside of regexes/char maps
      (stripped.match(/\\x[0-9a-f]{2}/gi)?.length || 0) > 10,
      // Unicode encoding outside of regexes/char maps
      (stripped.match(/\\u[0-9a-f]{4}/gi)?.length || 0) > 10,
      // Long base64 strings
      /[A-Za-z0-9+/=]{50,}/g.test(stripped),
      // Excessive string concatenation
      (content.match(/['"`]\s*\+\s*['"`]/g)?.length || 0) > 10
    ];

    return indicators.filter(Boolean).length >= 2;
  }

  private detectVariableMangling(content: string): boolean {
    const lines = content.split('\n');
    let shortVarCount = 0;
    let totalVars = 0;

    for (const line of lines) {
      const varMatches = line.match(/\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/g) || [];
      totalVars += varMatches.length;
      shortVarCount += varMatches.filter(v => v.length <= 2 && !/^(if|in|do|or|is|to|of|on|at|by|up|no|ok)$/.test(v)).length;
    }

    return totalVars > 10 && (shortVarCount / totalVars) > 0.2; // Lowered thresholds
  }

  private detectControlFlowObfuscation(content: string): boolean {
    const indicators = [
      // Excessive switch statements
      (content.match(/switch\s*\(/g)?.length || 0) > 5,
      // Complex ternary operators
      (content.match(/\?\s*[^:]+\s*:/g)?.length || 0) > 10,
      // Unusual loop structures
      /while\s*\(\s*!!\s*\[\]\s*\)/.test(content),
      // Function call obfuscation
      /\[\s*['"`]\w+['"`]\s*\]\s*\(/.test(content)
    ];

    return indicators.filter(Boolean).length >= 2;
  }

  private detectDeadCode(content: string): boolean {
    const indicators = [
      // Many empty functions — potential stub/placeholder code
      (content.match(/function\s*\w*\s*\(\s*\)\s*\{\s*\}/g)?.length || 0) > 10,
      // Massive number of unreferenced assignments — potential junk code injection
      (content.match(/var\s+_0x[a-f0-9]+\s*=/g)?.length || 0) > 5,
    ];

    return indicators.filter(Boolean).length >= 1;
  }

  private detectPacking(content: string): boolean {
    const indicators = [
      // UPX-style packing
      /eval\s*\(\s*function\s*\(\s*p\s*,\s*a\s*,\s*c\s*,\s*k\s*,\s*e\s*,\s*d\s*\)/.test(content),
      // Dean Edwards packer
      /eval\s*\(\s*function\s*\(\s*p\s*,\s*a\s*,\s*c\s*,\s*k\s*,\s*e\s*,\s*r\s*\)/.test(content),
      // Generic packed patterns
      /return\s+p\s*\}\s*\(\s*['"`][^'"`]{100,}['"`]/.test(content)
    ];

    return indicators.some(Boolean);
  }

  private detectEvalChains(content: string): boolean {
    const evalCount = (content.match(/eval\s*\(/g)?.length || 0);
    const functionCount = (content.match(/new\s+Function\s*\(/g)?.length || 0);
    
    return evalCount > 3 || functionCount > 2 || /eval\s*\(\s*eval/.test(content);
  }

  private attemptDeobfuscation(content: string): string[] {
    const samples: string[] = [];

    // Try to decode base64 strings
    const base64Matches = content.match(/[A-Za-z0-9+/=]{50,}/g) || [];
    for (const match of base64Matches.slice(0, 3)) {
      try {
        const decoded = Buffer.from(match, 'base64').toString('utf8');
        if (decoded.length > 10 && /^[\x20-\x7E\s]*$/.test(decoded)) {
          samples.push(decoded.substring(0, 100));
        }
      } catch (e) {
        // Ignore invalid base64
      }
    }

    // Try to decode hex strings
    const hexMatches = content.match(/\\x[0-9a-f]{2}/gi) || [];
    if (hexMatches.length > 10) {
      try {
        const hexString = hexMatches.join('').replace(/\\x/g, '');
        const decoded = Buffer.from(hexString, 'hex').toString('utf8');
        if (decoded.length > 10) {
          samples.push(decoded.substring(0, 100));
        }
      } catch (e) {
        // Ignore invalid hex
      }
    }

    return samples;
  }

  /**
   * Typosquatting detection using string similarity
   */
  private analyzeTyposquatting(packageName: string): TyposquattingAnalysis {
    let maxSimilarity = 0;
    let targetPackage = '';
    const suspiciousIndicators: string[] = [];

    // Check against popular packages
    for (const popular of POPULAR_PACKAGES) {
      const similarity = this.calculateStringSimilarity(packageName, popular);
      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
        targetPackage = popular;
      }
    }

    // Check for common typosquatting patterns
    if (this.hasTyposquattingPatterns(packageName)) {
      suspiciousIndicators.push('common typosquatting patterns');
    }

    // Check for character substitution
    if (this.hasCharacterSubstitution(packageName)) {
      suspiciousIndicators.push('character substitution');
    }

    const isTyposquat = maxSimilarity > 0.8 && maxSimilarity < 1.0;
    const confidence = isTyposquat ? maxSimilarity : 0;

    return {
      isTyposquat,
      similarity: maxSimilarity,
      targetPackage: isTyposquat ? targetPackage : undefined,
      confidence,
      suspiciousIndicators
    };
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    // Levenshtein distance based similarity
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    const distance = matrix[str2.length][str1.length];
    const maxLength = Math.max(str1.length, str2.length);
    return maxLength === 0 ? 1 : 1 - distance / maxLength;
  }

  private hasTyposquattingPatterns(packageName: string): boolean {
    const patterns = [
      // Extra characters
      /(.)\1{2,}/, // repeated characters
      // Common substitutions
      /[0o]/, // 0 for o
      /[il1]/, // i, l, 1 confusion
      // Hyphen/underscore variations
      /-|_/
    ];

    return patterns.some(pattern => pattern.test(packageName));
  }

  private hasCharacterSubstitution(packageName: string): boolean {
    const substitutions = [
      ['0', 'o'], ['1', 'l'], ['1', 'i'], ['5', 's'], ['3', 'e'],
      ['-', '_'], ['u', 'v'], ['rn', 'm'], ['cl', 'd']
    ];

    return substitutions.some(([from, to]) => 
      packageName.includes(from) || packageName.includes(to)
    );
  }

  /**
   * Tarball integrity analysis
   */
  private analyzeIntegrity(files: Map<string, string>, metadata: any): IntegrityAnalysis {
    const mismatches: string[] = [];
    let confidence = 0.9;

    // Check for package.json consistency
    const packageJsonContent = files.get('package.json');
    if (packageJsonContent) {
      try {
        const packageJson = JSON.parse(packageJsonContent);
        
        // Check name consistency
        if (metadata.name && packageJson.name !== metadata.name) {
          mismatches.push('Package name mismatch');
        }

        // Check version consistency
        if (metadata.version && packageJson.version !== metadata.version) {
          mismatches.push('Version mismatch');
        }

        // Check for suspicious scripts
        if (packageJson.scripts) {
          const suspiciousScripts = ['preinstall', 'postinstall', 'prepare'];
          for (const script of suspiciousScripts) {
            if (packageJson.scripts[script]) {
              mismatches.push(`Suspicious ${script} script`);
            }
          }
        }
      } catch (e) {
        mismatches.push('Invalid package.json');
        confidence = 0.5;
      }
    }

    // Check for unexpected files
    const expectedFiles = ['package.json', 'README.md', 'index.js', 'lib/', 'src/'];
    const unexpectedFiles = Array.from(files.keys()).filter(file => 
      !expectedFiles.some(expected => file.startsWith(expected)) &&
      !file.match(/\.(js|ts|json|md|txt)$/)
    );

    if (unexpectedFiles.length > 0) {
      mismatches.push(`Unexpected files: ${unexpectedFiles.slice(0, 3).join(', ')}`);
    }

    return {
      hasIntegrityIssues: mismatches.length > 0,
      mismatches,
      confidence,
      repositoryUrl: metadata.repository?.url
    };
  }

  private isJavaScriptFile(filename: string): boolean {
    return /\.(js|jsx|ts|tsx|mjs|cjs)$/.test(filename);
  }

  /**
   * Detect minified files — they trigger massive false positives.
   * Minified files have very long lines and/or .min. in the name.
   */
  private isMinifiedFile(filename: string, content: string): boolean {
    if (/\.min\.(js|css)$/.test(filename)) return true;
    // If any line is > 1000 chars, likely minified
    const lines = content.split('\n');
    if (lines.length < 5 && content.length > 5000) return true;
    return lines.some(line => line.length > 1000);
  }

  /**
   * Strip out legitimate uses of hex/unicode encoding so the deob engine
   * doesn't flag them. This includes:
   * - Regex patterns: /[\x00-\x2f]/ or /[\u0300-\u036f]/
   * - Character mapping objects: '\xc0': 'A', '\u0100': 'A'
   * - Regex string builders: var range = '\\ud800-\\udfff'
   */
  private stripLegitimateEncodings(content: string): string {
    let stripped = content;
    // Remove regex literals containing hex/unicode ranges
    stripped = stripped.replace(/\/[^\/\n]*(?:\\x[0-9a-f]{2}|\\u[0-9a-f]{4})[^\/\n]*\/[gimsuy]*/gi, '/* regex */');
    // Remove character mapping entries like '\xc0': 'A' or '\u0100': 'A'
    stripped = stripped.replace(/['"]\\[xu][0-9a-f]{2,4}['"]\s*:\s*['"][^'"]*['"]/gi, '"_": "_"');
    // Remove regex string builders like '\\ud800-\\udfff'
    stripped = stripped.replace(/['"](?:\\\\[xu][0-9a-f]{2,4}[-\\\\xu0-9a-f]*)+['"]/gi, '""');
    return stripped;
  }

  private getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
  }

  private extractSnippet(content: string, index: number, length: number = 50): string {
    const start = Math.max(0, index - length / 2);
    const end = Math.min(content.length, index + length / 2);
    return content.substring(start, end).replace(/\n/g, '\\n');
  }

  private calculateScore(result: StaticAnalysisResult): number {
    let score = 0;

    // Score by unique finding types per file, not raw count.
    // This prevents a package with 600 files from scoring 100x higher
    // than one with 1 file for the same types of patterns.
    const findingsByType = new Map<string, { maxSeverity: Severity; maxConfidence: number }>();
    for (const pattern of result.suspiciousPatterns) {
      const key = `${pattern.type}:${pattern.description.split(':')[0]}`;
      const existing = findingsByType.get(key);
      if (!existing || pattern.confidence > existing.maxConfidence) {
        findingsByType.set(key, {
          maxSeverity: pattern.severity,
          maxConfidence: pattern.confidence,
        });
      }
    }

    for (const { maxSeverity, maxConfidence } of findingsByType.values()) {
      const baseScore = maxSeverity === 'high' ? 15 :
                        maxSeverity === 'medium' ? 8 : 3;
      score += baseScore * maxConfidence;
    }

    // Add points for risk indicators
    const indicators = result.riskIndicators;
    if (indicators.uses_eval) score += 20;
    if (indicators.uses_dynamic_require) score += 10;
    if (indicators.makes_network_calls) score += 8;
    if (indicators.accesses_filesystem) score += 8;
    if (indicators.has_obfuscated_code) score += 15;
    if (indicators.has_base64_strings) score += 5;
    if (indicators.modifies_prototype) score += 15;

    // Add obfuscation and typosquatting scores (capped contribution)
    score += Math.min(15, result.obfuscationScore * 0.15);
    score += result.typosquattingScore * 0.2;

    // Add integrity issues
    score += Math.min(20, result.integrityFlags.length * 10);

    return Math.min(100, Math.round(score));
  }

  private calculateConfidence(result: StaticAnalysisResult): number {
    if (result.suspiciousPatterns.length === 0) return 0.95;

    const avgConfidence = result.suspiciousPatterns.reduce(
      (sum, pattern) => sum + pattern.confidence, 0
    ) / result.suspiciousPatterns.length;

    // Adjust confidence based on number of indicators
    const indicatorCount = Object.values(result.riskIndicators).filter(Boolean).length;
    const confidenceBoost = Math.min(0.1, indicatorCount * 0.02);

    return Math.min(0.99, avgConfidence + confidenceBoost);
  }
}

// Maintain backward compatibility
export class StaticAnalyzer extends EnhancedStaticAnalyzer {}