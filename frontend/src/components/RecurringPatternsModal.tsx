import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface RecurringPattern {
  id: number;
  user_id: number;
  day_of_week: number;
  start_time_local: string;
  end_time_local: string;
  enabled: boolean;
}

interface RecurringPatternsModalProps {
  onClose: () => void;
}

export function RecurringPatternsModal({ onClose }: RecurringPatternsModalProps) {
  const { token } = useAuth();
  const [patterns, setPatterns] = useState<RecurringPattern[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    day_of_week: 1,
    start_time: '18:00',
    end_time: '20:00',
  });

  const daysOfWeek = [
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
    { value: 7, label: 'Sunday' },
  ];

  useEffect(() => {
    loadPatterns();
  }, [token]);

  const loadPatterns = async () => {
    if (!token) return;

    try {
      const response = await axios.get(`${API_BASE_URL}/api/availability/patterns`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPatterns(response.data);
    } catch (error) {
      console.error('Error loading patterns:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setLoading(true);
    try {
      await axios.post(
        `${API_BASE_URL}/api/availability/patterns`,
        {
          day_of_week: formData.day_of_week,
          start_time_local: formData.start_time,
          end_time_local: formData.end_time,
          enabled: true,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await loadPatterns();
      setShowForm(false);
      setFormData({
        day_of_week: 1,
        start_time: '18:00',
        end_time: '20:00',
      });
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to create pattern');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (patternId: number, currentEnabled: boolean) => {
    if (!token) return;

    try {
      await axios.put(
        `${API_BASE_URL}/api/availability/patterns/${patternId}`,
        { enabled: !currentEnabled },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await loadPatterns();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to update pattern');
    }
  };

  const handleDelete = async (patternId: number) => {
    if (!token || !confirm('Delete this recurring pattern?')) return;

    try {
      await axios.delete(`${API_BASE_URL}/api/availability/patterns/${patternId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await loadPatterns();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to delete pattern');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Recurring Patterns</h2>
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
          {patterns.length > 0 && (
            <div className="space-y-3">
              {patterns.map((pattern) => (
                <div
                  key={pattern.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={pattern.enabled}
                        onCheckedChange={() => handleToggle(pattern.id, pattern.enabled)}
                      />
                      <div>
                        <div className="font-medium">
                          {daysOfWeek.find((d) => d.value === pattern.day_of_week)?.label}
                        </div>
                        <div className="text-sm text-slate-500">
                          {pattern.start_time_local} - {pattern.end_time_local}
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(pattern.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {patterns.length === 0 && !showForm && (
            <div className="text-center py-12 text-slate-500">
              <p className="font-medium">No recurring patterns yet</p>
              <p className="text-sm mt-1">Create a pattern to automatically generate availability</p>
            </div>
          )}

          {/* Add New Pattern Form */}
          {showForm ? (
            <form
              onSubmit={handleSubmit}
              className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-4"
            >
              <h3 className="font-semibold">New Recurring Pattern</h3>

              <div className="space-y-2">
                <Label htmlFor="day-of-week">Day of Week</Label>
                <Select
                  value={formData.day_of_week.toString()}
                  onValueChange={(value) =>
                    setFormData({ ...formData, day_of_week: parseInt(value) })
                  }
                >
                  <SelectTrigger id="day-of-week">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {daysOfWeek.map((day) => (
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
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end-time">End Time</Label>
                  <input
                    id="end-time"
                    type="time"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Pattern'}
                </Button>
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
            <strong>How it works:</strong> Recurring patterns automatically create availability slots
            for every week. Blocks are generated nightly and you can delete individual blocks if
            needed.
          </div>
        </div>
      </div>
    </div>
  );
}
