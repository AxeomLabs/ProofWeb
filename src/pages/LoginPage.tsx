import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { GraduationCap, Award, Building, X, Mail, Lock, ArrowRight } from 'lucide-react';

const LoginPage: React.FC<{ isSignup?: boolean }> = ({ isSignup }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');
  const [showRolePrompt, setShowRolePrompt] = useState(false);
  const [pendingGoogleUser, setPendingGoogleUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const createUserDocs = async (uid: string, emailAddr: string, fName: string, lName: string, userRole: string) => {
    const slug = fName.toLowerCase().replace(/[^a-z0-9]/g, '') +
      (lName ? lName.toLowerCase().replace(/[^a-z0-9]/g, '') : '') +
      Math.random().toString(36).substring(2, 6);

    await setDoc(doc(db, 'users', uid), {
      email: emailAddr,
      firstName: fName,
      lastName: userRole === 'institution_admin' ? '' : lName,
      role: userRole,
      profileUrlSlug: slug,
      createdAt: new Date().toISOString()
    });

    if (userRole === 'student') {
      await setDoc(doc(db, 'studentProfiles', uid), {
        userId: uid,
        profileUrlSlug: slug,
        isPublic: true,
        verificationScore: 0,
        createdAt: new Date().toISOString()
      });
    } else if (userRole === 'institution_admin') {
      await setDoc(doc(db, 'institutions', uid), {
        name: fName,
        officialEmail: emailAddr,
        type: 'organisation',
        isVerified: false,
        createdAt: new Date().toISOString()
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isSignup) {
        const res = await createUserWithEmailAndPassword(auth, email, password);
        await createUserDocs(res.user.uid, email, firstName, role === 'institution_admin' ? '' : lastName, role);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message?.replace('Firebase: ', '').replace(/\(auth\/.*\)/, '').trim() || 'Something went wrong');
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(auth, provider);
      const userDoc = await getDoc(doc(db, 'users', res.user.uid));
      if (!userDoc.exists()) {
        setPendingGoogleUser(res.user);
        setShowRolePrompt(true);
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message?.replace('Firebase: ', '').replace(/\(auth\/.*\)/, '').trim() || 'Something went wrong');
    }
  };

  const completeGoogleSetup = async () => {
    if (!pendingGoogleUser) return;
    setError('');
    setLoading(true);
    try {
      const displayName = pendingGoogleUser.displayName || '';
      const parts = displayName.split(' ');
      const fName = parts[0] || 'User';
      const lName = parts.slice(1).join(' ');
      await createUserDocs(pendingGoogleUser.uid, pendingGoogleUser.email || '', fName, lName, role);
      setShowRolePrompt(false);
      setPendingGoogleUser(null);
      navigate('/');
    } catch (err: any) {
      setError(err.message?.replace('Firebase: ', '').replace(/\(auth\/.*\)/, '').trim() || 'Something went wrong');
    }
    setLoading(false);
  };

  const roles = [
    { value: 'student', label: 'Student', desc: 'Access records & transcripts', icon: GraduationCap, color: 'var(--accent-primary)' },
    { value: 'teacher', label: 'Researcher', desc: 'Publish & verify credentials', icon: Award, color: 'var(--accent-primary)' },
    { value: 'institution_admin', label: 'Institution', desc: 'Manage network trust', icon: Building, color: 'var(--text-primary)' },
  ];

  return (
    <div style={{ minHeight: 'calc(100vh - 80px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <div className="fade-in" style={{ width: '100%', maxWidth: '420px' }}>

        {/* Branding */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>
            {isSignup ? 'Create your account' : 'Welcome back'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
            {isSignup ? 'Join the Proof network to verify your credentials.' : 'Sign in to your Proof account.'}
          </p>
        </div>

        <div className="card card-elevated" style={{ padding: '32px' }}>
          {error && (
            <div style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: '20px', fontSize: '13px', color: 'var(--error)' }}>
              {error}
            </div>
          )}

          {/* Google Button First */}
          <button
            onClick={handleGoogleLogin}
            className="btn-outline"
            style={{ width: '100%', padding: '10px', justifyContent: 'center' }}
            type="button"
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.49h4.84c-.21 1.12-.84 2.07-1.79 2.7v2.25h2.91c1.7-1.56 2.68-3.86 2.68-6.6z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.25c-.8.54-1.83.86-3.05.86-2.34 0-4.32-1.58-5.03-3.7H1.05v2.32C2.53 16.01 5.53 18 9 18z"/>
              <path fill="#FBBC05" d="M3.97 10.73c-.18-.54-.28-1.12-.28-1.73s.1-1.19.28-1.73V4.95H1.05C.38 6.29 0 7.8 0 9s.38 2.71 1.05 4.05l2.92-2.32z"/>
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.53 0 2.53 1.99 1.05 4.95L3.97 7.27c.71-2.12 2.69-3.69 5.03-3.69z"/>
            </svg>
            Continue with Google
          </button>

          <div className="divider"><span>or</span></div>

          <form onSubmit={handleSubmit}>
            {isSignup && (
              <>
                <label className="label-caps" style={{ marginBottom: '8px' }}>Role</label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                  {roles.map(r => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setRole(r.value)}
                      style={{
                        flex: 1,
                        padding: '8px 4px',
                        background: role === r.value ? 'var(--accent-light)' : 'var(--bg-input)',
                        border: role === r.value ? '1.5px solid var(--accent-primary)' : '1.5px solid var(--border-primary)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '12px',
                        fontWeight: role === r.value ? 600 : 500,
                        color: role === r.value ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                      }}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>

                {role === 'institution_admin' ? (
                  <>
                    <label>Institution Name</label>
                    <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="University of..." required />
                  </>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label>First Name</label>
                      <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} required />
                    </div>
                    <div>
                      <label>Last Name</label>
                      <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} required />
                    </div>
                  </div>
                )}
              </>
            )}

            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />

            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />

            <button type="submit" className="btn-blue" disabled={loading} style={{ width: '100%', padding: '10px', marginTop: '8px' }}>
              {loading ? 'Please wait...' : isSignup ? 'Create Account' : 'Sign In'}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'var(--text-secondary)' }}>
          {isSignup ? (
            <>Already have an account? <Link to="/login">Sign in</Link></>
          ) : (
            <>Don't have an account? <Link to="/signup">Get started</Link></>
          )}
        </p>
      </div>

      {/* Role Selection Modal */}
      {showRolePrompt && (
        <div className="modal-overlay">
          <div className="card card-elevated fade-in" style={{ maxWidth: '560px', width: '90%', padding: '32px', position: 'relative' }}>
            <button
              onClick={() => { setShowRolePrompt(false); setPendingGoogleUser(null); }}
              className="btn-ghost"
              style={{ position: 'absolute', top: '16px', right: '16px' }}
            >
              <X size={18} />
            </button>

            <h2 style={{ marginBottom: '6px' }}>Select Your Role</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '28px', fontSize: '14px' }}>
              Choose your identity within the network. This determines your access level.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '28px' }}>
              {roles.map(r => {
                const Icon = r.icon;
                const selected = role === r.value;
                return (
                  <div
                    key={r.value}
                    onClick={() => setRole(r.value)}
                    style={{
                      border: selected ? '2px solid var(--accent-primary)' : '1.5px solid var(--border-primary)',
                      background: selected ? 'var(--accent-light)' : 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-md)',
                      padding: '20px 16px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{
                      width: '44px', height: '44px', margin: '0 auto 12px',
                      borderRadius: '50%',
                      background: selected ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: selected ? 'white' : 'var(--text-primary)',
                      transition: 'all 0.2s',
                    }}>
                      <Icon size={22} />
                    </div>
                    <p style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>{r.label}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', lineHeight: '1.3' }}>{r.desc}</p>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={completeGoogleSetup} className="btn-blue" disabled={loading}>
                {loading ? 'Setting up...' : 'Continue'}
                {!loading && <ArrowRight size={16} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
