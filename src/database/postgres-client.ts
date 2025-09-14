import { Pool, PoolClient } from 'pg';
import { config } from '../config';
import { logger } from '../utils/logger';

// Database connection pool
let pool: Pool | null = null;

export function getPostgresPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    pool.on('connect', () => {
      logger.debug('PostgreSQL client connected');
    });

    pool.on('error', (err: any) => {
      logger.error('PostgreSQL pool error', err);
    });
  }

  return pool;
}

export async function closePostgresPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('PostgreSQL pool closed');
  }
}

/**
 * PostgreSQL database adapter for NodeWatch
 */
export class PostgresAdapter {
  private pool: Pool;

  constructor() {
    this.pool = getPostgresPool();
  }

  /**
   * Execute a query with parameters
   */
  async query<T = any>(text: string, params?: any[]): Promise<T[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(text, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Execute a query and return a single row
   */
  async queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
    const rows = await this.query<T>(text, params);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Execute multiple queries in a transaction
   */
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Package operations
  async createPackage(data: {
    name: string;
    version: string;
    contentHash?: string;
    packageHash?: string;
    fileCount?: number;
    totalSize?: number;
    uniqueFiles?: number;
    duplicateFiles?: string[];
    registryData?: any;
  }): Promise<string> {
    const result = await this.queryOne<{ id: string }>(`
      INSERT INTO packages (
        name, version, content_hash, package_hash, file_count, 
        total_size, unique_files, duplicate_files, registry_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (name, version) DO UPDATE SET
        content_hash = EXCLUDED.content_hash,
        package_hash = EXCLUDED.package_hash,
        updated_at = NOW()
      RETURNING id
    `, [
      data.name,
      data.version,
      data.contentHash || '',
      data.packageHash || '',
      data.fileCount || 0,
      data.totalSize || 0,
      data.uniqueFiles || 0,
      data.duplicateFiles || [],
      data.registryData || null
    ]);

    return result!.id;
  }

  async findPackageByContentHash(contentHash: string): Promise<any | null> {
    return await this.queryOne(`
      SELECT * FROM packages 
      WHERE content_hash = $1 
      ORDER BY created_at DESC 
      LIMIT 1
    `, [contentHash]);
  }

  async updatePackageStatus(id: string, status: string, registryData?: any): Promise<void> {
    await this.query(`
      UPDATE packages 
      SET analysis_status = $2, registry_data = COALESCE($3, registry_data), updated_at = NOW()
      WHERE id = $1
    `, [id, status, registryData]);
  }

  // File hash operations
  async storeFileHash(data: {
    contentHash: string;
    filePath: string;
    size: number;
    lines: number;
    isText: boolean;
    encoding?: string;
    analysisResults?: any;
  }): Promise<string> {
    const result = await this.queryOne<{ id: string }>(`
      INSERT INTO file_hashes (
        content_hash, file_path, size, lines, is_text, encoding, analysis_results
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (content_hash) DO UPDATE SET
        last_seen = NOW(),
        package_count = file_hashes.package_count + 1,
        analysis_results = COALESCE($7, file_hashes.analysis_results)
      RETURNING id
    `, [
      data.contentHash,
      data.filePath,
      data.size,
      data.lines,
      data.isText,
      data.encoding,
      data.analysisResults
    ]);

    return result!.id;
  }

  async getFileHashByContent(contentHash: string): Promise<any | null> {
    return await this.queryOne(`
      SELECT * FROM file_hashes WHERE content_hash = $1
    `, [contentHash]);
  }

  // Analysis results
  async saveAnalysisResult(data: {
    packageId: string;
    stage: string;
    results: any;
    error?: string;
    processingTimeMs?: number;
    cacheHit?: boolean;
    contentHash?: string;
  }): Promise<string> {
    const result = await this.queryOne<{ id: string }>(`
      INSERT INTO analysis_results (
        package_id, stage, status, results, error, 
        completed_at, processing_time_ms, cache_hit, content_hash
      ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8)
      ON CONFLICT (package_id, stage) DO UPDATE SET
        status = $3,
        results = $4,
        error = $5,
        completed_at = NOW(),
        processing_time_ms = $6,
        cache_hit = $7,
        content_hash = $8
      RETURNING id
    `, [
      data.packageId,
      data.stage,
      data.error ? 'failed' : 'completed',
      data.results,
      data.error,
      data.processingTimeMs || 0,
      data.cacheHit || false,
      data.contentHash
    ]);

    return result!.id;
  }

  async saveRiskScore(data: {
    packageId: string;
    overallScore: number;
    staticScore?: number;
    dynamicScore?: number;
    llmScore?: number;
    riskSignals?: any[];
    reasons: string[];
    scoringVersion?: string;
    calculationTimeMs?: number;
  }): Promise<string> {
    const result = await this.queryOne<{ id: string }>(`
      INSERT INTO risk_scores (
        package_id, overall_score, static_score, dynamic_score, llm_score,
        risk_signals, reasons, scoring_version, calculation_time_ms
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (package_id) DO UPDATE SET
        overall_score = $2,
        static_score = $3,
        dynamic_score = $4,
        llm_score = $5,
        risk_signals = $6,
        reasons = $7,
        scoring_version = $8,
        calculated_at = NOW(),
        calculation_time_ms = $9
      RETURNING id
    `, [
      data.packageId,
      data.overallScore,
      data.staticScore,
      data.dynamicScore,
      data.llmScore,
      JSON.stringify(data.riskSignals || []),
      data.reasons,
      data.scoringVersion || '1.0',
      data.calculationTimeMs || 0
    ]);

    return result!.id;
  }

  // Query operations
  async getPackageAnalysis(packageId: string): Promise<any | null> {
    return await this.queryOne(`
      SELECT 
        p.*,
        rs.overall_score,
        rs.static_score,
        rs.dynamic_score,
        rs.llm_score,
        rs.risk_signals,
        rs.reasons,
        rs.calculated_at,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'stage', ar.stage,
              'status', ar.status,
              'results', ar.results,
              'processing_time_ms', ar.processing_time_ms,
              'cache_hit', ar.cache_hit
            )
          ) FILTER (WHERE ar.id IS NOT NULL), 
          '[]'
        ) as analysis_results
      FROM packages p
      LEFT JOIN risk_scores rs ON rs.package_id = p.id
      LEFT JOIN analysis_results ar ON ar.package_id = p.id
      WHERE p.id = $1
      GROUP BY p.id, rs.id
    `, [packageId]);
  }

  async getPackageByName(name: string): Promise<any | null> {
    const pkg = await this.queryOne(`
      SELECT * FROM packages WHERE name = $1 ORDER BY created_at DESC LIMIT 1
    `, [name]);

    if (!pkg) return null;

    return await this.getPackageAnalysis(pkg.id);
  }

  async listPackages(options: {
    status?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<any[]> {
    const { status, limit = 20, offset = 0 } = options;
    
    let query = `
      SELECT p.*, rs.overall_score, rs.calculated_at as score_calculated_at
      FROM packages p
      LEFT JOIN risk_scores rs ON rs.package_id = p.id
    `;
    
    const params: any[] = [];
    
    if (status) {
      query += ` WHERE p.analysis_status = $${params.length + 1}`;
      params.push(status);
    }
    
    query += ` ORDER BY p.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
    return await this.query(query, params);
  }

  // Statistics
  async getDeduplicationStats(): Promise<any> {
    return await this.queryOne(`
      SELECT 
        COUNT(DISTINCT p.id) as total_packages,
        COUNT(DISTINCT fh.content_hash) as unique_files,
        COUNT(fh.id) FILTER (WHERE fh.package_count > 1) as duplicated_files,
        SUM(fh.size * (fh.package_count - 1)) FILTER (WHERE fh.package_count > 1) as space_saved_bytes,
        AVG(fh.package_count) as avg_reuse_rate
      FROM packages p
      JOIN package_files pf ON pf.package_id = p.id
      JOIN file_hashes fh ON fh.id = pf.file_hash_id
    `);
  }

  async getCacheStats(): Promise<any> {
    return await this.queryOne(`
      SELECT 
        COUNT(*) FILTER (WHERE cache_hit = true) as cache_hits,
        COUNT(*) FILTER (WHERE cache_hit = false) as cache_misses,
        AVG(processing_time_ms) as avg_processing_time,
        COUNT(DISTINCT package_id) as packages_analyzed
      FROM analysis_results
      WHERE completed_at > NOW() - INTERVAL '24 hours'
    `);
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.queryOne('SELECT 1');
      return true;
    } catch (error) {
      logger.error('Database health check failed', error);
      return false;
    }
  }
}

// Export singleton instance
export const db = new PostgresAdapter();