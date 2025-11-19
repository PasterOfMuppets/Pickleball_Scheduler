import { Home, Calendar, Users, List, Settings, Shield, Plane, LogOut } from 'lucide-react';
import { Button } from './ui/button';
import { usePickleballStore } from '../store/usePickleballStore';

interface DesktopSidebarProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
}

export function DesktopSidebar({ currentScreen, onNavigate }: DesktopSidebarProps) {
  const { currentUser, isAdmin, logout } = usePickleballStore();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'availability', label: 'Availability', icon: Calendar },
    { id: 'find-opponents', label: 'Find Opponents', icon: Users },
    { id: 'matches', label: 'Match History', icon: List },
  ];

  const bottomNavItems = [
    { id: 'vacation', label: 'Vacation Mode', icon: Plane },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  if (isAdmin) {
    bottomNavItems.unshift({ id: 'admin', label: 'Admin Dashboard', icon: Shield });
  }

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-slate-200 flex flex-col">
      {/* Logo/Header */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
            <svg
              className="w-5 h-5 text-emerald-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="10" strokeWidth="2" />
              <path strokeWidth="2" d="M8 12h8M12 8v8" />
            </svg>
          </div>
          <div>
            <h2>Pickleball</h2>
            <p className="text-sm text-slate-500">League Scheduler</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      {currentUser && (
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
              <span className="text-emerald-700">
                {currentUser.name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="truncate">{currentUser.name}</div>
              <div className="text-sm text-slate-500 truncate">{currentUser.email}</div>
            </div>
          </div>
        </div>
      )}

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentScreen === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                ${isActive
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-slate-600 hover:bg-slate-50'
                }
              `}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Navigation */}
      <div className="p-4 border-t border-slate-200 space-y-1">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentScreen === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                ${isActive
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-slate-600 hover:bg-slate-50'
                }
              `}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          );
        })}

        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-slate-600 hover:bg-slate-50"
          onClick={logout}
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </Button>
      </div>
    </aside>
  );
}
