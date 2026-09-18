import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Hero from '../components/Hero';
import FeatureCard from '../components/FeatureCard';
import CTA from '../components/CTA';
// @ts-ignore
import agrinexLoop from '../assets/videos/agrinex_loop.mp4';
import DynamicBackground from '../components/DynamicBackground';

const features = [
  {
    title: 'Micro Weather Forecasting',
    body: 'Hyper-local weather predictions for your specific farm location. Get 7-14 day forecasts with temperature, rainfall, humidity, and recommendations on best planting times and crop selection.',
    icon: '🌤️',
  },
  {
    title: 'AI Crop Recommendations',
    body: 'Our system analyzes weather patterns, soil conditions, and market prices to recommend the best crops, cultivation types, and planting schedules for maximum yield and profit.',
    icon: '🌾',
  },
  {
    title: 'Zone-Based Soil Analytics',
    body: 'Your farm is automatically divided into zones. Each zone gets analyzed for soil health, moisture, pH, and nutrients — then we tell you exactly which crop grows best in which zone.',
    icon: '🗺️',
  },
  {
    title: 'Explainable Irrigation AI',
    body: 'Irrigate NOW vs WAIT decisions with confidence, factors, and ROI so farmers trust the recommendation. Weather + soil data combined.',
    icon: '💧',
  },
  {
    title: 'Multi-Farm Network Map',
    body: 'See 10+ connected farms learning together. Share successful strategies, compare performance, and learn from neighbors\' irrigation patterns and crop choices.',
    icon: '🌐',
  },
  {
    title: 'Credit & ROI Proof',
    body: 'Lender-facing risk scoring, ROI uplift, and PDF packs so farmers qualify faster and cheaper. Includes crop yield projections.',
    icon: '💰',
  },
];

const Home: React.FC = () => {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <>
      <DynamicBackground />
      <Hero />

      {/* Agriculture Decorative Ribbon */}
      <div
        style={{
          height: 'clamp(70px, 10vw, 100px)',
          background: 'linear-gradient(180deg, rgba(16,185,129,0.12), transparent)',
          borderTop: '1px solid var(--border-color)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'clamp(16px, 5vw, 36px)',
        }}
      >
        <div style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)' }}>🌾</div>
        <div style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)' }}>🌱</div>
        <div style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)' }}>🍃</div>
        <div style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)' }}>🚜</div>
      </div>

      {/* Overview Section */}
      <section id="overview" className="section">
        <div className="container">
          <div
            style={{
              display: 'flex',
              gap: 'clamp(24px, 4vw, 48px)',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            {/* Text column */}
            <div style={{ flex: '1 1 320px', minWidth: 'min(100%, 300px)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', marginBottom: 'var(--space-sm)' }}>
                <div
                  className="pill"
                  style={{
                    background: 'rgba(16, 185, 129, 0.15)',
                    borderColor: 'var(--green-primary)',
                    color: 'var(--green-light)',
                  }}
                >
                  🌾 Agriculture is Our Core
                </div>
              </div>
              <h2 style={{ fontSize: 'var(--h1)', marginBottom: 'var(--space-sm)', color: 'var(--text-primary)' }}>
                Why Agrinex?
              </h2>
              <p style={{ fontSize: 'var(--body-lg)', lineHeight: 1.6, color: 'var(--text-secondary)', maxWidth: 'var(--narrow-width)' }}>
                <strong style={{ color: 'var(--text-primary)' }}>Agrinex is built exclusively for agriculture.</strong> Unlike generic farm management tools, we provide micro weather forecasting for your exact location, AI-powered crop recommendations based on soil and climate, zone-based soil analytics that tell you which crop grows best where, explainable irrigation decisions, salinity predictions, and lender-ready ROI reports — helping you maximize yield, reduce costs, and access credit faster.
              </p>
              <div style={{ display: 'flex', gap: '12px', marginTop: 'var(--space-md)', flexWrap: 'wrap' }}>
                <a className="btn btn-primary" href="/auth" style={{ minWidth: '140px' }}>
                  Start Free Trial
                </a>
                <a className="btn btn-secondary" href="#features" style={{ minWidth: '140px' }}>
                  Explore Features
                </a>
              </div>
            </div>

            {/* Video preview container */}
            <div
              style={{
                flex: '1 1 360px',
                minWidth: 'min(100%, 300px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: '100%',
                  maxWidth: '640px',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  border: '1px solid var(--border-color)',
                  boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
                  background: 'var(--bg-card)',
                }}
              >
                <video
                  src={agrinexLoop}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="auto"
                  style={{ width: '100%', height: 'auto', objectFit: 'cover', display: 'block' }}
                  aria-label="Agrinex looping product preview"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="section alt">
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', marginBottom: 'var(--space-xs)' }}>
            <div
              className="pill"
              style={{
                background: 'rgba(16, 185, 129, 0.15)',
                borderColor: 'var(--green-primary)',
                color: 'var(--green-light)',
              }}
            >
              🌾 Agriculture-First Features
            </div>
          </div>
          <h2 style={{ fontSize: 'var(--h1)', margin: 'var(--space-xs) 0 var(--space-sm)', color: 'var(--text-primary)' }}>
            Built for Agriculture Intelligence
          </h2>
          <p style={{ fontSize: 'var(--body-lg)', color: 'var(--text-secondary)', maxWidth: 'var(--narrow-width)', marginBottom: 'var(--space-md)' }}>
            Every feature is designed around agriculture workflows — from soil health to crop yield, water management to financial planning.
          </p>
          <div className="features-grid">
            {features.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </div>
      </section>

      <CTA />
    </>
  );
};

export default Home;
