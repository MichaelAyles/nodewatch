-- NodeWatch Database Schema
-- PostgreSQL initialization script

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Create custom types
CREATE TYPE analysis_status AS ENUM ('pending', 'analyzing', 'completed', 'failed');
CREATE TYPE job_status AS ENUM ('waiting', 'active', 'completed', 'failed', 'delayed');
CREATE TYPE risk_level AS ENUM ('safe', 'low', 'medium', 'high', 'critical');
CREATE TYPE severity_level AS ENUM ('low', 'medium', 'high');

-- Packages table
CREATE TABLE packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    version VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Content hashing for deduplication
    content_hash VARCHAR(64) NOT NULL,
    package_hash VARCHAR(64) NOT NULL,
    file_count INTEGER DEFAULT 0,
    total_size BIGINT DEFAULT 0,
    unique_files INTEGER DEFAULT 0,
    duplicate_files TEXT[] DEFAULT '{}',
    
    -- Registry metadata
    registry_data JSONB,
    tarball_url TEXT,
    
    -- Enhanced metadata
    download_count BIGINT,
    maintainer_info JSONB,
    dependency_count INTEGER DEFAULT 0,
    typosquatting_score REAL DEFAULT 0,
    
    -- Status and timestamps
    analysis_status analysis_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(name, version),
    CHECK (file_count >= 0),
    CHECK (total_size >= 0),
    CHECK (typosquatting_score >= 0 AND typosquatting_score <= 100)
);

-- File hashes table for content deduplication
CREATE TABLE file_hashes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_hash VARCHAR(64) UNIQUE NOT NULL,
    file_path TEXT NOT NULL,
    size BIGINT NOT NULL,
    lines INTEGER DEFAULT 0,
    is_text BOOLEAN DEFAULT true,
    encoding VARCHAR(20),
    
    -- Analysis results cached by content hash
    analysis_results JSONB,
    
    -- Usage tracking
    first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    package_count INTEGER DEFAULT 1,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CHECK (size >= 0),
    CHECK (lines >= 0),
    CHECK (package_count > 0)
);

-- Package file relationships
CREATE TABLE package_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    file_hash_id UUID NOT NULL REFERENCES file_hashes(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    is_duplicate BOOLEAN DEFAULT false,
    
    UNIQUE(package_id, file_path)
);

-- Dependency graph
CREATE TABLE dependency_graph (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    dependency_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    version_range VARCHAR(100) NOT NULL,
    dependency_type VARCHAR(20) NOT NULL DEFAULT 'production',
    depth INTEGER NOT NULL DEFAULT 0,
    
    CHECK (depth >= 0),
    CHECK (dependency_type IN ('production', 'development', 'peer', 'optional'))
);

-- Analysis results
CREATE TABLE analysis_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    stage VARCHAR(20) NOT NULL,
    status analysis_status DEFAULT 'pending',
    results JSONB,
    error TEXT,
    
    -- Performance tracking
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    processing_time_ms INTEGER,
    
    -- Cache information
    cache_hit BOOLEAN DEFAULT false,
    content_hash VARCHAR(64),
    
    CHECK (stage IN ('static', 'dynamic', 'llm')),
    CHECK (processing_time_ms >= 0)
);

-- Risk scores with detailed tracking
CREATE TABLE risk_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    
    -- Scores
    overall_score INTEGER NOT NULL,
    static_score INTEGER,
    dynamic_score INTEGER,
    llm_score INTEGER,
    
    -- Detailed risk breakdown
    risk_signals JSONB DEFAULT '[]',
    reasons TEXT[] DEFAULT '{}',
    
    -- Scoring metadata
    scoring_version VARCHAR(10) DEFAULT '1.0',
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    calculation_time_ms INTEGER DEFAULT 0,
    
    CHECK (overall_score >= 0 AND overall_score <= 100),
    CHECK (static_score IS NULL OR (static_score >= 0 AND static_score <= 100)),
    CHECK (dynamic_score IS NULL OR (dynamic_score >= 0 AND dynamic_score <= 100)),
    CHECK (llm_score IS NULL OR (llm_score >= 0 AND llm_score <= 100)),
    CHECK (calculation_time_ms >= 0)
);

-- Sandbox analysis results
CREATE TABLE sandbox_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    
    -- Behavioral data
    behaviors JSONB DEFAULT '[]',
    network_events JSONB DEFAULT '[]',
    file_operations JSONB DEFAULT '[]',
    process_spawns JSONB DEFAULT '[]',
    
    -- Resource usage
    resource_metrics JSONB,
    
    -- Execution info
    execution_time_ms INTEGER NOT NULL,
    exit_code INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CHECK (execution_time_ms >= 0)
);

-- LLM analysis results with cost tracking
CREATE TABLE llm_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    
    -- Provider info
    provider VARCHAR(20) NOT NULL,
    model VARCHAR(50) NOT NULL,
    
    -- Input data
    evidence_bundle JSONB,
    prompt_tokens INTEGER DEFAULT 0,
    
    -- Response data
    response JSONB,
    completion_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    
    -- Cost and performance
    cost_usd DECIMAL(10,6) DEFAULT 0,
    processing_time_ms INTEGER DEFAULT 0,
    confidence REAL DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CHECK (provider IN ('openai', 'anthropic', 'local')),
    CHECK (prompt_tokens >= 0),
    CHECK (completion_tokens >= 0),
    CHECK (total_tokens >= 0),
    CHECK (cost_usd >= 0),
    CHECK (processing_time_ms >= 0),
    CHECK (confidence >= 0 AND confidence <= 1)
);

-- Batch job tracking
CREATE TABLE batch_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    status job_status DEFAULT 'waiting',
    
    -- Progress tracking
    total_packages INTEGER NOT NULL,
    completed_packages INTEGER DEFAULT 0,
    failed_packages INTEGER DEFAULT 0,
    skipped_packages INTEGER DEFAULT 0,
    
    -- Timing
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    estimated_completion TIMESTAMP WITH TIME ZONE,
    
    -- Configuration
    configuration JSONB,
    
    -- Results summary
    results JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CHECK (total_packages > 0),
    CHECK (completed_packages >= 0),
    CHECK (failed_packages >= 0),
    CHECK (skipped_packages >= 0)
);

-- Cache statistics and monitoring
CREATE TABLE cache_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Hit rates
    file_hash_hits INTEGER DEFAULT 0,
    file_hash_misses INTEGER DEFAULT 0,
    package_hash_hits INTEGER DEFAULT 0,
    package_hash_misses INTEGER DEFAULT 0,
    analysis_hits INTEGER DEFAULT 0,
    analysis_misses INTEGER DEFAULT 0,
    
    -- Deduplication savings
    total_files_processed INTEGER DEFAULT 0,
    unique_content_hashes INTEGER DEFAULT 0,
    duplicate_files_found INTEGER DEFAULT 0,
    space_saved_bytes BIGINT DEFAULT 0,
    
    -- Performance metrics
    avg_analysis_time_ms INTEGER DEFAULT 0,
    total_packages_analyzed INTEGER DEFAULT 0,
    total_cost_usd DECIMAL(10,2) DEFAULT 0,
    
    CHECK (file_hash_hits >= 0),
    CHECK (file_hash_misses >= 0),
    CHECK (total_files_processed >= 0),
    CHECK (space_saved_bytes >= 0),
    CHECK (avg_analysis_time_ms >= 0),
    CHECK (total_cost_usd >= 0)
);

-- Create indexes for performance
CREATE INDEX idx_packages_name ON packages(name);
CREATE INDEX idx_packages_content_hash ON packages(content_hash);
CREATE INDEX idx_packages_package_hash ON packages(package_hash);
CREATE INDEX idx_packages_status ON packages(analysis_status);
CREATE INDEX idx_packages_created_at ON packages(created_at);

CREATE INDEX idx_file_hashes_content_hash ON file_hashes(content_hash);
CREATE INDEX idx_file_hashes_package_count ON file_hashes(package_count);
CREATE INDEX idx_file_hashes_first_seen ON file_hashes(first_seen);

CREATE INDEX idx_package_files_package_id ON package_files(package_id);
CREATE INDEX idx_package_files_file_hash_id ON package_files(file_hash_id);
CREATE INDEX idx_package_files_is_duplicate ON package_files(is_duplicate);

CREATE INDEX idx_dependency_graph_package_id ON dependency_graph(package_id);
CREATE INDEX idx_dependency_graph_dependency_id ON dependency_graph(dependency_id);
CREATE INDEX idx_dependency_graph_type ON dependency_graph(dependency_type);
CREATE INDEX idx_dependency_graph_depth ON dependency_graph(depth);

CREATE INDEX idx_analysis_results_package_id ON analysis_results(package_id);
CREATE INDEX idx_analysis_results_stage ON analysis_results(stage);
CREATE INDEX idx_analysis_results_status ON analysis_results(status);
CREATE INDEX idx_analysis_results_cache_hit ON analysis_results(cache_hit);
CREATE INDEX idx_analysis_results_content_hash ON analysis_results(content_hash);

CREATE INDEX idx_risk_scores_package_id ON risk_scores(package_id);
CREATE INDEX idx_risk_scores_overall_score ON risk_scores(overall_score);
CREATE INDEX idx_risk_scores_calculated_at ON risk_scores(calculated_at);

CREATE INDEX idx_sandbox_results_package_id ON sandbox_results(package_id);
CREATE INDEX idx_sandbox_results_created_at ON sandbox_results(created_at);

CREATE INDEX idx_llm_analyses_package_id ON llm_analyses(package_id);
CREATE INDEX idx_llm_analyses_provider ON llm_analyses(provider);
CREATE INDEX idx_llm_analyses_created_at ON llm_analyses(created_at);
CREATE INDEX idx_llm_analyses_cost ON llm_analyses(cost_usd);

CREATE INDEX idx_batch_jobs_status ON batch_jobs(status);
CREATE INDEX idx_batch_jobs_created_at ON batch_jobs(created_at);

CREATE INDEX idx_cache_stats_timestamp ON cache_stats(timestamp);

-- Create GIN indexes for JSONB columns
CREATE INDEX idx_packages_registry_data_gin ON packages USING GIN(registry_data);
CREATE INDEX idx_packages_maintainer_info_gin ON packages USING GIN(maintainer_info);
CREATE INDEX idx_file_hashes_analysis_results_gin ON file_hashes USING GIN(analysis_results);
CREATE INDEX idx_analysis_results_results_gin ON analysis_results USING GIN(results);
CREATE INDEX idx_risk_scores_risk_signals_gin ON risk_scores USING GIN(risk_signals);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_packages_updated_at BEFORE UPDATE ON packages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to update file_hashes.last_seen
CREATE OR REPLACE FUNCTION update_file_hash_last_seen()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE file_hashes 
    SET last_seen = NOW(), 
        package_count = package_count + 1
    WHERE id = NEW.file_hash_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_file_hash_usage AFTER INSERT ON package_files
    FOR EACH ROW EXECUTE FUNCTION update_file_hash_last_seen();