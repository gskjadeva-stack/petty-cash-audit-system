import { Link, useLocation, Outlet } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { db } from '@/api/client';

import { cn } from '@/lib/utils';
import {
  LayoutDashboard, FileSearch, TrendingUp,
  BarChart3, Settings, Bell, LogOut, ChevronRight, Calculator
} from 'lucide-react';

const NAV = [
  { label: 'Dashboard', path: '/', exact: true, icon: LayoutDashboard },
  { label: 'PCA Records', path: '/records', exact: false, icon: FileSearch },
  { label: 'Trend Analysis', path: '/trends', exact: false, icon: TrendingUp },
  { label: 'Reports', path: '/reports', exact: false, icon: BarChart3 },
  { label: 'PCF Tally', path: '/pcf-tally', exact: false, icon: Calculator },
];
const ADMIN_NAV = [
  { label: 'Settings', path: '/settings', exact: false, icon: Settings },
];

export default function Layout() {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [unread, setUnread] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    db.auth.me().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    db.entities.Notification.filter({ is_read: false }, '-created_date', 20)
      .then(n => { setUnread(n.length); setNotifications(n); });
  }, [location.pathname]);

  const isActive = (item) => {
    if (item.exact) return location.pathname === item.path;
    if (item.path === '/records') {
      return location.pathname === '/records' || (location.pathname.startsWith('/records/') && location.pathname !== '/records/new');
    }
    return location.pathname.startsWith(item.path);
  };

  const markRead = async (id) => {
    await db.entities.Notification.update(id, { is_read: true });
    setNotifications(prev => prev.filter(n => n.id !== id));
    setUnread(prev => Math.max(0, prev - 1));
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 flex flex-col shadow-xl" style={{ backgroundColor: '#1E3A5F' }}>
        <div className="px-5 py-5 border-b border-white/10">
          <p className="text-white/70 text-xs font-semibold leading-tight tracking-wide">Petty Cash Audit System</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(item => {
            const active = isActive(item);
            return (
              <Link key={item.path} to={item.path}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150',
                  active
                    ? 'bg-white text-[#1E3A5F] font-semibold shadow-sm'
                    : 'text-white/65 hover:text-white hover:bg-white/10'
                )}>
                <item.icon size={15} />
                {item.label}
                {active && <ChevronRight size={12} className="ml-auto opacity-40" />}
              </Link>
            );
          })}

          {user?.role === 'admin' && (
            <>
              <div className="pt-4 pb-1.5 px-3">
                <p className="text-white/25 text-[10px] uppercase tracking-widest font-semibold">Administration</p>
              </div>
              {ADMIN_NAV.map(item => {
                const active = isActive(item);
                return (
                  <Link key={item.path} to={item.path}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150',
                      active
                        ? 'bg-white text-[#1E3A5F] font-semibold shadow-sm'
                        : 'text-white/65 hover:text-white hover:bg-white/10'
                    )}>
                    <item.icon size={15} />
                    {item.label}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user?.full_name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">{user?.full_name || 'User'}</p>
              <p className="text-white/45 text-[10px] capitalize">{user?.role || 'auditor'}</p>
            </div>
            <button onClick={() => db.auth.logout()} className="text-white/40 hover:text-white transition-colors" title="Logout">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-13 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0" style={{ height: '52px' }}>
          <div className="flex items-center gap-4">
            <img src="/gsdc4.png" alt="GSDC" className="h-8 object-contain" />
            <p className="text-xs text-slate-400 font-medium">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-3">

            <div className="relative">
              <button onClick={() => setNotifOpen(!notifOpen)} className="relative text-slate-400 hover:text-slate-600 transition-colors p-1">
                <Bell size={17} />
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-9 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-800">Notifications</p>
                    <button onClick={() => setNotifOpen(false)} className="text-slate-400 hover:text-slate-600 text-xs">✕</button>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                    {notifications.length === 0 && <p className="text-sm text-slate-400 text-center py-6">All caught up!</p>}
                    {notifications.map(n => (
                      <div key={n.id} className="p-3 hover:bg-slate-50 cursor-pointer" onClick={() => markRead(n.id)}>
                        <div className="flex items-start gap-2">
                          <span className={cn(
                            'mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0',
                            n.type === 'Critical' ? 'bg-red-500' : n.type === 'Warning' ? 'bg-amber-500' : 'bg-blue-500'
                          )} />
                          <div>
                            <p className="text-xs font-semibold text-slate-800">{n.title}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}