import { useState, useEffect } from 'react';
import { Plane, Calendar, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export function VacationMode() {
  const { user, token } = useAuth();
  const [vacationUntil, setVacationUntil] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && user.vacation_until) {
      // Format the date for input[type="date"]
      const date = new Date(user.vacation_until);
      setVacationUntil(date.toISOString().split('T')[0]);
    }
  }, [user]);

  const handleToggleVacation = async () => {
    if (!token) return;

    setLoading(true);
    try {
      if (isOnVacation) {
        // End vacation
        await axios.put(
          `${API_BASE_URL}/api/users/me`,
          { status: 'active', vacation_until: null },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        // Start vacation - set default to 1 week from now
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 7);
        const dateStr = defaultDate.toISOString().split('T')[0];

        await axios.put(
          `${API_BASE_URL}/api/users/me`,
          { status: 'vacation', vacation_until: dateStr },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setVacationUntil(dateStr);
      }
      // Refresh user data
      window.location.reload();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to update vacation status');
    } finally {
      setLoading(false);
    }
  };

  const handleReturnDateChange = async (date: string) => {
    if (!token) return;

    setVacationUntil(date);
    try {
      await axios.put(
        `${API_BASE_URL}/api/users/me`,
        { vacation_until: date },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to update return date');
    }
  };

  if (!user) return null;

  const isOnVacation = user.status === 'vacation';

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Vacation Mode</h1>
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
            disabled={loading}
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
                value={vacationUntil}
                onChange={(e) => handleReturnDateChange(e.target.value)}
              />
            </div>

            <Alert className="border-blue-200 bg-blue-50">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900">
                You're hidden from opponent search until{' '}
                {vacationUntil
                  ? new Date(vacationUntil).toLocaleDateString('en-US', {
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
        <h2 className="text-xl font-semibold">How Vacation Mode Works</h2>

        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold">
              1
            </div>
            <div>
              <div className="font-medium">Hidden from Search</div>
              <p className="text-sm text-slate-500 mt-1">
                Other players won't see you when searching for opponents
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold">
              2
            </div>
            <div>
              <div className="font-medium">Existing Matches Remain</div>
              <p className="text-sm text-slate-500 mt-1">
                Your confirmed matches stay visible and you can still manage them
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold">
              3
            </div>
            <div>
              <div className="font-medium">No New Challenges</div>
              <p className="text-sm text-slate-500 mt-1">
                You won't receive new match challenges while on vacation
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold">
              4
            </div>
            <div>
              <div className="font-medium">Availability Preserved</div>
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
              <h3 className="text-blue-900 font-semibold">Planning a Trip?</h3>
              <p className="text-sm text-blue-800 mt-1 mb-4">
                Enable vacation mode to let other players know you're away. You can set an
                expected return date and we'll automatically reactivate your account.
              </p>
              <Button onClick={handleToggleVacation} disabled={loading} className="gap-2">
                <Plane className="w-4 h-4" />
                Enable Vacation Mode
              </Button>
            </div>
          </div>
        </div>
      )}

      {isOnVacation && (
        <div className="flex justify-center">
          <Button onClick={handleToggleVacation} disabled={loading} variant="outline" className="gap-2">
            End Vacation & Return to Active
          </Button>
        </div>
      )}
    </div>
  );
}
