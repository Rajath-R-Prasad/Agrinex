import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Landing page links (for non-authenticated users)
const landingLinks = [
  { href: '#overview', label: 'Overview' },
  { href: '#features', label: 'Features' },
  { href: '#impact', label: 'Impact' },
  { href: '#cta', label: 'Get Started' },
];

// Dashboard links (for authenticated users)
const dashboardLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/weather', label: 'Weather' },
  { href: '/soil', label: 'Soil Health' },
  { href: '/financial', label: 'Financial' },
];


const NavBar: React.FC = () => {
  const { isAuthenticated, user, logout, getSelectedFarm } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Determine which links to show
  const isAuthPage = location.pathname.startsWith('/auth');
  const links = isAuthenticated && !isAuthPage ? dashboardLinks : landingLinks;

  const handleLogout = () => {
    logout();
    navigate('/');
    setShowProfileMenu(false);
  };

  return (
    <nav className="nav-bar">
      <div className="nav-inner">
        <a
          href={isAuthenticated ? '/dashboard' : '/'}
          className="nav-logo"
          onClick={(e) => { e.preventDefault(); navigate(isAuthenticated ? '/dashboard' : '/'); }}
        >
          Agrinex
        </a>
        <div className="nav-links">
          {links.map((link) => (
            <a 
              key={link.label} 
              className="nav-link" 
              href={link.href}
              onClick={(e) => {
                if (link.href.startsWith('/')) {
                  e.preventDefault();
                  navigate(link.href);
                }
                // Hash links (#overview, #features, etc.) will work naturally
              }}
            >
              {link.label}
            </a>
          ))}
        </div>
        <div className="nav-actions">
          {isAuthenticated ? (
            <div style={{ position: 'relative' }}>
              <button
                className="nav-link auth-link"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  cursor: 'pointer',
                  background: 'var(--green-primary)',
                  color: 'var(--white)',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                }}
              >
                <span>👤</span>
                <span>{user?.name?.split(' ')[0] || 'Profile'}</span>
              </button>
              {showProfileMenu && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '8px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--space-xs)',
                  padding: 'var(--space-xs)',
                  minWidth: '180px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                  zIndex: 1000,
                }}>
                  <div style={{ padding: 'var(--space-sm)', borderBottom: '1px solid var(--border-color)', marginBottom: 'var(--space-xs)' }}>
                    <div style={{ fontSize: 'var(--body)', fontWeight: 600, color: 'var(--text-primary)' }}>{user?.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{user?.email}</div>
                    {getSelectedFarm() && (
                      <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                        {getSelectedFarm()?.name}
                      </div>
                    )}
                    {user?.farms && user.farms.length > 1 && (
                      <div style={{ fontSize: '11px', color: 'var(--green-light)', marginTop: '4px' }}>
                        {user.farms.length} farms
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      navigate('/profile');
                      setShowProfileMenu(false);
                    }}
                    style={{
                      width: '100%',
                      padding: 'var(--space-xs) var(--space-sm)',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-primary)',
                      fontSize: 'var(--body)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      borderRadius: '4px',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    Profile Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    style={{
                      width: '100%',
                      padding: 'var(--space-xs) var(--space-sm)',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-primary)',
                      fontSize: 'var(--body)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      marginTop: '4px',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    Log Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <a className="nav-link auth-link" href="/auth">Log In</a>
          )}
        </div>
      </div>
      {showProfileMenu && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999,
          }}
          onClick={() => setShowProfileMenu(false)}
        />
      )}
    </nav>
  );
};

export default NavBar;

