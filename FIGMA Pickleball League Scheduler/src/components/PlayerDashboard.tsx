import { Calendar, Users, Settings, ClipboardList, AlertCircle, Plane } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { usePickleballStore } from '../store/usePickleballStore';

interface PlayerDashboardProps {
  onNavigate: (screen: string) => void;
}

export function PlayerDashboard({ onNavigate }: PlayerDashboardProps) {
  const { currentUser, impersonatedUser, matches } = usePickleballStore();
  const activeUser = impersonatedUser || currentUser;

  if (!activeUser) return null;

  // Get matches relevant to the user
  const userMatches = matches.filter(
    m => m.challengerId === activeUser.id || m.opponentId === activeUser.id
  );

  const incomingChallenges = userMatches.filter(
    m => m.status === 'pending' && m.opponentId === activeUser.id
  );

  const outgoingChallenges = userMatches.filter(
    m => m.status === 'pending' && m.challengerId === activeUser.id
  );

  const upcomingMatches = userMatches
    .filter(m => m.status === 'confirmed' && new Date(m.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const nextMatch = upcomingMatches[0];

  // Check for alerts
  const alerts = [];
  if (!activeUser.smsEnabled && activeUser.smsConsent) {
    alerts.push({
      type: 'warning',
      message: 'SMS notifications are disabled due to repeated delivery failures',
    });
  }
  if (!activeUser.emailEnabled) {
    alerts.push({
      type: 'error',
      message: 'Email address is invalid - update your profile to receive notifications',
    });
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1>Welcome back, {activeUser.name.split(' ')[0]}</h1>
        <p className="text-slate-500 mt-1">Here's your schedule overview</p>
      </div>

      {/* Alerts */}
      {alerts.map((alert, i) => (
        <Alert key={i} variant={alert.type === 'error' ? 'destructive' : 'default'}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{alert.message}</AlertDescription>
        </Alert>
      ))}

      {/* Vacation Mode Alert */}
      {activeUser.status === 'vacation' && (
        <Alert className="border-blue-200 bg-blue-50">
          <Plane className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            Vacation mode is active until {activeUser.vacationUntil}. You're hidden from
            opponent search.
          </AlertDescription>
        </Alert>
      )}

      {/* Next Match Card */}
      {nextMatch && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-slate-500 mb-1">Next Match</p>
              <h2>
                {nextMatch.challengerId === activeUser.id
                  ? `You vs Opponent`
                  : `Opponent vs You`}
              </h2>
            </div>
            <Badge className="bg-emerald-100 text-emerald-700">Confirmed</Badge>
          </div>
          <div className="space-y-2 text-slate-600">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>
                {new Date(nextMatch.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 flex items-center justify-center">⏰</span>
              <span>
                {nextMatch.startTime} ({nextMatch.duration} minutes)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Pending Challenges */}
      {(incomingChallenges.length > 0 || outgoingChallenges.length > 0) && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h3 className="mb-4">Pending Challenges</h3>
          <div className="space-y-3">
            {incomingChallenges.map(match => (
              <div
                key={match.id}
                className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200"
              >
                <div>
                  <p className="text-sm">Incoming challenge</p>
                  <p className="text-slate-600 text-sm">
                    {new Date(match.date).toLocaleDateString()} at {match.startTime}
                  </p>
                </div>
                <Badge variant="outline" className="bg-white">
                  Action Required
                </Badge>
              </div>
            ))}
            {outgoingChallenges.map(match => (
              <div
                key={match.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
              >
                <div>
                  <p className="text-sm">Awaiting response</p>
                  <p className="text-slate-600 text-sm">
                    {new Date(match.date).toLocaleDateString()} at {match.startTime}
                  </p>
                </div>
                <Badge variant="outline">Pending</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h3 className="mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="h-auto py-4 justify-start"
            onClick={() => onNavigate('availability')}
          >
            <Calendar className="w-5 h-5 mr-3 text-emerald-600" />
            <div className="text-left">
              <div>Edit Availability</div>
              <div className="text-xs text-slate-500">Update your schedule</div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="h-auto py-4 justify-start"
            onClick={() => onNavigate('find-opponents')}
          >
            <Users className="w-5 h-5 mr-3 text-blue-600" />
            <div className="text-left">
              <div>Find Opponents</div>
              <div className="text-xs text-slate-500">See who's available</div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="h-auto py-4 justify-start"
            onClick={() => onNavigate('matches')}
          >
            <ClipboardList className="w-5 h-5 mr-3 text-purple-600" />
            <div className="text-left">
              <div>View Matches</div>
              <div className="text-xs text-slate-500">See your match history</div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="h-auto py-4 justify-start"
            onClick={() => onNavigate('settings')}
          >
            <Settings className="w-5 h-5 mr-3 text-slate-600" />
            <div className="text-left">
              <div>Settings</div>
              <div className="text-xs text-slate-500">Manage preferences</div>
            </div>
          </Button>
        </div>
      </div>

      {/* Weekly Summary */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h3 className="mb-4">This Week</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-slate-600">Available hours</span>
            <span>12 hours</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600">Confirmed matches</span>
            <span>{upcomingMatches.length}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600">Pending responses</span>
            <span className="text-amber-600">{incomingChallenges.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
