import React, { useState } from 'react';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  action: () => void;
  disabled?: boolean;
  badge?: string;
}

interface UserPreferences {
  recentlyViewed: string[];
  favoritePackages: string[];
  preferredActions: string[];
}

interface QuickActionsProps {
  onAnalyzePackage?: () => void;
  onComparePackages?: () => void;
  onViewDependencies?: () => void;
  userPreferences?: UserPreferences;
}

const QuickActions: React.FC<QuickActionsProps> = ({
  onAnalyzePackage,
  onComparePackages,
  onViewDependencies,
  userPreferences
}) => {
  const [queueStatus, setQueueStatus] = useState({
    position: 0,
    estimatedTime: 0,
    isActive: false
  });

  const defaultActions: QuickAction[] = [
    {
      id: 'analyze',
      title: 'Analyze New Package',
      description: 'Submit a package for security analysis',
      icon: '🔍',
      action: () => onAnalyzePackage?.(),
    },
    {
      id: 'compare',
      title: 'Compare Packages',
      description: 'Compare security metrics between packages',
      icon: '⚖️',
      action: () => onComparePackages?.(),
    },
    {
      id: 'dependencies',
      title: 'View Dependency Tree',
      description: 'Explore package dependencies and relationships',
      icon: '🌳',
      action: () => onViewDependencies?.(),
    },
    {
      id: 'browse',
      title: 'Browse All Packages',
      description: 'View complete list of analyzed packages',
      icon: '📦',
      action: () => {
        // Navigate to browse page
        window.location.href = '/browse';
      },
    },
    {
      id: 'reports',
      title: 'Security Reports',
      description: 'View detailed security analysis reports',
      icon: '📊',
      action: () => {
        // Navigate to reports page
        window.location.href = '/reports';
      },
    },
    {
      id: 'api',
      title: 'API Documentation',
      description: 'Learn how to integrate with our API',
      icon: '🔌',
      action: () => {
        // Navigate to API docs
        window.location.href = '/api-docs';
      },
    }
  ];

  const renderActionButton = (action: QuickAction) => (
    <button
      key={action.id}
      className={`action-button ${action.disabled ? 'disabled' : ''}`}
      onClick={action.action}
      disabled={action.disabled}
    >
      <div className="action-icon">{action.icon}</div>
      <div className="action-content">
        <h3 className="action-title">
          {action.title}
          {action.badge && (
            <span className="action-badge">{action.badge}</span>
          )}
        </h3>
        <p className="action-description">{action.description}</p>
      </div>
    </button>
  );

  const renderPersonalizedActions = (preferences: UserPreferences) => {
    if (!preferences.recentlyViewed.length && !preferences.favoritePackages.length) {
      return null;
    }

    return (
      <div className="personalized-actions">
        <h3>Quick Access</h3>
        
        {preferences.recentlyViewed.length > 0 && (
          <div className="quick-section">
            <h4>Recently Viewed</h4>
            <div className="quick-items">
              {preferences.recentlyViewed.slice(0, 5).map((pkg, index) => (
                <button
                  key={index}
                  className="quick-package"
                  onClick={() => {
                    // Navigate to package detail
                    window.location.href = `/package/${pkg}`;
                  }}
                >
                  📦 {pkg}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {preferences.favoritePackages.length > 0 && (
          <div className="quick-section">
            <h4>Favorite Packages</h4>
            <div className="quick-items">
              {preferences.favoritePackages.slice(0, 5).map((pkg, index) => (
                <button
                  key={index}
                  className="quick-package favorite"
                  onClick={() => {
                    // Navigate to package detail
                    window.location.href = `/package/${pkg}`;
                  }}
                >
                  ⭐ {pkg}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderQueueStatus = () => {
    if (!queueStatus.isActive) return null;

    return (
      <div className="queue-status">
        <div className="queue-header">
          <h4>Analysis Queue Status</h4>
          <div className="queue-indicator active">
            <div className="pulse"></div>
            Active
          </div>
        </div>
        <div className="queue-details">
          <div className="queue-stat">
            <span className="stat-label">Position in queue:</span>
            <span className="stat-value">#{queueStatus.position}</span>
          </div>
          <div className="queue-stat">
            <span className="stat-label">Estimated time:</span>
            <span className="stat-value">{queueStatus.estimatedTime}m</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="quick-actions">
      <div className="actions-header">
        <h2>Quick Actions</h2>
        <p>Common tools and shortcuts for package analysis</p>
      </div>
      
      <div className="actions-content">
        <div className="actions-grid">
          {defaultActions.map(renderActionButton)}
        </div>
        
        {userPreferences && renderPersonalizedActions(userPreferences)}
        
        {renderQueueStatus()}
      </div>
    </section>
  );
};

export default QuickActions;