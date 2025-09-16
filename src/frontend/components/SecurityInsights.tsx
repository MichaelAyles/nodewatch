import React, { useState, useEffect } from 'react';
import { getApiClient } from '../../utils/api-client';

enum ThreatType {
  MALWARE = 'malware',
  CREDENTIAL_THEFT = 'credential_theft',
  CODE_INJECTION = 'code_injection',
  TYPOSQUATTING = 'typosquatting',
  SUPPLY_CHAIN = 'supply_chain',
  BACKDOOR = 'backdoor'
}

enum SeverityLevel {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

interface SecurityFinding {
  id: string;
  packageName: string;
  version: string;
  threatType: ThreatType;
  severity: SeverityLevel;
  discoveryDate: Date;
  summary: string;
  impactDescription: string;
  affectedDownloads: number;
}

interface SecurityInsightsProps {
  onFindingClick?: (packageName: string) => void;
}

const SecurityInsights: React.FC<SecurityInsightsProps> = ({
  onFindingClick
}) => {
  const [recentFindings, setRecentFindings] = useState<SecurityFinding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiClient = getApiClient();
    
    const fetchFindings = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Use the API client to fetch findings
        const response = await fetch('/api/findings/recent?limit=6');
        const data = await response.json();
        
        if (data.success) {
          // Convert date strings back to Date objects
          const findings = data.findings.map((finding: any) => ({
            ...finding,
            discoveryDate: new Date(finding.discoveryDate),
            threatType: finding.threatType as ThreatType,
            severity: finding.severity as SeverityLevel,
          }));
          setRecentFindings(findings);
        } else {
          setError(data.error || 'Failed to load security findings');
        }
      } catch (err) {
        setError('Failed to connect to server');
        console.error('Error fetching findings:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFindings();
    
    // Refresh findings every 2 minutes
    const interval = setInterval(fetchFindings, 120000);
    
    return () => clearInterval(interval);
  }, []);

  const handleFindingClick = (packageName: string) => {
    onFindingClick?.(packageName);
    // Navigate to package detail page
    window.location.href = `/package/${packageName}`;
  };
  const getSeverityColor = (severity: SeverityLevel): string => {
    switch (severity) {
      case SeverityLevel.CRITICAL: return 'severity-critical';
      case SeverityLevel.HIGH: return 'severity-high';
      case SeverityLevel.MEDIUM: return 'severity-medium';
      case SeverityLevel.LOW: return 'severity-low';
      default: return 'severity-unknown';
    }
  };

  const getThreatIcon = (type: ThreatType): string => {
    switch (type) {
      case ThreatType.MALWARE: return '🦠';
      case ThreatType.CREDENTIAL_THEFT: return '🔑';
      case ThreatType.CODE_INJECTION: return '💉';
      case ThreatType.TYPOSQUATTING: return '🎭';
      case ThreatType.SUPPLY_CHAIN: return '⛓️';
      case ThreatType.BACKDOOR: return '🚪';
      default: return '⚠️';
    }
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) {
      return 'Just now';
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const formatDownloads = (downloads: number): string => {
    if (downloads >= 1000000) {
      return `${(downloads / 1000000).toFixed(1)}M`;
    } else if (downloads >= 1000) {
      return `${(downloads / 1000).toFixed(1)}K`;
    }
    return downloads.toLocaleString();
  };

  const renderFindingCard = (finding: SecurityFinding, index: number) => (
    <div 
      key={finding.id}
      className={`finding-card animate-slide-up`}
      style={{ animationDelay: `${index * 0.1}s` }}
      onClick={() => handleFindingClick(finding.packageName)}
    >
      <div className="finding-header">
        <div className="finding-threat">
          <span className="threat-icon">{getThreatIcon(finding.threatType)}</span>
          <span className="threat-type">{finding.threatType.replace('_', ' ')}</span>
        </div>
        <div className={`finding-severity ${getSeverityColor(finding.severity)}`}>
          {finding.severity.toUpperCase()}
        </div>
      </div>
      
      <div className="finding-content">
        <h3 className="finding-package">{finding.packageName}@{finding.version}</h3>
        <p className="finding-summary">{finding.summary}</p>
        <div className="finding-impact">
          <span className="impact-label">Impact:</span>
          <span className="impact-text">{finding.impactDescription}</span>
        </div>
        <div className="finding-meta">
          <span className="finding-date">
            <span className="meta-icon">🕒</span>
            {formatTimeAgo(finding.discoveryDate)}
          </span>
          <span className="finding-downloads">
            <span className="meta-icon">📦</span>
            {formatDownloads(finding.affectedDownloads)} affected
          </span>
        </div>
      </div>
      
      <div className="finding-actions">
        <button className="action-button view-details">
          View Details
        </button>
      </div>
    </div>
  );

  const renderEmptyState = () => (
    <div className="insights-empty">
      <div className="empty-icon">🛡️</div>
      <h3>No Recent Threats</h3>
      <p>The npm ecosystem is looking healthy! No new security threats detected in recent packages.</p>
    </div>
  );

  const renderLoadingState = () => (
    <div className="insights-loading">
      <div className="loading-spinner"></div>
      <p>Loading recent security findings...</p>
    </div>
  );

  return (
    <section className="security-insights">
      <div className="insights-header">
        <h2>Recent Security Findings</h2>
        <p>Latest security discoveries and threat analysis</p>
      </div>
      
      <div className="insights-content">
        {isLoading ? (
          renderLoadingState()
        ) : error ? (
          <div className="insights-error">
            <div className="error-icon">⚠️</div>
            <h3>Unable to Load Security Findings</h3>
            <p>{error}</p>
          </div>
        ) : recentFindings.length > 0 ? (
          <div className="findings-grid">
            {recentFindings.map((finding, index) => renderFindingCard(finding, index))}
          </div>
        ) : (
          renderEmptyState()
        )}
      </div>
    </section>
  );
};

export default SecurityInsights;