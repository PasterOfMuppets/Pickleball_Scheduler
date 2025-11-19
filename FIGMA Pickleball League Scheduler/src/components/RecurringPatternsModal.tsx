import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { usePickleballStore } from '../store/usePickleballStore';

interface RecurringPatternsModalProps {
  onClose: () => void;
}

export function RecurringPatternsModal({ onClose }: RecurringPatternsModalProps) {
  const { currentUser, impersonatedUser, recurringPatterns, addRecurringPattern, updateRecurringPattern, deleteRecurringPattern } = usePickleballStore();
  const activeUser = impersonatedUser || currentUser;

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    dayOfWeek: 1,
    startTime: '18:00',
    endTime: '20:00',
  });

  if (!activeUser) return null;

  const userPatterns = recurringPatterns.filter(p => p.userId === activeUser.id);

  const daysOfWeek = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addRecurringPattern({
      ...formData,
      userId: activeUser.id,
      enabled: true,
    });
    setShowForm(false);
    setFormData({
      name: '',
      dayOfWeek: 1,
      startTime: '18:00',
      endTime: '20:00',
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2>Recurring Patterns</h2>
            <p className="text-slate-500 mt-1">
              Automatically generate availability for recurring time slots
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Existing Patterns */}
          {userPatterns.length > 0 && (
            <div className="space-y-3">
              {userPatterns.map(pattern => (
                <div
                  key={pattern.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={pattern.enabled}
                        onCheckedChange={(enabled) =>
                          updateRecurringPattern(pattern.id, { enabled })
                        }
                      />
                      <div>
                        <div>{pattern.name || `${daysOfWeek[pattern.dayOfWeek].label} Pattern`}</div>
                        <div className="text-sm text-slate-500">
                          {daysOfWeek[pattern.dayOfWeek].label}, {pattern.startTime} - {pattern.endTime}
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm('Delete this recurring pattern?')) {
                        deleteRecurringPattern(pattern.id);
                      }
                    }}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {userPatterns.length === 0 && !showForm && (
            <div className="text-center py-12 text-slate-500">
              <p>No recurring patterns yet</p>
              <p className="text-sm mt-1">Create a pattern to automatically generate availability</p>
            </div>
          )}

          {/* Add New Pattern Form */}
          {showForm ? (
            <form onSubmit={handleSubmit} className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-4">
              <h3>New Recurring Pattern</h3>

              <div className="space-y-2">
                <Label htmlFor="pattern-name">Pattern Name (Optional)</Label>
                <input
                  id="pattern-name"
                  type="text"
                  placeholder="e.g., Tuesday Evening"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="day-of-week">Day of Week</Label>
                <Select
                  value={formData.dayOfWeek.toString()}
                  onValueChange={(value) => setFormData({ ...formData, dayOfWeek: parseInt(value) })}
                >
                  <SelectTrigger id="day-of-week">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {daysOfWeek.map(day => (
                      <SelectItem key={day.value} value={day.value.toString()}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-time">Start Time</Label>
                  <input
                    id="start-time"
                    type="time"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end-time">End Time</Label>
                  <input
                    id="end-time"
                    type="time"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit">Create Pattern</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <Button onClick={() => setShowForm(true)} className="w-full gap-2">
              <Plus className="w-4 h-4" />
              Add Recurring Pattern
            </Button>
          )}

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
            <strong>How it works:</strong> Recurring patterns automatically create availability
            slots for every week. You can still add one-time slots or create exceptions.
          </div>
        </div>
      </div>
    </div>
  );
}
