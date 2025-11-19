import { useState } from 'react';
import { Search, Users, Calendar, Clock } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { usePickleballStore } from '../store/usePickleballStore';
import { ChallengeModal } from './ChallengeModal';

export function FindOpponents() {
  const { currentUser, impersonatedUser, users, availability } = usePickleballStore();
  const activeUser = impersonatedUser || currentUser;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOpponent, setSelectedOpponent] = useState<string | null>(null);
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; time: string } | null>(null);

  if (!activeUser) return null;

  // Get active players (excluding current user and those on vacation)
  const activeOpponents = users.filter(
    u => u.id !== activeUser.id && u.status === 'active'
  );

  // Calculate overlap for each opponent
  const opponentsWithOverlap = activeOpponents
    .map(opponent => {
      const overlap = calculateOverlap(activeUser.id, opponent.id, availability);
      return {
        ...opponent,
        overlapHours: overlap.hours,
        sharedSlots: overlap.slots,
      };
    })
    .filter(o => searchQuery === '' || o.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => b.overlapHours - a.overlapHours);

  const selectedOpponentData = selectedOpponent
    ? opponentsWithOverlap.find(o => o.id === selectedOpponent)
    : null;

  const handleChallengeClick = (date: string, time: string) => {
    setSelectedSlot({ date, time });
    setShowChallengeModal(true);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile View */}
      <div className="lg:hidden">
        <div className="p-4 space-y-4">
          <div>
            <h1>Find Opponents</h1>
            <p className="text-slate-500 mt-1">Players with matching availability</p>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search players..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Opponents List */}
          <div className="space-y-3">
            {opponentsWithOverlap.map(opponent => (
              <button
                key={opponent.id}
                onClick={() => setSelectedOpponent(opponent.id === selectedOpponent ? null : opponent.id)}
                className="w-full bg-white rounded-xl p-4 border border-slate-200 hover:border-emerald-300 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-emerald-100 text-emerald-700">
                      {opponent.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <div>{opponent.name}</div>
                    <div className="text-sm text-slate-500">
                      {opponent.overlapHours} hours available
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                    {opponent.sharedSlots.length} slots
                  </Badge>
                </div>

                {/* Expanded Shared Slots */}
                {selectedOpponent === opponent.id && opponent.sharedSlots.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                    {groupSlotsByDate(opponent.sharedSlots).map((group, i) => (
                      <div key={i}>
                        <div className="text-sm text-slate-600 mb-2">
                          {new Date(group.date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                        <div className="space-y-2">
                          {group.slots.map((slot, j) => (
                            <div
                              key={j}
                              className="flex items-center justify-between p-2 bg-slate-50 rounded-lg"
                            >
                              <div className="flex items-center gap-2 text-sm">
                                <Clock className="w-4 h-4 text-slate-400" />
                                <span>
                                  {slot.startTime} - {slot.endTime}
                                </span>
                              </div>
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleChallengeClick(group.date, slot.startTime);
                                }}
                              >
                                Challenge
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </button>
            ))}

            {opponentsWithOverlap.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No opponents found with matching availability</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop View - Two Panel */}
      <div className="hidden lg:grid lg:grid-cols-2 min-h-screen">
        {/* Left Panel - Opponents List */}
        <div className="border-r border-slate-200 bg-white p-6 overflow-y-auto">
          <div className="space-y-4">
            <div>
              <h1>Find Opponents</h1>
              <p className="text-slate-500 mt-1">Players with matching availability</p>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Search players..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Opponents */}
            <div className="space-y-2">
              {opponentsWithOverlap.map(opponent => (
                <button
                  key={opponent.id}
                  onClick={() => setSelectedOpponent(opponent.id)}
                  className={`
                    w-full p-4 rounded-lg border transition-colors text-left
                    ${selectedOpponent === opponent.id
                      ? 'bg-emerald-50 border-emerald-300'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-emerald-100 text-emerald-700">
                        {opponent.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div>{opponent.name}</div>
                      <div className="text-sm text-slate-500">
                        {opponent.overlapHours} hours this week
                      </div>
                    </div>
                    <Badge variant="outline">
                      {opponent.sharedSlots.length}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel - Shared Calendar */}
        <div className="bg-slate-50 p-6 overflow-y-auto">
          {selectedOpponentData ? (
            <div className="space-y-4">
              <div>
                <h2>Shared Availability</h2>
                <p className="text-slate-500 mt-1">
                  Time slots when both you and {selectedOpponentData.name} are available
                </p>
              </div>

              {selectedOpponentData.sharedSlots.length > 0 ? (
                <div className="space-y-4">
                  {groupSlotsByDate(selectedOpponentData.sharedSlots).map((group, i) => (
                    <div key={i} className="bg-white rounded-xl p-4 border border-slate-200">
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <div>
                          {new Date(group.date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </div>
                      </div>
                      <div className="space-y-2">
                        {group.slots.map((slot, j) => (
                          <div
                            key={j}
                            className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-200"
                          >
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-emerald-600" />
                              <span>
                                {slot.startTime} - {slot.endTime}
                              </span>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleChallengeClick(group.date, slot.startTime)}
                            >
                              Challenge
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No overlapping availability this week</p>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400">
              <div className="text-center">
                <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Select a player to view shared availability</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Challenge Modal */}
      {showChallengeModal && selectedOpponent && selectedSlot && (
        <ChallengeModal
          opponentId={selectedOpponent}
          initialDate={selectedSlot.date}
          initialTime={selectedSlot.time}
          onClose={() => {
            setShowChallengeModal(false);
            setSelectedSlot(null);
          }}
        />
      )}
    </div>
  );
}

// Helper functions
function calculateOverlap(userId1: string, userId2: string, availability: any[]) {
  const user1Slots = availability.filter(s => s.userId === userId1);
  const user2Slots = availability.filter(s => s.userId === userId2);

  const sharedSlots: any[] = [];
  let totalMinutes = 0;

  user1Slots.forEach(slot1 => {
    user2Slots.forEach(slot2 => {
      if (slot1.date === slot2.date) {
        const start1 = timeToMinutes(slot1.startTime);
        const end1 = timeToMinutes(slot1.endTime);
        const start2 = timeToMinutes(slot2.startTime);
        const end2 = timeToMinutes(slot2.endTime);

        const overlapStart = Math.max(start1, start2);
        const overlapEnd = Math.min(end1, end2);

        if (overlapStart < overlapEnd) {
          const duration = overlapEnd - overlapStart;
          totalMinutes += duration;
          sharedSlots.push({
            date: slot1.date,
            startTime: minutesToTime(overlapStart),
            endTime: minutesToTime(overlapEnd),
          });
        }
      }
    });
  });

  return {
    hours: Math.floor(totalMinutes / 60),
    slots: sharedSlots,
  };
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

function groupSlotsByDate(slots: any[]) {
  const grouped = new Map<string, any[]>();

  slots.forEach(slot => {
    if (!grouped.has(slot.date)) {
      grouped.set(slot.date, []);
    }
    grouped.get(slot.date)!.push(slot);
  });

  return Array.from(grouped.entries())
    .map(([date, slots]) => ({ date, slots }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
