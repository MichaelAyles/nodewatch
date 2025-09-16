import React from 'react';
import { useSystemStats } from '../hooks/useSystemStats';

interface HeroSectionProps {
  onSearchClick?: () => void;
  onBrowseClick?: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({
  onSearchClick,
  onBrowseClick
}) => {
  const { stats, loading: isLoading, error, connected, cached, stale } = useSystemStats(true);

  const handleSearchClick = () => {
    onSearchClick?.();
    // Focus on search input
    const searchInput = document.querySelector('.search-input') as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
    }
  };

  const handleBrowseClick = () => {
    onBrowseClick?.();
    // Navigate to browse page
    window.location.href = '/browse';
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  };

  const getConnectionStatus = () => {
    if (connected) {
      return { icon: '🟢', text: 'Live', color: '#059669' };
    } else if (cached) {
      return { icon: '🟡', text: stale ? 'Stale' : 'Cached', color: '#d97706' };
    } else {
      return { icon: '🔴', text: 'Offline', color: '#dc2626' };
    }
  };

  const connectionStatus = getConnectionStatus();

  return (
    <section className="hero-section">
      <div className="hero-content">
        <div className="hero-text">
          <h1 className="hero-title">
            NodeWatch
            <span className="hero-badge">
              {connectionStatus.icon} {connectionStatus.text}
            </span>
          </h1>
          <p className="hero-subtitle">
            Real-time NPM package security analysis and malware detection
          </p>
          <p className="hero-description">
            Protecting the JavaScript ecosystem with advanced threat detection, 
            comprehensive security analysis, and real-time monitoring of npm packages.
          </p>
        </div>
        
        <div className="hero-stats">
          {isLoading ? (
            <div className="stats-loading">
              <div className="loading-spinner"></div>
              <span>Loading statistics...</span>
            </div>
          ) : error ? (
            <div className="stats-error">
              <span className="error-icon">⚠️</span>
              <div>
                <div className="error-title">Unable to load statistics</div>
                <div className="error-message">{error}</div>
              </div>
            </div>
          ) : stats ? (
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-number animate-counter">
                  {formatNumber(stats.totalPackagesAnalyzed)}
                </div>
                <div className="stat-label">Packages Analyzed</div>
                <div className="stat-change positive">
                  +{formatNumber(stats.packagesAnalyzedToday)} today
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-number animate-counter">
                  {formatNumber(stats.malwareDetected)}
                </div>
                <div className="stat-label">Threats Detected</div>
                <div className="stat-change negative">
                  +{stats.recentMalwareCount} this week
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-number animate-pulse">
                  {stats.currentlyAnalyzing}
                </div>
                <div className="stat-label">Currently Analyzing</div>
                <div className="stat-change neutral">
                  {stats.queueDepth} in queue
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-number animate-counter">
                  {stats.analysisRate}/hr
                </div>
                <div className="stat-label">Analysis Rate</div>
                <div className="stat-change positive">
                  {stats.successRate}% success rate
                </div>
              </div>
            </div>
          ) : (
            <div className="stats-error">
              <span className="error-icon">❌</span>
              <span>Unable to load statistics</span>
            </div>
          )}
        </div>
        
        <div className="hero-actions">
          <button 
            className="cta-button primary"
            onClick={handleSearchClick}
          >
            <span className="button-icon">🔍</span>
            Search Packages
          </button>
          <button 
            className="cta-button secondary"
            onClick={handleBrowseClick}
          >
            <span className="button-icon">📦</span>
            View Top 1000
          </button>
        </div>

        {stats && (
          <div className="hero-footer">
            <div className="last-update">
              Last scan: {new Date(stats.lastScanTime).toLocaleTimeString()}
            </div>
            <div className="cache-info">
              Cache hit rate: {stats.cacheHitRate}%
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default HeroSection;