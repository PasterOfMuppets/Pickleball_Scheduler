import { useState } from 'react';
import { Calendar, Clock, Check, X, Ban, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Textarea } from './ui/textarea';
import { usePickleballStore } from '../store/usePickleballStore';

export function MatchHistory() {
  const { currentUser, impersonatedUser, matches, users, respondToChallenge, cancelMatch } = usePickleballStore();
  const activeUser = impersonatedUser || currentUser;

  const [cancelingMatchId, setCancelingMatchId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  if (!activeUser) return null;

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
    .filter(m => m.status === 'confirmed' && new Date(m.date) >= new Date('2025-11-18'))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const pastMatches = userMatches
    .filter(m => m.status === 'confirmed' && new Date(m.date) < new Date('2025-11-18'))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const canceledDeclined = userMatches
    .filter(m => m.status === 'declined' || m.status === 'canceled' || m.status === 'expired')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const getOpponent = (match: any) => {
    const opponentId = match.challengerId === activeUser.id ? match.opponentId : match.challengerId;
    return users.find(u => u.id === opponentId);
  };

  const handleAccept = (matchId: string) => {
    respondToChallenge(matchId, true);
  };

  const handleDecline = (matchId: string) => {
    if (confirm('Decline this challenge?')) {
      respondToChallenge(matchId, false);
    }
  };

  const handleCancel = (matchId: string) => {
    cancelMatch(matchId, cancelReason);
    setCancelingMatchId(null);
    setCancelReason('');
  };

  const renderMatch = (match: any, showActions: boolean = false) => {
    const opponent = getOpponent(match);
    if (!opponent) return null;

    const isIncoming = match.opponentId === activeUser.id;

    return (
      <div key={match.id} className="bg-white rounded-xl p-4 border border-slate-200">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3>
                {isIncoming ? `${opponent.name} vs You` : `You vs ${opponent.name}`}
              </h3>
            </div>
            <div className="text-sm text-slate-500 mt-1">
              Created {new Date(match.createdAt).toLocaleDateString()}
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
              {new Date(match.date).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>
              {match.startTime} ({match.duration} minutes)
            </span>
          </div>
        </div>

        {match.cancelReason && (
          <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="text-sm text-slate-600 mb-1">Cancellation reason:</div>
            <div className="text-sm">{match.cancelReason}</div>
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

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1>Match History</h1>
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
          <h3 className="mb-4 text-slate-600">Canceled & Declined</h3>
          <div className="space-y-3">
            {canceledDeclined.slice(0, 5).map(match => renderMatch(match, false))}
          </div>
        </div>
      )}
    </div>
  );
}
