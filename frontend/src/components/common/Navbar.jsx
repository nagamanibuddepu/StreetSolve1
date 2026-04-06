import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { useNotifStore } from '../../store/notifStore';

const ROLE_COLORS = {
  citizen:    'bg-orange-100 text-orange-700',
  volunteer:  'bg-green-100 text-green-700',
  ngo:        'bg-purple-100 text-purple-700',
  government: 'bg-blue-100 text-blue-700',
  admin:      'bg-red-100 text-red-700',
};

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const unread = useNotifStore(s => s.unreadCount);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const navLinks = [
    { path:'/',        label:'Home' },
    { path:'/issues',  label:'Issues' },
    { path:'/map',     label:'Map' },
    { path:'/report',  label:'Report Issue', highlight: true },
  ];

  return (
    <>
      {/* Top government strip */}
      <div className="bg-[#154360] text-white/80 text-[10px] py-1 px-4 text-center tracking-wide hidden sm:block">
        🇮🇳 &nbsp;Government of India — Smart City Civic Grievance Redressal Platform &nbsp;·&nbsp; StreetSolve
      </div>

      {/* Main navbar */}
      <nav className="sticky top-0 z-50 bg-navy border-b border-white/10 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-4">

          {/* Brand */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shadow-md shadow-orange-500/30 group-hover:shadow-orange-500/50 transition-shadow">
              <span className="text-lg">🏛️</span>
            </div>
            <div className="hidden sm:block">
              <div className="text-white font-display font-bold text-base leading-none">StreetSolve</div>
              <div className="text-orange-300 text-[9px] font-semibold tracking-widest uppercase leading-none mt-0.5">Community Governance</div>
            </div>
            <div className="sm:hidden text-white font-display font-bold text-base">StreetSolve</div>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden lg:flex items-center gap-1 flex-1 ml-4">
            {navLinks.map(link => (
              <Link key={link.path} to={link.path}
                className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-all
                  ${link.highlight
                    ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-sm'
                    : pathname === link.path || (link.path !== '/' && pathname.startsWith(link.path))
                      ? 'bg-white/15 text-white'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}>
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {isAuthenticated ? (
              <>
                {/* Notification bell */}
                <Link to="/notifications" className="relative p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unread > 0 && (
                    <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center px-0.5 leading-none">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </Link>

                {/* User menu */}
                <button onClick={() => navigate('/profile')}
                  className="flex items-center gap-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl px-3 py-2 transition-colors">
                  <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-xs font-bold shrink-0">
                    {user?.avatar?.url
                      ? <img src={user.avatar.url} alt="" className="w-full h-full rounded-full object-cover"/>
                      : (user?.name?.[0]||'U').toUpperCase()
                    }
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="text-xs font-bold leading-none">{user?.name?.split(' ')[0]}</div>
                    <div className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold inline-block mt-0.5 ${ROLE_COLORS[user?.role]||'bg-slate-100 text-slate-600'}`}>
                      {user?.role}
                    </div>
                  </div>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="text-white/80 hover:text-white text-sm font-semibold px-3 py-2 rounded-lg hover:bg-white/10 transition-colors">
                  Sign In
                </Link>
                <Link to="/register" className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors shadow-sm">
                  Register Free
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
