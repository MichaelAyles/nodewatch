import React from 'react';
import HeroSection from './HeroSection';
import SecurityInsights from './SecurityInsights';
import TopPackages from './TopPackages';
import SearchHub from './SearchHub';
import EcosystemHealth from './EcosystemHealth';
import QuickActions from './QuickActions';
import Footer from './Footer';
import './HomePage.css';

const HomePage: React.FC = () => {
  const handleSearch = (query: string) => {
    // Navigate to search results page
    window.location.href = `/search?q=${encodeURIComponent(query)}`;
  };

  const handleAdvancedSearch = () => {
    // Navigate to advanced search page
    window.location.href = '/search/advanced';
  };

  const handleAnalyzePackage = () => {
    // Focus on search input for quick analysis
    const searchInput = document.querySelector('.search-input') as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
      searchInput.placeholder = 'Enter package name to analyze...';
    }
  };

  return (
    <div className="homepage">
      <header className="homepage-header">
        <SearchHub 
          onSearch={handleSearch}
          onAdvancedSearch={handleAdvancedSearch}
        />
      </header>
      
      <main className="homepage-main">
        <HeroSection />
        <SecurityInsights />
        <TopPackages />
        <EcosystemHealth />
        <QuickActions 
          onAnalyzePackage={handleAnalyzePackage}
        />
      </main>
      
      <Footer />
    </div>
  );
};

export default HomePage;