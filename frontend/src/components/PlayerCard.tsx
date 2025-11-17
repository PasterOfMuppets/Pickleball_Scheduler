interface PlayerCardProps {
  userId: number;
  name: string;
  email: string;
  overlapHours: number;
  overlapCount: number;
  onViewSchedule: (userId: number) => void;
  isSelected?: boolean;
}

export default function PlayerCard({
  userId,
  name,
  email,
  overlapHours,
  overlapCount,
  onViewSchedule,
  isSelected = false,
}: PlayerCardProps) {
  return (
    <div
      className={`bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow cursor-pointer ${
        isSelected ? 'ring-2 ring-blue-500' : ''
      }`}
      onClick={() => onViewSchedule(userId)}
    >
      {/* Player Info */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
          <p className="text-sm text-gray-600">{email}</p>
        </div>
        {overlapHours > 0 && (
          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
            {overlapHours}h
          </span>
        )}
      </div>

      {/* Overlap Stats */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center text-gray-600">
          <span className="mr-1">🕒</span>
          <span>
            {overlapHours > 0
              ? `${overlapHours} hours available`
              : 'No overlap this week'}
          </span>
        </div>
        {overlapCount > 0 && (
          <span className="text-gray-500 text-xs">
            {overlapCount} {overlapCount === 1 ? 'slot' : 'slots'}
          </span>
        )}
      </div>

      {/* View Schedule Button (visible on hover/selected) */}
      {overlapHours > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewSchedule(userId);
          }}
          className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md text-sm font-medium transition-colors"
        >
          View Shared Schedule
        </button>
      )}
    </div>
  );
}
