import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, orderBy, limit, doc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';

const DashboardPage: React.FC = () => {
  const { user, profile } = useAuth();
  const [achievements, setAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLayer, setActiveLayer] = useState<'identity' | 'assets' | 'pipeline' | 'growth' | 'opportunity' | 'network'>('identity');
  
  const [verifications, setVerifications] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [peers, setPeers] = useState<any[]>([]);
  
  const fetchDashboardData = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      // 1. Achievements
      const achQuery = query(collection(db, 'achievements'), where('studentId', '==', user.uid), orderBy('createdAt', 'desc'));
      const achSnap = await getDocs(achQuery);
      setAchievements(achSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // 2. Verifications
      const verQuery = query(collection(db, 'verificationRequests'), where('requestedBy', '==', user.uid), orderBy('createdAt', 'desc'));
      const verSnap = await getDocs(verQuery);
      setVerifications(verSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // 3. Real Events
      const eventSnap = await getDocs(query(collection(db, 'events'), where('isPublished', '==', true), limit(10)));
      setEvents(eventSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // 4. Institutional Peers (functional)
      if (profile?.institutionId) {
        const peerSnap = await getDocs(query(
          collection(db, 'users'), 
          where('institutionId', '==', profile.institutionId),
          limit(5)
        ));
        setPeers(peerSnap.docs.filter(d => d.id !== user.uid).map(d => ({ id: d.id, ...d.data() })));
      }
    } catch (err) {
      console.error("Dashboard data fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user, profile?.institutionId]);

  if (loading) return <div className="container mt-4">Loading...</div>;

  const completeness = calculateCompleteness(profile, achievements);

  return (
    <div className="dashboard-layout">
      <aside className="sidebar-nav">
        <div className={`nav-item ${activeLayer === 'identity' ? 'active' : ''}`} onClick={() => setActiveLayer('identity')}>Identity</div>
        <div className={`nav-item ${activeLayer === 'assets' ? 'active' : ''}`} onClick={() => setActiveLayer('assets')}>Assets</div>
        <div className={`nav-item ${activeLayer === 'pipeline' ? 'active' : ''}`} onClick={() => setActiveLayer('pipeline')}>Pipeline</div>
        <div className={`nav-item ${activeLayer === 'growth' ? 'active' : ''}`} onClick={() => setActiveLayer('growth')}>Growth</div>
        <div className={`nav-item ${activeLayer === 'opportunity' ? 'active' : ''}`} onClick={() => setActiveLayer('opportunity')}>Opportunities</div>
        <div className={`nav-item ${activeLayer === 'network' ? 'active' : ''}`} onClick={() => setActiveLayer('network')}>Network</div>
      </aside>

      <main>
        {activeLayer === 'identity' && <IdentityLayer profile={profile} achievements={achievements} completeness={completeness} />}
        {activeLayer === 'assets' && <AssetCreationLayer achievements={achievements} onUpdate={fetchDashboardData} />}
        {activeLayer === 'pipeline' && <ProofPipeline verifications={verifications} />}
        {activeLayer === 'growth' && <GrowthIntelligence profile={profile} achievements={achievements} />}
        {activeLayer === 'opportunity' && <OpportunityLayer events={events} />}
        {activeLayer === 'network' && <NetworkLayer peers={peers} profile={profile} />}
      </main>
    </div>
  );
};

// --- Identity Layer ---
const IdentityLayer = ({ profile, achievements, completeness }: any) => {
  const verifiedCount = achievements.filter((a: any) => a.verificationStatus === 'verified').length;
  return (
    <div>
      <h2 className="mb-4">Identity Layer</h2>
      <div className="stats-grid">
        <div className="card">
          <p className="text-small">Completeness</p>
          <p className="text-bold" style={{ fontSize: '1.5rem' }}>{completeness}%</p>
          <div className="progress-container"><div className="progress-bar" style={{ width: `${completeness}%` }}></div></div>
        </div>
        <div className="card">
          <p className="text-small">Verification Score</p>
          <p className="text-bold" style={{ fontSize: '1.5rem', color: 'var(--accent-primary)' }}>
            {profile?.verificationScore || 0}
          </p>
          <p className="text-small mt-2">{verifiedCount} items verified</p>
        </div>
        <div className="card">
          <p className="text-small">Reputation Signals</p>
          <div className="mt-2">
            <div className="flex-between"><span className="text-small">Profile Views:</span> <span className="text-bold">{profile?.viewCount || 0}</span></div>
            <div className="flex-between"><span className="text-small">Endorsements:</span> <span className="text-bold">{profile?.endorsements || 0}</span></div>
          </div>
        </div>
      </div>
      <div className="card">
        <h3>Public Profile</h3>
        <p className="text-small mb-4">View your profile as it appears to the public.</p>
        <button className="btn-outline" onClick={() => window.open(`/u/${profile?.profileUrlSlug}`, '_blank')}>
          Open Public Profile
        </button>
      </div>
    </div>
  );
};

// --- Asset Creation Layer ---
const AssetCreationLayer = ({ achievements, onUpdate }: any) => {
  const { user, profile } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [issuedBy, setIssuedBy] = useState('');
  const [dateAchieved, setDateAchieved] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  // Verification request state
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [verifiers, setVerifiers] = useState<any[]>([]);
  const [selectedVerifier, setSelectedVerifier] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const fetchVerifiers = async () => {
      try {
        // Fetch teachers
        const tSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'teacher')));
        // Fetch institutions
        const iSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'institution_admin')));
        
        setVerifiers([...tSnap.docs, ...iSnap.docs].map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Error fetching verifiers", err);
      }
    };
    fetchVerifiers();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (!user) return;
    try {
      await addDoc(collection(db, 'achievements'), {
        studentId: user.uid,
        title,
        description,
        issuedBy,
        dateAchieved,
        expiryDate: expiryDate || null,
        type: 'project',
        verificationStatus: 'draft',
        createdAt: new Date().toISOString()
      });
      setTitle('');
      setDescription('');
      setIssuedBy('');
      setDateAchieved('');
      setExpiryDate('');
      setShowAdd(false);
      setSuccessMsg('Achievement created successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
      onUpdate();
    } catch (err: any) {
      setErrorMsg('Failed to create achievement: ' + err.message);
    }
  };

  const handleDelete = async (achievementId: string) => {
    if (!window.confirm("Are you sure you want to delete this achievement? This action cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, 'achievements', achievementId));
      setSuccessMsg('Achievement deleted successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
      onUpdate();
    } catch (err: any) {
      setErrorMsg('Failed to delete achievement: ' + err.message);
    }
  };

  const handleRequestVerification = async (achievementId: string, achTitle: string) => {
    setErrorMsg('');
    setSuccessMsg('');
    
    if (!selectedVerifier) {
      setErrorMsg('Please select a verifier first.');
      return;
    }
    
    try {
      if (!user?.uid) throw new Error("User ID is missing.");
      
      // Check for existing pending requests for this achievement
      const existingReqsQuery = query(
        collection(db, 'verificationRequests'), 
        where('achievementId', '==', achievementId), 
        where('requestedBy', '==', user.uid),
        where('status', '==', 'pending')
      );
      const existingSnap = await getDocs(existingReqsQuery);
      if (!existingSnap.empty) {
        setErrorMsg('A verification request is already pending for this achievement.');
        return;
      }

      // 1. Create Request
      await addDoc(collection(db, 'verificationRequests'), {
        achievementId,
        achievementTitle: achTitle,
        requestedBy: user.uid,
        requestedTo: selectedVerifier,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      
      // 2. Update Achievement Status
      await updateDoc(doc(db, 'achievements', achievementId), {
        verificationStatus: 'pending'
      });
      
      setRequestingId(null);
      setSelectedVerifier('');
      setSuccessMsg('Verification requested successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
      onUpdate();
    } catch(err: any) {
      console.error(err);
      setErrorMsg(`Failed to request verification: ${err.message}`);
    }
  };

  return (
    <div>
      <h2 className="mb-4">Asset Creation</h2>
      
      {errorMsg && <div className="card mb-4" style={{ background: '#fef2f2', color: 'var(--error)', border: '1px solid var(--error)' }}>{errorMsg}</div>}
      {successMsg && <div className="card mb-4" style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #10b981' }}>{successMsg}</div>}

      <button className="btn-blue mb-4" onClick={() => setShowAdd(!showAdd)}>
        {showAdd ? 'Cancel' : '+ Create Achievement'}
      </button>
      {showAdd && (
        <form onSubmit={handleAdd} className="card mb-4 animate-fade-in">
          <label className="text-small">Achievement Title</label>
          <input type="text" placeholder="e.g., First Place Hackathon" value={title} onChange={e => setTitle(e.target.value)} required />
          
          <label className="text-small">Description</label>
          <textarea placeholder="Describe your achievement..." value={description} onChange={e => setDescription(e.target.value)} required rows={3} />
          
          <label className="text-small">Issued By</label>
          <input type="text" placeholder="e.g., Stanford University, Microsoft" value={issuedBy} onChange={e => setIssuedBy(e.target.value)} required />
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label className="text-small">Date Achieved</label>
              <input type="date" value={dateAchieved} onChange={e => setDateAchieved(e.target.value)} required />
            </div>
            <div style={{ flex: 1 }}>
              <label className="text-small">Expiry Date (Optional)</label>
              <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
            </div>
          </div>
          
          <button type="submit" className="btn-blue mt-4" style={{ width: '100%' }}>Save Asset</button>
        </form>
      )}
      <div style={{ display: 'grid', gap: '1rem' }}>
        {achievements.map((a: any) => (
          <div key={a.id} className="card flex-between" style={{ alignItems: 'flex-start' }}>
            <div>
              <p className="text-bold">{a.title}</p>
              {a.issuedBy && <p className="text-small" style={{ color: 'var(--text-secondary)' }}>Issued by {a.issuedBy}</p>}
              
              {requestingId === a.id && (
                <div className="mt-4 animate-fade-in" style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px' }}>
                  <p className="text-small mb-2">Select an authority to verify this asset:</p>
                  <select value={selectedVerifier} onChange={e => setSelectedVerifier(e.target.value)}>
                    <option value="">-- Choose Authority --</option>
                    {verifiers.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.role === 'institution_admin' ? `🏛️ ${v.firstName}` : `👩‍🏫 ${v.firstName} ${v.lastName}`}
                      </option>
                    ))}
                  </select>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button className="btn-blue" style={{ fontSize: '0.8rem', padding: '0.3rem 0.8rem' }} onClick={() => handleRequestVerification(a.id, a.title)}>Submit Request</button>
                    <button className="btn-outline" style={{ fontSize: '0.8rem', padding: '0.3rem 0.8rem' }} onClick={() => setRequestingId(null)}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
              <span className={`badge ${a.verificationStatus === 'verified' ? 'badge-green' : a.verificationStatus === 'pending' ? 'badge-yellow' : 'badge-grey'}`}>{a.verificationStatus}</span>
              {a.verificationStatus === 'draft' && requestingId !== a.id && (
                <button 
                  className="btn-outline" 
                  style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
                  onClick={() => setRequestingId(a.id)}
                >
                  Request Verification
                </button>
              )}
              {a.verificationStatus !== 'verified' && (
                <button 
                  className="btn-outline" 
                  style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', color: 'var(--error)' }}
                  onClick={() => handleDelete(a.id)}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
        {achievements.length === 0 && <p className="text-small">No assets created yet.</p>}
      </div>
    </div>
  );
};

// --- Proof Pipeline ---
const ProofPipeline = ({ verifications }: any) => (
  <div>
    <h2 className="mb-4">Proof Pipeline</h2>
    <div style={{ display: 'grid', gap: '1rem' }}>
      {verifications.length > 0 ? verifications.map((v: any) => (
        <div key={v.id} className="card">
          <div className="flex-between">
            <span className="text-bold">Request #{v.id.slice(0, 5)}</span>
            <span className={`badge ${v.status === 'approved' ? 'badge-green' : 'badge-yellow'}`}>{v.status}</span>
          </div>
          {v.reviewerNote && <p className="text-small mt-2" style={{ background: '#f3f4f6', padding: '0.5rem' }}>Feedback: {v.reviewerNote}</p>}
        </div>
      )) : <p>No verification requests yet.</p>}
    </div>
  </div>
);

// --- Growth Intelligence (Functional) ---
const GrowthIntelligence = ({ profile, achievements }: any) => {
  const verifiedCount = achievements.filter((a: any) => a.verificationStatus === 'verified').length;
  const suggestions = [];
  
  if (!profile?.bio) suggestions.push({ text: "Add a bio to your profile", impact: "+5% Completeness" });
  if (achievements.length < 2) suggestions.push({ text: "Add 2 more projects", impact: "+16 potential score" });
  if (verifiedCount === 0) suggestions.push({ text: "Request verification for a project", impact: "Boost Trust" });

  return (
    <div>
      <h2 className="mb-4">Growth Intelligence</h2>
      <div className="card" style={{ background: 'var(--accent-light)', border: 'none' }}>
        <h3>Next Steps</h3>
        <div className="mt-4">
          {suggestions.map((s, i) => (
            <div key={i} className="flex-between mb-2">
              <span className="text-small">• {s.text}</span>
              <span className="badge badge-blue">{s.impact}</span>
            </div>
          ))}
          {suggestions.length === 0 && <p>You're all set! Keep adding proof.</p>}
        </div>
      </div>
    </div>
  );
};

// --- Opportunity Layer (Functional) ---
const OpportunityLayer = ({ events }: any) => (
  <div>
    <h2 className="mb-4">Opportunity Layer</h2>
    <div style={{ display: 'grid', gap: '1rem' }}>
      {events.length > 0 ? events.map((e: any) => (
        <div key={e.id} className="card">
          <h4 className="text-bold">{e.title}</h4>
          <p className="text-small mt-2">{e.description}</p>
          <button className="btn-outline mt-4" style={{ padding: '4px 12px', fontSize: '0.8rem' }}>Register</button>
        </div>
      )) : <p className="text-small" style={{ textAlign: 'center', padding: '2rem' }}>No events currently available in your area.</p>}
    </div>
  </div>
);

// --- Network Layer (Functional) ---
const NetworkLayer = ({ peers, profile }: any) => (
  <div>
    <h2 className="mb-4">Network Layer</h2>
    <div className="card">
      <h3 className="mb-2">Institutional Peers</h3>
      {peers.length > 0 ? peers.map((p: any) => (
        <div key={p.id} className="flex-between mb-2" style={{ borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>
          <span className="text-small">{p.firstName} {p.lastName}</span>
          <button className="btn-outline" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>Connect</button>
        </div>
      )) : <p className="text-small">No peers found from {profile?.institutionName || 'your institution'}.</p>}
    </div>
  </div>
);

// --- Completeness Calculator ---
const calculateCompleteness = (profile: any, achievements: any) => {
  let score = 0;
  if (profile?.firstName) score += 20;
  if (profile?.lastName) score += 20;
  if (profile?.bio) score += 20;
  if (profile?.headline) score += 20;
  if (achievements.length > 0) score += 20;
  return score;
};

export default DashboardPage;
