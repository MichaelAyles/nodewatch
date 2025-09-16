import React, { useState, useEffect, useRef } from 'react';

enum RiskLevel {
  SAFE = 'safe',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

interface SearchSuggestion {
  packageName: string;
  downloadCount: number;
  riskLevel: RiskLevel;
  matchType: 'exact' | 'partial' | 'similar';
}

interface SearchHubProps {
  onSearch?: (query: string) => void;
  onAdvancedSearch?: () => void;
  recentSearches?: string[];
  popularPackages?: string[];
}

const SearchHub: React.FC<SearchHubProps> = ({
  onSearch,
  onAdvancedSearch,
  recentSearches = [],
  popularPackages = []
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Debounced search for suggestions
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.length > 1) {
        fetchSuggestions(searchQuery);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Handle clicks outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !searchInputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = async (query: string) => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query)}`);
      // const data = await response.json();
      
      // Mock suggestions for now
      const mockSuggestions: SearchSuggestion[] = [
        {
          packageName: `${query}-mock`,
          downloadCount: 1000000,
          riskLevel: RiskLevel.SAFE,
          matchType: 'partial'
        }
      ];
      
      setSuggestions(mockSuggestions);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch?.(searchQuery.trim());
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setSearchQuery(suggestion.packageName);
    onSearch?.(suggestion.packageName);
    setShowSuggestions(false);
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const renderSuggestion = (suggestion: SearchSuggestion) => (
    <div
      key={suggestion.packageName}
      className="suggestion-item"
      onClick={() => handleSuggestionClick(suggestion)}
    >
      <div className="suggestion-main">
        <span className="suggestion-name">{suggestion.packageName}</span>
        <div className={`suggestion-risk ${suggestion.riskLevel}`}>
          {suggestion.riskLevel.toUpperCase()}
        </div>
      </div>
      <div className="suggestion-meta">
        <span className="suggestion-downloads">
          {suggestion.downloadCount.toLocaleString()} downloads
        </span>
        <span className="suggestion-match">
          {suggestion.matchType} match
        </span>
      </div>
    </div>
  );

  const renderQuickAccess = () => (
    <div className="quick-access">
      {recentSearches.length > 0 && (
        <div className="quick-section">
          <h4>Recent Searches</h4>
          <div className="quick-items">
            {recentSearches.slice(0, 5).map((search, index) => (
              <button
                key={index}
                className="quick-item"
                onClick={() => {
                  setSearchQuery(search);
                  onSearch?.(search);
                }}
              >
                {search}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {popularPackages.length > 0 && (
        <div className="quick-section">
          <h4>Popular Packages</h4>
          <div className="quick-items">
            {popularPackages.slice(0, 5).map((pkg, index) => (
              <button
                key={index}
                className="quick-item"
                onClick={() => {
                  setSearchQuery(pkg);
                  onSearch?.(pkg);
                }}
              >
                {pkg}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="search-hub">
      <div className="search-container">
        <form onSubmit={handleSearchSubmit} className="search-form">
          <div className="search-input-container">
            <input
              ref={searchInputRef}
              type="text"
              className="search-input"
              placeholder="Search npm packages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={handleInputFocus}
              autoComplete="off"
            />
            <button type="submit" className="search-button">
              🔍
            </button>
          </div>
          
          {showSuggestions && (
            <div ref={suggestionsRef} className="suggestions-dropdown">
              {isLoading ? (
                <div className="suggestions-loading">
                  <div className="loading-spinner"></div>
                  <span>Searching...</span>
                </div>
              ) : suggestions.length > 0 ? (
                <div className="suggestions-list">
                  {suggestions.map(renderSuggestion)}
                </div>
              ) : searchQuery.length > 1 ? (
                <div className="suggestions-empty">
                  No packages found matching "{searchQuery}"
                </div>
              ) : null}
              
              {(recentSearches.length > 0 || popularPackages.length > 0) && (
                renderQuickAccess()
              )}
            </div>
          )}
        </form>
        
        <button 
          className="advanced-search-button"
          onClick={onAdvancedSearch}
        >
          Advanced Search
        </button>
      </div>
    </div>
  );
};

export default SearchHub;