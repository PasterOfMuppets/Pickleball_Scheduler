import { Home, Calendar, Users, List, Settings, Shield } from 'lucide-react';
import { usePickleballStore } from '../store/usePickleballStore';

interface MobileNavProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
}

export function MobileNav({ currentScreen, onNavigate }: MobileNavProps) {
  const { isAdmin } = usePickleballStore();

  const navItems = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'availability', label: 'Schedule', icon: Calendar },
    { id: 'find-opponents', label: 'Opponents', icon: Users },
    { id: 'matches', label: 'Matches', icon: List },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  if (isAdmin) {
    navItems.push({ id: 'admin', label: 'Admin', icon: Shield });
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-2 z-40">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentScreen === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`
                flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[60px]
                ${isActive
                  ? 'text-emerald-600 bg-emerald-50'
                  : 'text-slate-600 hover:bg-slate-50'
                }
              `}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
