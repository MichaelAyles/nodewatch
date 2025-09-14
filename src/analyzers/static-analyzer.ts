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
      pattern: /\.exec\s*\(/g,
      type: 'dynamic_require' as PatternType,
      severity: 'medium' as Severity,
      description: 'Executes system commands'
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

    // Obfuscation indicators
    {
      pattern: /\\x[0-9a-f]{2}/gi,
      type: 'obfuscation' as PatternType,
      severity: 'medium' as Severity,
      description: 'Contains hex-encoded strings'
    },
    {
      pattern: /\\u[0-9a-f]{4}/gi,
      type: 'obfuscation' as PatternType,
      severity: 'medium' as Severity,
      description: 'Contains unicode-encoded strings'
    },
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
      // Skip non-JS/TS files for pattern analysis
      if (this.isJavaScriptFile(filePath)) {
        await this.analyzeFilePatterns(filePath, content, result);
      }

      // Enhanced deobfuscation analysis
      const deobfuscationResult = await this.deobfuscationEngine.deobfuscate(content);
      if (deobfuscationResult.confidence > 0.3) {
        result.riskIndicators.has_obfuscated_code = true;
        result.obfuscationScore = Math.max(result.obfuscationScore, deobfuscationResult.confidence * 100);
        
        // Add deobfuscation findings
        result.suspiciousPatterns.push({
          type: 'obfuscation',
          file: filePath,
          line: 0,
          snippet: deobfuscationResult.originalContent.substring(0, 100),
          severity: deobfuscationResult.confidence > 0.7 ? 'high' : 'medium',
          description: `Encoded content detected: ${deobfuscationResult.encodingTypes.join(', ')}`,
          confidence: deobfuscationResult.confidence
        });

        // Add suspicious strings found in deobfuscated content
        for (const suspiciousString of deobfuscationResult.suspiciousStrings) {
          result.suspiciousPatterns.push({
            type: 'obfuscation',
            file: filePath,
            line: 0,
            snippet: suspiciousString.substring(0, 100),
            severity: 'high',
            description: 'Suspicious content found in deobfuscated string',
            confidence: 0.9
          });
        }

        // If we have deobfuscated content, analyze it for additional patterns
        if (deobfuscationResult.deobfuscatedContent !== deobfuscationResult.originalContent) {
          await this.analyzeFilePatterns(filePath + ' (deobfuscated)', deobfuscationResult.deobfuscatedContent, result);
        }
      }

      // Legacy obfuscation analysis (for patterns not caught by new engine)
      const legacyObfuscationAnalysis = this.analyzeObfuscation(content);
      if (legacyObfuscationAnalysis.isObfuscated && deobfuscationResult.confidence < 0.3) {
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
    // Analyze suspicious patterns
    for (const { pattern, type, severity, description } of this.suspiciousPatterns) {
      const matches = Array.from(content.matchAll(pattern));
      for (const match of matches) {
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

        // Update risk indicators
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
    const stringLiterals = StringAnalyzer.extractStringLiterals(content);
    
    for (const literal of stringLiterals) {
      const analysis = StringAnalyzer.analyzeString(literal);
      
      // Check for high entropy (potential obfuscation)
      if (analysis.entropy > 6) {
        result.suspiciousPatterns.push({
          type: 'obfuscation',
          file: filePath,
          line: 0,
          snippet: literal.substring(0, 50),
          severity: 'medium',
          description: `High entropy string (${analysis.entropy.toFixed(2)}) suggests obfuscation`,
          confidence: Math.min(0.9, analysis.entropy / 8)
        });
      }

      // Check for encoded content in strings
      if (analysis.hasEncodedContent) {
        result.riskIndicators.has_base64_strings = true;
        result.suspiciousPatterns.push({
          type: 'obfuscation',
          file: filePath,
          line: 0,
          snippet: literal.substring(0, 50),
          severity: 'medium',
          description: 'String contains encoded content',
          confidence: 0.7
        });
      }

      // Check for suspicious patterns in strings
      if (analysis.suspiciousPatterns.length > 0) {
        result.suspiciousPatterns.push({
          type: 'obfuscation',
          file: filePath,
          line: 0,
          snippet: literal.substring(0, 50),
          severity: 'high',
          description: `Suspicious patterns in string: ${analysis.suspiciousPatterns.join(', ')}`,
          confidence: 0.8
        });
      }

      // High obfuscation score
      if (analysis.obfuscationScore > 0.6) {
        result.riskIndicators.has_obfuscated_code = true;
        result.obfuscationScore = Math.max(result.obfuscationScore, analysis.obfuscationScore * 100);
        
        result.suspiciousPatterns.push({
          type: 'obfuscation',
          file: filePath,
          line: 0,
          snippet: literal.substring(0, 50),
          severity: 'high',
          description: `Highly obfuscated string (score: ${(analysis.obfuscationScore * 100).toFixed(0)})`,
          confidence: analysis.obfuscationScore
        });
      }
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
    const indicators = [
      // Hex encoding (lowered threshold)
      /\\x[0-9a-f]{2}/gi.test(content) && (content.match(/\\x[0-9a-f]{2}/gi)?.length || 0) > 3,
      // Unicode encoding (lowered threshold)
      /\\u[0-9a-f]{4}/gi.test(content) && (content.match(/\\u[0-9a-f]{4}/gi)?.length || 0) > 2,
      // Base64 strings (lowered threshold)
      /[A-Za-z0-9+/=]{30,}/g.test(content),
      // Excessive string concatenation (lowered threshold)
      /['"`]\s*\+\s*['"`]/g.test(content) && (content.match(/['"`]\s*\+\s*['"`]/g)?.length || 0) > 5
    ];

    return indicators.filter(Boolean).length >= 1; // Changed from 2 to 1
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
      // Unreachable code after return
      /return\s*[^;]*;\s*\w+/.test(content),
      // Empty functions
      (content.match(/function\s*\w*\s*\(\s*\)\s*\{\s*\}/g)?.length || 0) > 5,
      // Unused variables
      /var\s+\w+\s*=\s*[^;]+;\s*(?!.*\w+)/.test(content)
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

    // Add points for each suspicious pattern with confidence weighting
    for (const pattern of result.suspiciousPatterns) {
      const baseScore = pattern.severity === 'high' ? 20 : 
                      pattern.severity === 'medium' ? 10 : 5;
      score += baseScore * pattern.confidence;
    }

    // Add points for risk indicators
    const indicators = result.riskIndicators;
    if (indicators.uses_eval) score += 25;
    if (indicators.uses_dynamic_require) score += 15;
    if (indicators.makes_network_calls) score += 10;
    if (indicators.accesses_filesystem) score += 10;
    if (indicators.has_obfuscated_code) score += 30;
    if (indicators.has_base64_strings) score += 10;
    if (indicators.modifies_prototype) score += 20;

    // Add obfuscation and typosquatting scores
    score += result.obfuscationScore * 0.3;
    score += result.typosquattingScore * 0.2;

    // Add integrity issues
    score += result.integrityFlags.length * 15;

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