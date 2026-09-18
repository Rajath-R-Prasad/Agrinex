import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="footer" id="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <div className="title" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--green-primary)' }}>
              <span>🌿</span>
              <span>Agrinex</span>
            </div>
            <div className="small" style={{ marginTop: '8px' }}>
              © {new Date().getFullYear()} Agrinex · Agriculture-First Intelligence.
            </div>
            <div className="small" style={{ marginTop: '4px', color: 'var(--text-tertiary)' }}>
              Built exclusively for modern farming operations.
            </div>
          </div>
          <div>
            <div className="title">Product</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <a href="#overview">Overview</a>
              <a href="#features">Features</a>
              <a href="/weather">Weather Radar</a>
              <a href="/soil">Soil Diagnostics</a>
            </div>
          </div>
          <div>
            <div className="title">Network</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <a href="/network">Farm Network</a>
              <a href="/financial">Financials & ROI</a>
            </div>
          </div>
          <div>
            <div className="title">Support</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <a href="mailto:support@agrinex.ai">support@agrinex.ai</a>
              <a href="#cta">Contact Us</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
