import React, { useState, useEffect } from 'react';
import { getApiClient } from '../../utils/api-client';

enum RiskLevel {
  SAFE = 'safe',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

enum AnalysisStatus {
  COMPLETED = 'completed',
  IN_PROGRESS = 'in_progress',
  QUEUED = 'queued',
  FAILED = 'failed',
  PENDING = 'pending'
}

interface PackagePreview {
  name: string;
  version: string;
  weeklyDownloads: number;
  riskScore: number;
  riskLevel: RiskLevel;
  analysisStatus: AnalysisStatus;
  lastAnalyzed?: Date;
  shortDescription: string;
  maintainer: string;
}

interface TopPackagesProps {
  onPackageClick?: (packageName: string) => void;
  onViewAllClick?: () => void;
}

const TopPackages: React.FC<TopPackagesProps> = ({
  onPackageClick,
  onViewAllClick
}) => {
  const [packages, setPackages] = useState<PackagePreview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/packages/top?limit=12');
        const data = await response.json();
        
        if (data.success) {
          // Convert data to proper types
          const packages = data.packages.map((pkg: any) => ({
            ...pkg,
            riskLevel: pkg.riskLevel as RiskLevel,
            analysisStatus: pkg.analysisStatus as AnalysisStatus,
            lastAnalyzed: pkg.lastAnalyzed ? new Date(pkg.lastAnalyzed) : undefined,
          }));
          setPackages(packages);
          setError(null);
        } else {
          setError(data.error || 'Failed to load packages');
        }
      } catch (err) {
        setError('Failed to connect to server');
        console.error('Error fetching packages:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPackages();
    
    // Refresh packages every 5 minutes
    const interval = setInterval(fetchPackages, 300000);
    
    return () => clearInterval(interval);
  }, []);

  const handlePackageClick = (packageName: string) => {
    onPackageClick?.(packageName);
    // Navigate to package detail page
    window.location.href = `/package/${packageName}`;
  };

  const handleViewAllClick = () => {
    onViewAllClick?.();
    // Navigate to browse page
    window.location.href = '/browse';
  };
  const getRiskLevelColor = (level: RiskLevel): string => {
    switch (level) {
      case RiskLevel.SAFE: return 'risk-safe';
      case RiskLevel.LOW: return 'risk-low';
      case RiskLevel.MEDIUM: return 'risk-medium';
      case RiskLevel.HIGH: return 'risk-high';
      case RiskLevel.CRITICAL: return 'risk-critical';
      default: return 'risk-unknown';
    }
  };

  const formatDownloadCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const renderProgressIndicator = (status: AnalysisStatus, progress?: number) => {
    switch (status) {
      case AnalysisStatus.IN_PROGRESS:
        return (
          <div className="progress-indicator">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progress || 0}%` }}
              ></div>
            </div>
            <span className="progress-text">Analyzing...</span>
          </div>
        );
      case AnalysisStatus.QUEUED:
        return <div className="status-badge queued">Queued</div>;
      case AnalysisStatus.FAILED:
        return <div className="status-badge failed">Failed</div>;
      case AnalysisStatus.PENDING:
        return <div className="status-badge pending">Pending</div>;
      default:
        return null;
    }
  };

  const renderPackageCard = (pkg: PackagePreview, index: number) => (
    <div 
      key={pkg.name}
      className="package-card animate-fade-in"
      style={{ animationDelay: `${index * 0.1}s` }}
      onClick={() => handlePackageClick(pkg.name)}
    >
      <div className="package-header">
        <div className="package-title-section">
          <h3 className="package-name">{pkg.name}</h3>
          <span className="package-version">v{pkg.version}</span>
        </div>
        <div className={`risk-badge ${getRiskLevelColor(pkg.riskLevel)}`}>
          <span className="risk-score">{pkg.riskScore}</span>
          <span className="risk-label">{pkg.riskLevel}</span>
        </div>
      </div>
      
      <div className="package-content">
        <p className="package-description">{pkg.shortDescription}</p>
        
        <div className="package-stats">
          <div className="stat-row">
            <div className="stat">
              <span className="stat-icon">📦</span>
              <div className="stat-info">
                <span className="stat-value">{formatDownloadCount(pkg.weeklyDownloads)}</span>
                <span className="stat-label">weekly downloads</span>
              </div>
            </div>
            <div className="stat">
              <span className="stat-icon">👤</span>
              <div className="stat-info">
                <span className="stat-value">{pkg.maintainer}</span>
                <span className="stat-label">maintainer</span>
              </div>
            </div>
          </div>
        </div>
        
        {pkg.analysisStatus !== AnalysisStatus.COMPLETED && (
          <div className="package-status">
            {renderProgressIndicator(pkg.analysisStatus)}
          </div>
        )}
        
        {pkg.lastAnalyzed && (
          <div className="package-meta">
            <span className="last-analyzed">
              Last analyzed: {pkg.lastAnalyzed.toLocaleDateString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <section className="top-packages">
      <div className="packages-header">
        <h2>Top Packages</h2>
        <p>Most popular npm packages and their security status</p>
        <button 
          className="view-all-button"
          onClick={handleViewAllClick}
        >
          View All Packages
        </button>
      </div>
      
      <div className="packages-content">
        {isLoading ? (
          <div className="packages-loading">
            <div className="loading-spinner"></div>
            <p>Loading top packages...</p>
          </div>
        ) : error ? (
          <div className="packages-error">
            <div className="error-icon">⚠️</div>
            <h3>Unable to Load Packages</h3>
            <p>{error}</p>
          </div>
        ) : packages.length > 0 ? (
          <div className="packages-grid">
            {packages.map((pkg, index) => renderPackageCard(pkg, index))}
          </div>
        ) : (
          <div className="packages-empty">
            <p>No packages available</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default TopPackages;