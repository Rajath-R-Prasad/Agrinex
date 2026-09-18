import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const CTA: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <section id="cta" className="section">
      <div
        className="container"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-md)',
          alignItems: 'flex-start',
          maxWidth: 'var(--standard-width)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
          <div
            className="pill"
            style={{
              background: 'rgba(16, 185, 129, 0.15)',
              borderColor: 'var(--green-primary)',
              color: 'var(--green-light)',
            }}
          >
            🌾 Start Your Agriculture Journey
          </div>
        </div>

        <h2 style={{ fontSize: 'var(--h1)', margin: 0, color: 'var(--text-primary)' }}>
          Ready to transform your agriculture operations?
        </h2>

        <p style={{ fontSize: 'var(--body-lg)', color: 'var(--text-secondary)', maxWidth: 'var(--narrow-width)' }}>
          Join Agrinex and experience agriculture-first technology designed specifically for modern farming. Start with our free trial and see the difference agriculture intelligence makes.
        </p>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', width: '100%' }}>
          <a
            className="btn btn-primary"
            href={isAuthenticated ? '/dashboard' : '/auth'}
            onClick={(e) => {
              e.preventDefault();
              navigate(isAuthenticated ? '/dashboard' : '/auth');
            }}
            style={{ minWidth: '160px' }}
          >
            Start Free Pilot
          </a>
          <a
            className="btn btn-secondary"
            href="mailto:support@agrinex.ai"
            style={{ minWidth: '160px' }}
          >
            Talk to an Expert
          </a>
        </div>
      </div>
    </section>
  );
};

export default CTA;
