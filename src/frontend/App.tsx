import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './components/HomePage';
import './App.css';

const App: React.FC = () => {
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<HomePage />} />
          {/* Future routes will be added here */}
          <Route path="/package/:name" element={<div>Package Detail Page (Coming Soon)</div>} />
          <Route path="/browse" element={<div>Browse Packages Page (Coming Soon)</div>} />
          <Route path="/search" element={<div>Search Results Page (Coming Soon)</div>} />
          <Route path="/analytics" element={<div>Analytics Page (Coming Soon)</div>} />
          <Route path="/reports" element={<div>Reports Page (Coming Soon)</div>} />
          <Route path="/api-docs" element={<div>API Documentation (Coming Soon)</div>} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;