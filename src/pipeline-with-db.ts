import { NpmFetcher } from './npm-fetcher';
import { StaticAnalyzer } from './analyzers/static-analyzer';
import { LLMAnalyzer } from './analyzers/llm-analyzer';
import { convexClient, isConvexConfigured } from './convex-client';
import { api } from '../convex/_generated/api';

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

  constructor() {
    this.fetcher = new NpmFetcher();
    this.staticAnalyzer = new StaticAnalyzer();
    const apiKey = process.env.ANTHROPIC_API_KEY;
    this.llmAnalyzer = new LLMAnalyzer(apiKey);
    this.llmEnabled = !!apiKey;
  }

  async analyzePackage(packageName: string, version = 'latest'): Promise<AnalysisResult> {
    if (!version) version = 'latest';

    console.log(`Starting analysis of ${packageName}@${version}`);
    const startTime = Date.now();

    try {
      // Create package record in Convex (if configured)
      let packageId: string | undefined;
      if (isConvexConfigured()) {
        packageId = await convexClient!.mutation(api.packages.submitPackage as any, {
          name: packageName,
          version,
        });
        console.log(`Created package record: ${packageId}`);
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

      // Save static analysis results to Convex
      if (isConvexConfigured() && packageId) {
        await convexClient!.mutation(api.analysis.saveAnalysisResult as any, {
          package_id: packageId,
          stage: 'static',
          results: staticResults,
          processing_time_ms: staticTime,
        });
      }

      // Run LLM analysis
      console.log('Running LLM analysis...');
      const llmStart = Date.now();
      const llmResults = await this.llmAnalyzer.analyze(packageName, files, staticResults);
      const llmTime = Date.now() - llmStart;

      // Save LLM analysis results to Convex
      if (isConvexConfigured() && packageId) {
        await convexClient!.mutation(api.analysis.saveAnalysisResult as any, {
          package_id: packageId,
          stage: 'llm',
          results: llmResults,
          processing_time_ms: llmTime,
        });
      }

      // Calculate overall score
      const overallScore = this.calculateOverallScore(staticResults, llmResults);
      const riskLevel = this.determineRiskLevel(overallScore);

      // Save risk score to Convex
      if (isConvexConfigured() && packageId) {
        const reasons = [
          ...(staticResults.suspicious_patterns?.map((p: any) => p.description) || []),
          ...(llmResults.reasons || []),
        ].slice(0, 10);

        await convexClient!.mutation(api.analysis.saveRiskScore as any, {
          package_id: packageId,
          overall_score: overallScore,
          static_score: staticResults?.score,
          llm_score: llmResults?.score,
          reasons,
        });

        // Update package status to completed
        await convexClient!.mutation(api.packages.updatePackageStatus as any, {
          id: packageId,
          status: 'completed',
          registry_data: {
            description: metadata.description,
            tarball_url: metadata.dist.tarball,
            dependencies: metadata.dependencies,
          },
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
      // Mark package as failed in Convex
      if (isConvexConfigured() && arguments[2]) {
        try {
          await convexClient!.mutation(api.packages.updatePackageStatus as any, {
            id: arguments[2],
            status: 'failed',
          });
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
