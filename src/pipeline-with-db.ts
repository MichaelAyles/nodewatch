import { NpmFetcher } from './npm-fetcher';
import { StaticAnalyzer } from './analyzers/static-analyzer';
import { LLMAnalyzer } from './analyzers/llm-analyzer';
import { db } from './database/postgres-client';

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
  private llmEnabled: boolean;
  private dbEnabled: boolean;

  constructor() {
    this.fetcher = new NpmFetcher();
    this.staticAnalyzer = new StaticAnalyzer();
    const apiKey = process.env.ANTHROPIC_API_KEY;
    this.llmAnalyzer = new LLMAnalyzer(apiKey);
    this.llmEnabled = !!apiKey;
    this.dbEnabled = !!process.env.DATABASE_URL;
  }

  async analyzePackage(packageName: string, version = 'latest'): Promise<AnalysisResult> {
    if (!version) version = 'latest';

    console.log(`Starting analysis of ${packageName}@${version}`);
    const startTime = Date.now();

    let packageId: string | undefined;

    try {
      // Create package record in Postgres
      if (this.dbEnabled) {
        packageId = await db.createPackage({ name: packageName, version });
        console.log(`Created package record: ${packageId}`);
        await db.updatePackageStatus(packageId, 'analyzing');
      }

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
      const files = await this.fetcher.extractPackage(tarballPath, packageName, metadata.version);
      console.log(`Extracted ${files.size} files`);

      // Run static analysis
      console.log('Running static analysis...');
      const staticStart = Date.now();
      const staticResults = await this.staticAnalyzer.analyze(files);
      const staticTime = Date.now() - staticStart;

      if (this.dbEnabled && packageId) {
        await db.saveAnalysisResult({
          packageId,
          stage: 'static',
          results: staticResults,
          processingTimeMs: staticTime,
        });
      }

      // Run LLM analysis
      console.log('Running LLM analysis...');
      const llmStart = Date.now();
      const llmResults = await this.llmAnalyzer.analyze(packageName, files, staticResults);
      const llmTime = Date.now() - llmStart;

      if (this.dbEnabled && packageId) {
        await db.saveAnalysisResult({
          packageId,
          stage: 'llm',
          results: llmResults,
          processingTimeMs: llmTime,
        });
      }

      // Calculate overall score
      const overallScore = this.calculateOverallScore(staticResults, llmResults);
      const riskLevel = this.determineRiskLevel(overallScore);

      if (this.dbEnabled && packageId) {
        const reasons = [
          ...(staticResults.suspicious_patterns?.map((p: any) => p.description) || []),
          ...(llmResults.reasons || []),
        ].slice(0, 10);

        await db.saveRiskScore({
          packageId,
          overallScore,
          staticScore: staticResults?.score,
          llmScore: llmResults?.score,
          reasons,
          calculationTimeMs: Date.now() - startTime,
        });

        await db.updatePackageStatus(packageId, 'completed', {
          description: metadata.description,
          tarball_url: metadata.dist.tarball,
          dependencies: metadata.dependencies,
        });
      }

      const totalTime = Date.now() - startTime;
      console.log(`Analysis complete in ${totalTime}ms (static: ${staticTime}ms, llm: ${llmTime}ms)`);

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
      if (this.dbEnabled && packageId) {
        try {
          await db.updatePackageStatus(packageId, 'failed');
        } catch (_) { /* best effort */ }
      }
      console.error(`Analysis failed for ${packageName}@${version}:`, error);
      throw error;
    }
  }

  private calculateOverallScore(staticResults: any, llmResults: any): number {
    const staticScore = staticResults?.score || 0;
    const llmScore = llmResults?.score || 0;

    if (this.llmEnabled) {
      return Math.round(staticScore * 0.4 + llmScore * 0.6);
    }
    return staticScore;
  }

  private determineRiskLevel(score: number): 'safe' | 'low' | 'medium' | 'high' | 'critical' {
    if (score < 10) return 'safe';
    if (score < 30) return 'low';
    if (score < 50) return 'medium';
    if (score < 70) return 'high';
    return 'critical';
  }
}
