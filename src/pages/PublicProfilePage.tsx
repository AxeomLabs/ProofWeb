import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { collection, query, where, getDocs, doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const PublicProfilePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [profile, setProfile] = useState<any>(null);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [institutionName, setInstitutionName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!slug) return;
      
      let userId = slug;
      let userData: any = null;
      let profileDocId: string | null = null;

      // 1. Try checking if slug is a direct UID in users
      const userDoc = await getDoc(doc(db, 'users', slug));
      if (userDoc.exists()) {
        userData = userDoc.data();
        userId = userDoc.id;
      } else {
        // 2. Try checking if it's a profileUrlSlug in users
        const userSlugQuery = await getDocs(query(collection(db, 'users'), where('profileUrlSlug', '==', slug)));
        if (!userSlugQuery.empty) {
          const uDoc = userSlugQuery.docs[0];
          userData = uDoc.data();
          userId = uDoc.id;
        } else {
          // 3. Fall back to slug lookup in studentProfiles
          const q = query(collection(db, 'studentProfiles'), where('profileUrlSlug', '==', slug));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const profileDoc = snap.docs[0];
            profileDocId = profileDoc.id;
            const profileData = profileDoc.data();
            userId = (profileData as any).userId;
            
            const userDocSnap = await getDoc(doc(db, 'users', userId));
            if (userDocSnap.exists()) {
              userData = userDocSnap.data();
            }
          }
        }
      }

      if (userData) {
        const finalProfile = { id: userId, ...userData };
        setProfile(finalProfile);

        if (userData.institutionId && userData.institutionStatus === 'approved') {
          const instSnap = await getDoc(doc(db, 'users', userData.institutionId));
          if (instSnap.exists()) {
            const instData = instSnap.data();
            setInstitutionName(`${instData.firstName} ${instData.lastName}`);
          }
        }

        if (profileDocId) {
          try {
            await updateDoc(doc(db, 'studentProfiles', profileDocId), {
              viewCount: increment(1)
            });
          } catch(e) { console.warn("Failed to increment view count", e); }
        }

        const achSnap = await getDocs(query(
          collection(db, 'achievements'), 
          where('studentId', '==', userId), 
          where('verificationStatus', '==', 'verified')
        ));
        setAchievements(achSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
      
      setLoading(false);
    };

    fetchProfile();
  }, [slug]);

  if (loading) return <div className="container mt-4">Loading profile...</div>;
  if (!profile) return <div className="container mt-4">Profile not found.</div>;

  return (
    <div className="container mt-4">
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{profile.firstName} {profile.lastName}</h1>
        <p className="text-secondary" style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>{profile.headline || 'No headline'}</p>
        <p style={{ maxWidth: '600px', margin: '0 auto' }}>{profile.bio || 'No bio provided.'}</p>
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
          {profile.gender && (
             <span className="badge badge-grey">{profile.gender}</span>
          )}
          {institutionName && (
             <span className="badge badge-blue">🏛️ {institutionName}</span>
          )}
        </div>

        <div className="mt-4 flex-center" style={{ gap: '2rem' }}>
          <div>
            <p className="text-bold">{profile.verificationScore || 0}</p>
            <p className="text-small">Score</p>
          </div>
          <div>
            <p className="text-bold">{achievements.length}</p>
            <p className="text-small">Verified Assets</p>
          </div>
          <div>
            <p className="text-bold">{profile.viewCount || 0}</p>
            <p className="text-small">Views</p>
          </div>
        </div>
      </div>

      <h2 className="mt-4 mb-4">Verified Proof</h2>
      <div style={{ display: 'grid', gap: '1.5rem' }}>
        {achievements.map((a) => (
          <div key={a.id} className="card">
            <div className="flex-between" style={{ alignItems: 'flex-start' }}>
              <div>
                <h3 className="text-bold">{a.title}</h3>
                {a.issuedBy && <p className="text-small mt-1" style={{ color: 'var(--text-secondary)' }}>Issued by <span className="text-bold">{a.issuedBy}</span></p>}
              </div>
              <span className="badge badge-green">Verified</span>
            </div>
            
            {a.description && <p className="text-small mt-3" style={{ lineHeight: '1.5' }}>{a.description}</p>}
            
            <div style={{ display: 'flex', gap: '2rem', marginTop: '1.5rem', borderTop: '1px solid var(--border-primary)', paddingTop: '1rem' }}>
              {a.dateAchieved && (
                <div>
                  <p className="text-small" style={{ color: 'var(--text-tertiary)' }}>Date Achieved</p>
                  <p className="text-small text-bold">{new Date(a.dateAchieved).toLocaleDateString()}</p>
                </div>
              )}
              {a.expiryDate && (
                <div>
                  <p className="text-small" style={{ color: 'var(--text-tertiary)' }}>Expiry Date</p>
                  <p className="text-small text-bold">{new Date(a.expiryDate).toLocaleDateString()}</p>
                </div>
              )}
            </div>

            {a.externalUrl && (
              <a href={a.externalUrl} target="_blank" rel="noreferrer" className="btn-outline mt-4" style={{ display: 'inline-block' }}>
                View Project
              </a>
            )}
          </div>
        ))}
        {achievements.length === 0 && (
          <p className="text-small text-center">No verified assets yet.</p>
        )}
      </div>
    </div>
  );
};

export default PublicProfilePage;
