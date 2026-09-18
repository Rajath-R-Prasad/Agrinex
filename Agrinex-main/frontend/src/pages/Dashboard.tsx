import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
// @ts-ignore
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import DynamicBackground from '../components/DynamicBackground';

const Dashboard: React.FC = () => {
  const { user, getSelectedFarm } = useAuth();
  const navigate = useNavigate();
  const [weatherSummary, setWeatherSummary] = useState<any | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!db || !user) return;
      const farm = getSelectedFarm() || user.farms?.[0];
      if (!farm) return;
      try {
        const wdoc = await getDoc(doc(db, 'weather', `${user.id}_${farm.id}`));
        if (wdoc.exists()) setWeatherSummary(wdoc.data());
      } catch {}
    };
    load();
  }, [user?.id, getSelectedFarm]);

  const activeFarm = getSelectedFarm() || (user?.farms && user.farms[0]);

  return (
    <>
      <DynamicBackground />
      <section className="section" style={{ position: 'relative', overflow: 'hidden', zIndex: 10 }}>
        <div className="container">
          {/* Welcome Card */}
          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <div
              className="card-apple"
              style={{
                background: 'rgba(2, 44, 34, 0.65)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-xs)' }}>
                <div
                  className="pill"
                  style={{
                    background: 'rgba(16, 185, 129, 0.2)',
                    borderColor: 'var(--green-primary)',
                    color: 'var(--green-light)',
                  }}
                >
                  🌿 Farmer Command Center
                </div>
              </div>

              <h1
                style={{
                  fontSize: 'var(--h1)',
                  marginBottom: 'var(--space-xs)',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  flexWrap: 'wrap',
                }}
              >
                <span>🚜</span>
                <span>Welcome back, {user?.name?.split(' ')[0] || 'Farmer'}!</span>
              </h1>

              <p style={{ fontSize: 'var(--body-lg)', color: 'var(--text-secondary)', maxWidth: 'var(--narrow-width)' }}>
                {activeFarm
                  ? `Active farm: ${activeFarm.name} (${activeFarm.location}). Real-time telemetry, soil diagnostics, and predictive irrigation advice.`
                  : 'Your agriculture intelligence dashboard. Monitor farm weather, soil health, and financials.'}
              </p>
            </div>
          </div>

          {!user?.name && (
            <div className="card-apple" style={{ marginBottom: 'var(--space-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ fontSize: 'var(--body)', color: 'var(--text-secondary)' }}>
                  Your profile name is not set. Update your profile to customize farm advisories.
                </div>
                <a className="btn btn-secondary" href="/profile">
                  Set Name
                </a>
              </div>
            </div>
          )}

          {/* Quick Weather Telemetry Snapshot */}
          {weatherSummary && (
            <div className="card-apple" style={{ marginBottom: 'var(--space-lg)' }}>
              <div className="pill" style={{ marginBottom: 'var(--space-sm)', alignSelf: 'flex-start' }}>
                🌤️ Live Farm Telemetry
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))',
                  gap: '14px',
                }}
              >
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Location</div>
                  <div style={{ fontSize: 'var(--h3)', color: 'var(--text-primary)', fontWeight: 700 }}>
                    {weatherSummary.location}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Temperature</div>
                  <div style={{ fontSize: 'var(--h3)', color: 'var(--text-primary)', fontWeight: 700 }}>
                    {weatherSummary.current?.temperature ?? '-'}°C
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Condition</div>
                  <div style={{ fontSize: 'var(--h3)', color: 'var(--green-light)', fontWeight: 700 }}>
                    {weatherSummary.current?.condition ?? '-'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Updated</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {new Date(weatherSummary.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Feature Grid Navigation */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
              gap: 'clamp(14px, 2.5vw, 24px)',
            }}
          >
            <div
              className="card-apple"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate('/weather')}
            >
              <div style={{ fontSize: '2rem', marginBottom: 'var(--space-xs)' }}>🌤️</div>
              <h3 style={{ fontSize: 'var(--h3)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                Weather & Radar
              </h3>
              <p style={{ fontSize: 'var(--body)', color: 'var(--text-secondary)', flex: 1 }}>
                Concentric 2km/5km/10km radar, rainfall predictions, and automated irrigation volume advice.
              </p>
              <div style={{ marginTop: '12px', color: 'var(--green-light)', fontSize: '13px', fontWeight: 600 }}>
                Open Weather View →
              </div>
            </div>

            <div
              className="card-apple"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate('/soil')}
            >
              <div style={{ fontSize: '2rem', marginBottom: 'var(--space-xs)' }}>🌱</div>
              <h3 style={{ fontSize: 'var(--h3)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                Soil Diagnostic Studio
              </h3>
              <p style={{ fontSize: 'var(--body)', color: 'var(--text-secondary)', flex: 1 }}>
                Interactive N-P-K nutrient balancing, soil texture presets, and machine learning crop rankings.
              </p>
              <div style={{ marginTop: '12px', color: 'var(--green-light)', fontSize: '13px', fontWeight: 600 }}>
                Analyze Soil →
              </div>
            </div>

            <div
              className="card-apple"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate('/financial')}
            >
              <div style={{ fontSize: '2rem', marginBottom: 'var(--space-xs)' }}>💰</div>
              <h3 style={{ fontSize: 'var(--h3)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                Financial Intelligence
              </h3>
              <p style={{ fontSize: 'var(--body)', color: 'var(--text-secondary)', flex: 1 }}>
                Track ROI projections, crop cost/revenue breakdown, and lender-ready risk certificates.
              </p>
              <div style={{ marginTop: '12px', color: 'var(--green-light)', fontSize: '13px', fontWeight: 600 }}>
                View Financials →
              </div>
            </div>

            <div
              className="card-apple"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate('/profile')}
            >
              <div style={{ fontSize: '2rem', marginBottom: 'var(--space-xs)' }}>⚙️</div>
              <h3 style={{ fontSize: 'var(--h3)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                My Farms & Settings
              </h3>
              <p style={{ fontSize: 'var(--body)', color: 'var(--text-secondary)', flex: 1 }}>
                Add and configure multiple farm locations with automatic GPS coordinates detection.
              </p>
              <div style={{ marginTop: '12px', color: 'var(--green-light)', fontSize: '13px', fontWeight: 600 }}>
                Manage Farms →
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Dashboard;
