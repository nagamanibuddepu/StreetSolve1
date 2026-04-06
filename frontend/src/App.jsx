import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useSocket } from './hooks/useSocket';
import Navbar from './components/common/Navbar';
import BottomNav from './components/common/BottomNav';
import LoadingScreen from './components/common/LoadingScreen';
import { authAPI } from './services/api';

const HomePage      = lazy(() => import('./pages/HomePage'));
const IssuesPage    = lazy(() => import('./pages/IssuesPage'));
const IssueDetail   = lazy(() => import('./pages/IssueDetailPage'));
const ReportPage    = lazy(() => import('./pages/ReportPage'));
const MapPage       = lazy(() => import('./pages/MapPage'));
const LoginPage     = lazy(() => import('./pages/LoginPage'));
const RegisterPage  = lazy(() => import('./pages/RegisterPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const NotifPage     = lazy(() => import('./pages/NotificationsPage'));
const ProfilePage   = lazy(() => import('./pages/ProfilePage'));

const ProtectedRoute = ({ children, roles }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user?.role)) return <Navigate to="/" replace />;
  return children;
};

export default function App() {
  const { isAuthenticated, setAuth, logout } = useAuthStore();
  useSocket();

  useEffect(() => {
    const token = localStorage.getItem('ss_token');
    if (token && !isAuthenticated) {
      authAPI.getMe()
        .then(res => { setAuth(res.data.data, token); })
        .catch(() => logout());
    }
  }, []);

  return (
    <div className="min-h-screen bg-cream">
      <Navbar />
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/issues" element={<IssuesPage />} />
          <Route path="/issues/:id" element={<IssueDetail />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <LoginPage />} />
          <Route path="/register" element={isAuthenticated ? <Navigate to="/" /> : <RegisterPage />} />
          <Route path="/report" element={<ProtectedRoute><ReportPage /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><NotifPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <BottomNav />
    </div>
  );
}
