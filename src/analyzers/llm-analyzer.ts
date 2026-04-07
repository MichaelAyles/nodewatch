import Anthropic from '@anthropic-ai/sdk';

export interface LLMAnalysisResult {
  is_malicious: boolean;
  confidence: number; // 0-1
  reasons: string[];
  suspicious_code_snippets: Array<{
    file: string;
    snippet: string;
    explanation: string;
  }>;
  score: number; // 0-100
}

export class LLMAnalyzer {
  private client: Anthropic | null;
  private model: string;

  constructor(apiKey?: string, model = 'claude-sonnet-4-6') {
    const key = apiKey || process.env.ANTHROPIC_API_KEY;
    this.client = key ? new Anthropic({ apiKey: key }) : null;
    this.model = model;
  }

  async analyze(
    packageName: string,
    files: Map<string, string>,
    staticAnalysisResults?: any
  ): Promise<LLMAnalysisResult> {
    const suspiciousFiles = this.selectSuspiciousFiles(files, staticAnalysisResults);

    if (suspiciousFiles.length === 0) {
      return {
        is_malicious: false,
        confidence: 0.9,
        reasons: ['No suspicious patterns detected'],
        suspicious_code_snippets: [],
        score: 0,
      };
    }

    if (!this.client) {
      console.log('No ANTHROPIC_API_KEY configured, using mock LLM analysis');
      return this.generateMockAnalysis(suspiciousFiles, staticAnalysisResults);
    }

    return this.callClaude(packageName, suspiciousFiles, staticAnalysisResults);
  }

  private selectSuspiciousFiles(
    files: Map<string, string>,
    staticAnalysisResults?: any
  ): Array<{ path: string; content: string }> {
    const suspicious: Array<{ path: string; content: string }> = [];

    if (!staticAnalysisResults || !staticAnalysisResults.suspicious_patterns) {
      return suspicious;
    }

    const flaggedFiles = new Set(
      staticAnalysisResults.suspicious_patterns.map((p: any) => p.file)
    );

    for (const file of flaggedFiles) {
      const content = files.get(file as string);
      if (content) {
        suspicious.push({ path: file as string, content });
      }
    }

    return suspicious.slice(0, 5); // Limit to 5 files for cost control
  }

  private async callClaude(
    packageName: string,
    suspiciousFiles: Array<{ path: string; content: string }>,
    staticAnalysisResults?: any
  ): Promise<LLMAnalysisResult> {
    const staticSummary = staticAnalysisResults
      ? `Static analysis score: ${staticAnalysisResults.score}/100\nPatterns found: ${staticAnalysisResults.suspicious_patterns?.length || 0}\nCategories: ${[...new Set(staticAnalysisResults.suspicious_patterns?.map((p: any) => p.type) || [])].join(', ')}`
      : 'No static analysis available';

    const fileContents = suspiciousFiles
      .map((f) => {
        const truncated = f.content.length > 3000 ? f.content.substring(0, 3000) + '\n... (truncated)' : f.content;
        return `--- ${f.path} ---\n${truncated}`;
      })
      .join('\n\n');

    const prompt = `You are a security analyst reviewing an npm package for malware. Analyze the following flagged files from the package "${packageName}".

${staticSummary}

Flagged source files:

${fileContents}

Respond with ONLY valid JSON matching this exact schema:
{
  "is_malicious": boolean,
  "confidence": number between 0 and 1,
  "reasons": ["string array of specific findings"],
  "suspicious_code_snippets": [{"file": "path", "snippet": "code excerpt", "explanation": "why this is suspicious"}],
  "score": number between 0 and 100
}

Be specific. Reference actual code you see. A high score means more dangerous. Common legitimate patterns (like build tools using child_process, or test frameworks using eval) should score low. Focus on: data exfiltration, credential theft, reverse shells, obfuscated payloads, install script abuse, and typosquatting indicators.`;

    try {
      const response = await this.client!.messages.create({
        model: this.model,
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('');

      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('LLM response did not contain valid JSON, falling back to mock');
        return this.generateMockAnalysis(suspiciousFiles, staticAnalysisResults);
      }

      const parsed = JSON.parse(jsonMatch[0]) as LLMAnalysisResult;

      // Clamp values to valid ranges
      parsed.confidence = Math.max(0, Math.min(1, parsed.confidence));
      parsed.score = Math.max(0, Math.min(100, Math.round(parsed.score)));

      return parsed;
    } catch (error) {
      console.error('Claude API call failed, falling back to mock:', error);
      return this.generateMockAnalysis(suspiciousFiles, staticAnalysisResults);
    }
  }

  private generateMockAnalysis(
    suspiciousFiles: Array<{ path: string; content: string }>,
    staticAnalysisResults?: any
  ): LLMAnalysisResult {
    const hasHighRisk = staticAnalysisResults?.suspicious_patterns?.some(
      (p: any) => p.severity === 'high'
    );

    const score = staticAnalysisResults?.score || 0;

    if (hasHighRisk && score > 50) {
      return {
        is_malicious: true,
        confidence: 0.75,
        reasons: [
          'Package contains high-risk patterns like eval() or dynamic code execution',
          'Multiple suspicious patterns detected across files',
          'Code structure suggests potential malicious intent',
        ],
        suspicious_code_snippets: suspiciousFiles.slice(0, 2).map((f) => ({
          file: f.path,
          snippet: f.content.substring(0, 200),
          explanation: 'Contains suspicious patterns that could be used maliciously',
        })),
        score: Math.min(100, score + 20),
      };
    }

    return {
      is_malicious: false,
      confidence: 0.6,
      reasons: [
        'Some suspicious patterns detected but likely legitimate use',
        'Common patterns found in many npm packages',
      ],
      suspicious_code_snippets: [],
      score: Math.max(0, score - 10),
    };
  }
}
