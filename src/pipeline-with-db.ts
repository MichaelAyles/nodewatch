import { NpmFetcher } from './npm-fetcher';
import { StaticAnalyzer } from './analyzers/static-analyzer';
import { LLMAnalyzer } from './analyzers/llm-analyzer';
import { convexClient } from './convex-client';

export interface AnalysisResult {
  package: {
    name: string;
    version: string;
    description?: string;
  };
  static_analysis?: any;
  llm_analysis?: any;
  overall_score: number;
  risk_level: 'safe' | 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  package_id?: string;
}

export class AnalysisPipelineWithDB {
  private fetcher: NpmFetcher;
  private staticAnalyzer: StaticAnalyzer;
  private llmAnalyzer: LLMAnalyzer;

  constructor() {
    this.fetcher = new NpmFetcher();
    this.staticAnalyzer = new StaticAnalyzer();
    this.llmAnalyzer = new LLMAnalyzer();
  }

  async analyzePackage(packageName: string, version = 'latest'): Promise<AnalysisResult> {
    // Handle empty version string
    if (!version) {
      version = 'latest';
    }
    
    console.log(`Starting analysis of ${packageName}@${version}`);
    
    try {
      // Create package record in database
      // TODO: Replace with proper Convex API call once generated
      const packageId = `pkg_${Date.now()}`; // await convexClient.mutation(api.packages.submitPackage, { name: packageName, version: version });
      
      console.log(`Created package record: ${packageId}`);
      
      // Fetch package metadata
      console.log('Fetching package metadata...');
      const metadata = await this.fetcher.fetchPackageMetadata(packageName, version);
      
      // Download tarball
      console.log('Downloading package tarball...');
      const tarballPath = await this.fetcher.downloadTarball(
        metadata.dist.tarball,
        packageName,
        metadata.version
      );
      
      // Extract and read files
      console.log('Extracting package contents...');
      const files = await this.fetcher.extractPackage(
        tarballPath,
        packageName,
        metadata.version
      );
      
      console.log(`Extracted ${files.size} files`);
      
      // Run static analysis
      console.log('Running static analysis...');
      const staticResults = await this.staticAnalyzer.analyze(files);
      
      // Save static analysis results
      // TODO: Replace with proper Convex API call once generated
      // await convexClient.mutation(api.analysis.saveAnalysisResult, { package_id: packageId, stage: 'static', results: staticResults });
      
      // Run LLM analysis on suspicious files
      console.log('Running LLM analysis...');
      const llmResults = await this.llmAnalyzer.analyze(
        packageName,
        files,
        staticResults
      );
      
      // Save LLM analysis results
      // TODO: Replace with proper Convex API call once generated
      // await convexClient.mutation(api.analysis.saveAnalysisResult, { package_id: packageId, stage: 'llm', results: llmResults });
      
      // Calculate overall score
      const overallScore = this.calculateOverallScore(staticResults, llmResults);
      const riskLevel = this.determineRiskLevel(overallScore);
      
      // Save risk score
      // TODO: Replace with proper Convex API call once generated
      // await convexClient.mutation(api.analysis.saveRiskScore, { package_id: packageId, overall_score: overallScore, static_score: staticResults?.score, llm_score: llmResults?.score, reasons: [...staticResults.suspicious_patterns.map((p: any) => p.description), ...(llmResults.reasons || [])].slice(0, 10) });
      
      // Update package status
      // TODO: Replace with proper Convex API call once generated
      // await convexClient.mutation(api.packages.updatePackageStatus, { id: packageId, status: 'completed', registry_data: { description: metadata.description, tarball_url: metadata.dist.tarball, dependencies: metadata.dependencies } });
      
      return {
        package: {
          name: packageName,
          version: metadata.version,
          description: metadata.description,
        },
        static_analysis: staticResults,
        llm_analysis: llmResults,
        overall_score: overallScore,
        risk_level: riskLevel,
        timestamp: Date.now(),
        package_id: packageId,
      };
    } catch (error) {
      console.error(`Analysis failed for ${packageName}@${version}:`, error);
      throw error;
    }
  }

  private calculateOverallScore(staticResults: any, llmResults: any): number {
    // Weighted average of different analysis scores
    const staticWeight = 0.4;
    const llmWeight = 0.6;
    
    const staticScore = staticResults?.score || 0;
    const llmScore = llmResults?.score || 0;
    
    return Math.round(staticScore * staticWeight + llmScore * llmWeight);
  }

  private determineRiskLevel(score: number): 'safe' | 'low' | 'medium' | 'high' | 'critical' {
    if (score < 10) return 'safe';
    if (score < 30) return 'low';
    if (score < 50) return 'medium';
    if (score < 70) return 'high';
    return 'critical';
  }
}