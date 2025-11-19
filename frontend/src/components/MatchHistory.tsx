import { useState, useEffect } from 'react';
import { Calendar, Clock, Check, X, Ban, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
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
  created_at: string;
  cancel_reason?: string;
}

export function MatchHistory() {
  const { user, token } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelingMatchId, setCancelingMatchId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    if (user && token) {
      fetchMatches();
    }
  }, [user, token]);

  const fetchMatches = async () => {
    if (!token) return;

    setLoading(true);
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

  const handleAccept = async (matchId: number) => {
    if (!token) return;

    try {
      await axios.post(
        `${API_BASE_URL}/api/matches/${matchId}/accept`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchMatches();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to accept match');
    }
  };

  const handleDecline = async (matchId: number) => {
    if (!token || !confirm('Decline this challenge?')) return;

    try {
      await axios.post(
        `${API_BASE_URL}/api/matches/${matchId}/decline`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchMatches();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to decline match');
    }
  };

  const handleCancel = async (matchId: number) => {
    if (!token) return;

    try {
      await axios.post(
        `${API_BASE_URL}/api/matches/${matchId}/cancel`,
        { reason: cancelReason || undefined },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCancelingMatchId(null);
      setCancelReason('');
      await fetchMatches();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to cancel match');
    }
  };

  if (!user) return null;

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

  const pastMatches = userMatches
    .filter(m => m.status === 'confirmed' && new Date(m.start_time) < new Date())
    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

  const canceledDeclined = userMatches
    .filter(m => ['declined', 'canceled', 'expired'].includes(m.status))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const renderMatch = (match: Match, showActions: boolean = false) => {
    const isIncoming = match.player_b.id === user.id;
    const opponent = isIncoming ? match.player_a : match.player_b;

    return (
      <div key={match.id} className="bg-white rounded-xl p-4 border border-slate-200">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">
                {isIncoming ? `${opponent.name} vs You` : `You vs ${opponent.name}`}
              </h3>
            </div>
            <div className="text-sm text-slate-500 mt-1">
              Created {new Date(match.created_at).toLocaleDateString()}
            </div>
          </div>
          <Badge
            className={
              match.status === 'confirmed'
                ? 'bg-emerald-100 text-emerald-700'
                : match.status === 'pending'
                ? 'bg-amber-100 text-amber-700'
                : match.status === 'declined'
                ? 'bg-red-100 text-red-700'
                : 'bg-slate-100 text-slate-700'
            }
          >
            {match.status.charAt(0).toUpperCase() + match.status.slice(1)}
          </Badge>
        </div>

        <div className="space-y-2 text-slate-600 mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>
              {new Date(match.start_time).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>
              {new Date(match.start_time).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              })}{' '}
              ({match.duration} minutes)
            </span>
          </div>
        </div>

        {match.cancel_reason && (
          <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="text-sm text-slate-600 mb-1">Cancellation reason:</div>
            <div className="text-sm">{match.cancel_reason}</div>
          </div>
        )}

        {showActions && (
          <>
            {match.status === 'pending' && isIncoming && (
              <div className="flex gap-2">
                <Button onClick={() => handleAccept(match.id)} className="flex-1 gap-2">
                  <Check className="w-4 h-4" />
                  Accept
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleDecline(match.id)}
                  className="flex-1 gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="w-4 h-4" />
                  Decline
                </Button>
              </div>
            )}

            {match.status === 'confirmed' && cancelingMatchId === match.id && (
              <div className="space-y-3">
                <Textarea
                  placeholder="Optional: Reason for cancellation"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    onClick={() => handleCancel(match.id)}
                    className="flex-1"
                  >
                    Confirm Cancellation
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCancelingMatchId(null);
                      setCancelReason('');
                    }}
                  >
                    Keep Match
                  </Button>
                </div>
              </div>
            )}

            {match.status === 'confirmed' && cancelingMatchId !== match.id && (
              <Button
                variant="outline"
                onClick={() => setCancelingMatchId(match.id)}
                className="w-full gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Ban className="w-4 h-4" />
                Cancel Match
              </Button>
            )}
          </>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Match History</h1>
        <p className="text-slate-500 mt-1">View and manage your challenges and matches</p>
      </div>

      <Tabs defaultValue="incoming" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="incoming" className="relative">
            Incoming
            {incomingChallenges.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-white text-xs rounded-full flex items-center justify-center">
                {incomingChallenges.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="outgoing" className="relative">
            Outgoing
            {outgoingChallenges.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
                {outgoingChallenges.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
        </TabsList>

        <TabsContent value="incoming" className="space-y-3">
          {incomingChallenges.length > 0 ? (
            incomingChallenges.map(match => renderMatch(match, true))
          ) : (
            <div className="text-center py-12 text-slate-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No incoming challenges</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="outgoing" className="space-y-3">
          {outgoingChallenges.length > 0 ? (
            outgoingChallenges.map(match => renderMatch(match, false))
          ) : (
            <div className="text-center py-12 text-slate-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No outgoing challenges</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-3">
          {upcomingMatches.length > 0 ? (
            upcomingMatches.map(match => renderMatch(match, true))
          ) : (
            <div className="text-center py-12 text-slate-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No upcoming matches</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-3">
          {pastMatches.length > 0 ? (
            pastMatches.map(match => renderMatch(match, false))
          ) : (
            <div className="text-center py-12 text-slate-500">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No past matches</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Canceled/Declined Section */}
      {canceledDeclined.length > 0 && (
        <div className="pt-6 border-t border-slate-200">
          <h3 className="mb-4 text-slate-600 font-semibold">Canceled & Declined</h3>
          <div className="space-y-3">
            {canceledDeclined.slice(0, 5).map(match => renderMatch(match, false))}
          </div>
        </div>
      )}
    </div>
  );
}
