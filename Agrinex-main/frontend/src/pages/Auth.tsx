import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import DynamicBackground from '../components/DynamicBackground';

const Auth: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (window.location.hash === '#signup') {
      setMode('signup');
    }
  }, []);

  const handleAuthSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const email = (formData.get('email') as string).trim();
      const password = formData.get('password') as string;
      const name = (formData.get('name') as string) || email.split('@')[0];
      const farm = (formData.get('farm') as string) || `${name}'s Farm`;
      const city = (formData.get('city') as string) || 'Bengaluru';
      const state = 'Karnataka';

      const isNewUser = mode === 'signup';

      // 1. Capture user geolocation if available
      let coords = '12.9716, 77.5946';
      let lat = 12.9716;
      let lon = 77.5946;

      if ('geolocation' in navigator) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 5000 });
          });
          lat = Number(pos.coords.latitude.toFixed(4));
          lon = Number(pos.coords.longitude.toFixed(4));
          coords = `${lat}, ${lon}`;
        } catch {
          coords = '12.9716, 77.5946';
        }
      }

      // 2. Supabase Auth if configured
      let userId = `user_${Date.now()}`;
      if (isSupabaseConfigured) {
        if (isNewUser) {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: name,
                district: city,
                state: state,
                coordinates: coords,
                farm_name: farm,
              },
            },
          });
          if (error) throw error;
          if (data.user) userId = data.user.id;
        } else {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (error) throw error;
          if (data.user) userId = data.user.id;
        }
      }

      const farms = [
        {
          id: `farm_${Date.now()}`,
          name: farm || 'Primary Farm',
          location: `${city}, ${state}`,
          coordinates: coords,
          area: 5.0,
          soilType: 'Loamy Soil',
        },
      ];

      // 3. Sync to backend API via POST request
      try {
        await api.post('/api/v1/auth/profile', {
          full_name: name,
          email,
          phone: '',
          village: city,
          district: city,
          state: state,
          coordinates: coords,
        });
      } catch {}

      // 4. Update local context
      login({
        id: userId,
        name,
        email,
        phone: '',
        address: city,
        district: city,
        state: state,
        coordinates: coords,
        farms,
      });

      navigate(isNewUser ? '/profile' : '/dashboard');
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DynamicBackground />
      <section className="section" style={{ position: 'relative', zIndex: 10 }}>
        <div className="container auth-grid">
          {/* Hero Explainer Column */}
          <div className="auth-hero card-apple">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div
                className="pill"
                style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  borderColor: 'var(--green-primary)',
                  color: 'var(--green-light)',
                }}
              >
                🌾 Welcome to Agrinex
              </div>
            </div>

            <h1 style={{ fontSize: 'var(--h1)', margin: 'var(--space-xs) 0 var(--space-sm)', color: 'var(--text-primary)' }}>
              Agriculture Intelligence Platform
            </h1>

            <p style={{ fontSize: 'var(--body-lg)', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '520px', marginBottom: 'var(--space-md)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Built exclusively for agriculture.</strong> Access AI-powered irrigation recommendations, N-P-K soil diagnostic studio, micro weather forecasting, and lender-ready ROI certificates.
            </p>

            <div style={{ display: 'grid', gap: '10px' }}>
              <div className="auth-bullet">
                <span>🌾</span>
                <span>Agriculture-first technology built for farming workflows</span>
              </div>
              <div className="auth-bullet">
                <span>🛰️</span>
                <span>Multi-radius concentric radar (2km, 5km, 10km live rings)</span>
              </div>
              <div className="auth-bullet">
                <span>💧</span>
                <span>Automated irrigation decisions with water volume guidance</span>
              </div>
              <div className="auth-bullet">
                <span>🌱</span>
                <span>NPK soil diagnostics & machine learning crop rankings</span>
              </div>
              <div className="auth-bullet">
                <span>💰</span>
                <span>Credit readiness & lender-grade ROI proof packs</span>
              </div>
            </div>
          </div>

          {/* Form Card Column */}
          <div className="auth-card">
            <div className="auth-toggle">
              <button
                type="button"
                className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
                onClick={() => setMode('login')}
              >
                Log In
              </button>
              <button
                type="button"
                className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
                onClick={() => setMode('signup')}
              >
                Sign Up
              </button>
            </div>

            {errorMsg && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid #ef4444',
                  color: '#f87171',
                  fontSize: '13px',
                  marginBottom: '14px',
                }}
              >
                {errorMsg}
              </div>
            )}

            <form className="auth-form" onSubmit={handleAuthSubmit}>
              {mode === 'signup' && (
                <div className="form-row">
                  <label htmlFor="name">Full Name</label>
                  <input id="name" name="name" type="text" placeholder="Rajesh Kumar" required />
                </div>
              )}

              <div className="form-row">
                <label htmlFor="email">Email Address</label>
                <input id="email" name="email" type="email" placeholder="you@example.com" required />
              </div>

              <div className="form-row">
                <label htmlFor="password">Password</label>
                <input id="password" name="password" type="password" placeholder="••••••••" required />
              </div>

              {mode === 'signup' && (
                <>
                  <div className="form-row">
                    <label htmlFor="farm">Primary Farm Name</label>
                    <input id="farm" name="farm" type="text" placeholder="North Plot Farm" />
                  </div>
                  <div className="form-row">
                    <label htmlFor="city">City / District</label>
                    <input id="city" name="city" type="text" placeholder="Bengaluru, Karnataka" required />
                  </div>
                </>
              )}

              <div className="form-row inline">
                <label className="checkbox">
                  <input type="checkbox" defaultChecked required />
                  <span>I agree to the Terms of Service & Privacy Policy</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', marginTop: '6px' }}
              >
                {loading ? 'Please wait…' : mode === 'login' ? 'Log In' : 'Create Account'}
              </button>

              <div className="auth-alt">
                {mode === 'login' ? (
                  <span>
                    New to Agrinex?{' '}
                    <button type="button" className="link-like" onClick={() => setMode('signup')}>
                      Create an account
                    </button>
                  </span>
                ) : (
                  <span>
                    Already have an account?{' '}
                    <button type="button" className="link-like" onClick={() => setMode('login')}>
                      Log in
                    </button>
                  </span>
                )}
              </div>
            </form>
          </div>
        </div>
      </section>
    </>
  );
};

export default Auth;
