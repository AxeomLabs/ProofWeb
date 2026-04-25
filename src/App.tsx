import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import PublicProfilePage from './pages/PublicProfilePage';
import TeacherDashboardPage from './pages/TeacherDashboardPage';
import InstitutionDashboardPage from './pages/InstitutionDashboardPage';
import FeedPage from './pages/FeedPage';

const ImpersonationBanner: React.FC = () => {
  const { impersonating, stopImpersonating, profile } = useAuth();
  if (!impersonating) return null;

  return (
    <div style={{ 
      background: '#dc2626', 
      color: 'white', 
      padding: '0.5rem', 
      textAlign: 'center', 
      fontSize: '0.875rem',
      fontWeight: 600,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '1rem',
      position: 'sticky',
      top: 0,
      zIndex: 1000
    }}>
      Viewing as: {profile?.firstName} {profile?.lastName} ({profile?.role})
      <button 
        onClick={stopImpersonating}
        style={{ 
          background: 'white', 
          color: '#dc2626', 
          padding: '2px 8px', 
          borderRadius: '4px',
          fontSize: '0.75rem'
        }}
      >
        Exit Impersonation
      </button>
    </div>
  );
};

const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean; teacherOnly?: boolean; institutionOnly?: boolean; studentOnly?: boolean }> = ({ children, adminOnly, teacherOnly, institutionOnly, studentOnly }) => {
  const { user, profile, loading } = useAuth();
  if (loading) return <div className="container mt-4">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  
  if (adminOnly && profile?.role !== 'platform_admin') return <Navigate to="/" />;
  if (teacherOnly && profile?.role !== 'teacher') return <Navigate to="/" />;
  if (institutionOnly && profile?.role !== 'institution_admin') return <Navigate to="/" />;
  if (studentOnly && profile?.role !== 'student') return <Navigate to="/" />;
  
  return <>{children}</>;
};

const IndexRoute: React.FC = () => {
  const { user, profile, loading } = useAuth();
  
  if (loading) return <div className="container mt-4">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  
  switch(profile?.role) {
    case 'platform_admin':
      return <Navigate to="/admin" />;
    case 'teacher':
      return <Navigate to="/teacher" />;
    case 'institution_admin':
      return <Navigate to="/institution" />;
    case 'student':
    default:
      return <Navigate to="/profile" />;
  }
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <ImpersonationBanner />
        <Navbar />
        <main className="container mt-4">
          <Routes>
            <Route path="/" element={<IndexRoute />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<LoginPage isSignup />} />
            <Route path="/u/:slug" element={<PublicProfilePage />} />
            <Route path="/dashboard" element={
              <ProtectedRoute studentOnly>
                <ProfilePage />
              </ProtectedRoute>
            } />
            <Route path="/teacher" element={
              <ProtectedRoute teacherOnly>
                <TeacherDashboardPage />
              </ProtectedRoute>
            } />
            <Route path="/institution" element={
              <ProtectedRoute institutionOnly>
                <InstitutionDashboardPage />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } />
            <Route path="/feed" element={
              <ProtectedRoute>
                <FeedPage />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute adminOnly>
                <AdminDashboardPage />
              </ProtectedRoute>
            } />
          </Routes>
        </main>
      </Router>
    </AuthProvider>
  );
};

export default App;
