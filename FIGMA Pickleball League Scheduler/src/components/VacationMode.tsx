import { Plane, Calendar, Info } from 'lucide-react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Alert, AlertDescription } from './ui/alert';
import { usePickleballStore } from '../store/usePickleballStore';

export function VacationMode() {
  const { currentUser, impersonatedUser, updateUser } = usePickleballStore();
  const activeUser = impersonatedUser || currentUser;

  if (!activeUser) return null;

  const isOnVacation = activeUser.status === 'vacation';

  const handleToggleVacation = () => {
    if (isOnVacation) {
      updateUser(activeUser.id, {
        status: 'active',
        vacationUntil: undefined,
      });
    } else {
      updateUser(activeUser.id, {
        status: 'vacation',
        vacationUntil: '2025-11-30',
      });
    }
  };

  const handleReturnDateChange = (date: string) => {
    updateUser(activeUser.id, {
      vacationUntil: date,
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl">
      <div>
        <h1>Vacation Mode</h1>
        <p className="text-slate-500 mt-1">
          Temporarily hide yourself from opponent search
        </p>
      </div>

      {/* Status Card */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center ${
                isOnVacation ? 'bg-blue-100' : 'bg-slate-100'
              }`}
            >
              <Plane
                className={`w-6 h-6 ${isOnVacation ? 'text-blue-600' : 'text-slate-400'}`}
              />
            </div>
            <div>
              <Label htmlFor="vacation-toggle">Vacation Mode</Label>
              <p className="text-sm text-slate-500">
                {isOnVacation ? 'Currently on vacation' : 'Currently active'}
              </p>
            </div>
          </div>
          <Switch
            id="vacation-toggle"
            checked={isOnVacation}
            onCheckedChange={handleToggleVacation}
          />
        </div>

        {isOnVacation && (
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <div className="space-y-2">
              <Label htmlFor="return-date" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Expected Return Date
              </Label>
              <input
                id="return-date"
                type="date"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg"
                value={activeUser.vacationUntil || ''}
                onChange={(e) => handleReturnDateChange(e.target.value)}
              />
            </div>

            <Alert className="border-blue-200 bg-blue-50">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900">
                You're hidden from opponent search until{' '}
                {activeUser.vacationUntil
                  ? new Date(activeUser.vacationUntil).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'you return'}
                . Your confirmed matches remain visible.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </div>

      {/* How It Works */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 space-y-4">
        <h2>How Vacation Mode Works</h2>

        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center flex-shrink-0 text-sm">
              1
            </div>
            <div>
              <div>Hidden from Search</div>
              <p className="text-sm text-slate-500 mt-1">
                Other players won't see you when searching for opponents
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center flex-shrink-0 text-sm">
              2
            </div>
            <div>
              <div>Existing Matches Remain</div>
              <p className="text-sm text-slate-500 mt-1">
                Your confirmed matches stay visible and you can still manage them
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center flex-shrink-0 text-sm">
              3
            </div>
            <div>
              <div>No New Challenges</div>
              <p className="text-sm text-slate-500 mt-1">
                You won't receive new match challenges while on vacation
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center flex-shrink-0 text-sm">
              4
            </div>
            <div>
              <div>Availability Preserved</div>
              <p className="text-sm text-slate-500 mt-1">
                Your availability settings and recurring patterns are saved
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      {!isOnVacation && (
        <div className="bg-gradient-to-br from-blue-50 to-emerald-50 rounded-xl p-6 border border-blue-200">
          <div className="flex items-start gap-3">
            <Plane className="w-5 h-5 text-blue-600 mt-1" />
            <div>
              <h3 className="text-blue-900">Planning a Trip?</h3>
              <p className="text-sm text-blue-800 mt-1 mb-4">
                Enable vacation mode to let other players know you're away. You can set an
                expected return date and we'll automatically reactivate your account.
              </p>
              <Button onClick={handleToggleVacation} className="gap-2">
                <Plane className="w-4 h-4" />
                Enable Vacation Mode
              </Button>
            </div>
          </div>
        </div>
      )}

      {isOnVacation && (
        <div className="flex justify-center">
          <Button onClick={handleToggleVacation} variant="outline" className="gap-2">
            End Vacation & Return to Active
          </Button>
        </div>
      )}
    </div>
  );
}
