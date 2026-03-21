import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import ProfileSetup from './pages/ProfileSetup';
import TopicExplore from './pages/TopicExplore';
import LearningView from './pages/LearningView';
import Sidebar from './components/Sidebar';
import { api } from './api/client';

function getUserId(): number | null {
  const stored = localStorage.getItem('lotus_user_id');
  if (!stored) return null;
  const parsed = parseInt(stored, 10);
  return isNaN(parsed) ? null : parsed;
}

function RequireUser({ children }: { children: React.ReactNode }) {
  const userId = getUserId();
  if (!userId) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppLayout() {
  const userId = getUserId();
  const [sessionCount, setSessionCount] = useState(0);

  useEffect(() => {
    if (userId) {
      api.listSessions(userId).then((s) => setSessionCount(s.length)).catch(() => {});
    }
  }, [userId]);

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg)' }}>
      <Sidebar sessionCount={sessionCount} />
      <div className="flex-1 min-w-0">
        <Outlet />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            getUserId() ? <Navigate to="/explore" replace /> : <ProfileSetup />
          }
        />
        <Route
          element={
            <RequireUser>
              <AppLayout />
            </RequireUser>
          }
        >
          <Route path="/explore" element={<TopicExplore />} />
          <Route path="/learn/:sessionId" element={<LearningView />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
