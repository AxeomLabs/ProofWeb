import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';

const Navbar: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <header>
      <div className="container flex-between">
        <Link to="/" className="text-bold" style={{ fontSize: '1.25rem', color: 'var(--accent-primary)' }}>
          PROOF
        </Link>
        <nav style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {user ? (
            <>
              {profile?.role === 'platform_admin' && (
                <Link to="/admin" className="text-small" style={{ color: 'var(--error)', fontWeight: 600 }}>Admin</Link>
              )}
              {profile?.role === 'institution_admin' && (
                <Link to="/institution" className="text-small" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Institute</Link>
              )}
              {profile?.role === 'teacher' && (
                <Link to="/teacher" className="text-small" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Authority</Link>
              )}
              <Link to="/feed" className="text-small">Feed</Link>
              <Link to="/profile" className="text-small">Profile</Link>
              <button onClick={handleLogout} className="btn-outline" style={{ padding: '0.25rem 0.75rem' }}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-small">Login</Link>
              <Link to="/signup" className="btn-blue" style={{ padding: '0.25rem 0.75rem' }}>Sign Up</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
