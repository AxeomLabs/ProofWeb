import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const FeedPage: React.FC = () => {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim() || !user || !profile) return;
    try {
      await addDoc(collection(db, 'posts'), {
        authorId: user.uid,
        authorName: `${profile.firstName} ${profile.lastName || ''}`.trim(),
        authorRole: profile.role,
        content: newPost.trim(),
        createdAt: new Date().toISOString(),
        likes: []
      });
      setNewPost('');
    } catch (err) {
      console.error("Failed to post:", err);
    }
  };

  const toggleLike = async (postId: string, likes: string[]) => {
    if (!user) return;
    const postRef = doc(db, 'posts', postId);
    if (likes.includes(user.uid)) {
      await updateDoc(postRef, { likes: arrayRemove(user.uid) });
    } else {
      await updateDoc(postRef, { likes: arrayUnion(user.uid) });
    }
  };

  if (loading) return <div className="container mt-4">Loading feed...</div>;

  return (
    <div className="feed-container" style={{ display: 'grid', gridTemplateColumns: '225px 1fr 300px', gap: '1.5rem', alignItems: 'start' }}>
      
      {/* Left Column: Profile Summary */}
      <aside style={{ position: 'sticky', top: '5rem' }}>
        <div className="card" style={{ padding: '0', textAlign: 'center', overflow: 'hidden' }}>
          <div style={{ height: '60px', background: 'var(--accent-primary)' }}></div>
          <div style={{ marginTop: '-30px', display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', border: '2px solid white', background: '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold' }}>
              {profile?.firstName?.charAt(0)}
            </div>
          </div>
          <div style={{ padding: '1rem' }}>
            <p className="text-bold" style={{ fontSize: '1rem', margin: '0.5rem 0 0.25rem' }}>
              {profile?.firstName} {profile?.lastName}
            </p>
            <p className="text-small" style={{ textTransform: 'capitalize', color: 'var(--text-secondary)' }}>
              {profile?.role?.replace('_', ' ')}
            </p>
          </div>
          <div style={{ borderTop: '1px solid var(--border-primary)', padding: '0.75rem 1rem', textAlign: 'left' }}>
            <p className="text-small" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Total Posts</span>
              <span className="text-bold" style={{ color: 'var(--accent-primary)' }}>
                {posts.filter(p => p.authorId === user?.uid).length}
              </span>
            </p>
          </div>
        </div>
      </aside>

      {/* Center Column: Main Feed */}
      <main>
        <div className="card mb-4" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              {profile?.firstName?.charAt(0)}
            </div>
            <button 
              onClick={() => {
                const element = document.getElementById('post-textarea');
                if(element) element.focus();
              }}
              style={{ flex: 1, background: 'var(--bg-primary)', border: '1px solid var(--border-secondary)', borderRadius: '24px', padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              Start a post
            </button>
          </div>
          
          <form onSubmit={handlePost}>
            <textarea 
              id="post-textarea"
              value={newPost}
              onChange={e => setNewPost(e.target.value)}
              placeholder="What's on your mind? Share a milestone or verification update..."
              style={{ width: '100%', height: '80px', resize: 'none', marginBottom: '0.5rem', padding: '0.5rem' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn-blue" disabled={!newPost.trim()}>Post</button>
            </div>
          </form>
        </div>

        <div style={{ display: 'grid', gap: '1rem' }}>
          {posts.map(post => (
            <div key={post.id} className="card" style={{ padding: '1rem' }}>
              <div className="flex-between mb-2" style={{ alignItems: 'flex-start' }}>
                <Link to={`/u/${post.authorId}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--accent-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 'bold' }}>
                    {post.authorName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-bold" style={{ fontSize: '0.95rem', lineHeight: '1.2', textDecoration: 'underline' }}>{post.authorName}</p>
                    <p className="text-small" style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                      {post.authorRole.replace('_', ' ')}
                    </p>
                    <p className="text-small" style={{ color: 'var(--text-tertiary)' }}>
                      {new Date(post.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </Link>
              </div>
              
              <p style={{ whiteSpace: 'pre-wrap', fontSize: '0.95rem', margin: '1rem 0', color: 'var(--text-primary)' }}>
                {post.content}
              </p>
              
              <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border-primary)', paddingTop: '0.5rem' }}>
                <button 
                  onClick={() => toggleLike(post.id, post.likes || [])}
                  style={{ 
                    background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem 1rem', borderRadius: '4px',
                    color: (post.likes || []).includes(user?.uid) ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: '600'
                  }}
                >
                  {(post.likes || []).includes(user?.uid) ? '👍 Liked' : '👍 Like'} 
                  <span className="badge badge-grey" style={{ marginLeft: '4px' }}>{(post.likes || []).length}</span>
                </button>
              </div>
            </div>
          ))}
          {posts.length === 0 && <p className="text-center text-small mt-4">No updates yet. Start the conversation!</p>}
        </div>
      </main>

      {/* Right Column: News / Suggestions */}
      <aside style={{ position: 'sticky', top: '5rem' }}>
        <div className="card" style={{ padding: '1rem' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Proof Community</span>
          </h3>
          <ul style={{ listStyle: 'none', display: 'grid', gap: '0.75rem' }}>
            <li style={{ paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-primary)' }}>
              <p className="text-bold" style={{ fontSize: '0.875rem' }}>🔒 Database Lockdown Complete</p>
              <p className="text-small">Full security integration is now live across the Proof platform.</p>
            </li>
            <li style={{ paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-primary)' }}>
              <p className="text-bold" style={{ fontSize: '0.875rem' }}>✨ Peer Verifications Rising</p>
              <p className="text-small">Institutions are approving items 40% faster this month.</p>
            </li>
            <li>
              <p className="text-bold" style={{ fontSize: '0.875rem' }}>🚀 Welcome to Proof Web</p>
              <p className="text-small">Share your academic achievements directly with the community.</p>
            </li>
          </ul>
        </div>
      </aside>

    </div>
  );
};

export default FeedPage;
