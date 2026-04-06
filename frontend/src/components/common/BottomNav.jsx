import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export default function BottomNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const items = [
    { path:'/', icon:'🏠', label:'Home' },
    { path:'/issues', icon:'📋', label:'Issues' },
    { path:'/report', icon:'➕', label:'Report', primary:true },
    { path:'/map', icon:'🗺️', label:'Map' },
    { path: isAuthenticated ? '/dashboard' : '/login', icon:'👤', label:'Profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-blue-900 border-t border-blue-800">
      <div className="max-w-3xl mx-auto flex">
        {items.map((item) => {
          const active = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
          return (
            <button key={item.path} onClick={() => navigate(item.path)}
              className={`flex-1 flex flex-col items-center pt-2 pb-3 gap-0.5 transition-all relative ${active ? 'text-orange-400' : 'text-blue-300 hover:text-blue-100'}`}>
              {item.primary ? (
                <>
                  <div className="absolute -top-5 w-11 h-11 bg-orange-500 hover:bg-orange-600 rounded-xl flex items-center justify-center text-xl shadow-lg shadow-orange-500/30 border-4 border-slate-50 transition-colors">{item.icon}</div>
                  <span className="text-[9px] font-semibold mt-5">{item.label}</span>
                </>
              ) : (
                <>
                  <span className="text-lg leading-none">{item.icon}</span>
                  <span className="text-[9px] font-semibold">{item.label}</span>
                  {active && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-orange-400 rounded-t-full" />}
                </>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
