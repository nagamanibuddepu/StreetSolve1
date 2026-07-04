import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export default function BottomNav({ hideReport = false }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();

  const items = [
    { path:'/',        icon:'🏠', label:'Home' },
    { path:'/issues',  icon:'📋', label:'Issues' },
    ...(!hideReport ? [{ path:'/report', icon:'➕', label:'Report', primary:true }] : []),
    { path:'/map',     icon:'🗺️', label:'Map' },
    { path: isAuthenticated ? '/dashboard' : '/login', icon:'👤', label: isAuthenticated ? 'Dashboard' : 'Login' },
  ];

  // Hide on map page (map has its own header)
  if (pathname === '/map') return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-navy border-t border-white/10 safe-area-pb">
      <div className="max-w-3xl mx-auto flex">
        {items.map((item) => {
          const active = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
          if (item.primary) return (
            <button key={item.path} onClick={() => navigate(item.path)}
              className="flex-1 flex flex-col items-center pt-1.5 pb-3 relative">
              <div className="absolute -top-5 w-12 h-12 bg-orange-500 hover:bg-orange-600 rounded-xl flex items-center justify-center text-2xl shadow-lg border-4 border-slate-50 transition-colors">{item.icon}</div>
              <span className="text-[10px] font-semibold text-blue-300 mt-7">{item.label}</span>
            </button>
          );
          return (
            <button key={item.path} onClick={() => navigate(item.path)}
              className={`flex-1 flex flex-col items-center py-2 gap-0.5 transition-all relative ${active?'text-orange-400':'text-blue-300 hover:text-blue-100'}`}>
              <span className="text-lg leading-none">{item.icon}</span>
              <span className="text-[10px] font-semibold">{item.label}</span>
              {active && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-orange-400 rounded-t-full"/>}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
