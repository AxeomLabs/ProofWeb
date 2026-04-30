import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { ThumbsUp, Send, MessageCircle } from 'lucide-react';

const FeedPage: React.FC = () => {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<Record<string, any>>({});

  useEffect(() => {
    const usersUnsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const userMap: Record<string, any> = {};
      snapshot.docs.forEach(d => { userMap[d.id] = d.data(); });
      setUsers(userMap);
    });

    const postsQuery = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const postsUnsubscribe = onSnapshot(postsQuery, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => { usersUnsubscribe(); postsUnsubscribe(); };
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

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '620px', margin: '32px auto', display: 'grid', gap: '16px' }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="card" style={{ padding: '24px' }}>
            <div className="skeleton" style={{ width: '200px', height: '14px', marginBottom: '12px' }} />
            <div className="skeleton" style={{ width: '100%', height: '60px' }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '620px', margin: '0 auto', paddingTop: '8px' }}>

      {/* Compose Card */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <form onSubmit={handlePost}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div className="avatar avatar-md" style={{ background: 'var(--accent-primary)', color: 'white' }}>
              {profile?.firstName?.charAt(0)}
            </div>
            <div style={{ flex: 1 }}>
              <textarea
                value={newPost}
                onChange={e => setNewPost(e.target.value)}
                placeholder="Share a milestone, update, or thought..."
                style={{
                  width: '100%', resize: 'none', border: 'none', background: 'transparent',
                  padding: '8px 0', fontSize: '15px', minHeight: '60px',
                  margin: 0,
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-primary)', paddingTop: '12px' }}>
                <button type="submit" className="btn-blue" disabled={!newPost.trim()} style={{ padding: '6px 16px', fontSize: '13px' }}>
                  <Send size={14} />
                  Post
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Posts */}
      <div className="fade-in" style={{ display: 'grid', gap: '12px' }}>
        {posts.map(post => {
          const author = users[post.authorId] || { firstName: post.authorName, role: post.authorRole };
          const authorName = author.firstName ? `${author.firstName} ${author.lastName || ''}`.trim() : post.authorName;
          const authorRole = (author.role || post.authorRole || '').replace(/_/g, ' ');
          const liked = (post.likes || []).includes(user?.uid);
          const likeCount = (post.likes || []).length;

          return (
            <div key={post.id} className="card" style={{ padding: '20px 24px' }}>
              {/* Author */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '14px' }}>
                <Link to={`/u/${author.profileUrlSlug || post.authorId}`} style={{ textDecoration: 'none' }}>
                  <div className="avatar avatar-md" style={{ background: 'var(--accent-light)', color: 'var(--accent-primary)' }}>
                    {authorName.charAt(0)}
                  </div>
                </Link>
                <div style={{ flex: 1 }}>
                  <Link to={`/u/${author.profileUrlSlug || post.authorId}`} style={{ textDecoration: 'none', color: 'var(--text-primary)', fontWeight: 600, fontSize: '14px' }}>
                    {authorName}
                  </Link>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span className="badge badge-grey" style={{ fontSize: '11px', padding: '1px 6px', textTransform: 'capitalize' }}>{authorRole}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>· {timeAgo(post.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <p style={{ whiteSpace: 'pre-wrap', fontSize: '15px', lineHeight: '1.6', color: 'var(--text-primary)', marginBottom: '16px' }}>
                {post.content}
              </p>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '4px', borderTop: '1px solid var(--border-primary)', paddingTop: '8px' }}>
                <button
                  onClick={() => toggleLike(post.id, post.likes || [])}
                  className="btn-ghost"
                  style={{
                    color: liked ? 'var(--accent-primary)' : 'var(--text-tertiary)',
                    fontWeight: liked ? 600 : 500,
                    fontSize: '13px',
                  }}
                >
                  <ThumbsUp size={15} fill={liked ? 'currentColor' : 'none'} />
                  {likeCount > 0 ? `${likeCount} Like${likeCount > 1 ? 's' : ''}` : 'Like'}
                </button>
              </div>
            </div>
          );
        })}

        {posts.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <MessageCircle size={40} style={{ color: 'var(--border-secondary)', marginBottom: '12px' }} />
            <p style={{ fontWeight: 600, marginBottom: '4px' }}>No posts yet</p>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Be the first to share something with the community.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedPage;
