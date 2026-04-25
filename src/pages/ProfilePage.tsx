import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc, setDoc, deleteDoc, collection, query, where, getDocs, addDoc, orderBy, limit } from 'firebase/firestore';
import { deleteUser } from 'firebase/auth';
import { db, auth } from '../firebase/config';
import { useNavigate } from 'react-router-dom';

const ProfilePage: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [gender, setGender] = useState('');
  const [institutionId, setInstitutionId] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [customSlug, setCustomSlug] = useState('');
  const [institutions, setInstitutions] = useState<any[]>([]);

  // Dashboard States (for student)
  const [achievements, setAchievements] = useState<any[]>([]);
  const [verifications, setVerifications] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [peers, setPeers] = useState<any[]>([]);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName || '');
      setLastName(profile.lastName || '');
      setHeadline(profile.headline || '');
      setBio(profile.bio || '');
      setGender(profile.gender || '');
      setInstitutionId(profile.institutionId || '');
      setCustomSlug(profile.profileUrlSlug || '');
    }

    const fetchInstitutions = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'institution_admin')));
        setInstitutions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Failed to fetch institutions", err);
      }
    };

    fetchInstitutions();
  }, [profile]);

  // Fetch Dashboard Data if user is a student
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user || profile?.role !== 'student') return;
      try {
        const achSnap = await getDocs(query(collection(db, 'achievements'), where('studentId', '==', user.uid), orderBy('createdAt', 'desc')));
        setAchievements(achSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        const verSnap = await getDocs(query(collection(db, 'verificationRequests'), where('requestedBy', '==', user.uid), orderBy('createdAt', 'desc')));
        setVerifications(verSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        const eventSnap = await getDocs(query(collection(db, 'events'), where('isPublished', '==', true), limit(5)));
        setEvents(eventSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        if (profile?.institutionId) {
          const peerSnap = await getDocs(query(collection(db, 'users'), where('institutionId', '==', profile.institutionId), limit(5)));
          setPeers(peerSnap.docs.filter(d => d.id !== user.uid).map(d => ({ id: d.id, ...d.data() })));
        }
      } catch (err) {
        console.error("Dashboard data fetch error:", err);
      }
    };

    fetchDashboardData();
  }, [user, profile]);

  if (!user) return <div className="container mt-4">Please login.</div>;

  const isInst = profile?.role === 'institution_admin';
  const isStudent = profile?.role === 'student';

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updates: any = {
        firstName,
        bio,
        updatedAt: new Date().toISOString()
      };
      
      if (!isInst) {
        updates.lastName = lastName;
        updates.headline = headline;
        updates.gender = gender;
      } else {
        updates.lastName = '';
      }

      if (isStudent && institutionId !== profile?.institutionId) {
        updates.institutionId = institutionId;
        updates.institutionStatus = institutionId ? 'pending' : 'none';
      }

      await updateDoc(doc(db, 'users', user.uid), updates);

      let slugToUse = customSlug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
      if (!slugToUse) {
        slugToUse = firstName.toLowerCase().replace(/[^a-z0-9]/g, '') + 
                    (lastName ? lastName.toLowerCase().replace(/[^a-z0-9]/g, '') : '') + 
                    Math.random().toString(36).substring(2, 6);
      }

      if (slugToUse !== profile?.profileUrlSlug) {
        const existingDocs = await getDocs(query(collection(db, 'users'), where('profileUrlSlug', '==', slugToUse)));
        if (!existingDocs.empty) {
          alert('Username already taken. Please pick another one!');
          setLoading(false);
          return;
        }
      }
                   
      await updateDoc(doc(db, 'users', user.uid), { profileUrlSlug: slugToUse });
      updates.profileUrlSlug = slugToUse;

      if (isStudent) {
        await setDoc(doc(db, 'studentProfiles', user.uid), {
          userId: user.uid,
          profileUrlSlug: slugToUse,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      setIsEditing(false);
      alert('Profile updated successfully!');
    } catch (err: any) {
      alert('Error updating profile: ' + err.message);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (window.confirm('ARE YOU SURE? This will permanently delete your account and all data.')) {
      setLoading(true);
      try {
        // 1. Delete authentication user first (fails safely if requires recent login)
        await deleteUser(user);

        // 2. Proceed with removing user datasets safely
        const postsSnap = await getDocs(query(collection(db, 'posts'), where('authorId', '==', user.uid)));
        for (const d of postsSnap.docs) await deleteDoc(d.ref);

        const achSnap = await getDocs(query(collection(db, 'achievements'), where('studentId', '==', user.uid)));
        for (const d of achSnap.docs) await deleteDoc(d.ref);

        const reqSnap = await getDocs(query(collection(db, 'verificationRequests'), where('requestedBy', '==', user.uid)));
        for (const d of reqSnap.docs) await deleteDoc(d.ref);

        const reqToSnap = await getDocs(query(collection(db, 'verificationRequests'), where('requestedTo', '==', user.uid)));
        for (const d of reqToSnap.docs) await deleteDoc(d.ref);

        await deleteDoc(doc(db, 'users', user.uid));
        navigate('/login');
      } catch (err: any) {
        if (err.code === 'auth/requires-recent-login') {
          alert('For security reasons, please logout and log back in before deleting your account.');
        } else {
          alert('Error deleting account: ' + err.message);
        }
      }
      setLoading(false);
    }
  };

  const completeness = (() => {
    let score = 0;
    if (profile?.firstName) score += 20;
    if (profile?.lastName) score += 20;
    if (profile?.bio) score += 20;
    if (profile?.headline) score += 20;
    if (achievements.length > 0) score += 20;
    return score;
  })();

  const verifiedCount = achievements.filter((a: any) => a.verificationStatus === 'verified').length;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'grid', gap: '1.5rem' }}>
      
      {/* Profile Header Card */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ height: '140px', background: 'linear-gradient(135deg, var(--accent-primary), #004182)' }}></div>
        <div style={{ padding: '0 2rem 2rem 2rem', marginTop: '-60px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
            <div style={{ width: '120px', height: '120px', borderRadius: '50%', border: '4px solid white', background: '#f3f2ef', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
              {profile?.firstName?.charAt(0)}
            </div>
            <button onClick={() => setIsEditing(!isEditing)} className="btn-outline">
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>

          {isEditing ? (
            <form onSubmit={handleUpdate}>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <input type="text" placeholder="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} required />
                {!isInst && <input type="text" placeholder="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} required />}
              </div>
              
              {!isInst && (
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                  <select value={gender} onChange={e => setGender(e.target.value)}>
                    <option value="">Gender (Optional)</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                  {isStudent && (
                    <select value={institutionId} onChange={e => setInstitutionId(e.target.value)}>
                      <option value="">Institution (Optional)</option>
                      {institutions.map(inst => <option key={inst.id} value={inst.id}>{inst.firstName}</option>)}
                    </select>
                  )}
                </div>
              )}

              {!isInst && (
                <input 
                  type="text" 
                  placeholder="Headline (e.g. Software Engineering Student)" 
                  value={headline} 
                  onChange={e => setHeadline(e.target.value)} 
                  style={{ marginBottom: '1rem' }}
                />
              )}

              <div style={{ marginBottom: '1rem' }}>
                <label className="text-small" style={{ display: 'block', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>
                  Custom Profile URL Slug
                </label>
                <input 
                  type="text" 
                  placeholder="Enter unique handle (e.g., john_doe)" 
                  value={customSlug} 
                  onChange={e => setCustomSlug(e.target.value)} 
                />
              </div>
              <textarea placeholder="Bio/Summary" value={bio} onChange={e => setBio(e.target.value)} rows={3} />
              <button type="submit" className="btn-blue mt-2" disabled={loading} style={{ width: '100%' }}>Save Profile</button>
            </form>
          ) : (
            <>
              <h1 style={{ fontSize: '1.5rem', fontWeight: '700' }}>{profile?.firstName} {profile?.lastName}</h1>
              {profile?.headline && <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{profile.headline}</p>}
              <p className="text-small mt-2" style={{ textTransform: 'capitalize', color: 'var(--text-tertiary)' }}>{profile?.role}</p>
              {profile?.bio && <p style={{ marginTop: '1rem', fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>{profile.bio}</p>}
              
              <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-primary)' }}>
                <p className="text-small" style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Public Profile Link</p>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.5rem' }}>
                  <code style={{ flex: 1, background: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-primary)', color: 'var(--accent-primary)', wordBreak: 'break-all' }}>
                    proof.axeomlabs.in/u/{profile?.profileUrlSlug || user.uid}
                  </code>
                  <button className="btn-outline" onClick={() => window.open(`/u/${profile?.profileUrlSlug || user.uid}`, '_blank')}>
                    View
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Student Dashboard Details Rendered Inline */}
      {isStudent && !isEditing && (
        <>
          {/* Identity & Completeness */}
          <div className="stats-grid">
            <div className="card">
              <p className="text-small">Profile Completeness</p>
              <p className="text-bold" style={{ fontSize: '1.5rem', margin: '0.5rem 0' }}>{completeness}%</p>
              <div className="progress-container"><div className="progress-bar" style={{ width: `${completeness}%` }}></div></div>
            </div>
            <div className="card">
              <p className="text-small">Verification Score</p>
              <p className="text-bold" style={{ fontSize: '1.5rem', margin: '0.5rem 0', color: 'var(--accent-primary)' }}>{profile?.verificationScore || 0}</p>
              <p className="text-small">{verifiedCount} items verified</p>
            </div>
            <div className="card">
              <p className="text-small">Public Profile</p>
              <p className="text-small mt-2" style={{ wordBreak: 'break-all', color: 'var(--accent-primary)', fontWeight: '600' }}>
                proof.app/u/{profile?.profileUrlSlug}
              </p>
              <button className="btn-outline mt-2" style={{ padding: '4px 12px', fontSize: '0.8rem' }} onClick={() => window.open(`/u/${profile?.profileUrlSlug}`, '_blank')}>
                View
              </button>
            </div>
          </div>

          {/* Achievements Section */}
          <div className="card">
            <h3 className="mb-4" style={{ borderBottom: '1px solid var(--border-primary)', paddingBottom: '0.5rem' }}>Experience & Proof Assets</h3>
            <StudentAssetSection achievements={achievements} onUpdate={() => {}} />
          </div>

          {/* Proof Pipeline Section */}
          <div className="card">
            <h3 className="mb-4" style={{ borderBottom: '1px solid var(--border-primary)', paddingBottom: '0.5rem' }}>Verification Pipeline</h3>
            {verifications.length > 0 ? verifications.map((v: any) => (
              <div key={v.id} className="flex-between mb-2" style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border-primary)' }}>
                <div>
                  <p className="text-bold" style={{ fontSize: '0.9rem' }}>{v.achievementTitle}</p>
                  {v.reviewerNote && <p className="text-small" style={{ color: 'var(--text-secondary)' }}>Feedback: {v.reviewerNote}</p>}
                </div>
                <span className={`badge ${v.status === 'approved' ? 'badge-green' : v.status === 'revoked' ? 'badge-grey' : 'badge-yellow'}`}>{v.status}</span>
              </div>
            )) : <p className="text-small text-center">No verification tasks ongoing.</p>}
          </div>

          {/* Networks */}
          <div className="card">
            <h3 className="mb-4" style={{ borderBottom: '1px solid var(--border-primary)', paddingBottom: '0.5rem' }}>Institutional Peers</h3>
            {peers.length > 0 ? peers.map((p: any) => (
              <div key={p.id} className="flex-between mb-2" style={{ paddingBottom: '0.5rem' }}>
                <span className="text-small">{p.firstName} {p.lastName}</span>
                <button className="btn-outline" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>Connect</button>
              </div>
            )) : <p className="text-small text-center">No other colleagues found.</p>}
          </div>
        </>
      )}

      {/* Danger Zone */}
      {!isEditing && (
        <div className="card" style={{ border: '1px solid #fca5a5' }}>
          <h3 style={{ color: 'var(--error)', marginBottom: '0.5rem' }}>Danger Zone</h3>
          <button onClick={handleDelete} className="btn-outline" style={{ color: 'var(--error)', borderColor: 'var(--error)' }}>
            Delete Account
          </button>
        </div>
      )}
    </div>
  );
};

// Sub component to handle Achievement forms inside profile
const StudentAssetSection = ({ achievements }: any) => {
  const { user } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [issuedBy, setIssuedBy] = useState('');
  
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [verifiers, setVerifiers] = useState<any[]>([]);
  const [selectedVerifier, setSelectedVerifier] = useState('');

  useEffect(() => {
    const fetchVerifiers = async () => {
      const tSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'teacher')));
      const iSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'institution_admin')));
      setVerifiers([...tSnap.docs, ...iSnap.docs].map(d => ({ id: d.id, ...d.data() })));
    };
    fetchVerifiers();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    await addDoc(collection(db, 'achievements'), {
      studentId: user.uid,
      title,
      description,
      issuedBy,
      verificationStatus: 'draft',
      createdAt: new Date().toISOString()
    });
    setTitle(''); setDescription(''); setIssuedBy(''); setShowAdd(false);
    alert('Success! Please reload view.');
  };

  const handleRequestVerification = async (achId: string, achTitle: string) => {
    if (!selectedVerifier || !user) return;
    await addDoc(collection(db, 'verificationRequests'), {
      achievementId: achId,
      achievementTitle: achTitle,
      requestedBy: user.uid,
      requestedTo: selectedVerifier,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    await updateDoc(doc(db, 'achievements', achId), { verificationStatus: 'pending' });
    setRequestingId(null); setSelectedVerifier('');
    alert('Verification request deployed.');
  };

  return (
    <div>
      <button className="btn-blue mb-4" onClick={() => setShowAdd(!showAdd)}>{showAdd ? 'Cancel' : '+ Add Proof Item'}</button>
      {showAdd && (
        <form onSubmit={handleAdd} style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
          <input type="text" placeholder="Project/Achievement Name" value={title} onChange={e => setTitle(e.target.value)} required />
          <input type="text" placeholder="Host Organization/Issuer" value={issuedBy} onChange={e => setIssuedBy(e.target.value)} required />
          <textarea placeholder="Summary of what you created" value={description} onChange={e => setDescription(e.target.value)} required />
          <button type="submit" className="btn-blue mt-2">Deploy Asset</button>
        </form>
      )}
      
      {achievements.map((a: any) => (
        <div key={a.id} style={{ padding: '1rem 0', borderBottom: '1px solid var(--border-primary)' }}>
          <div className="flex-between">
            <div>
              <p className="text-bold">{a.title}</p>
              <p className="text-small" style={{ color: 'var(--text-secondary)' }}>{a.issuedBy}</p>
            </div>
            <span className={`badge ${a.verificationStatus === 'verified' ? 'badge-green' : a.verificationStatus === 'pending' ? 'badge-yellow' : 'badge-grey'}`}>
              {a.verificationStatus}
            </span>
          </div>
          <p className="text-small mt-2">{a.description}</p>
          
          {a.verificationStatus === 'draft' && requestingId !== a.id && (
            <button className="btn-outline mt-2" style={{ fontSize: '0.75rem', padding: '2px 8px' }} onClick={() => setRequestingId(a.id)}>
              Request Endorsement
            </button>
          )}

          {requestingId === a.id && (
            <div style={{ background: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: '4px', marginTop: '0.5rem' }}>
              <select value={selectedVerifier} onChange={e => setSelectedVerifier(e.target.value)} style={{ marginBottom: '0.5rem' }}>
                <option value="">Select a Certifier</option>
                {verifiers.map(v => <option key={v.id} value={v.id}>{v.firstName} ({v.role})</option>)}
              </select>
              <button className="btn-blue" style={{ fontSize: '0.75rem', padding: '4px 8px' }} onClick={() => handleRequestVerification(a.id, a.title)}>Send</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ProfilePage;
