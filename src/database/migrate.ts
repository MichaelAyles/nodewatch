import { getPostgresPool, closePostgresPool } from './postgres-client';

const MIGRATION = `
CREATE TABLE IF NOT EXISTS packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  description TEXT,
  analysis_status TEXT NOT NULL DEFAULT 'pending',
  content_hash TEXT NOT NULL DEFAULT '',
  package_hash TEXT NOT NULL DEFAULT '',
  file_count INTEGER NOT NULL DEFAULT 0,
  total_size BIGINT NOT NULL DEFAULT 0,
  unique_files INTEGER NOT NULL DEFAULT 0,
  duplicate_files TEXT[] NOT NULL DEFAULT '{}',
  registry_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(name, version)
);

CREATE INDEX IF NOT EXISTS idx_packages_name ON packages(name);
CREATE INDEX IF NOT EXISTS idx_packages_status ON packages(analysis_status);
CREATE INDEX IF NOT EXISTS idx_packages_content_hash ON packages(content_hash);

CREATE TABLE IF NOT EXISTS file_hashes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_hash TEXT NOT NULL UNIQUE,
  file_path TEXT NOT NULL,
  size BIGINT NOT NULL DEFAULT 0,
  lines INTEGER NOT NULL DEFAULT 0,
  is_text BOOLEAN NOT NULL DEFAULT true,
  encoding TEXT,
  analysis_results JSONB,
  first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  package_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_file_hashes_hash ON file_hashes(content_hash);

CREATE TABLE IF NOT EXISTS package_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  file_hash_id UUID NOT NULL REFERENCES file_hashes(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  is_duplicate BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_package_files_package ON package_files(package_id);
CREATE INDEX IF NOT EXISTS idx_package_files_hash ON package_files(file_hash_id);

CREATE TABLE IF NOT EXISTS analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  results JSONB,
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  processing_time_ms INTEGER NOT NULL DEFAULT 0,
  cache_hit BOOLEAN NOT NULL DEFAULT false,
  content_hash TEXT,
  UNIQUE(package_id, stage)
);

CREATE INDEX IF NOT EXISTS idx_analysis_results_package ON analysis_results(package_id);
CREATE INDEX IF NOT EXISTS idx_analysis_results_stage ON analysis_results(stage);

CREATE TABLE IF NOT EXISTS risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL UNIQUE REFERENCES packages(id) ON DELETE CASCADE,
  overall_score INTEGER NOT NULL DEFAULT 0,
  static_score INTEGER,
  dynamic_score INTEGER,
  llm_score INTEGER,
  risk_signals JSONB NOT NULL DEFAULT '[]',
  reasons TEXT[] NOT NULL DEFAULT '{}',
  scoring_version TEXT NOT NULL DEFAULT '1.0',
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  calculation_time_ms INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_risk_scores_package ON risk_scores(package_id);
CREATE INDEX IF NOT EXISTS idx_risk_scores_score ON risk_scores(overall_score);
`;

async function migrate() {
  console.log('Running database migration...');
  const pool = getPostgresPool();
  try {
    await pool.query(MIGRATION);
    console.log('Migration complete.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await closePostgresPool();
  }
}

migrate();
