import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, orderBy, limit, increment } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { sendNotification } from '../utils/notifications';

const InstitutionDashboardPage: React.FC = () => {
  const { user, profile } = useAuth();
  const [activeLayer, setActiveLayer] = useState<'intelligence' | 'trust' | 'lifecycle' | 'exports' | 'events'>('intelligence');
  const [loading, setLoading] = useState(true);
  
  // Data
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [queue, setQueue] = useState<any[]>([]);
  
  const fetchInstitutionData = async () => {
    if (!user || !profile) return;
    setLoading(true);
    try {
      // 1. Fetch Students linked to this institution
      const sQuery = query(collection(db, 'users'), where('institutionId', '==', user.uid), where('role', '==', 'student'));
      const sSnap = await getDocs(sQuery);
      setStudents(sSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // 2. Fetch Teachers linked to this institution
      const tQuery = query(collection(db, 'users'), where('institutionId', '==', user.uid), where('role', '==', 'teacher'));
      const tSnap = await getDocs(tQuery);
      setTeachers(tSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      
      // 3. Fetch Verification Queue (Both pending and history)
      const vQuery = query(collection(db, 'verificationRequests'), where('requestedTo', '==', user.uid));
      const vSnap = await getDocs(vQuery);
      setQueue(vSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstitutionData();
  }, [user, profile]);

  if (loading) return <div className="container mt-4">Loading institution control...</div>;

  return (
    <div className="dashboard-layout">
      <aside className="sidebar-nav">
        <div className={`nav-item ${activeLayer === 'intelligence' ? 'active' : ''}`} onClick={() => setActiveLayer('intelligence')}>Intelligence</div>
        <div className={`nav-item ${activeLayer === 'trust' ? 'active' : ''}`} onClick={() => setActiveLayer('trust')}>Trust Control</div>
        <div className={`nav-item ${activeLayer === 'lifecycle' ? 'active' : ''}`} onClick={() => setActiveLayer('lifecycle')}>Student Lifecycle</div>
        <div className={`nav-item ${activeLayer === 'exports' ? 'active' : ''}`} onClick={() => setActiveLayer('exports')}>Data & Exports</div>
        <div className={`nav-item ${activeLayer === 'events' ? 'active' : ''}`} onClick={() => setActiveLayer('events')}>Events</div>
      </aside>

      <main>
        {activeLayer === 'intelligence' && <IntelligenceLayer students={students} />}
        {activeLayer === 'trust' && <TrustControlLayer teachers={teachers} queue={queue} onUpdate={fetchInstitutionData} />}
        {activeLayer === 'lifecycle' && <LifecycleLayer students={students} onUpdate={fetchInstitutionData} />}
        {activeLayer === 'exports' && <ExportLayer students={students} />}
        {activeLayer === 'events' && <InstitutionEventsLayer />}
      </main>
    </div>
  );
};

// --- Intelligence Layer ---
const IntelligenceLayer = ({ students }: any) => {
  const approvedStudents = students.filter((s:any) => s.institutionStatus === 'approved');
  const verifiedTotal = approvedStudents.reduce((acc: number, s: any) => acc + (s.verificationScore > 0 ? 1 : 0), 0);
  const avgScore = approvedStudents.length > 0 ? approvedStudents.reduce((acc: number, s: any) => acc + (s.verificationScore || 0), 0) / approvedStudents.length : 0;

  return (
    <div>
      <h2 className="mb-4">Institutional Intelligence</h2>
      <div className="stats-grid">
        <div className="card">
          <p className="text-small">Total Approved Students</p>
          <p className="text-bold" style={{ fontSize: '1.5rem' }}>{approvedStudents.length}</p>
        </div>
        <div className="card">
          <p className="text-small">Verified Ratio</p>
          <p className="text-bold" style={{ fontSize: '1.5rem' }}>{Math.round((verifiedTotal / (approvedStudents.length || 1)) * 100) || 0}%</p>
        </div>
        <div className="card">
          <p className="text-small">Avg. Verification Score</p>
          <p className="text-bold" style={{ fontSize: '1.5rem' }}>{avgScore.toFixed(1)}</p>
        </div>
      </div>

      <div className="card">
        <h3>Top Performers</h3>
        <div className="mt-4">
          {approvedStudents.sort((a:any, b:any) => (b.verificationScore || 0) - (a.verificationScore || 0)).slice(0, 5).map((s:any, i:number) => (
            <div key={s.id} className="flex-between mb-2" style={{ padding: '0.5rem', background: i === 0 ? 'var(--accent-light)' : 'transparent', borderRadius: '4px' }}>
              <span>{s.firstName} {s.lastName}</span>
              <span className="text-bold">{s.verificationScore || 0}</span>
            </div>
          ))}
          {approvedStudents.length === 0 && <p className="text-small">No approved students yet.</p>}
        </div>
      </div>
    </div>
  );
};

// --- Trust Control Layer ---
const TrustControlLayer = ({ teachers, queue, onUpdate }: any) => {
  const handleToggleTeacher = async (id: string, isVerified: boolean) => {
    await updateDoc(doc(db, 'users', id), { isTeacherVerified: !isVerified });
    onUpdate();
  };

  const handleAction = async (id: string, achievementId: string, studentId: string, status: 'approved' | 'rejected', achievementTitle: string) => {
    const note = status === 'approved' ? 'Verified by Institution' : 'Insufficient proof';
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
        message: `"${achievementTitle}" has been officially verified by your institution.`,
        meta: { achievementId, achievementTitle },
      });
    } else {
      await sendNotification({
        userId: studentId,
        type: 'verification_rejected',
        title: 'Verification Declined',
        message: `Your institution declined "${achievementTitle}". Reason: ${note}`,
        meta: { achievementId, achievementTitle },
      });
    }
    onUpdate();
  };

  const handleRevoke = async (id: string, achievementId: string, studentId: string, achievementTitle: string) => {
    if (!window.confirm("Revoke this verification? This will deduct the student's score.")) return;
    await updateDoc(doc(db, 'verificationRequests', id), {
      status: 'rejected',
      reviewerNote: 'Revoked by Institution',
      reviewedAt: new Date().toISOString()
    });
    await updateDoc(doc(db, 'achievements', achievementId), { verificationStatus: 'rejected', verifiedAt: null });
    await updateDoc(doc(db, 'users', studentId), { verificationScore: increment(-10) });
    await sendNotification({
      userId: studentId,
      type: 'verification_revoked',
      title: 'Verification Revoked',
      message: `Your institution has revoked the verification for "${achievementTitle}".`,
      meta: { achievementId, achievementTitle },
    });
    onUpdate();
  };

  return (
    <div>
      <h2 className="mb-4">Trust Control</h2>
      
      <div className="card mb-4" style={{ background: 'var(--accent-light)', border: 'none' }}>
        <h3 style={{ color: 'var(--accent-primary)' }}>Verification Requests</h3>
        <p className="text-small mb-4">You have <b>{queue.filter((q:any) => q.status === 'pending').length}</b> pending achievements waiting for institutional approval.</p>
        <div style={{ display: 'grid', gap: '1rem' }}>
          {queue.filter((q:any) => q.status === 'pending').length > 0 ? queue.filter((q:any) => q.status === 'pending').map((v: any) => (
            <div key={v.id} className="card" style={{ background: 'white' }}>
              <div className="flex-between">
                <span className="text-bold">{v.achievementTitle || 'Achievement Request'}</span>
                <span className="badge badge-yellow">Pending</span>
              </div>
              <p className="text-small mt-2">Achievement ID: {v.achievementId}</p>
              <div className="mt-4 flex-between">
                <button className="btn-blue" style={{ fontSize: '0.8rem', padding: '0.3rem 0.8rem' }} onClick={() => handleAction(v.id, v.achievementId, v.requestedBy, 'approved', v.achievementTitle || 'Achievement')}>Approve &amp; Verify</button>
                <button className="btn-outline" style={{ fontSize: '0.8rem', padding: '0.3rem 0.8rem', color: 'var(--error)' }} onClick={() => handleAction(v.id, v.achievementId, v.requestedBy, 'rejected', v.achievementTitle || 'Achievement')}>Reject</button>
              </div>
            </div>
          )) : <p className="text-small">No pending verifications.</p>}
        </div>
      </div>

      {queue.filter((q:any) => q.status !== 'pending').length > 0 && (
        <div className="card mb-4">
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

      <div className="card">
        <h3>Teacher Authority</h3>
        <p className="text-small mb-4">Grant verification privileges to teachers affiliated with your institution.</p>
        <div className="mt-4">
          {teachers.map((t: any) => (
            <div key={t.id} className="flex-between mb-2">
              <div>
                <p className="text-bold">{t.firstName} {t.lastName}</p>
                <p className="text-small">{t.email}</p>
              </div>
              <button 
                onClick={() => handleToggleTeacher(t.id, t.isTeacherVerified)}
                className={t.isTeacherVerified ? "btn-outline" : "btn-blue"}
                style={{ fontSize: '0.8rem' }}
              >
                {t.isTeacherVerified ? 'Revoke Access' : 'Verify Teacher'}
              </button>
            </div>
          ))}
          {teachers.length === 0 && <p className="text-small">No teachers linked to this institution.</p>}
        </div>
      </div>
    </div>
  );
};

// --- Lifecycle Layer ---
const LifecycleLayer = ({ students, onUpdate }: any) => {
  const { user } = useAuth();
  const pending = students.filter((s:any) => s.institutionStatus === 'pending');
  const approved = students.filter((s:any) => s.institutionStatus === 'approved');

  const handleStatusChange = async (studentId: string, studentName: string, institutionId: string, newStatus: string) => {
    try {
      const updateData = newStatus === 'none'
        ? { institutionId: '', institutionStatus: 'none' }
        : { institutionStatus: newStatus };
      await updateDoc(doc(db, 'users', studentId), updateData);
      if (newStatus === 'approved') {
        await sendNotification({
          userId: studentId,
          type: 'institution_approved',
          title: 'Institution Membership Approved',
          message: `Your affiliation request has been approved. You are now a member of the institution.`,
          meta: { institutionId },
        });
      } else if (newStatus === 'none') {
        await sendNotification({
          userId: studentId,
          type: 'institution_rejected',
          title: 'Institution Request Declined',
          message: `Your affiliation request was not approved by the institution.`,
          meta: { institutionId },
        });
      }
      onUpdate();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <h2 className="mb-4">Student Lifecycle</h2>
      
      {pending.length > 0 && (
        <div className="card mb-4" style={{ border: '2px solid var(--accent-primary)' }}>
          <h3 style={{ color: 'var(--accent-primary)' }}>Pending Requests</h3>
          <p className="text-small mb-4">These students claim to be part of your institution.</p>
          {pending.map((s:any) => (
            <div key={s.id} className="flex-between mb-2 pb-2" style={{ borderBottom: '1px solid var(--border-primary)' }}>
              <div>
                <p className="text-bold">{s.firstName} {s.lastName}</p>
                <p className="text-small">{s.email}</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => handleStatusChange(s.id, s.firstName, user?.uid || '', 'approved')} className="btn-blue" style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem' }}>Approve</button>
                <button onClick={() => handleStatusChange(s.id, s.firstName, user?.uid || '', 'none')} className="btn-outline" style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem', color: 'var(--error)' }}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ padding: 0 }}>
        <table style={{ width: '100%', textAlign: 'left' }}>
          <thead style={{ background: '#f3f4f6' }}>
            <tr>
              <th style={{ padding: '1rem' }}>Approved Student</th>
              <th style={{ padding: '1rem' }}>Score</th>
              <th style={{ padding: '1rem' }}>Status</th>
              <th style={{ padding: '1rem' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {approved.map((s: any) => (
              <tr key={s.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '1rem' }}>
                  <p className="text-bold">{s.firstName} {s.lastName}</p>
                  <p className="text-small">{s.email}</p>
                </td>
                <td style={{ padding: '1rem' }} className="text-bold">{s.verificationScore || 0}</td>
                <td style={{ padding: '1rem' }}>
                  <span className={`badge ${(s.verificationScore || 0) > 50 ? 'badge-green' : 'badge-grey'}`}>
                    {(s.verificationScore || 0) > 50 ? 'High Potential' : 'Developing'}
                  </span>
                </td>
                <td style={{ padding: '1rem' }}>
                  <button onClick={() => handleStatusChange(s.id, s.firstName, '', 'none')} className="btn-outline" style={{ fontSize: '0.7rem', color: 'var(--error)' }}>Remove</button>
                </td>
              </tr>
            ))}
            {approved.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: '1rem', textAlign: 'center' }} className="text-small">No approved students.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- Export Layer ---
const ExportLayer = ({ students }: any) => {
  const approved = students.filter((s:any) => s.institutionStatus === 'approved');

  const handleExport = () => {
    const data = JSON.stringify(approved, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'institution_report.json';
    a.click();
  };

  return (
    <div>
      <h2 className="mb-4">Data & Exports</h2>
      <div className="card">
        <h3>Reports for Accreditation</h3>
        <p className="text-small mb-4">Export all approved student portfolios and verified achievements for internal evaluation.</p>
        <button onClick={handleExport} className="btn-blue">Export JSON Report</button>
      </div>
    </div>
  );
};

// --- Institution Events Layer ---
const InstitutionEventsLayer = () => (
  <div>
    <h2 className="mb-4">Institution Events</h2>
    <div className="card" style={{ borderStyle: 'dashed', textAlign: 'center', padding: '3rem' }}>
       <p className="text-bold">Host Institution-wide Event</p>
       <p className="text-small mb-4">Launch a competition or science fair only for your students.</p>
       <button className="btn-blue">Create Private Event</button>
    </div>
  </div>
);

export default InstitutionDashboardPage;
