import React, { useState, useRef, useEffect } from 'react';
import { Bell, CheckCheck, CheckCircle, XCircle, AlertCircle, Clock, Building } from 'lucide-react';
import { useNotifications, Notification } from '../hooks/useNotifications';

const iconMap: Record<string, React.ReactNode> = {
  verification_requested: <Clock size={16} style={{ color: 'var(--warning)' }} />,
  verification_approved: <CheckCircle size={16} style={{ color: 'var(--success)' }} />,
  verification_rejected: <XCircle size={16} style={{ color: 'var(--error)' }} />,
  verification_revoked: <AlertCircle size={16} style={{ color: 'var(--error)' }} />,
  institution_approved: <Building size={16} style={{ color: 'var(--success)' }} />,
  institution_rejected: <Building size={16} style={{ color: 'var(--error)' }} />,
};

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const NotificationBell: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Bell Button */}
      <button
        id="notification-bell"
        onClick={() => setOpen(o => !o)}
        className="btn-ghost"
        style={{ position: 'relative', padding: '6px 8px' }}
        aria-label="Notifications"
      >
        <Bell size={18} style={{ color: unreadCount > 0 ? 'var(--accent-primary)' : 'var(--text-secondary)' }} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: '2px', right: '2px',
            width: '17px', height: '17px', background: 'var(--accent-primary)',
            color: 'white', borderRadius: '50%',
            fontSize: '10px', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            lineHeight: 1,
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="fade-in"
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0,
            width: '360px', background: 'var(--bg-secondary)',
            border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)', zIndex: 200, overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '14px 16px', borderBottom: '1px solid var(--border-primary)',
          }}>
            <p style={{ fontWeight: 600, fontSize: '14px' }}>
              Notifications {unreadCount > 0 && (
                <span className="badge badge-blue" style={{ marginLeft: '6px', fontSize: '11px' }}>{unreadCount} new</span>
              )}
            </p>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="btn-ghost"
                style={{ fontSize: '12px', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                <Bell size={32} style={{ color: 'var(--border-secondary)', marginBottom: '8px' }} />
                <p style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>All caught up!</p>
              </div>
            ) : (
              notifications.slice(0, 30).map((n: Notification) => (
                <div
                  key={n.id}
                  onClick={() => { if (!n.read) markAsRead(n.id); }}
                  style={{
                    display: 'flex', gap: '12px', padding: '12px 16px',
                    background: n.read ? 'transparent' : 'var(--accent-light)',
                    borderBottom: '1px solid var(--border-primary)',
                    cursor: n.read ? 'default' : 'pointer',
                    transition: 'background 0.15s',
                  }}
                >
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: 'var(--bg-tertiary)', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {iconMap[n.type] || <Bell size={15} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, marginBottom: '2px', lineHeight: '1.3' }}>{n.title}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{n.message}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>{timeAgo(n.createdAt)}</p>
                  </div>
                  {!n.read && (
                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--accent-primary)', flexShrink: 0, marginTop: '6px' }} />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
