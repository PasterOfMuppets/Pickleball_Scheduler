import { useNavigate } from 'react-router-dom';

export interface Match {
  id: number;
  player_a: {
    id: number;
    name: string;
    email: string;
  };
  player_b: {
    id: number;
    name: string;
    email: string;
  };
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'declined' | 'expired' | 'canceled';
  created_by: number;
  canceled_by?: number;
  cancellation_reason?: string;
  created_at: string;
  confirmed_at?: string;
  declined_at?: string;
  canceled_at?: string;
  updated_at: string;
}

interface MatchCardProps {
  match: Match;
  currentUserId: number;
  onAccept?: (matchId: number) => void;
  onDecline?: (matchId: number) => void;
  onCancel?: (matchId: number) => void;
}

export default function MatchCard({
  match,
  currentUserId,
  onAccept,
  onDecline,
  onCancel,
}: MatchCardProps) {
  const navigate = useNavigate();

  // Determine if current user is player A or B
  const isPlayerA = match.created_by === currentUserId;
  const isPlayerB = match.player_b.id === currentUserId;
  const opponent = isPlayerA ? match.player_b : match.player_a;

  // Format date and time
  const startDateTime = new Date(match.start_time);
  const endDateTime = new Date(match.end_time);
  const dateStr = startDateTime.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = `${startDateTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })} - ${endDateTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })}`;

  // Status badge colors
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-green-100 text-green-800',
    declined: 'bg-red-100 text-red-800',
    expired: 'bg-gray-100 text-gray-800',
    canceled: 'bg-red-100 text-red-800',
  };

  // Determine available actions
  const showAcceptDecline = match.status === 'pending' && isPlayerB;
  const showCancel =
    (match.status === 'pending' && isPlayerA) ||
    (match.status === 'confirmed' && (isPlayerA || isPlayerB));

  return (
    <div
      className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => navigate(`/matches/${match.id}`)}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            vs {opponent.name}
          </h3>
          <p className="text-sm text-gray-500">{opponent.email}</p>
        </div>
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            statusColors[match.status]
          }`}
        >
          {match.status.charAt(0).toUpperCase() + match.status.slice(1)}
        </span>
      </div>

      {/* Match Info */}
      <div className="space-y-1 mb-4">
        <p className="text-sm text-gray-700">
          <span className="font-medium">📅 {dateStr}</span>
        </p>
        <p className="text-sm text-gray-700">
          <span className="font-medium">🕒 {timeStr}</span>
        </p>
      </div>

      {/* Direction indicator */}
      {match.status === 'pending' && (
        <p className="text-xs text-gray-500 mb-3">
          {isPlayerA ? '→ Sent to ' + opponent.name : '← From ' + opponent.name}
        </p>
      )}

      {/* Cancellation reason */}
      {match.status === 'canceled' && match.cancellation_reason && (
        <div className="bg-red-50 border border-red-200 rounded p-2 mb-3">
          <p className="text-xs text-red-800">
            <span className="font-medium">Reason:</span>{' '}
            {match.cancellation_reason}
          </p>
        </div>
      )}

      {/* Actions */}
      {(showAcceptDecline || showCancel) && (
        <div
          className="flex gap-2"
          onClick={(e) => e.stopPropagation()} // Prevent card click
        >
          {showAcceptDecline && (
            <>
              <button
                onClick={() => onAccept && onAccept(match.id)}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition-colors text-sm font-medium"
              >
                Accept
              </button>
              <button
                onClick={() => onDecline && onDecline(match.id)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded hover:bg-gray-300 transition-colors text-sm font-medium"
              >
                Decline
              </button>
            </>
          )}
          {showCancel && (
            <button
              onClick={() => onCancel && onCancel(match.id)}
              className="flex-1 bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
          )}
        </div>
      )}
    </div>
  );
}
