'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Flag, Users, Coins, LogOut, Shield, Menu, X, ChevronRight,
} from 'lucide-react';

const NAV = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/admin/reports', label: 'Reports', icon: Flag },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/economy', label: 'Economy', icon: Coins },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, token, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user || !token) { router.push('/admin/login'); return; }
    if (!user.is_admin) { setAuthorized(false); return; }
    setAuthorized(true);
  }, [user, token, loading, router]);

  // Skip auth check on login page
  if (pathname === '/admin/login') return <>{children}</>;

  if (loading || authorized === null) return (
    <div style={{ background: '#020617', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 40, height: 40, border: '3px solid #1E293B', borderTopColor: '#22C55E', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (authorized === false) return (
    <div style={{ background: '#020617', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, fontFamily: 'Fira Sans, sans-serif' }}>
      <Shield style={{ width: 56, height: 56, color: '#EF4444' }} />
      <h1 style={{ color: '#F8FAFC', fontSize: 24, fontWeight: 700, margin: 0 }}>Access Denied</h1>
      <p style={{ color: '#64748B', margin: 0 }}>You do not have admin privileges.</p>
      <button onClick={() => { logout(); router.push('/login'); }}
        style={{ marginTop: 8, padding: '10px 24px', background: '#EF4444', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600 }}>
        Log Out
      </button>
    </div>
  );

  const isActive = (link: typeof NAV[0]) =>
    link.exact ? pathname === link.href : pathname.startsWith(link.href);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Fira+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        .admin-root { font-family: 'Fira Sans', sans-serif; background: #020617; min-height: calc(100vh - 64px); display: flex; }
        .admin-sidebar { width: 240px; background: #0F172A; border-right: 1px solid #1E293B; display: flex; flex-direction: column; position: fixed; top: 64px; left: 0; height: calc(100vh - 64px); z-index: 40; transition: transform 0.25s ease; }
        .admin-sidebar.mobile-hidden { transform: translateX(-100%); }
        .admin-main { flex: 1; margin-left: 240px; min-height: calc(100vh - 64px); display: flex; flex-direction: column; }
        .admin-overlay { display: none; }
        @media(max-width:768px){
          .admin-sidebar { transform: translateX(-100%); }
          .admin-sidebar.mobile-open { transform: translateX(0); }
          .admin-main { margin-left: 0; }
          .admin-overlay { display: block; position: fixed; top: 64px; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); z-index: 35; backdrop-filter: blur(4px); }
        }
        .nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 16px; border-radius: 10px; text-decoration: none; transition: all 0.15s; color: #64748B; font-size: 14px; font-weight: 500; cursor: pointer; border: none; background: none; width: 100%; }
        .nav-item:hover { background: #1E293B; color: #F8FAFC; }
        .nav-item.active { background: #1E293B; color: #22C55E; }
        .admin-topbar { background: #0F172A; border-bottom: 1px solid #1E293B; padding: 0 24px; height: 52px; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
        .admin-content { flex: 1; padding: 24px; overflow-y: auto; }
      `}</style>

      <div className="admin-root">
        {/* Sidebar */}
        <aside className={`admin-sidebar ${sidebarOpen ? 'mobile-open' : ''}`}>
          {/* Logo */}
          <div style={{ padding: '20px 16px', borderBottom: '1px solid #1E293B' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #E8604C, #D4A853)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield style={{ width: 20, height: 20, color: 'white' }} />
              </div>
              <div>
                <p style={{ color: '#F8FAFC', fontWeight: 700, fontSize: 15, margin: 0 }}>SoulSync</p>
                <p style={{ color: '#22C55E', fontSize: 11, fontWeight: 600, margin: 0, letterSpacing: '0.05em' }}>ADMIN PANEL</p>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {NAV.map((link) => {
              const Icon = link.icon;
              const active = isActive(link);
              return (
                <Link key={link.href} href={link.href} onClick={() => setSidebarOpen(false)}
                  className={`nav-item ${active ? 'active' : ''}`}>
                  <Icon style={{ width: 17, height: 17, flexShrink: 0 }} />
                  {link.label}
                  {active && <ChevronRight style={{ width: 14, height: 14, marginLeft: 'auto', opacity: 0.5 }} />}
                </Link>
              );
            })}
          </nav>

          {/* Admin user info */}
          <div style={{ padding: '12px 8px', borderTop: '1px solid #1E293B' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#1E293B', borderRadius: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #E8604C, #D4A853)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: '#F8FAFC', fontSize: 13, fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</p>
                <p style={{ color: '#64748B', fontSize: 11, margin: 0 }}>Admin</p>
              </div>
              <button onClick={() => { logout(); router.push('/admin/login'); }} title="Logout"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: 4 }}>
                <LogOut style={{ width: 15, height: 15 }} />
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile overlay */}
        {sidebarOpen && <div className="admin-overlay" onClick={() => setSidebarOpen(false)} />}

        {/* Main content */}
        <div className="admin-main">
          {/* Top bar */}
          <header className="admin-topbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={() => setSidebarOpen(!sidebarOpen)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', display: 'flex', padding: 6 }}>
                {sidebarOpen ? <X style={{ width: 20, height: 20 }} /> : <Menu style={{ width: 20, height: 20 }} />}
              </button>
              <span style={{ color: '#64748B', fontSize: 13 }}>
                {NAV.find(n => isActive(n))?.label ?? 'Admin'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ padding: '4px 12px', background: '#1E293B', borderRadius: 20, fontSize: 12, color: '#22C55E', fontWeight: 600, border: '1px solid rgba(34,197,94,0.2)' }}>
                ● Live
              </div>
            </div>
          </header>

          <main className="admin-content">{children}</main>
        </div>
      </div>
    </>
  );
}
