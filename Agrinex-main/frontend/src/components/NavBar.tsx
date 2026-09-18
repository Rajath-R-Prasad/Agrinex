import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Landing page navigation links
const landingLinks = [
  { href: '#overview', label: 'Overview', icon: '🌾' },
  { href: '#features', label: 'Features', icon: '✨' },
  { href: '#cta', label: 'Get Started', icon: '🚀' },
];

// Dashboard navigation links
const dashboardLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/weather', label: 'Weather', icon: '🌤️' },
  { href: '/soil', label: 'Soil Health', icon: '🌱' },
  { href: '/financial', label: 'Financial', icon: '💰' },
];

const NavBar: React.FC = () => {
  const { isAuthenticated, user, logout, getSelectedFarm } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setShowProfileMenu(false);
  }, [location.pathname, location.hash]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const isAuthPage = location.pathname.startsWith('/auth');
  const links = isAuthenticated && !isAuthPage ? dashboardLinks : landingLinks;

  const handleLogout = () => {
    logout();
    navigate('/');
    setShowProfileMenu(false);
    setMobileMenuOpen(false);
  };

  const handleLinkClick = (href: string, e: React.MouseEvent) => {
    if (href.startsWith('/')) {
      e.preventDefault();
      navigate(href);
    } else if (href.startsWith('#')) {
      if (location.pathname !== '/') {
        e.preventDefault();
        navigate('/' + href);
      }
    }
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header className="nav-bar">
        <div className="nav-inner">
          {/* Brand Logo */}
          <a
            href={isAuthenticated ? '/dashboard' : '/'}
            className="nav-logo"
            onClick={(e) => {
              e.preventDefault();
              navigate(isAuthenticated ? '/dashboard' : '/');
              setMobileMenuOpen(false);
            }}
          >
            <span>🌿</span>
            <span>Agrinex</span>
          </a>

          {/* Desktop Navigation Links */}
          <nav className="nav-links-desktop" aria-label="Main Navigation">
            {links.map((link) => {
              const isActive = link.href.startsWith('/')
                ? location.pathname === link.href
                : location.hash === link.href;
              return (
                <a
                  key={link.label}
                  className={`nav-link ${isActive ? 'active' : ''}`}
                  href={link.href}
                  onClick={(e) => handleLinkClick(link.href, e)}
                >
                  {link.label}
                </a>
              );
            })}
          </nav>

          {/* Actions & Profile */}
          <div className="nav-actions">
            {isAuthenticated ? (
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  className="auth-link"
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                  }}
                  aria-label="User profile menu"
                >
                  <span>👤</span>
                  <span style={{ maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.name?.split(' ')[0] || 'Farmer'}
                  </span>
                </button>

                {showProfileMenu && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      right: 0,
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '12px',
                      padding: '8px',
                      minWidth: '220px',
                      boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
                      zIndex: 1001,
                    }}
                  >
                    <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)', marginBottom: '6px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {user?.name || 'Farmer'}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {user?.email}
                      </div>
                      {getSelectedFarm() && (
                        <div style={{ fontSize: '12px', color: 'var(--green-light)', marginTop: '4px' }}>
                          🌾 {getSelectedFarm()?.name}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        navigate('/profile');
                        setShowProfileMenu(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                        fontWeight: 500,
                        textAlign: 'left',
                        cursor: 'pointer',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <span>⚙️</span> Farm & Profile Settings
                    </button>

                    <button
                      type="button"
                      onClick={handleLogout}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'transparent',
                        border: 'none',
                        color: '#f87171',
                        fontSize: '13px',
                        fontWeight: 600,
                        textAlign: 'left',
                        cursor: 'pointer',
                        borderRadius: '8px',
                        marginTop: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <span>🚪</span> Log Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <a
                className="auth-link"
                href="/auth"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/auth');
                  setMobileMenuOpen(false);
                }}
              >
                Log In
              </a>
            )}

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              className={`nav-hamburger ${mobileMenuOpen ? 'open' : ''}`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
            >
              <div className="nav-hamburger-icon">
                <span />
                <span />
                <span />
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Backdrop for profile menu */}
      {showProfileMenu && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 1000 }}
          onClick={() => setShowProfileMenu(false)}
        />
      )}

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <>
          <div className="mobile-nav-backdrop" onClick={() => setMobileMenuOpen(false)} />
          <nav className="mobile-nav-drawer" aria-label="Mobile Navigation">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {links.map((link) => {
                const isActive = link.href.startsWith('/')
                  ? location.pathname === link.href
                  : location.hash === link.href;
                return (
                  <a
                    key={link.label}
                    className={`mobile-nav-item ${isActive ? 'active' : ''}`}
                    href={link.href}
                    onClick={(e) => handleLinkClick(link.href, e)}
                  >
                    <span className="mobile-nav-icon">{link.icon}</span>
                    <span>{link.label}</span>
                  </a>
                );
              })}

              {isAuthenticated ? (
                <>
                  <div style={{ height: '1px', background: 'var(--border-color)', margin: '8px 0' }} />
                  <a
                    className={`mobile-nav-item ${location.pathname === '/profile' ? 'active' : ''}`}
                    href="/profile"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate('/profile');
                      setMobileMenuOpen(false);
                    }}
                  >
                    <span className="mobile-nav-icon">⚙️</span>
                    <span>Profile & Farms</span>
                  </a>

                  <button
                    type="button"
                    className="mobile-nav-item"
                    onClick={handleLogout}
                    style={{ color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', cursor: 'pointer' }}
                  >
                    <span className="mobile-nav-icon">🚪</span>
                    <span>Log Out</span>
                  </button>
                </>
              ) : (
                <a
                  className="mobile-nav-item"
                  href="/auth"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/auth');
                    setMobileMenuOpen(false);
                  }}
                  style={{
                    background: 'var(--green-primary)',
                    color: 'var(--white)',
                    borderColor: 'var(--green-primary)',
                    justifyContent: 'center',
                    marginTop: '8px',
                  }}
                >
                  <span>Log In / Sign Up</span>
                </a>
              )}
            </div>
          </nav>
        </>
      )}
    </>
  );
};

export default NavBar;
