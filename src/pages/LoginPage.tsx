import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
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
