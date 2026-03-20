import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProfileSetup from './pages/ProfileSetup';
import TopicExplore from './pages/TopicExplore';
import LearningView from './pages/LearningView';

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
          path="/explore"
          element={
            <RequireUser>
              <TopicExplore />
            </RequireUser>
          }
        />
        <Route
          path="/learn/:sessionId"
          element={
            <RequireUser>
              <LearningView />
            </RequireUser>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
