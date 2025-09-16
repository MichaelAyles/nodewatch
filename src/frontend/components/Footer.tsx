import React from 'react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <h3>NodeWatch</h3>
          <p>Real-time NPM package security analysis and malware detection</p>
          <div className="footer-version">
            <span>Version 1.0.0</span>
            <span>Last updated: {new Date().toLocaleDateString()}</span>
          </div>
        </div>
        
        <div className="footer-section">
          <h4>Documentation</h4>
          <ul className="footer-links">
            <li><a href="/docs">Getting Started</a></li>
            <li><a href="/docs/api">API Reference</a></li>
            <li><a href="/docs/methodology">Methodology</a></li>
            <li><a href="/docs/faq">FAQ</a></li>
          </ul>
        </div>
        
        <div className="footer-section">
          <h4>Development</h4>
          <ul className="footer-links">
            <li><a href="https://github.com/nodewatch/nodewatch" target="_blank" rel="noopener noreferrer">
              GitHub Repository
            </a></li>
            <li><a href="https://github.com/nodewatch/nodewatch/issues" target="_blank" rel="noopener noreferrer">
              Issue Tracker
            </a></li>
            <li><a href="/docs/contributing">Contributing</a></li>
            <li><a href="/changelog">Changelog</a></li>
          </ul>
        </div>
        
        <div className="footer-section">
          <h4>Community</h4>
          <ul className="footer-links">
            <li><a href="/contact">Contact Us</a></li>
            <li><a href="https://discord.gg/nodewatch" target="_blank" rel="noopener noreferrer">
              Discord
            </a></li>
            <li><a href="https://twitter.com/nodewatch" target="_blank" rel="noopener noreferrer">
              Twitter
            </a></li>
            <li><a href="/blog">Blog</a></li>
          </ul>
        </div>
        
        <div className="footer-section">
          <h4>Legal</h4>
          <ul className="footer-links">
            <li><a href="/privacy">Privacy Policy</a></li>
            <li><a href="/terms">Terms of Service</a></li>
            <li><a href="/security">Security Policy</a></li>
            <li><a href="/license">License</a></li>
          </ul>
        </div>
      </div>
      
      <div className="footer-bottom">
        <div className="footer-bottom-content">
          <p>&copy; {currentYear} NodeWatch. All rights reserved.</p>
          <div className="footer-acknowledgments">
            <span>Powered by open source security research</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;