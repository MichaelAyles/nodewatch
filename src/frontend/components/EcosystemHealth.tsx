import React, { useState, useEffect } from 'react';

interface HealthMetrics {
  safePackagePercentage: number;
  threatDetectionRate: number;
  analysisCoverage: number;
  averageRiskScore: number;
  weeklyChange: {
    safePackages: number;
    threatsDetected: number;
    newPackagesAnalyzed: number;
  };
  totalPackages: number;
  totalAnalyzed: number;
  totalThreats: number;
  recentActivity: {
    packagesThisWeek: number;
    threatsThisWeek: number;
    analysesThisWeek: number;
  };
}

interface TrendData {
  date: Date;
  malwareDetected: number;
  packagesAnalyzed: number;
  averageRiskScore: number;
}

interface EcosystemHealthProps {
  onViewAnalytics?: () => void;
}

const EcosystemHealth: React.FC<EcosystemHealthProps> = ({
  onViewAnalytics
}) => {
  const [healthMetrics, setHealthMetrics] = useState<HealthMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHealthMetrics = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/health/metrics');
        const data = await response.json();
        
        if (data.success) {
          setHealthMetrics(data.metrics);
          setError(null);
        } else {
          setError(data.error || 'Failed to load health metrics');
        }
      } catch (err) {
        setError('Failed to connect to server');
        console.error('Error fetching health metrics:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHealthMetrics();
    
    // Refresh metrics every 5 minutes
    const interval = setInterval(fetchHealthMetrics, 300000);
    
    return () => clearInterval(interval);
  }, []);

  const handleViewAnalytics = () => {
    onViewAnalytics?.();
    // Navigate to analytics page
    window.location.href = '/analytics';
  };
  const renderHealthScore = (percentage: number, label: string, isPositive: boolean = true) => (
    <div className="health-metric">
      <div className="metric-circle">
        <svg className="metric-svg" viewBox="0 0 36 36">
          <path
            className="metric-bg"
            d="M18 2.0845
              a 15.9155 15.9155 0 0 1 0 31.831
              a 15.9155 15.9155 0 0 1 0 -31.831"
          />
          <path
            className={`metric-fill ${isPositive ? 'positive' : 'negative'}`}
            strokeDasharray={`${percentage}, 100`}
            d="M18 2.0845
              a 15.9155 15.9155 0 0 1 0 31.831
              a 15.9155 15.9155 0 0 1 0 -31.831"
          />
        </svg>
        <div className="metric-percentage">{percentage}%</div>
      </div>
      <div className="metric-label">{label}</div>
    </div>
  );

  const renderChangeIndicator = (change: number, isPositive: boolean = true) => {
    const isIncrease = change > 0;
    const displayChange = Math.abs(change);
    const changeClass = isPositive 
      ? (isIncrease ? 'change-positive' : 'change-negative')
      : (isIncrease ? 'change-negative' : 'change-positive');
    
    return (
      <div className={`change-indicator ${changeClass}`}>
        <span className="change-arrow">
          {isIncrease ? '↗' : '↘'}
        </span>
        <span className="change-value">
          {displayChange.toFixed(1)}%
        </span>
      </div>
    );
  };

  const renderTrendChart = (data: TrendData[]) => {
    if (data.length === 0) return null;

    // Simple line chart representation
    const maxMalware = Math.max(...data.map(d => d.malwareDetected));
    const maxPackages = Math.max(...data.map(d => d.packagesAnalyzed));
    
    return (
      <div className="trend-chart">
        <h4>Security Trends (Last 30 Days)</h4>
        <div className="chart-container">
          <svg className="chart-svg" viewBox="0 0 300 100">
            {/* Grid lines */}
            <defs>
              <pattern id="grid" width="30" height="20" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 20" fill="none" stroke="#e0e0e0" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            
            {/* Malware detection line */}
            <polyline
              fill="none"
              stroke="#dc2626"
              strokeWidth="2"
              points={data.map((d, i) => 
                `${(i / (data.length - 1)) * 280 + 10},${90 - (d.malwareDetected / maxMalware) * 80}`
              ).join(' ')}
            />
            
            {/* Packages analyzed line */}
            <polyline
              fill="none"
              stroke="#2563eb"
              strokeWidth="2"
              points={data.map((d, i) => 
                `${(i / (data.length - 1)) * 280 + 10},${90 - (d.packagesAnalyzed / maxPackages) * 80}`
              ).join(' ')}
            />
          </svg>
          
          <div className="chart-legend">
            <div className="legend-item">
              <div className="legend-color malware"></div>
              <span>Malware Detected</span>
            </div>
            <div className="legend-item">
              <div className="legend-color packages"></div>
              <span>Packages Analyzed</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderWarningAlerts = (metrics: HealthMetrics) => {
    const alerts = [];
    
    if (metrics.safePackagePercentage < 90) {
      alerts.push({
        type: 'warning',
        message: 'Safe package percentage is below 90%'
      });
    }
    
    if (metrics.weeklyChange.threatsDetected > 20) {
      alerts.push({
        type: 'alert',
        message: 'Significant increase in threat detection this week'
      });
    }
    
    if (alerts.length === 0) return null;
    
    return (
      <div className="health-alerts">
        {alerts.map((alert, index) => (
          <div key={index} className={`alert ${alert.type}`}>
            <span className="alert-icon">
              {alert.type === 'warning' ? '⚠️' : '🚨'}
            </span>
            <span className="alert-message">{alert.message}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <section className="ecosystem-health">
      <div className="health-header">
        <h2>Ecosystem Health</h2>
        <p>Overall npm ecosystem security metrics and trends</p>
        <button 
          className="view-analytics-button"
          onClick={handleViewAnalytics}
        >
          View Detailed Analytics
        </button>
      </div>
      
      <div className="health-content">
        {isLoading ? (
          <div className="health-loading">
            <div className="loading-spinner"></div>
            <p>Loading ecosystem health data...</p>
          </div>
        ) : error ? (
          <div className="health-error">
            <div className="error-icon">⚠️</div>
            <h3>Unable to Load Health Data</h3>
            <p>{error}</p>
          </div>
        ) : healthMetrics ? (
          <>
            <div className="health-metrics">
              {renderHealthScore(
                healthMetrics.safePackagePercentage,
                'Safe Packages',
                true
              )}
              {renderHealthScore(
                healthMetrics.threatDetectionRate,
                'Threat Detection Rate',
                true
              )}
              {renderHealthScore(
                healthMetrics.analysisCoverage,
                'Analysis Coverage',
                true
              )}
              {renderHealthScore(
                100 - healthMetrics.averageRiskScore,
                'Overall Safety',
                true
              )}
            </div>
            
            <div className="health-changes">
              <h3>Weekly Changes</h3>
              <div className="changes-grid">
                <div className="change-item">
                  <span className="change-label">Safe Packages</span>
                  {renderChangeIndicator(healthMetrics.weeklyChange.safePackages, true)}
                </div>
                <div className="change-item">
                  <span className="change-label">Threats Detected</span>
                  {renderChangeIndicator(healthMetrics.weeklyChange.threatsDetected, false)}
                </div>
                <div className="change-item">
                  <span className="change-label">New Packages Analyzed</span>
                  {renderChangeIndicator(healthMetrics.weeklyChange.newPackagesAnalyzed, true)}
                </div>
              </div>
            </div>
            
            {renderWarningAlerts(healthMetrics)}
          </>
        ) : (
          <div className="health-error">
            <p>Unable to load ecosystem health data</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default EcosystemHealth;