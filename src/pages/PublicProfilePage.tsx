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
  if (!profile) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="card" style={{ textAlign: 'center', padding: '2rem', maxWidth: '400px' }}>
          <h3 style={{ color: 'var(--error)', fontSize: '1.5rem', marginBottom: '1rem' }}>Profile Not Found</h3>
          <p style={{ color: 'var(--text-secondary)' }}>The requested user profile doesn't exist or could have been moved.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '1.5rem 1rem' }}>
      {/* Hero Profile Header */}
      <div className="card" style={{ padding: '0', overflow: 'hidden', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', borderRadius: '16px', background: 'var(--bg-secondary)' }}>
        <div style={{ height: '200px', background: 'linear-gradient(135deg, #0a66c2 0%, #004182 100%)', position: 'relative' }}>
          {/* Decorative Grid Overlay */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.1, backgroundSize: '20px 20px', backgroundImage: 'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)' }} />
        </div>
        
        <div style={{ padding: '0 3rem 3rem 3rem', marginTop: '-80px', textAlign: 'center', position: 'relative' }}>
          {/* Avatar */}
          <div style={{ display: 'inline-flex', width: '160px', height: '160px', borderRadius: '50%', border: '6px solid var(--bg-secondary)', background: 'var(--bg-tertiary)', alignItems: 'center', justifyContent: 'center', fontSize: '4rem', fontWeight: 'bold', color: 'var(--accent-primary)', boxShadow: '0 8px 20px rgba(0,0,0,0.1)' }}>
            {profile.firstName?.charAt(0)}
          </div>
          
          <h1 style={{ fontSize: '2.5rem', fontWeight: '700', marginTop: '1.5rem', color: 'var(--text-primary)' }}>
            {profile.firstName} {profile.lastName}
          </h1>
          
          <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', marginTop: '0.5rem', fontWeight: '400' }}>
            {profile.headline || 'Professional Achiever'}
          </p>

          {profile.bio && (
            <p style={{ maxWidth: '650px', margin: '1.5rem auto 0', color: 'var(--text-secondary)', lineHeight: '1.6', fontSize: '1.05rem', whiteSpace: 'pre-wrap' }}>
              {profile.bio}
            </p>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
            {profile.gender && (
              <span style={{ padding: '0.5rem 1rem', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', borderRadius: '30px', fontSize: '0.9rem', fontWeight: '600' }}>
                {profile.gender}
              </span>
            )}
            {institutionName && (
              <span style={{ padding: '0.5rem 1rem', background: 'rgba(10, 102, 194, 0.1)', color: 'var(--accent-primary)', borderRadius: '30px', fontSize: '0.9rem', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                🏛️ {institutionName}
              </span>
            )}
          </div>

          {/* Summary Metrics Card */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '3rem', marginTop: '2.5rem', background: 'var(--bg-tertiary)', padding: '1.5rem', borderRadius: '12px', maxWidth: '500px', margin: '2.5rem auto 0' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--accent-primary)' }}>{profile.verificationScore || 0}</p>
              <p className="text-small" style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600', marginTop: '0.25rem' }}>Score</p>
            </div>
            <div style={{ textAlign: 'center', borderLeft: '1px solid var(--border-primary)', borderRight: '1px solid var(--border-primary)', padding: '0 2.5rem' }}>
              <p style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--accent-primary)' }}>{achievements.length}</p>
              <p className="text-small" style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600', marginTop: '0.25rem' }}>Assets</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--accent-primary)' }}>{profile.viewCount || 0}</p>
              <p className="text-small" style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600', marginTop: '0.25rem' }}>Views</p>
            </div>
          </div>
        </div>
      </div>

      {/* Verified Proof Section */}
      <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginTop: '3rem', marginBottom: '1.5rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        🛡️ Verified Proofs
      </h2>
      
      <div style={{ display: 'grid', gap: '1.5rem' }}>
        {achievements.map((a) => (
          <div key={a.id} className="card" style={{ padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', transition: 'transform 0.2s ease, box-shadow 0.2s ease', border: '1px solid var(--border-primary)', background: 'var(--bg-secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--text-primary)' }}>{a.title}</h3>
                {a.issuedBy && (
                  <p className="text-small" style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    Issued by <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{a.issuedBy}</span>
                  </p>
                )}
              </div>
              <span style={{ padding: '0.35rem 0.75rem', background: 'rgba(5, 118, 66, 0.1)', color: 'var(--success)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '700', letterSpacing: '0.5px' }}>
                VERIFIED
              </span>
            </div>
            
            {a.description && (
              <p style={{ color: 'var(--text-secondary)', marginTop: '1rem', fontSize: '0.95rem', lineHeight: '1.6' }}>
                {a.description}
              </p>
            )}
            
            <div style={{ display: 'flex', gap: '2.5rem', marginTop: '1.5rem', borderTop: '1px solid var(--border-primary)', paddingTop: '1.25rem' }}>
              {a.dateAchieved && (
                <div>
                  <p className="text-small" style={{ color: 'var(--text-tertiary)', fontWeight: '500' }}>Date Achieved</p>
                  <p className="text-small" style={{ fontWeight: '600', color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                    {new Date(a.dateAchieved).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              )}
              {a.expiryDate && (
                <div>
                  <p className="text-small" style={{ color: 'var(--text-tertiary)', fontWeight: '500' }}>Expiry Date</p>
                  <p className="text-small" style={{ fontWeight: '600', color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                    {new Date(a.expiryDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              )}
            </div>

            {a.externalUrl && (
              <a 
                href={a.externalUrl} 
                target="_blank" 
                rel="noreferrer" 
                className="btn-outline mt-4" 
                style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none', fontWeight: '600', padding: '0.6rem 1.2rem' }}
              >
                View Associated Project
              </a>
            )}
          </div>
        ))}
        
        {achievements.length === 0 && (
          <div className="card" style={{ padding: '3rem', textAlign: 'center', borderRadius: '16px', background: 'var(--bg-secondary)' }}>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '1.1rem' }}>No verified credentials published currently.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicProfilePage;
