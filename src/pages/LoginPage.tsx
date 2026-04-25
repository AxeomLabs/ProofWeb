import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

const LoginPage: React.FC<{ isSignup?: boolean }> = ({ isSignup }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isSignup) {
        const res = await createUserWithEmailAndPassword(auth, email, password);
        
        // Handle name mapping based on role
        const finalFirstName = firstName;
        const finalLastName = role === 'institution_admin' ? '' : lastName;
        
        const slug = finalFirstName.toLowerCase().replace(/[^a-z0-9]/g, '') + 
                     finalLastName.toLowerCase().replace(/[^a-z0-9]/g, '') + 
                     Math.random().toString(36).substring(2, 6);
        
        // Create base user document
        await setDoc(doc(db, 'users', res.user.uid), {
          email,
          firstName: finalFirstName,
          lastName: finalLastName,
          role,
          createdAt: new Date().toISOString()
        });

        // Create role-specific profile
        if (role === 'student') {
          await setDoc(doc(db, 'studentProfiles', res.user.uid), {
            userId: res.user.uid,
            profileUrlSlug: slug,
            isPublic: true,
            verificationScore: 0,
            createdAt: new Date().toISOString()
          });
        } else if (role === 'institution_admin') {
          await setDoc(doc(db, 'institutions', res.user.uid), {
            name: finalFirstName,
            officialEmail: email,
            type: 'organisation',
            isVerified: false,
            createdAt: new Date().toISOString()
          });
        }
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(auth, provider);
      const userDoc = await getDoc(doc(db, 'users', res.user.uid));
      
      if (!userDoc.exists()) {
        const displayName = res.user.displayName || '';
        const nameParts = displayName.split(' ');
        const finalFirstName = nameParts[0] || 'User';
        const finalLastName = nameParts.slice(1).join(' ');
        const emailAddress = res.user.email || '';
        
        const slug = finalFirstName.toLowerCase().replace(/[^a-z0-9]/g, '') + 
                     (finalLastName ? finalLastName.toLowerCase().replace(/[^a-z0-9]/g, '') : '') + 
                     Math.random().toString(36).substring(2, 6);

        const assignedRole = isSignup ? role : 'student';

        await setDoc(doc(db, 'users', res.user.uid), {
          email: emailAddress,
          firstName: finalFirstName,
          lastName: assignedRole === 'institution_admin' ? '' : finalLastName,
          role: assignedRole,
          createdAt: new Date().toISOString()
        });

        if (assignedRole === 'student') {
          await setDoc(doc(db, 'studentProfiles', res.user.uid), {
            userId: res.user.uid,
            profileUrlSlug: slug,
            isPublic: true,
            verificationScore: 0,
            createdAt: new Date().toISOString()
          });
        } else if (assignedRole === 'institution_admin') {
          await setDoc(doc(db, 'institutions', res.user.uid), {
            name: finalFirstName,
            officialEmail: emailAddress,
            type: 'organisation',
            isVerified: false,
            createdAt: new Date().toISOString()
          });
        }
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '2rem auto' }}>
      <div className="card">
        <h2 className="mb-4">{isSignup ? 'Create Account' : 'Login'}</h2>
        {error && <p style={{ color: 'var(--error)', marginBottom: '1rem' }}>{error}</p>}
        <form onSubmit={handleSubmit}>
          {isSignup && (
            <>
              <label className="text-small">I am a...</label>
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="institution_admin">Institution / Admin</option>
                <option value="platform_admin">Platform Admin</option>
              </select>
              
              {role === 'institution_admin' ? (
                <>
                  <label className="text-small">Institution Name</label>
                  <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                </>
              ) : (
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label className="text-small">First Name</label>
                    <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="text-small">Last Name</label>
                    <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                  </div>
                </div>
              )}
            </>
          )}
          <label className="text-small">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <label className="text-small">Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="submit" className="btn-blue" style={{ width: '100%', marginTop: '1rem' }}>
            {isSignup ? 'Sign Up' : 'Login'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', margin: '1.5rem 0', gap: '0.5rem' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-primary)' }}></div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>OR</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-primary)' }}></div>
        </div>

        <button 
          onClick={handleGoogleLogin} 
          className="btn-outline" 
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: '600' }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.49h4.84c-.21 1.12-.84 2.07-1.79 2.7v2.25h2.91c1.7-1.56 2.68-3.86 2.68-6.6z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.25c-.8.54-1.83.86-3.05.86-2.34 0-4.32-1.58-5.03-3.7H1.05v2.32C2.53 16.01 5.53 18 9 18z"/>
            <path fill="#FBBC05" d="M3.97 10.73c-.18-.54-.28-1.12-.28-1.73s.1-1.19.28-1.73V4.95H1.05C.38 6.29 0 7.8 0 9s.38 2.71 1.05 4.05l2.92-2.32z"/>
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.53 0 2.53 1.99 1.05 4.95L3.97 7.27c.71-2.12 2.69-3.69 5.03-3.69z"/>
          </svg>
          Continue with Google
        </button>
        <p className="mt-4 text-small" style={{ textAlign: 'center' }}>
          {isSignup ? (
            <>Already have an account? <Link to="/login" style={{ color: 'var(--accent-primary)' }}>Login</Link></>
          ) : (
            <>Don't have an account? <Link to="/signup" style={{ color: 'var(--accent-primary)' }}>Sign Up</Link></>
          )}
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
