import React from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import NavBar from './components/NavBar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Weather from './pages/Weather';
import Profile from './pages/Profile';
import Soil from './pages/Soil';
import Financial from './pages/Financial';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('Agrinex Route Caught Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-xl)', textAlign: 'center' }}>
          <div className="card-apple" style={{ maxWidth: '600px', width: '100%', borderColor: 'rgba(239, 68, 68, 0.4)' }}>
            <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>⚠️</div>
            <h2 style={{ fontSize: 'var(--h2)', color: 'var(--text-primary)', marginBottom: 'var(--space-sm)' }}>Page Encountered An Issue</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--body)', marginBottom: 'var(--space-md)' }}>
              {this.state.error?.message || 'An unexpected rendering error occurred while loading this view.'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="btn btn-primary"
            >
              🔄 Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const AppShell: React.FC = () => {
  const location = useLocation();
  return (
    <div className="page">
      <NavBar />
      <div style={{ height: '42px' }} />
      <ErrorBoundary>
        <div key={location.pathname} style={{ animation: 'routeFade var(--transition-med) var(--easing)' }}>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/weather" element={<Weather />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/soil" element={<Soil />} />
            <Route path="/financial" element={<Financial />} />
            <Route path="/*" element={<Home />} />
          </Routes>
        </div>
      </ErrorBoundary>
      <Footer />
    </div>
  );
};


const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;

