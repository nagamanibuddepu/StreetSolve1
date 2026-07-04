import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
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

// Map page gets full-height layout, others get scrollable
const MAP_ROUTES = ['/map'];

export default function App() {
  const { isAuthenticated, setAuth, logout, user } = useAuthStore();
  const { pathname } = useLocation();
  useSocket();
  const isMapPage = MAP_ROUTES.some(r => pathname.startsWith(r));

  useEffect(() => {
    const token = localStorage.getItem('ss_token');
    if (token && !isAuthenticated) {
      authAPI.getMe().then(res => setAuth(res.data.data, token)).catch(() => logout());
    }
  }, []);

  // Hide report button for government users
  const isGovt = user?.role === 'government';

  return (
    <div className={`bg-slate-50 ${isMapPage ? 'h-screen overflow-hidden' : 'min-h-screen overflow-y-auto'}`}>
      {!isMapPage && <Navbar />}
      <Suspense fallback={<LoadingScreen />}>
        <div className={isMapPage ? 'h-screen' : 'pb-20'}>
          <Routes>
            <Route path="/"              element={<HomePage />} />
            <Route path="/issues"        element={<IssuesPage />} />
            <Route path="/issues/:id"    element={<IssueDetail />} />
            <Route path="/map"           element={<MapPage />} />
            <Route path="/login"         element={isAuthenticated ? <Navigate to="/" /> : <LoginPage />} />
            <Route path="/register"      element={isAuthenticated ? <Navigate to="/" /> : <RegisterPage />} />
            <Route path="/report"        element={<ProtectedRoute>{isGovt ? <Navigate to="/dashboard" /> : <ReportPage />}</ProtectedRoute>} />
            <Route path="/dashboard"     element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><NotifPage /></ProtectedRoute>} />
            <Route path="/profile"       element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="*"              element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Suspense>
      <BottomNav hideReport={isGovt} />
    </div>
  );
}
