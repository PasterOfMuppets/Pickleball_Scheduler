import { useState } from 'react';
import { ChevronLeft, ChevronRight, Copy, Trash2, Repeat } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { usePickleballStore } from '../store/usePickleballStore';
import { RecurringPatternsModal } from './RecurringPatternsModal';

export function AvailabilityEditor() {
  const { currentUser, impersonatedUser, availability, addAvailability, removeAvailability, clearWeekAvailability } = usePickleballStore();
  const activeUser = impersonatedUser || currentUser;

  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, 1 = next week
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);

  if (!activeUser) return null;

  // Calculate week dates
  const getWeekDates = (offset: number) => {
    const today = new Date('2025-11-18'); // Using the specified date
    const currentDay = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - currentDay + 1 + offset * 7);

    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const weekDates = getWeekDates(weekOffset);
  const timeSlots = generateTimeSlots();

  // Get user's availability for the current week
  const userAvailability = availability.filter(slot => {
    if (slot.userId !== activeUser.id) return false;
    const slotDate = new Date(slot.date);
    return slotDate >= weekDates[0] && slotDate <= weekDates[6];
  });

  const isSlotAvailable = (date: Date, time: string) => {
    const dateStr = formatDate(date);
    return userAvailability.some(
      slot =>
        slot.date === dateStr &&
        slot.startTime <= time &&
        slot.endTime > time
    );
  };

  const getSlotType = (date: Date, time: string) => {
    const dateStr = formatDate(date);
    const slot = userAvailability.find(
      s => s.date === dateStr && s.startTime <= time && s.endTime > time
    );
    if (!slot) return null;
    if (slot.isException) return 'exception';
    if (slot.isRecurring) return 'recurring';
    return 'one-time';
  };

  const toggleSlot = (date: Date, time: string) => {
    const slotId = `${formatDate(date)}-${time}`;
    const newSelected = new Set(selectedSlots);
    
    if (newSelected.has(slotId)) {
      newSelected.delete(slotId);
    } else {
      newSelected.add(slotId);
    }
    
    setSelectedSlots(newSelected);
  };

  const handleMouseDown = (date: Date, time: string) => {
    setIsDragging(true);
    toggleSlot(date, time);
  };

  const handleMouseEnter = (date: Date, time: string) => {
    if (isDragging) {
      toggleSlot(date, time);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const saveAvailability = () => {
    const slots = Array.from(selectedSlots).map(slotId => {
      const [date, time] = slotId.split('-');
      const endTime = getEndTime(time);
      return {
        userId: activeUser.id,
        date,
        startTime: time,
        endTime,
        isRecurring: false,
      };
    });

    addAvailability(slots);
    setSelectedSlots(new Set());
  };

  const clearWeek = () => {
    if (confirm('Clear all availability for this week?')) {
      clearWeekAvailability(activeUser.id, formatDate(weekDates[0]));
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1>Weekly Availability</h1>
          <p className="text-slate-500 mt-1">
            Drag to select time slots when you're available to play
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
          <div>{weekOffset === 0 ? 'Current Week' : 'Next Week'}</div>
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
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-amber-100 border-2 border-amber-500 rounded" />
          <span className="text-slate-600">Selected</span>
        </div>
      </div>

      {/* Calendar Grid - Mobile */}
      <div className="lg:hidden space-y-4">
        {weekDates.map((date, dayIndex) => (
          <div key={dayIndex} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
              <div>{date.toLocaleDateString('en-US', { weekday: 'long' })}</div>
              <div className="text-sm text-slate-500">
                {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
            </div>
            <div className="p-2 grid grid-cols-4 gap-1">
              {timeSlots.map(time => {
                const slotId = `${formatDate(date)}-${time}`;
                const isAvailable = isSlotAvailable(date, time);
                const slotType = getSlotType(date, time);
                const isSelected = selectedSlots.has(slotId);

                return (
                  <button
                    key={time}
                    className={`
                      p-2 rounded text-xs transition-colors
                      ${isSelected
                        ? 'bg-amber-100 border-2 border-amber-500'
                        : isAvailable && slotType === 'recurring'
                        ? 'bg-emerald-100 border-2 border-emerald-500'
                        : isAvailable && slotType === 'one-time'
                        ? 'bg-blue-100 border-2 border-blue-500'
                        : 'bg-slate-50 border border-slate-200 hover:bg-slate-100'
                      }
                    `}
                    onMouseDown={() => handleMouseDown(date, time)}
                    onMouseEnter={() => handleMouseEnter(date, time)}
                    onMouseUp={handleMouseUp}
                    onTouchStart={() => handleMouseDown(date, time)}
                  >
                    {time}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Calendar Grid - Desktop */}
      <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-auto">
        <div className="min-w-[800px]">
          {/* Header Row */}
          <div className="grid grid-cols-8 border-b border-slate-200 bg-slate-50">
            <div className="p-3 border-r border-slate-200">Time</div>
            {weekDates.map((date, i) => (
              <div key={i} className="p-3 border-r border-slate-200 last:border-r-0">
                <div>{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                <div className="text-sm text-slate-500">
                  {date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
                </div>
              </div>
            ))}
          </div>

          {/* Time Slots */}
          {timeSlots.map(time => (
            <div key={time} className="grid grid-cols-8 border-b border-slate-200 last:border-b-0">
              <div className="p-3 border-r border-slate-200 text-sm text-slate-600">{time}</div>
              {weekDates.map((date, dayIndex) => {
                const slotId = `${formatDate(date)}-${time}`;
                const isAvailable = isSlotAvailable(date, time);
                const slotType = getSlotType(date, time);
                const isSelected = selectedSlots.has(slotId);

                return (
                  <button
                    key={dayIndex}
                    className={`
                      p-3 border-r border-slate-200 last:border-r-0 transition-colors
                      ${isSelected
                        ? 'bg-amber-100 border-2 border-amber-500'
                        : isAvailable && slotType === 'recurring'
                        ? 'bg-emerald-100'
                        : isAvailable && slotType === 'one-time'
                        ? 'bg-blue-100'
                        : 'hover:bg-slate-50'
                      }
                    `}
                    onMouseDown={() => handleMouseDown(date, time)}
                    onMouseEnter={() => handleMouseEnter(date, time)}
                    onMouseUp={handleMouseUp}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={saveAvailability}
          disabled={selectedSlots.size === 0}
          className="gap-2"
        >
          Save {selectedSlots.size > 0 && `(${selectedSlots.size})`}
        </Button>
        <Button variant="outline" className="gap-2">
          <Copy className="w-4 h-4" />
          Copy from Last Week
        </Button>
        <Button variant="outline" onClick={clearWeek} className="gap-2 text-red-600">
          <Trash2 className="w-4 h-4" />
          Clear Week
        </Button>
      </div>

      {/* Recurring Patterns Modal */}
      {showRecurringModal && (
        <RecurringPatternsModal onClose={() => setShowRecurringModal(false)} />
      )}
    </div>
  );
}

// Helper functions
function generateTimeSlots() {
  const slots = [];
  for (let hour = 6; hour <= 21; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`);
    slots.push(`${hour.toString().padStart(2, '0')}:30`);
  }
  return slots;
}

function formatDate(date: Date) {
  return date.toISOString().split('T')[0];
}

function getEndTime(startTime: string) {
  const [hours, minutes] = startTime.split(':').map(Number);
  const endMinutes = minutes + 30;
  if (endMinutes >= 60) {
    return `${(hours + 1).toString().padStart(2, '0')}:00`;
  }
  return `${hours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
}
