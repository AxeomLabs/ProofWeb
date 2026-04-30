import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc, setDoc, deleteDoc, collection, query, where, getDocs, addDoc, orderBy, limit } from 'firebase/firestore';
import { deleteUser } from 'firebase/auth';
import { db, auth } from '../firebase/config';
import { useNavigate } from 'react-router-dom';
import { Edit3, Save, ExternalLink, Trash2, Plus, X, Send, CheckCircle, Clock, FileText, AlertTriangle } from 'lucide-react';
import { sendNotification } from '../utils/notifications';

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
  const [achievements, setAchievements] = useState<any[]>([]);
  const [verifications, setVerifications] = useState<any[]>([]);

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
      } catch (err) { console.error(err); }
    };
    fetchInstitutions();
  }, [profile]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user || profile?.role !== 'student') return;
      try {
        const achSnap = await getDocs(query(collection(db, 'achievements'), where('studentId', '==', user.uid), orderBy('createdAt', 'desc')));
        setAchievements(achSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        const verSnap = await getDocs(query(collection(db, 'verificationRequests'), where('requestedBy', '==', user.uid), orderBy('createdAt', 'desc')));
        setVerifications(verSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) { console.error(err); }
    };
    fetchData();
  }, [user, profile]);

  if (!user) return <div className="container mt-4">Please login.</div>;

  const isInst = profile?.role === 'institution_admin';
  const isStudent = profile?.role === 'student';
  const verifiedCount = achievements.filter((a: any) => a.verificationStatus === 'verified').length;

  const completeness = (() => {
    let s = 0;
    if (profile?.firstName) s += 25;
    if (profile?.lastName || isInst) s += 25;
    if (profile?.bio) s += 25;
    if (profile?.headline || isInst) s += 25;
    return s;
  })();

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updates: any = { firstName, bio, updatedAt: new Date().toISOString() };
      if (!isInst) { updates.lastName = lastName; updates.headline = headline; updates.gender = gender; }
      else { updates.lastName = ''; }
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
        const existing = await getDocs(query(collection(db, 'users'), where('profileUrlSlug', '==', slugToUse)));
        if (!existing.empty) { alert('Username already taken.'); setLoading(false); return; }
      }
      await updateDoc(doc(db, 'users', user.uid), { profileUrlSlug: slugToUse });
      if (isStudent) {
        await setDoc(doc(db, 'studentProfiles', user.uid), { userId: user.uid, profileUrlSlug: slugToUse, updatedAt: new Date().toISOString() }, { merge: true });
      }
      setIsEditing(false);
    } catch (err: any) { alert('Error: ' + err.message); }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (window.confirm('This will permanently delete your account and all data. Are you sure?')) {
      setLoading(true);
      try {
        await deleteUser(user);
        const postsSnap = await getDocs(query(collection(db, 'posts'), where('authorId', '==', user.uid)));
        for (const d of postsSnap.docs) await deleteDoc(d.ref);
        const achSnap = await getDocs(query(collection(db, 'achievements'), where('studentId', '==', user.uid)));
        for (const d of achSnap.docs) await deleteDoc(d.ref);
        const reqSnap = await getDocs(query(collection(db, 'verificationRequests'), where('requestedBy', '==', user.uid)));
        for (const d of reqSnap.docs) await deleteDoc(d.ref);
        await deleteDoc(doc(db, 'users', user.uid));
        navigate('/login');
      } catch (err: any) {
        if (err.code === 'auth/requires-recent-login') alert('Please logout and log back in before deleting.');
        else alert('Error: ' + err.message);
      }
      setLoading(false);
    }
  };

  return (
    <div className="fade-in" style={{ maxWidth: '720px', margin: '0 auto', display: 'grid', gap: '20px', paddingTop: '8px', paddingBottom: '40px' }}>

      {/* Profile Header */}
      <div className="card card-elevated" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ height: '100px', background: 'linear-gradient(135deg, #1e3a5f 0%, var(--accent-primary) 100%)' }} />
        <div style={{ padding: '0 28px 28px', marginTop: '-48px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
            <div className="avatar avatar-xl" style={{ background: 'var(--bg-secondary)', color: 'var(--accent-primary)', border: '3px solid var(--bg-secondary)', boxShadow: 'var(--shadow-md)' }}>
              {profile?.firstName?.charAt(0)}
            </div>
            <button onClick={() => setIsEditing(!isEditing)} className={isEditing ? 'btn-ghost' : 'btn-outline'} style={{ fontSize: '13px' }}>
              {isEditing ? <><X size={14} /> Cancel</> : <><Edit3 size={14} /> Edit</>}
            </button>
          </div>

          {isEditing ? (
            <form onSubmit={handleUpdate} style={{ display: 'grid', gap: '4px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: isInst ? '1fr' : '1fr 1fr', gap: '12px' }}>
                <div><label>{isInst ? 'Institution Name' : 'First Name'}</label><input value={firstName} onChange={e => setFirstName(e.target.value)} required /></div>
                {!isInst && <div><label>Last Name</label><input value={lastName} onChange={e => setLastName(e.target.value)} required /></div>}
              </div>
              {!isInst && (
                <>
                  <label>Headline</label>
                  <input value={headline} onChange={e => setHeadline(e.target.value)} placeholder="e.g. CS Student @ MIT" />
                </>
              )}
              <label>Bio</label>
              <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} placeholder="Tell us about yourself..." />
              <label>Profile URL</label>
              <input value={customSlug} onChange={e => setCustomSlug(e.target.value)} placeholder="unique-handle" />
              {!isInst && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label>Gender</label>
                    <select value={gender} onChange={e => setGender(e.target.value)}>
                      <option value="">Prefer not to say</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Non-binary">Non-binary</option>
                    </select>
                  </div>
                  {isStudent && (
                    <div>
                      <label>Institution</label>
                      <select value={institutionId} onChange={e => setInstitutionId(e.target.value)}>
                        <option value="">None</option>
                        {institutions.map(inst => <option key={inst.id} value={inst.id}>{inst.firstName}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              )}
              <button type="submit" className="btn-blue" disabled={loading} style={{ marginTop: '8px' }}>
                <Save size={15} /> {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          ) : (
            <>
              <h1 style={{ fontSize: '24px', marginBottom: '2px' }}>{profile?.firstName} {profile?.lastName}</h1>
              {profile?.headline && <p style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>{profile.headline}</p>}
              <span className="badge badge-grey" style={{ marginTop: '8px', textTransform: 'capitalize' }}>{profile?.role?.replace(/_/g, ' ')}</span>
              {profile?.bio && <p style={{ marginTop: '16px', fontSize: '14px', lineHeight: '1.7', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{profile.bio}</p>}

              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <code style={{ flex: 1, background: 'var(--bg-input)', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', fontSize: '13px', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                  proof.axeomlabs.in/u/{profile?.profileUrlSlug || user.uid}
                </code>
                <button className="btn-outline" style={{ fontSize: '12px', padding: '6px 12px', flexShrink: 0 }} onClick={() => window.open(`/u/${profile?.profileUrlSlug || user.uid}`, '_blank')}>
                  <ExternalLink size={13} /> View
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Student Stats */}
      {isStudent && !isEditing && (
        <div className="stats-grid">
          <div className="card" style={{ textAlign: 'center' }}>
            <p className="label-caps" style={{ marginBottom: '8px' }}>Completeness</p>
            <p style={{ fontSize: '28px', fontWeight: 700, color: completeness === 100 ? 'var(--success)' : 'var(--text-primary)' }}>{completeness}%</p>
            <div className="progress-container" style={{ marginTop: '8px' }}><div className="progress-bar" style={{ width: `${completeness}%` }} /></div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <p className="label-caps" style={{ marginBottom: '8px' }}>Verified</p>
            <p style={{ fontSize: '28px', fontWeight: 700, color: 'var(--success)' }}>{verifiedCount}</p>
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>of {achievements.length} items</p>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <p className="label-caps" style={{ marginBottom: '8px' }}>Pending</p>
            <p style={{ fontSize: '28px', fontWeight: 700, color: 'var(--warning)' }}>{verifications.filter(v => v.status === 'pending').length}</p>
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>verifications</p>
          </div>
        </div>
      )}

      {/* Achievements */}
      {isStudent && !isEditing && (
        <div className="card">
          <div className="flex-between" style={{ marginBottom: '16px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FileText size={18} /> Proof Items</h3>
          </div>
          <StudentAssetSection achievements={achievements} />
        </div>
      )}

      {/* Verifications */}
      {isStudent && !isEditing && verifications.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={18} /> Verification Pipeline</h3>
          {verifications.map((v: any) => (
            <div key={v.id} className="flex-between" style={{ padding: '12px 0', borderBottom: '1px solid var(--border-primary)' }}>
              <div>
                <p style={{ fontWeight: 600, fontSize: '14px' }}>{v.achievementTitle}</p>
                {v.reviewerNote && <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>"{v.reviewerNote}"</p>}
              </div>
              <span className={`badge ${v.status === 'approved' ? 'badge-green' : v.status === 'revoked' ? 'badge-red' : 'badge-yellow'}`}>
                {v.status === 'approved' ? <><CheckCircle size={12} /> Verified</> : v.status === 'pending' ? <><Clock size={12} /> Pending</> : v.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Danger Zone */}
      {!isEditing && (
        <div className="card" style={{ border: '1px solid rgba(220, 38, 38, 0.2)' }}>
          <div className="flex-between">
            <div>
              <h3 style={{ fontSize: '15px', color: 'var(--error)', display: 'flex', alignItems: 'center', gap: '6px' }}><AlertTriangle size={16} /> Danger Zone</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '2px' }}>Permanently delete your account and all data.</p>
            </div>
            <button onClick={handleDelete} className="btn-danger" style={{ fontSize: '13px', padding: '6px 14px' }}>
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const StudentAssetSection = ({ achievements }: any) => {
  const { user, profile } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [issuedBy, setIssuedBy] = useState('');
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [verifiers, setVerifiers] = useState<any[]>([]);
  const [selectedVerifier, setSelectedVerifier] = useState('');

  useEffect(() => {
    const fetch = async () => {
      const tSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'teacher')));
      const iSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'institution_admin')));
      setVerifiers([...tSnap.docs, ...iSnap.docs].map(d => ({ id: d.id, ...d.data() })));
    };
    fetch();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    await addDoc(collection(db, 'achievements'), {
      studentId: user.uid, title, description, issuedBy,
      verificationStatus: 'draft', createdAt: new Date().toISOString()
    });
    setTitle(''); setDescription(''); setIssuedBy(''); setShowAdd(false);
    window.location.reload();
  };

  const handleRequest = async (achId: string, achTitle: string) => {
    if (!selectedVerifier || !user) return;
    await addDoc(collection(db, 'verificationRequests'), {
      achievementId: achId, achievementTitle: achTitle,
      requestedBy: user.uid, requestedTo: selectedVerifier,
      status: 'pending', createdAt: new Date().toISOString()
    });
    await updateDoc(doc(db, 'achievements', achId), { verificationStatus: 'pending' });
    // Notify the verifier they have a new request
    const verifier = verifiers.find(v => v.id === selectedVerifier);
    const verifierName = verifier ? `${verifier.firstName} ${verifier.lastName || ''}`.trim() : 'a verifier';
    await sendNotification({
      userId: selectedVerifier,
      type: 'verification_requested',
      title: 'New Verification Request',
      message: `${profile?.firstName} ${profile?.lastName || ''} has requested verification for "${achTitle}".`,
      meta: { achievementId: achId, achievementTitle: achTitle, requestedBy: user.uid },
    });
    setRequestingId(null); setSelectedVerifier('');
    window.location.reload();
  };

  return (
    <div>
      <button className={showAdd ? 'btn-ghost' : 'btn-outline'} onClick={() => setShowAdd(!showAdd)} style={{ marginBottom: '16px', fontSize: '13px' }}>
        {showAdd ? <><X size={14} /> Cancel</> : <><Plus size={14} /> Add Item</>}
      </button>

      {showAdd && (
        <form onSubmit={handleAdd} style={{ background: 'var(--bg-tertiary)', padding: '20px', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
          <label>Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Project or achievement name" required />
          <label>Issuer</label>
          <input value={issuedBy} onChange={e => setIssuedBy(e.target.value)} placeholder="Organization or authority" required />
          <label>Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief summary..." rows={2} required />
          <button type="submit" className="btn-blue" style={{ fontSize: '13px', marginTop: '4px' }}><Plus size={14} /> Add</button>
        </form>
      )}

      {achievements.length === 0 && !showAdd && (
        <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', textAlign: 'center', padding: '24px 0' }}>No items yet. Add your first proof item above.</p>
      )}

      {achievements.map((a: any) => (
        <div key={a.id} style={{ padding: '14px 0', borderBottom: '1px solid var(--border-primary)' }}>
          <div className="flex-between">
            <div>
              <p style={{ fontWeight: 600, fontSize: '14px' }}>{a.title}</p>
              <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{a.issuedBy}</p>
            </div>
            <span className={`badge ${a.verificationStatus === 'verified' ? 'badge-green' : a.verificationStatus === 'pending' ? 'badge-yellow' : 'badge-grey'}`}>
              {a.verificationStatus === 'verified' ? <><CheckCircle size={11} /> Verified</> : a.verificationStatus}
            </span>
          </div>
          {a.description && <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: '1.5' }}>{a.description}</p>}

          {a.verificationStatus === 'draft' && requestingId !== a.id && (
            <button className="btn-ghost" style={{ fontSize: '12px', marginTop: '6px', padding: '4px 8px' }} onClick={() => setRequestingId(a.id)}>
              <Send size={12} /> Request Verification
            </button>
          )}

          {requestingId === a.id && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px', alignItems: 'center' }}>
              <select value={selectedVerifier} onChange={e => setSelectedVerifier(e.target.value)} style={{ flex: 1, margin: 0 }}>
                <option value="">Select verifier...</option>
                {verifiers.map(v => <option key={v.id} value={v.id}>{v.firstName} ({v.role?.replace(/_/g, ' ')})</option>)}
              </select>
              <button className="btn-blue" style={{ fontSize: '12px', padding: '8px 12px', flexShrink: 0 }} onClick={() => handleRequest(a.id, a.title)}>
                <Send size={12} />
              </button>
              <button className="btn-ghost" style={{ padding: '8px', flexShrink: 0 }} onClick={() => setRequestingId(null)}>
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ProfilePage;
