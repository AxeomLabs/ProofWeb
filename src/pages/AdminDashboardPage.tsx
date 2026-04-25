import React, { useEffect, useState } from 'react';
import { collection, getDocs, deleteDoc, doc, query, orderBy, setDoc, where, writeBatch, updateDoc, limit } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const AdminDashboardPage: React.FC = () => {
  const { profile, impersonate } = useAuth();
  const navigate = useNavigate();
  const [activeLayer, setActiveLayer] = useState<'system' | 'moderation' | 'institutions' | 'growth' | 'power'>('system');
  
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [flaggedCount, setFlaggedCount] = useState(0);
  const [funnelData, setFunnelData] = useState({ students: 0, profiles: 0, assets: 0, verifications: 0 });
  
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Users
      const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const userList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsers(userList);

      // 1b. Fetch Student Profiles
      const spSnap = await getDocs(collection(db, 'studentProfiles'));
      const spList = spSnap.docs.map(d => d.data());

      // 2. Real Moderation Data (Flagged achievements)
      const flagQuery = query(collection(db, 'achievements'), where('verificationStatus', '==', 'flagged'));
      const flagSnap = await getDocs(flagQuery);
      setFlaggedCount(flagSnap.size);

      // 3. Real Growth Funnel Data
      const allAchievements = await getDocs(collection(db, 'achievements'));
      const uniqueStudentIds = new Set(allAchievements.docs.map(d => d.data().studentId));
      const verifiedStudentIds = new Set(allAchievements.docs.filter(d => d.data().verificationStatus === 'verified').map(d => d.data().studentId));
      
      const totalStudents = userList.filter((u: any) => u.role === 'student').length;
      const completedProfiles = spList.filter(sp => sp.bio || sp.headline).length;

      setFunnelData({
        students: totalStudents,
        profiles: completedProfiles,
        assets: uniqueStudentIds.size,
        verifications: verifiedStudentIds.size
      });

    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (profile?.role === 'platform_admin') {
      fetchData();
    }
  }, [profile]);

  if (profile?.role !== 'platform_admin') return <div className="container mt-4">Unauthorized.</div>;

  return (
    <div className="dashboard-layout">
      <aside className="sidebar-nav">
        <div className={`nav-item ${activeLayer === 'system' ? 'active' : ''}`} onClick={() => setActiveLayer('system')}>System Overview</div>
        <div className={`nav-item ${activeLayer === 'moderation' ? 'active' : ''}`} onClick={() => setActiveLayer('moderation')}>Moderation</div>
        <div className={`nav-item ${activeLayer === 'institutions' ? 'active' : ''}`} onClick={() => setActiveLayer('institutions')}>Institutions</div>
        <div className={`nav-item ${activeLayer === 'growth' ? 'active' : ''}`} onClick={() => setActiveLayer('growth')}>Growth Engine</div>
        <div className={`nav-item ${activeLayer === 'power' ? 'active' : ''}`} onClick={() => setActiveLayer('power')}>Power Layer</div>
      </aside>

      <main>
        {activeLayer === 'system' && <SystemOverviewLayer users={users} funnelData={funnelData} />}
        {activeLayer === 'moderation' && <ModerationLayer flaggedCount={flaggedCount} />}
        {activeLayer === 'institutions' && <InstitutionControlLayer users={users} onUpdate={fetchData} />}
        {activeLayer === 'growth' && <GrowthEngineLayer funnelData={funnelData} />}
        {activeLayer === 'power' && <PowerLayer users={users} onUpdate={fetchData} onImpersonate={impersonate} navigate={navigate} />}
      </main>
    </div>
  );
};

// --- System Overview ---
const SystemOverviewLayer = ({ users, funnelData }: any) => {
  const stats = {
    students: users.filter((u:any) => u.role === 'student').length,
    teachers: users.filter((u:any) => u.role === 'teacher').length,
    institutions: users.filter((u:any) => u.role === 'institution_admin').length,
  };
  const verRate = funnelData.assets > 0 ? Math.round((funnelData.verifications / funnelData.assets) * 100) : 0;

  return (
    <div>
      <h2 className="mb-4">System Overview</h2>
      <div className="stats-grid">
        <div className="card">
          <p className="text-small">Total Ecosystem Users</p>
          <p className="text-bold" style={{ fontSize: '1.5rem' }}>{users.length}</p>
        </div>
        <div className="card">
          <p className="text-small">Students</p>
          <p className="text-bold">{stats.students}</p>
        </div>
        <div className="card">
          <p className="text-small">Teachers</p>
          <p className="text-bold">{stats.teachers}</p>
        </div>
        <div className="card">
          <p className="text-small">Institutions</p>
          <p className="text-bold">{stats.institutions}</p>
        </div>
      </div>
      
      <div className="card">
        <h3>Verification Health</h3>
        <p className="text-small mt-2">Global Verification Rate: <b>{verRate}%</b></p>
        <div className="progress-container mt-4"><div className="progress-bar" style={{ width: `${verRate}%` }}></div></div>
      </div>
    </div>
  );
};

// --- Moderation Layer ---
const ModerationLayer = ({ flaggedCount }: any) => {
  return (
    <div>
      <h2 className="mb-4">Moderation Layer</h2>
      <div className="card" style={{ background: flaggedCount > 0 ? 'rgba(239, 68, 68, 0.1)' : 'var(--glass-bg)', border: flaggedCount > 0 ? '1px solid var(--error)' : '1px solid var(--glass-border)' }}>
        <p className="text-bold" style={{ color: flaggedCount > 0 ? 'var(--error)' : 'var(--text-secondary)' }}>
          {flaggedCount} suspicious achievements detected
        </p>
      </div>
      {flaggedCount === 0 && (
        <p className="text-small mt-4" style={{ textAlign: 'center' }}>No content currently flagged for review.</p>
      )}
    </div>
  );
};

// --- Institution Control ---
const InstitutionControlLayer = ({ users, onUpdate }: any) => {
  const institutions = users.filter((u:any) => u.role === 'institution_admin');

  const updateTier = async (id: string, tier: string) => {
    await updateDoc(doc(db, 'users', id), { tier });
    onUpdate();
  };

  return (
    <div>
      <h2 className="mb-4">Institution Control</h2>
      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-secondary)' }}>
              <th style={{ padding: '1rem', color: 'var(--text-primary)' }}>Institution</th>
              <th style={{ padding: '1rem', color: 'var(--text-primary)' }}>Tier</th>
              <th style={{ padding: '1rem', color: 'var(--text-primary)' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {institutions.map((i: any) => (
              <tr key={i.id} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                <td style={{ padding: '1rem' }}>{i.firstName} {i.lastName}</td>
                <td style={{ padding: '1rem' }}>
                  <span className="badge badge-blue">{i.tier || 'Verified'}</span>
                </td>
                <td style={{ padding: '1rem' }}>
                  <select onChange={(e) => updateTier(i.id, e.target.value)} style={{ width: 'auto', marginBottom: 0 }}>
                    <option value="Verified">Verified</option>
                    <option value="Trusted">Trusted</option>
                    <option value="Partner">Partner</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- Growth Engine ---
const GrowthEngineLayer = ({ funnelData }: any) => {
  const total = funnelData.students || 1;
  const pRate = Math.round((funnelData.profiles / total) * 100);
  const aRate = Math.round((funnelData.assets / total) * 100);
  const vRate = Math.round((funnelData.verifications / total) * 100);

  return (
    <div>
      <h2 className="mb-4">Growth Engine</h2>
      <div className="card">
        <h3>Student Ecosystem Funnel</h3>
        <p className="text-small mb-4">Based on {funnelData.students} registered students.</p>
        <div className="mt-4" style={{ display: 'grid', gap: '1.5rem' }}>
          <div>
            <p className="text-small">Completed Profile (Added Bio/Headline) ({pRate}%)</p>
            <div className="progress-container"><div className="progress-bar" style={{ width: `${pRate}%` }}></div></div>
          </div>
          <div>
            <p className="text-small">First Achievement Created ({aRate}%)</p>
            <div className="progress-container"><div className="progress-bar" style={{ width: `${aRate}%` }}></div></div>
          </div>
          <div>
            <p className="text-small">First Verified Achievement ({vRate}%)</p>
            <div className="progress-container"><div className="progress-bar" style={{ width: `${vRate}%` }}></div></div>
          </div>
        </div>
        {aRate < 30 && funnelData.students > 0 && (
          <p className="text-small mt-4" style={{ color: 'var(--error)' }}>Low achievement rate detected. Students are signing up but not adding proof.</p>
        )}
      </div>
    </div>
  );
};

// --- Power Layer ---
const PowerLayer = ({ users, onUpdate, onImpersonate, navigate }: any) => {
  const [showCreate, setShowCreate] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('student');

  const handleRoleChange = async (userId: string, newRole: string) => {
    await updateDoc(doc(db, 'users', userId), { role: newRole });
    onUpdate();
  };

  const handleDisableUser = async (userId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), { isDisabled: !currentStatus });
      onUpdate();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!window.confirm('PERMANENT DELETE: This will wipe all user data and FORCE them to log out immediately. Proceed?')) return;
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'users', userId));
      batch.delete(doc(db, 'studentProfiles', userId));
      
      const achSnap = await getDocs(query(collection(db, 'achievements'), where('studentId', '==', userId)));
      achSnap.forEach(d => batch.delete(d.ref));
      
      const verSnap = await getDocs(query(collection(db, 'verificationRequests'), where('requestedBy', '==', userId)));
      verSnap.forEach(d => batch.delete(d.ref));

      await batch.commit();
      onUpdate();
    } catch(err:any) {
      alert('Error: ' + err.message);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.confirm('Note: Creating a user will log you out of your admin account. Proceed?')) return;
    
    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      
      const finalFirstName = firstName;
      const finalLastName = role === 'institution_admin' ? '' : lastName;
      
      await setDoc(doc(db, 'users', res.user.uid), {
        email, 
        firstName: finalFirstName, 
        lastName: finalLastName, 
        role,
        createdAt: new Date().toISOString()
      });
      alert('User created! You have been logged in as the new user.');
      navigate('/dashboard');
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <div>
      <div className="flex-between mb-4">
        <h2>Power Layer (Emergency Controls)</h2>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-blue">
          {showCreate ? 'Cancel' : '+ New User'}
        </button>
      </div>

      {showCreate && (
        <div className="card mb-4 animate-fade-in">
          <h3>Create New Account</h3>
          <form onSubmit={handleCreateUser}>
            <label className="text-small">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="institution_admin">Institution</option>
              <option value="platform_admin">Platform Admin</option>
            </select>
            
            {role === 'institution_admin' ? (
              <div style={{ marginTop: '0.5rem' }}>
                <input type="text" placeholder="Institution Name" onChange={e => setFirstName(e.target.value)} required />
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <input type="text" placeholder="First Name" onChange={e => setFirstName(e.target.value)} required />
                <input type="text" placeholder="Last Name" onChange={e => setLastName(e.target.value)} required />
              </div>
            )}
            
            <input type="email" placeholder="Email" onChange={e => setEmail(e.target.value)} required />
            <input type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} required />
            <button type="submit" className="btn-blue mt-2">Create User</button>
          </form>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-secondary)' }}>
              <th style={{ padding: '1rem', color: 'var(--text-primary)' }}>User</th>
              <th style={{ padding: '1rem', color: 'var(--text-primary)' }}>Role Management</th>
              <th style={{ padding: '1rem', color: 'var(--text-primary)' }}>Status</th>
              <th style={{ padding: '1rem', color: 'var(--text-primary)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u:any) => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                <td style={{ padding: '1rem' }}>
                  <p className="text-bold">{u.firstName} {u.lastName}</p>
                  <p className="text-small">{u.email}</p>
                </td>
                <td style={{ padding: '1rem' }}>
                  <select 
                    value={u.role} 
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    style={{ width: 'auto', marginBottom: 0, fontSize: '0.8rem' }}
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="institution_admin">Institution</option>
                    <option value="platform_admin">Platform Admin</option>
                  </select>
                </td>
                <td style={{ padding: '1rem' }}>
                  <span className={`badge ${u.isDisabled ? 'badge-grey' : 'badge-green'}`}>
                    {u.isDisabled ? 'Disabled' : 'Active'}
                  </span>
                </td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button onClick={async () => { await onImpersonate(u.id); navigate('/dashboard'); }} className="btn-outline" style={{ fontSize: '0.7rem' }}>Impersonate</button>
                    <button onClick={() => handleDisableUser(u.id, u.isDisabled)} className="btn-outline" style={{ fontSize: '0.7rem' }}>
                      {u.isDisabled ? 'Enable' : 'Disable'}
                    </button>
                    <button onClick={() => handleDelete(u.id)} className="btn-outline" style={{ color: 'var(--error)', borderColor: 'var(--error)', fontSize: '0.7rem' }}>Wipe</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
