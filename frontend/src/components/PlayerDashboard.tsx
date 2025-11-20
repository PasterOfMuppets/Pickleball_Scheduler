import { useState, useEffect } from 'react';
import { Calendar, Users, Settings, ClipboardList, AlertCircle, Plane } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface Match {
  id: number;
  player_a: { id: number; name: string };
  player_b: { id: number; name: string };
  start_time: string;
  end_time: string;
  duration: number;
  status: string;
  created_by: number;
}

export function PlayerDashboard() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token && user) {
      fetchMatches();
    }
  }, [token, user]);

  const fetchMatches = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/matches`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMatches(response.data);
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user || loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Get matches relevant to the user
  const userMatches = matches.filter(
    m => m.player_a.id === user.id || m.player_b.id === user.id
  );

  const incomingChallenges = userMatches.filter(
    m => m.status === 'pending' && m.player_b.id === user.id
  );

  const outgoingChallenges = userMatches.filter(
    m => m.status === 'pending' && m.created_by === user.id
  );

  const upcomingMatches = userMatches
    .filter(m => m.status === 'confirmed' && new Date(m.start_time) >= new Date())
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  const nextMatch = upcomingMatches[0];

  // Check for alerts
  const alerts = [];
  // Add alert logic based on user properties when available

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1>Welcome back, {user.name.split(' ')[0]}</h1>
        <p className="text-slate-500 mt-1">Here's your schedule overview</p>
      </div>

      {/* Alerts */}
      {alerts.map((alert: any, i) => (
        <Alert key={i} variant={alert.type === 'error' ? 'destructive' : 'default'}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{alert.message}</AlertDescription>
        </Alert>
      ))}

      {/* Vacation Mode Alert */}
      {user.status === 'vacation' && user.vacation_until && (
        <Alert className="border-blue-200 bg-blue-50">
          <Plane className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            Vacation mode is active until {new Date(user.vacation_until).toLocaleDateString()}. You're hidden from
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
                {nextMatch.player_a.id === user.id
                  ? `You vs ${nextMatch.player_b.name}`
                  : `${nextMatch.player_a.name} vs You`}
              </h2>
            </div>
            <Badge className="bg-emerald-100 text-emerald-700">Confirmed</Badge>
          </div>
          <div className="space-y-2 text-slate-600">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>
                {new Date(nextMatch.start_time).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 flex items-center justify-center">⏰</span>
              <span>
                {new Date(nextMatch.start_time).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                })} ({nextMatch.duration} minutes)
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
                  <p className="text-sm font-medium">Incoming challenge from {match.player_a.name}</p>
                  <p className="text-slate-600 text-sm">
                    {new Date(match.start_time).toLocaleDateString()} at{' '}
                    {new Date(match.start_time).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
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
                  <p className="text-sm font-medium">Awaiting response from {match.player_b.name}</p>
                  <p className="text-slate-600 text-sm">
                    {new Date(match.start_time).toLocaleDateString()} at{' '}
                    {new Date(match.start_time).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
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
            onClick={() => navigate('/availability')}
          >
            <Calendar className="w-5 h-5 mr-3 text-emerald-600" />
            <div className="text-left">
              <div className="font-medium">Edit Availability</div>
              <div className="text-xs text-slate-500">Update your schedule</div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="h-auto py-4 justify-start"
            onClick={() => navigate('/find-opponents')}
          >
            <Users className="w-5 h-5 mr-3 text-blue-600" />
            <div className="text-left">
              <div className="font-medium">Find Opponents</div>
              <div className="text-xs text-slate-500">See who's available</div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="h-auto py-4 justify-start"
            onClick={() => navigate('/matches')}
          >
            <ClipboardList className="w-5 h-5 mr-3 text-purple-600" />
            <div className="text-left">
              <div className="font-medium">View Matches</div>
              <div className="text-xs text-slate-500">See your match history</div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="h-auto py-4 justify-start"
            onClick={() => navigate('/profile')}
          >
            <Settings className="w-5 h-5 mr-3 text-slate-600" />
            <div className="text-left">
              <div className="font-medium">Settings</div>
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
