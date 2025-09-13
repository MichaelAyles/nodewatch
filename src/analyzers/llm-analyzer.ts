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
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model = 'gpt-3.5-turbo') {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
    this.model = model;
  }

  async analyze(
    packageName: string,
    files: Map<string, string>,
    staticAnalysisResults?: any
  ): Promise<LLMAnalysisResult> {
    // For MVP, we'll create a mock analysis
    // In production, this would call OpenAI/Claude API
    
    const suspiciousFiles = this.selectSuspiciousFiles(files, staticAnalysisResults);
    
    if (suspiciousFiles.length === 0) {
      return {
        is_malicious: false,
        confidence: 0.9,
        reasons: ['No suspicious patterns detected'],
        suspicious_code_snippets: [],
        score: 0
      };
    }

    // Mock analysis result based on static analysis
    const mockResult = this.generateMockAnalysis(suspiciousFiles, staticAnalysisResults);
    
    return mockResult;
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
          'Code structure suggests potential malicious intent'
        ],
        suspicious_code_snippets: suspiciousFiles.slice(0, 2).map(f => ({
          file: f.path,
          snippet: f.content.substring(0, 200),
          explanation: 'Contains suspicious patterns that could be used maliciously'
        })),
        score: Math.min(100, score + 20)
      };
    }

    return {
      is_malicious: false,
      confidence: 0.6,
      reasons: [
        'Some suspicious patterns detected but likely legitimate use',
        'Common patterns found in many npm packages'
      ],
      suspicious_code_snippets: [],
      score: Math.max(0, score - 10)
    };
  }

  private async callLLMAPI(prompt: string): Promise<any> {
    // Placeholder for actual API call
    // In production:
    // - Use OpenAI API or Claude API
    // - Include proper error handling
    // - Implement rate limiting
    // - Cache results
    
    throw new Error('LLM API not configured. Using mock analysis.');
  }
}