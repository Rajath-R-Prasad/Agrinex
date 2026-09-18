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
          // Default to Bengaluru or city geocode
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
              }
            }
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
        }
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
      <section className="section" style={{ paddingTop: 'var(--space-xl)', position: 'relative', zIndex: 50 }}>
        <div className="container auth-grid" style={{ position: 'relative', zIndex: 51 }}>
          <div className="auth-hero card-apple">
            <div className="pill" style={{ background: 'rgba(16, 185, 129, 0.15)', borderColor: 'var(--green-primary)', color: 'var(--green-light)' }}>
              🌾 Welcome to Agrinex
            </div>
            <h1 style={{ fontSize: 'var(--h1)', margin: 'var(--space-sm) 0', color: 'var(--text-primary)' }}>Agriculture Intelligence Platform</h1>
            <p style={{ fontSize: 'var(--body-lg)', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '520px' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Built exclusively for agriculture.</strong> Join Agrinex to access AI-powered irrigation recommendations, salinity prediction, soil analytics, micro weather forecasting, and lender-ready credit proof — all designed for modern farming.
            </p>
            <div style={{ display: 'grid', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
              <div className="auth-bullet">🌾 Agriculture-first technology built for farming workflows</div>
              <div className="auth-bullet">🌐 Multi-farm intelligence with real-time collaboration</div>
              <div className="auth-bullet">💧 Irrigation decisions with explainability (2km, 5km, 10km radius)</div>
              <div className="auth-bullet">🌱 NPK soil diagnostics & rule-based crop predictions</div>
              <div className="auth-bullet">💰 Credit readiness & ROI proof for lenders</div>
            </div>
          </div>

          <div className="auth-card">
            <div className="auth-toggle">
              <button
                className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
                onClick={() => setMode('login')}
              >
                Log In
              </button>
              <button
                className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
                onClick={() => setMode('signup')}
              >
                Sign Up
              </button>
            </div>

            {errorMsg && (
              <div style={{
                padding: 'var(--space-sm)',
                borderRadius: 'var(--space-xs)',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #ef4444',
                color: '#f87171',
                fontSize: '13px',
                marginBottom: 'var(--space-md)'
              }}>
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
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" placeholder="you@example.com" required />
            </div>

            <div className="form-row">
              <label htmlFor="password">Password</label>
              <input id="password" name="password" type="password" placeholder="••••••••" required />
            </div>

            {mode === 'signup' && (
              <>
              <div className="form-row">
                <label htmlFor="farm">Primary Farm</label>
                <input id="farm" name="farm" type="text" placeholder="Farm 1 - Rajesh Kumar" />
              </div>
              <div className="form-row">
                <label htmlFor="city">City</label>
                <input id="city" name="city" type="text" placeholder="Your City" required />
              </div>
              </>
            )}

            <div className="form-row inline">
              <label className="checkbox">
                <input type="checkbox" defaultChecked />
                <span>I agree to the Terms and Privacy Policy</span>
              </label>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              {mode === 'login' ? 'Log In' : 'Create Account'}
            </button>

            <div className="auth-alt">
              {mode === 'login' ? (
                <span>
                  New here?{' '}
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
