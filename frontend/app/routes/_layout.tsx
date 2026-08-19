// src/routes/_layout.tsx
import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router';
import {
  FileText, LayoutDashboard, FilePlus,
  Archive, CheckSquare, RefreshCw,
  Settings, LogOut, ChevronDown,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { usePendingCount } from '../hooks/usePendingCount';
import { useRevisionCount } from '../hooks/useRevisionCount';

const SUBMENU_ITEMS = [
  { to: '/letters/create/mou', label: 'MoU' },
];

// Route yang HANYA boleh diakses oleh direktur
const DIREKTUR_ONLY_PATHS = [
  '/settings/signature',
  '/approval',
];

function UserAvatar({ nama }: { nama: string }) {
  const initials = nama
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div className="w-7 h-7 rounded-full bg-emerald-50 flex items-center justify-center text-xs font-medium text-emerald-700 shrink-0">
      {initials}
    </div>
  );
}

export default function RootLayout() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, loading } = useAuth();
  const pendingCount = usePendingCount();
  const revisionCount = useRevisionCount();

  const isCreateActive = location.pathname.startsWith('/letters/create');
  const [createOpen, setCreateOpen] = useState(isCreateActive);

  // ── Authentication and role guard ───────────────────────────────────────
  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    const isDirektorOnlyPath = DIREKTUR_ONLY_PATHS.some((p) =>
      location.pathname.startsWith(p)
    );

    if (isDirektorOnlyPath && user.role !== 'direktur') {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, location.pathname, navigate]);
  // ───────────────────────────────────────────────────────────────────────

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50">

      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0">

        {/* Logo */}
        <div className="px-4 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-emerald-50 rounded-lg flex items-center justify-center">
              <FileText size={14} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">PT. JUOS</p>
              <p className="text-[11px] text-gray-400">Penyuratan Digital Internal</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">

          {/* Dashboard */}
          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-emerald-50 text-emerald-700 font-medium'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`
            }
          >
            <LayoutDashboard size={15} className="shrink-0" />
            <span>Dashboard</span>
          </NavLink>

          {/* Buat Surat + Submenu */}
          <div>
            <button
              onClick={() => setCreateOpen((prev) => !prev)}
              className={`flex items-center gap-2.5 px-3 py-2 w-full rounded-lg text-sm transition-colors ${
                isCreateActive
                  ? 'bg-emerald-50 text-emerald-700 font-medium'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`}
            >
              <FilePlus size={15} className="shrink-0" />
              <span className="flex-1 text-left">Buat surat</span>
              <ChevronDown
                size={13}
                className={`transition-transform duration-200 ${createOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {createOpen && (
              <div className="ml-6 mt-0.5 space-y-0.5 border-l border-gray-100 pl-3">
                {SUBMENU_ITEMS.map(({ to, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      `flex items-center py-1.5 text-sm transition-colors ${
                        isActive
                          ? 'text-emerald-700 font-medium'
                          : 'text-gray-400 hover:text-gray-700'
                      }`
                    }
                  >
                    {label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>

          {/* Arsip Surat */}
          <NavLink
            to="/letters"
            end
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-emerald-50 text-emerald-700 font-medium'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`
            }
          >
            <Archive size={15} className="shrink-0" />
            <span>Arsip surat</span>
            {revisionCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-amber-600 text-white text-[10px] font-medium px-2 py-0.5">
                {revisionCount}
              </span>
            )}
          </NavLink>

          {user?.role === 'direktur' && (
            <NavLink
              to="/approval"
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 font-medium'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`
              }
            >
              <CheckSquare size={15} className="shrink-0" />
              <span className="flex-1">Approval</span>
              {pendingCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full leading-none">
                  {pendingCount}
                </span>
              )}
            </NavLink>
          )}

          {/* Pengaturan — hanya tampil untuk direktur */}
          {user?.role === 'direktur' && (
            <NavLink
              to="/settings/signature"
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 font-medium'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`
              }
            >
              <Settings size={15} className="shrink-0" />
              <span>Pengaturan</span>
            </NavLink>
          )}

        </nav>

        {/* User + Logout */}
        <div className="px-2 py-3 border-t border-gray-100 space-y-0.5">
          {user && (
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg">
              <UserAvatar nama={user.nama} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">{user.nama}</p>
                <p className="text-[11px] text-gray-400 capitalize">{user.role}</p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 px-3 py-2 w-full rounded-lg text-sm text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut size={15} />
            Keluar
          </button>
        </div>

      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>

    </div>
  );
}