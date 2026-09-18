import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import InteractiveField from './InteractiveField';

const Hero: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <section id="hero" className="hero-full">
      <div className="container">
        <div className="hero-grid">
          {/* Left Hero Content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
              <div
                className="pill"
                style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  borderColor: 'var(--green-primary)',
                  color: 'var(--green-light)',
                }}
              >
                🌾 Agriculture-First Platform
              </div>
            </div>

            <h1 className="hero-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span>🌿</span>
              <span>Agrinex</span>
            </h1>

            <p className="hero-sub">
              <strong style={{ color: 'var(--text-primary)' }}>Built specifically for agriculture.</strong> The only platform with micro weather forecasting, AI crop recommendations, zone-based soil analytics, smart irrigation AI, and lender-ready credit proof.
            </p>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', margin: '8px 0 16px' }}>
              <a
                className="btn btn-primary"
                href={isAuthenticated ? '/dashboard' : '/auth'}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(isAuthenticated ? '/dashboard' : '/auth');
                }}
                style={{ minWidth: '150px' }}
              >
                Start Free Trial
              </a>
              <a
                className="btn btn-secondary"
                href="#overview"
                style={{ minWidth: '150px' }}
              >
                See How It Works
              </a>
            </div>

            {/* Responsive Key Stats */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: '12px',
                paddingTop: '16px',
                borderTop: '1px solid var(--border-color)',
              }}
            >
              <HeroStat value="87%" label="Decision Accuracy" />
              <HeroStat value="28%" label="Water Savings" />
              <HeroStat value="45%" label="Profit Increase" />
              <HeroStat value="14 Days" label="Forecast Horizon" />
            </div>
          </div>

          {/* Right Visual Field Scanner */}
          <div className="hero-visual">
            <InteractiveField />
          </div>
        </div>
      </div>
    </section>
  );
};

const HeroStat: React.FC<{ value: string; label: string }> = ({ value, label }) => (
  <div style={{ display: 'flex', flexDirection: 'column' }}>
    <div style={{ fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', fontWeight: 800, lineHeight: 1.1, color: 'var(--green-light)' }}>
      {value}
    </div>
    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
      {label}
    </div>
  </div>
);

export default Hero;
