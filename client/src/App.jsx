import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './components/auth/LoginPage';
import ChatPage from './components/chat/ChatPage';
import HRMSDashboard from './components/hrms/HRMSDashboard';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--grey-1)' }}>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return children;
}

function HROnlyRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (user.role !== 'hr_head') return <Navigate to="/chat" />;
  return children;
}

export default function App() {
  return (
    <>
      <Toaster position="top-right" toastOptions={{ style: { fontFamily: 'Inter, sans-serif', fontSize: '14px' } }} />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
        <Route path="/hrms/*" element={<HROnlyRoute><HRMSDashboard /></HROnlyRoute>} />
        <Route path="*" element={<Navigate to="/chat" />} />
      </Routes>
    </>
  );
}
