import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, increment } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { sendNotification } from '../utils/notifications';

const TeacherDashboardPage: React.FC = () => {
  const { user, profile } = useAuth();
  const [activeLayer, setActiveLayer] = useState<'verification' | 'students' | 'events' | 'influence'>('verification');
  const [loading, setLoading] = useState(true);
  
  // Data
  const [queue, setQueue] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  
  const fetchTeacherData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Verification Queue (Both pending and history)
      const q = query(collection(db, 'verificationRequests'), where('requestedTo', '==', user.uid));
      const snap = await getDocs(q);
      setQueue(snap.docs.map(d => ({ id: d.id, ...d.data() })));

      // 2. Students Intelligence
      const sSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'student')));
      setStudents(sSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeacherData();
  }, [user]);

  if (loading) return <div className="container mt-4">Loading authority dashboard...</div>;

  return (
    <div className="dashboard-layout">
      <aside className="sidebar-nav">
        <div className={`nav-item ${activeLayer === 'verification' ? 'active' : ''}`} onClick={() => setActiveLayer('verification')}>Verification Queue</div>
        <div className={`nav-item ${activeLayer === 'students' ? 'active' : ''}`} onClick={() => setActiveLayer('students')}>Student Intelligence</div>
        <div className={`nav-item ${activeLayer === 'events' ? 'active' : ''}`} onClick={() => setActiveLayer('events')}>Event Authority</div>
        <div className={`nav-item ${activeLayer === 'influence' ? 'active' : ''}`} onClick={() => setActiveLayer('influence')}>Influence Layer</div>
      </aside>

      <main>
        {activeLayer === 'verification' && <VerificationLayer queue={queue} onUpdate={fetchTeacherData} />}
        {activeLayer === 'students' && <StudentIntelligenceLayer students={students} />}
        {activeLayer === 'events' && <EventAuthorityLayer onUpdate={fetchTeacherData} />}
        {activeLayer === 'influence' && <InfluenceLayer students={students} />}
      </main>
    </div>
  );
};

// --- Verification Layer ---
const VerificationLayer = ({ queue, onUpdate }: any) => {
  const handleAction = async (id: string, achievementId: string, studentId: string, status: 'approved' | 'rejected', achievementTitle: string) => {
    const note = status === 'approved' ? 'Verified by Teacher' : 'Insufficient proof';
    await updateDoc(doc(db, 'verificationRequests', id), {
      status,
      reviewerNote: note,
      reviewedAt: new Date().toISOString()
    });
    await updateDoc(doc(db, 'achievements', achievementId), {
      verificationStatus: status === 'approved' ? 'verified' : 'rejected',
      verifiedAt: status === 'approved' ? new Date().toISOString() : null
    });
    if (status === 'approved') {
      await updateDoc(doc(db, 'users', studentId), { verificationScore: increment(10) });
      await sendNotification({
        userId: studentId,
        type: 'verification_approved',
        title: 'Credential Verified ✓',
        message: `"${achievementTitle}" has been approved and verified by a researcher.`,
        meta: { achievementId, achievementTitle },
      });
    } else {
      await sendNotification({
        userId: studentId,
        type: 'verification_rejected',
        title: 'Verification Declined',
        message: `"${achievementTitle}" was rejected. Reason: ${note}`,
        meta: { achievementId, achievementTitle },
      });
    }
    onUpdate();
  };

  const handleRevoke = async (id: string, achievementId: string, studentId: string, achievementTitle: string) => {
    if (!window.confirm("Are you sure you want to revoke this verification? This will deduct the student's score.")) return;
    await updateDoc(doc(db, 'verificationRequests', id), {
      status: 'rejected',
      reviewerNote: 'Revoked by Teacher',
      reviewedAt: new Date().toISOString()
    });
    await updateDoc(doc(db, 'achievements', achievementId), { verificationStatus: 'rejected', verifiedAt: null });
    await updateDoc(doc(db, 'users', studentId), { verificationScore: increment(-10) });
    await sendNotification({
      userId: studentId,
      type: 'verification_revoked',
      title: 'Verification Revoked',
      message: `Your verification for "${achievementTitle}" has been revoked by the researcher.`,
      meta: { achievementId, achievementTitle },
    });
    onUpdate();
  };

  return (
    <div>
      <h2 className="mb-4">Verification Control Center</h2>
      <div className="card" style={{ background: 'var(--accent-light)', border: 'none' }}>
        <p className="text-small">Priority Scoring: <b>{queue.filter((q:any) => q.status === 'pending').length} pending items</b></p>
      </div>
      <div className="mt-4" style={{ display: 'grid', gap: '1rem' }}>
        {queue.filter((q:any) => q.status === 'pending').length > 0 ? queue.filter((q:any) => q.status === 'pending').map((v: any) => (
          <div key={v.id} className="card">
            <div className="flex-between">
              <span className="text-bold">{v.achievementTitle || 'Achievement Request'}</span>
              <span className="badge badge-yellow">Priority Pending</span>
            </div>
            <p className="text-small mt-2">Achievement ID: {v.achievementId}</p>
            <div className="mt-4 flex-between">
              <button className="btn-blue" onClick={() => handleAction(v.id, v.achievementId, v.requestedBy, 'approved', v.achievementTitle)}>Approve</button>
              <button className="btn-outline" style={{ color: 'var(--error)' }} onClick={() => handleAction(v.id, v.achievementId, v.requestedBy, 'rejected', v.achievementTitle)}>Reject</button>
            </div>
          </div>
        )) : <p>No pending verifications.</p>}
      </div>

      {queue.filter((q:any) => q.status !== 'pending').length > 0 && (
        <div className="card mt-4">
          <h3>Verification History</h3>
          <div className="mt-4" style={{ display: 'grid', gap: '1rem' }}>
            {queue.filter((q:any) => q.status !== 'pending').map((v: any) => (
              <div key={v.id} className="flex-between" style={{ padding: '0.5rem', background: '#f9fafb', borderRadius: '4px' }}>
                <div>
                  <span className="text-bold">{v.achievementTitle || 'Achievement Request'}</span>
                  <p className="text-small" style={{ color: 'var(--text-secondary)' }}>Reviewed on {new Date(v.reviewedAt).toLocaleDateString()}</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <span className={`badge ${v.status === 'approved' ? 'badge-green' : 'badge-error'}`}>{v.status}</span>
                  {v.status === 'approved' && (
                    <button 
                      onClick={() => handleRevoke(v.id, v.achievementId, v.requestedBy, v.achievementTitle)} 
                      className="btn-outline" 
                      style={{ fontSize: '0.7rem', color: 'var(--error)', padding: '2px 6px' }}
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// --- Student Intelligence ---
const StudentIntelligenceLayer = ({ students }: any) => (
  <div>
    <h2 className="mb-4">Student Intelligence</h2>
    <div style={{ display: 'grid', gap: '1rem' }}>
      {students.map((s: any) => (
        <div key={s.id} className="card">
          <div className="flex-between">
            <span className="text-bold">{s.firstName} {s.lastName}</span>
            <button className="btn-outline" style={{ fontSize: '0.8rem' }}>View History</button>
          </div>
          <div className="mt-4 flex-between">
            <span className="text-small">Role: {s.role}</span>
            <span className="text-small">Reliability: <b style={{ color: 'var(--success)' }}>High</b></span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// --- Event Authority ---
const EventAuthorityLayer = ({ onUpdate }: any) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    await addDoc(collection(db, 'events'), {
      organiserId: user.uid,
      title,
      description: desc,
      isPublished: true,
      createdAt: new Date().toISOString()
    });
    setTitle('');
    setDesc('');
    onUpdate();
    alert('Event Published!');
  };

  return (
    <div>
      <h2 className="mb-4">Event Authority</h2>
      <form onSubmit={handleCreateEvent} className="card">
        <h3>Create Event</h3>
        <label className="text-small">Event Title</label>
        <input type="text" value={title} onChange={e => setTitle(e.target.value)} required />
        <label className="text-small">Description</label>
        <textarea value={desc} onChange={e => setDesc(e.target.value)} required />
        <button type="submit" className="btn-blue mt-2">Publish Event</button>
      </form>
    </div>
  );
};

// --- Influence Layer ---
const InfluenceLayer = ({ students }: any) => {
  const handleEndorse = async (studentId: string) => {
    await updateDoc(doc(db, 'studentProfiles', studentId), {
      endorsements: increment(1)
    });
    alert('Student Endorsed!');
  };

  return (
    <div>
      <h2 className="mb-4">Influence Layer</h2>
      <p className="text-small mb-4">Highlight top students and issue endorsements.</p>
      <div style={{ display: 'grid', gap: '1rem' }}>
        {students.map((s: any) => (
          <div key={s.id} className="card flex-between">
            <span>{s.firstName} {s.lastName}</span>
            <button className="btn-blue" onClick={() => handleEndorse(s.id)} style={{ fontSize: '0.8rem' }}>Endorse Student</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeacherDashboardPage;
