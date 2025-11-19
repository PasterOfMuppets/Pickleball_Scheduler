import { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { usePickleballStore } from '../store/usePickleballStore';

interface ChallengeModalProps {
  opponentId: string;
  initialDate?: string;
  initialTime?: string;
  onClose: () => void;
}

export function ChallengeModal({
  opponentId,
  initialDate,
  initialTime,
  onClose,
}: ChallengeModalProps) {
  const { users, createChallenge, currentUser, impersonatedUser, matches, availability } = usePickleballStore();
  const activeUser = impersonatedUser || currentUser;

  const opponent = users.find(u => u.id === opponentId);

  const [formData, setFormData] = useState({
    date: initialDate || '',
    startTime: initialTime || '',
    duration: 90 as 60 | 90 | 120,
  });

  if (!activeUser || !opponent) return null;

  const durationOptions = [
    { value: 60, label: '60 minutes' },
    { value: 90, label: '90 minutes' },
    { value: 120, label: '120 minutes' },
  ];

  // Check for conflicts
  const hasConflict = (duration: number) => {
    if (!formData.date || !formData.startTime) return false;

    const endTime = calculateEndTime(formData.startTime, duration);
    
    // Check if user has existing matches at this time
    const userMatches = matches.filter(
      m =>
        (m.challengerId === activeUser.id || m.opponentId === activeUser.id) &&
        m.status !== 'declined' &&
        m.status !== 'canceled' &&
        m.date === formData.date
    );

    return userMatches.some(match => {
      const matchEnd = calculateEndTime(match.startTime, match.duration);
      return (
        (formData.startTime >= match.startTime && formData.startTime < matchEnd) ||
        (endTime > match.startTime && endTime <= matchEnd) ||
        (formData.startTime <= match.startTime && endTime >= matchEnd)
      );
    });
  };

  // Check quiet hours
  const isInQuietHours = () => {
    if (!formData.startTime || !activeUser.quietHoursStart || !activeUser.quietHoursEnd) {
      return false;
    }

    const start = timeToMinutes(formData.startTime);
    const quietStart = timeToMinutes(activeUser.quietHoursStart);
    const quietEnd = timeToMinutes(activeUser.quietHoursEnd);

    if (quietStart > quietEnd) {
      // Quiet hours span midnight
      return start >= quietStart || start < quietEnd;
    }
    return start >= quietStart && start < quietEnd;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (hasConflict(formData.duration)) {
      alert('This time slot conflicts with an existing match');
      return;
    }

    createChallenge({
      challengerId: activeUser.id,
      opponentId: opponent.id,
      date: formData.date,
      startTime: formData.startTime,
      duration: formData.duration,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2>Challenge Opponent</h2>
            <p className="text-slate-500 mt-1">Send a match challenge to {opponent.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="opponent">Opponent</Label>
            <div className="px-4 py-3 bg-slate-50 rounded-lg border border-slate-200">
              {opponent.name}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <input
              id="date"
              type="date"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="start-time">Start Time</Label>
            <input
              id="start-time"
              type="time"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg"
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Duration</Label>
            <div className="grid grid-cols-3 gap-2">
              {durationOptions.map(option => {
                const conflict = hasConflict(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={conflict}
                    onClick={() => setFormData({ ...formData, duration: option.value as 60 | 90 | 120 })}
                    className={`
                      px-4 py-3 rounded-lg border transition-colors
                      ${formData.duration === option.value
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : conflict
                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                        : 'bg-white border-slate-300 hover:border-emerald-300'
                      }
                    `}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quiet Hours Warning */}
          {isInQuietHours() && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-amber-900">
                <strong>Quiet Hours Notice:</strong> This notification will be delayed until{' '}
                {activeUser.quietHoursEnd} to respect quiet hours preferences.
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">
              Send Challenge
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Helper functions
function calculateEndTime(startTime: string, duration: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + duration;
  const endHours = Math.floor(totalMinutes / 60);
  const endMinutes = totalMinutes % 60;
  return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}
