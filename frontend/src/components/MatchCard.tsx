import React from 'react';
import { useNavigate } from 'react-router-dom';

export interface Match {
  id: number;
  player_a_id: number;
  player_b_id: number;
  player_a?: {
    id: number;
    name: string;
    email: string;
  };
  player_b?: {
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

const MatchCard: React.FC<MatchCardProps> = ({
  match,
  currentUserId,
  onAccept,
  onDecline,
  onCancel,
}) => {
  const navigate = useNavigate();

  // Determine if current user is player A or B
  const isPlayerA = match.player_a_id === currentUserId;
  const isPlayerB = match.player_b_id === currentUserId;
  const opponent = isPlayerA ? match.player_b : match.player_a;

  // Format date and time
  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const dateOptions: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    };
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    };

    return {
      date: date.toLocaleDateString('en-US', dateOptions),
      time: date.toLocaleTimeString('en-US', timeOptions),
    };
  };

  const { date, time } = formatDateTime(match.start_time);
  const endTime = new Date(match.end_time).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  // Status badge styling
  const getStatusBadge = () => {
    const baseClasses = 'px-2 py-1 rounded-full text-xs font-semibold';
    switch (match.status) {
      case 'pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'confirmed':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'declined':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'expired':
        return `${baseClasses} bg-gray-100 text-gray-800`;
      case 'canceled':
        return `${baseClasses} bg-orange-100 text-orange-800`;
      default:
        return baseClasses;
    }
  };

  // Determine what actions are available
  const showAcceptDecline = match.status === 'pending' && isPlayerB;
  const showCancel = (match.status === 'pending' || match.status === 'confirmed') && (isPlayerA || isPlayerB);

  return (
    <div
      className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => navigate(`/matches/${match.id}`)}
    >
      {/* Header: Opponent and Status */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {opponent?.name || 'Unknown Player'}
          </h3>
          <p className="text-sm text-gray-600">
            {isPlayerA ? 'You challenged' : 'Challenged you'}
          </p>
        </div>
        <span className={getStatusBadge()}>
          {match.status.charAt(0).toUpperCase() + match.status.slice(1)}
        </span>
      </div>

      {/* Date and Time */}
      <div className="mb-4">
        <p className="text-sm font-medium text-gray-700">{date}</p>
        <p className="text-sm text-gray-600">
          {time} - {endTime}
        </p>
      </div>

      {/* Cancellation Reason (if applicable) */}
      {match.status === 'canceled' && match.cancellation_reason && (
        <div className="mb-3 p-2 bg-orange-50 rounded border border-orange-200">
          <p className="text-xs font-semibold text-orange-800 mb-1">Cancellation Reason:</p>
          <p className="text-sm text-orange-700">{match.cancellation_reason}</p>
        </div>
      )}

      {/* Actions */}
      {(showAcceptDecline || showCancel) && (
        <div className="flex gap-2 mt-4">
          {showAcceptDecline && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAccept?.(match.id);
                }}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Accept
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDecline?.(match.id);
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Decline
              </button>
            </>
          )}
          {showCancel && !showAcceptDecline && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCancel?.(match.id);
              }}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Cancel Match
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default MatchCard;
