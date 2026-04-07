import React, { useState } from 'react';
import { AnalysisResult, SuspiciousPattern, RiskIndicators, ThreatIndicator } from '../api';
import { ScoreRing } from './ScoreRing';

interface ResultViewProps {
  result: AnalysisResult;
  processingTime?: number;
  onBack: () => void;
}

type TabKey = 'patterns' | 'indicators' | 'llm' | 'integrity';

export function ResultView({ result, processingTime, onBack }: ResultViewProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('patterns');

  const patterns: SuspiciousPattern[] =
    result.static_analysis.suspiciousPatterns ||
    result.static_analysis.suspicious_patterns ||
    [];

  const indicators: RiskIndicators =
    result.static_analysis.riskIndicators ||
    result.static_analysis.risk_indicators ||
    {};

  const obfuscationScore =
    result.static_analysis.obfuscationScore ??
    result.static_analysis.obfuscation_score ??
    0;

  const typosquattingScore =
    result.static_analysis.typosquattingScore ??
    result.static_analysis.typosquatting_score ??
    0;

  const integrityFlags =
    result.static_analysis.integrityFlags ||
    result.static_analysis.integrity_flags ||
    [];

  const llm = result.llm_analysis;
  const threats: ThreatIndicator[] = llm?.specificThreats || llm?.specific_threats || [];
  const actions: string[] = llm?.recommendedActions || llm?.recommended_actions || [];

  const indicatorEntries: { label: string; key: keyof RiskIndicators; flagged: boolean }[] = [
    { label: 'eval() usage', key: 'uses_eval', flagged: !!indicators.uses_eval },
    { label: 'Dynamic require', key: 'uses_dynamic_require', flagged: !!indicators.uses_dynamic_require },
    { label: 'Network calls', key: 'makes_network_calls', flagged: !!indicators.makes_network_calls },
    { label: 'Filesystem access', key: 'accesses_filesystem', flagged: !!indicators.accesses_filesystem },
    { label: 'Obfuscated code', key: 'has_obfuscated_code', flagged: !!indicators.has_obfuscated_code },
    { label: 'Base64 strings', key: 'has_base64_strings', flagged: !!indicators.has_base64_strings },
    { label: 'Prototype modification', key: 'modifies_prototype', flagged: !!indicators.modifies_prototype },
  ];

  const flaggedCount = indicatorEntries.filter(i => i.flagged).length;

  return (
    <div>
      <button className="back-link" onClick={onBack}>
        &larr; Back to search
      </button>

      <div className="result-header">
        <ScoreRing score={result.overall_score} riskLevel={result.risk_level} />
        <div className="result-header-info">
          <div className="result-package-name">{result.package.name}</div>
          <div className="result-package-version">v{result.package.version}</div>
          {result.package.description && (
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>
              {result.package.description}
            </div>
          )}
          <div className="result-meta-row">
            <span>
              <span className={`risk-badge ${result.risk_level}`}>{result.risk_level}</span>
            </span>
            <span>Static score: {result.static_analysis.score}</span>
            {llm && <span>LLM score: {llm.score}</span>}
            {processingTime != null && (
              <span>{(processingTime / 1000).toFixed(1)}s</span>
            )}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-value">{patterns.length}</div>
          <div className="stat-label">Suspicious patterns</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{flaggedCount}</div>
          <div className="stat-label">Risk indicators flagged</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ fontSize: 20 }}>{obfuscationScore}%</div>
          <div className="stat-label">Obfuscation score</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ fontSize: 20 }}>{typosquattingScore}%</div>
          <div className="stat-label">Typosquatting score</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'patterns' ? 'active' : ''}`}
          onClick={() => setActiveTab('patterns')}
        >
          Patterns ({patterns.length})
        </button>
        <button
          className={`tab ${activeTab === 'indicators' ? 'active' : ''}`}
          onClick={() => setActiveTab('indicators')}
        >
          Risk indicators
        </button>
        {llm && (
          <button
            className={`tab ${activeTab === 'llm' ? 'active' : ''}`}
            onClick={() => setActiveTab('llm')}
          >
            LLM analysis
          </button>
        )}
        <button
          className={`tab ${activeTab === 'integrity' ? 'active' : ''}`}
          onClick={() => setActiveTab('integrity')}
        >
          Integrity
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'patterns' && (
        <PatternsTab patterns={patterns} />
      )}
      {activeTab === 'indicators' && (
        <IndicatorsTab indicators={indicatorEntries} />
      )}
      {activeTab === 'llm' && llm && (
        <LLMTab llm={llm} threats={threats} actions={actions} />
      )}
      {activeTab === 'integrity' && (
        <IntegrityTab flags={integrityFlags} />
      )}
    </div>
  );
}

function PatternsTab({ patterns }: { patterns: SuspiciousPattern[] }) {
  if (patterns.length === 0) {
    return <div className="empty-state">No suspicious patterns detected.</div>;
  }

  return (
    <div>
      {patterns.map((p, i) => (
        <div key={i} className="finding-row">
          <span className={`severity-badge ${p.severity}`}>{p.severity}</span>
          <div className="finding-content">
            <div className="finding-title">{p.description}</div>
            <div className="finding-detail">
              Type: {p.type} &middot; Confidence: {Math.round(p.confidence * 100)}%
            </div>
            <div className="finding-file">{p.file}:{p.line}</div>
            {p.snippet && (
              <div className="finding-snippet">{p.snippet}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function IndicatorsTab({
  indicators,
}: {
  indicators: { label: string; key: string; flagged: boolean }[];
}) {
  return (
    <div className="indicators-grid">
      {indicators.map(ind => (
        <div
          key={ind.key}
          className={`indicator-item ${ind.flagged ? 'flagged' : 'clean'}`}
        >
          <div className={`indicator-dot ${ind.flagged ? 'flagged' : 'clean'}`} />
          {ind.label}
        </div>
      ))}
    </div>
  );
}

function LLMTab({
  llm,
  threats,
  actions,
}: {
  llm: NonNullable<AnalysisResult['llm_analysis']>;
  threats: ThreatIndicator[];
  actions: string[];
}) {
  return (
    <div>
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <span
            className={`risk-badge ${
              llm.verdict === 'malicious' ? 'critical' :
              llm.verdict === 'suspicious' ? 'medium' : 'safe'
            }`}
          >
            {llm.verdict}
          </span>
          <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
            Confidence: {Math.round(llm.confidence * 100)}%
          </span>
          {llm.provider && (
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              via {llm.provider}
            </span>
          )}
        </div>

        {llm.reasoning && llm.reasoning.length > 0 && (
          <div>
            <div className="section-label">Reasoning</div>
            <ul style={{ paddingLeft: 18, fontSize: 13, color: 'var(--color-text-secondary)' }}>
              {llm.reasoning.map((r, i) => (
                <li key={i} style={{ marginBottom: 4 }}>{r}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {threats.length > 0 && (
        <div className="result-section">
          <div className="result-section-title">Specific threats</div>
          {threats.map((t, i) => (
            <div key={i} className="finding-row">
              <span className={`severity-badge ${t.severity}`}>{t.severity}</span>
              <div className="finding-content">
                <div className="finding-title">{t.description}</div>
                <div className="finding-detail">Type: {t.type}</div>
                {t.evidence && t.evidence.length > 0 && (
                  <div className="finding-snippet">{t.evidence.join('\n')}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {actions.length > 0 && (
        <div className="result-section">
          <div className="result-section-title">Recommended actions</div>
          <ul style={{ paddingLeft: 18, fontSize: 13, color: 'var(--color-text-secondary)' }}>
            {actions.map((a, i) => (
              <li key={i} style={{ marginBottom: 4 }}>{a}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function IntegrityTab({ flags }: { flags: string[] }) {
  if (flags.length === 0) {
    return <div className="empty-state">No integrity issues detected.</div>;
  }

  return (
    <div>
      {flags.map((flag, i) => (
        <div key={i} className="finding-row">
          <span className="severity-badge medium">flag</span>
          <div className="finding-content">
            <div className="finding-title">{flag}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
