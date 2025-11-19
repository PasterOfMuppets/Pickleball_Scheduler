import { useState } from 'react';
import { AuthFlow } from './components/AuthFlow';
import { PlayerDashboard } from './components/PlayerDashboard';
import { AvailabilityEditor } from './components/AvailabilityEditor';
import { FindOpponents } from './components/FindOpponents';
import { MatchHistory } from './components/MatchHistory';
import { NotificationSettings } from './components/NotificationSettings';
import { VacationMode } from './components/VacationMode';
import { AdminDashboard } from './components/AdminDashboard';
import { MobileNav } from './components/MobileNav';
import { DesktopSidebar } from './components/DesktopSidebar';
import { usePickleballStore } from './store/usePickleballStore';

export default function App() {
  const { currentUser, isAdmin, impersonatedUser } = usePickleballStore();
  const [currentScreen, setCurrentScreen] = useState<string>('dashboard');

  if (!currentUser) {
    return <AuthFlow />;
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case 'dashboard':
        return <PlayerDashboard onNavigate={setCurrentScreen} />;
      case 'availability':
        return <AvailabilityEditor />;
      case 'find-opponents':
        return <FindOpponents />;
      case 'matches':
        return <MatchHistory />;
      case 'settings':
        return <NotificationSettings />;
      case 'vacation':
        return <VacationMode />;
      case 'admin':
        return isAdmin ? <AdminDashboard /> : <PlayerDashboard onNavigate={setCurrentScreen} />;
      default:
        return <PlayerDashboard onNavigate={setCurrentScreen} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Admin Impersonation Banner */}
      {impersonatedUser && (
        <div className="bg-amber-500 text-white px-4 py-3 flex items-center justify-between">
          <span>
            You are impersonating: <strong>{impersonatedUser.name}</strong>
          </span>
          <button
            onClick={() => usePickleballStore.getState().stopImpersonation()}
            className="px-3 py-1 bg-white text-amber-700 rounded hover:bg-amber-50"
          >
            Stop Impersonating
          </button>
        </div>
      )}

      {/* Desktop Layout */}
      <div className="hidden lg:flex">
        <DesktopSidebar currentScreen={currentScreen} onNavigate={setCurrentScreen} />
        <main className="flex-1 ml-64">
          <div className="max-w-7xl mx-auto p-6">
            {renderScreen()}
          </div>
        </main>
      </div>

      {/* Mobile/Tablet Layout */}
      <div className="lg:hidden">
        <main className="pb-20">
          {renderScreen()}
        </main>
        <MobileNav currentScreen={currentScreen} onNavigate={setCurrentScreen} />
      </div>
    </div>
  );
}
