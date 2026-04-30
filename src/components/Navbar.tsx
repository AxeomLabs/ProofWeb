import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { LogOut, Shield, Building, Award, Newspaper, User } from 'lucide-react';

const Navbar: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  const navLinkStyle = (path: string): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: isActive(path) ? 600 : 500,
    color: isActive(path) ? 'var(--accent-primary)' : 'var(--text-secondary)',
    background: isActive(path) ? 'var(--accent-light)' : 'transparent',
    textDecoration: 'none',
    transition: 'all 0.15s ease',
  });

  return (
    <header>
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '56px' }}>
        <Link to="/" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', textDecoration: 'none', letterSpacing: '-0.02em' }}>
          Proof<span style={{ color: 'var(--accent-primary)' }}>.</span>
        </Link>

        <nav style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {user ? (
            <>
              <Link to="/feed" style={navLinkStyle('/feed')}>
                <Newspaper size={16} />
                Feed
              </Link>
              <Link to="/profile" style={navLinkStyle('/profile')}>
                <User size={16} />
                Profile
              </Link>

              {profile?.role === 'teacher' && (
                <Link to="/teacher" style={navLinkStyle('/teacher')}>
                  <Award size={16} />
                  Verify
                </Link>
              )}
              {profile?.role === 'institution_admin' && (
                <Link to="/institution" style={navLinkStyle('/institution')}>
                  <Building size={16} />
                  Institute
                </Link>
              )}
              {profile?.role === 'platform_admin' && (
                <Link to="/admin" style={navLinkStyle('/admin')}>
                  <Shield size={16} />
                  Admin
                </Link>
              )}

              <div style={{ width: '1px', height: '24px', background: 'var(--border-primary)', margin: '0 8px' }} />

              <button onClick={handleLogout} className="btn-ghost" style={{ fontSize: '13px' }}>
                <LogOut size={15} />
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" style={{ ...navLinkStyle('/login'), fontWeight: 500 }}>Login</Link>
              <Link to="/signup" className="btn-blue" style={{ padding: '6px 16px', fontSize: '13px', textDecoration: 'none', color: 'white' }}>
                Get Started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
