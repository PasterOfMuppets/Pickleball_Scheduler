import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Trash2, Repeat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { RecurringPatternsModal } from './RecurringPatternsModal';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface AvailabilityBlock {
  id: number;
  user_id: number;
  start_time: string;
  end_time: string;
  generated_from_recurring: number | null;
}

export function AvailabilityEditor() {
  const { user, token } = useAuth();
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, 1 = next week
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && token) {
      loadBlocks();
    }
  }, [user, token, weekOffset]);

  const loadBlocks = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const weekDates = getWeekDates(weekOffset);
      const response = await axios.get(`${API_BASE_URL}/api/availability/blocks`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          start_date: weekDates[0].toISOString(),
          end_date: weekDates[6].toISOString(),
        },
      });
      setBlocks(response.data);
    } catch (error) {
      console.error('Error loading blocks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBlock = async (blockId: number) => {
    if (!token || !confirm('Delete this availability block?')) return;

    try {
      await axios.delete(`${API_BASE_URL}/api/availability/blocks/${blockId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await loadBlocks();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to delete block');
    }
  };

  if (!user) return null;

  // Calculate week dates
  const getWeekDates = (offset: number) => {
    const today = new Date();
    const currentDay = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - currentDay + (currentDay === 0 ? -6 : 1) + offset * 7);

    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const weekDates = getWeekDates(weekOffset);

  // Group blocks by date
  const blocksByDate = blocks.reduce((acc, block) => {
    const date = new Date(block.start_time).toLocaleDateString('en-US');
    if (!acc[date]) acc[date] = [];
    acc[date].push(block);
    return acc;
  }, {} as Record<string, AvailabilityBlock[]>);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Weekly Availability</h1>
          <p className="text-slate-500 mt-1">
            Manage your availability schedule and recurring patterns
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowRecurringModal(true)}
          className="gap-2"
        >
          <Repeat className="w-4 h-4" />
          Recurring Patterns
        </Button>
      </div>

      {/* Week Navigator */}
      <div className="flex items-center justify-between bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))}
          disabled={weekOffset === 0}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <div className="text-center">
          <div className="font-semibold">{weekOffset === 0 ? 'Current Week' : 'Next Week'}</div>
          <div className="text-sm text-slate-500">
            {weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} -{' '}
            {weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setWeekOffset(Math.min(1, weekOffset + 1))}
          disabled={weekOffset === 1}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-emerald-100 border-2 border-emerald-500 rounded" />
          <span className="text-slate-600">Recurring</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-100 border-2 border-blue-500 rounded" />
          <span className="text-slate-600">One-time</span>
        </div>
      </div>

      {/* Availability Blocks List */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : blocks.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-slate-200 text-center">
          <p className="text-slate-500">
            No availability blocks for this week. Create recurring patterns to automatically generate availability.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {weekDates.map((date) => {
            const dateKey = date.toLocaleDateString('en-US');
            const dayBlocks = blocksByDate[dateKey] || [];

            return (
              <div key={dateKey} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                  <div className="font-semibold">{date.toLocaleDateString('en-US', { weekday: 'long' })}</div>
                  <div className="text-sm text-slate-500">
                    {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  {dayBlocks.length === 0 ? (
                    <p className="text-sm text-slate-400">No availability</p>
                  ) : (
                    dayBlocks.map((block) => (
                      <div
                        key={block.id}
                        className={`flex items-center justify-between p-3 rounded-lg border-2 ${
                          block.generated_from_recurring
                            ? 'bg-emerald-100 border-emerald-500'
                            : 'bg-blue-100 border-blue-500'
                        }`}
                      >
                        <div>
                          <div className="font-medium">
                            {new Date(block.start_time).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}{' '}
                            -{' '}
                            {new Date(block.end_time).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </div>
                          <div className="text-xs text-slate-600">
                            {block.generated_from_recurring ? 'From recurring pattern' : 'One-time block'}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteBlock(block.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recurring Patterns Modal */}
      {showRecurringModal && (
        <RecurringPatternsModal
          onClose={() => {
            setShowRecurringModal(false);
            loadBlocks();
          }}
        />
      )}
    </div>
  );
}
