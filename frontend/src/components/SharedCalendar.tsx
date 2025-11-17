interface TimeSlot {
  start_time: string;
  end_time: string;
  duration_minutes: number;
}

interface SharedCalendarProps {
  slots: TimeSlot[];
  onSlotClick: (slot: TimeSlot) => void;
}

export default function SharedCalendar({ slots, onSlotClick }: SharedCalendarProps) {
  // Group slots by day
  const slotsByDay: { [key: string]: TimeSlot[] } = {};

  slots.forEach((slot) => {
    const date = new Date(slot.start_time);
    const dayKey = date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });

    if (!slotsByDay[dayKey]) {
      slotsByDay[dayKey] = [];
    }
    slotsByDay[dayKey].push(slot);
  });

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (slots.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">
          No shared availability this week
        </p>
        <p className="text-gray-400 text-sm mt-2">
          Try checking your recurring patterns or the next week
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop: Grid view */}
      <div className="hidden md:block space-y-4">
        {Object.entries(slotsByDay).map(([day, daySlots]) => (
          <div key={day} className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">{day}</h3>
            <div className="grid grid-cols-2 gap-2">
              {daySlots.map((slot, index) => (
                <button
                  key={index}
                  onClick={() => onSlotClick(slot)}
                  className="bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg p-3 text-left transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-900">
                        {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                      </p>
                      <p className="text-xs text-green-700 mt-1">
                        {slot.duration_minutes} minutes
                      </p>
                    </div>
                    <span className="text-green-600 text-xl">→</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Mobile: List view */}
      <div className="md:hidden space-y-2">
        {slots.map((slot, index) => {
          const date = new Date(slot.start_time);
          const dayStr = date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          });

          return (
            <button
              key={index}
              onClick={() => onSlotClick(slot)}
              className="w-full bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg p-4 text-left transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{dayStr}</p>
                  <p className="text-base font-semibold text-green-900 mt-1">
                    {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    {slot.duration_minutes} minutes available
                  </p>
                </div>
                <span className="text-green-600 text-2xl">→</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-900">
          <span className="font-semibold">{slots.length}</span> shared time{' '}
          {slots.length === 1 ? 'slot' : 'slots'} available this week. Click any
          slot to send a challenge.
        </p>
      </div>
    </div>
  );
}
