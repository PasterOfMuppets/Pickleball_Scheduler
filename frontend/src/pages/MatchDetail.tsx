import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { type Match } from '../components/MatchCard';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export default function MatchDetail() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchMatch();
  }, [matchId, token]);

  const fetchMatch = async () => {
    if (!token || !matchId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`${API_BASE_URL}/api/matches/${matchId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setMatch(response.data);
    } catch (err: any) {
      console.error('Error fetching match:', err);
      setError(err.response?.data?.detail || 'Failed to load match');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!token || !matchId) return;

    setSubmitting(true);
    try {
      await axios.post(
        `${API_BASE_URL}/api/matches/${matchId}/accept`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      // Refresh match data
      await fetchMatch();
    } catch (err: any) {
      console.error('Error accepting match:', err);
      alert(err.response?.data?.detail || 'Failed to accept match');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = async () => {
    if (!token || !matchId) return;

    if (!confirm('Are you sure you want to decline this challenge?')) return;

    setSubmitting(true);
    try {
      await axios.post(
        `${API_BASE_URL}/api/matches/${matchId}/decline`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      // Refresh match data
      await fetchMatch();
    } catch (err: any) {
      console.error('Error declining match:', err);
      alert(err.response?.data?.detail || 'Failed to decline match');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelSubmit = async () => {
    if (!token || !matchId) return;

    setSubmitting(true);
    try {
      await axios.post(
        `${API_BASE_URL}/api/matches/${matchId}/cancel`,
        { reason: cancelReason || undefined },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setShowCancelModal(false);
      // Refresh match data
      await fetchMatch();
    } catch (err: any) {
      console.error('Error canceling match:', err);
      alert(err.response?.data?.detail || 'Failed to cancel match');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error || 'Match not found'}
        </div>
        <button
          onClick={() => navigate('/matches')}
          className="mt-4 text-blue-600 hover:text-blue-800"
        >
          ← Back to Matches
        </button>
      </div>
    );
  }

  if (!user) return null;

  const isPlayerA = match.created_by === user.id;
  const isPlayerB = match.player_b.id === user.id;
  const opponent = isPlayerA ? match.player_b : match.player_a;

  const startDateTime = new Date(match.start_time);
  const endDateTime = new Date(match.end_time);
  const dateStr = startDateTime.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const timeStr = `${startDateTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })} - ${endDateTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })}`;

  const showAcceptDecline = match.status === 'pending' && isPlayerB;
  const showCancel =
    (match.status === 'pending' && isPlayerA) ||
    (match.status === 'confirmed' && (isPlayerA || isPlayerB));

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-green-100 text-green-800',
    declined: 'bg-red-100 text-red-800',
    expired: 'bg-gray-100 text-gray-800',
    canceled: 'bg-red-100 text-red-800',
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Back button */}
      <button
        onClick={() => navigate('/matches')}
        className="mb-4 text-blue-600 hover:text-blue-800 flex items-center"
      >
        ← Back to Matches
      </button>

      {/* Match card */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Match Details</h1>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              statusColors[match.status]
            }`}
          >
            {match.status.charAt(0).toUpperCase() + match.status.slice(1)}
          </span>
        </div>

        {/* Players */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">Player A (Challenger)</p>
            <p className="text-lg font-semibold text-gray-900">{match.player_a.name}</p>
            <p className="text-sm text-gray-600">{match.player_a.email}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">Player B (Challenged)</p>
            <p className="text-lg font-semibold text-gray-900">{match.player_b.name}</p>
            <p className="text-sm text-gray-600">{match.player_b.email}</p>
          </div>
        </div>

        {/* Match Info */}
        <div className="space-y-3 mb-6">
          <div className="flex items-start">
            <span className="text-2xl mr-3">📅</span>
            <div>
              <p className="text-sm text-gray-500">Date</p>
              <p className="text-base font-medium text-gray-900">{dateStr}</p>
            </div>
          </div>
          <div className="flex items-start">
            <span className="text-2xl mr-3">🕒</span>
            <div>
              <p className="text-sm text-gray-500">Time</p>
              <p className="text-base font-medium text-gray-900">{timeStr}</p>
            </div>
          </div>
        </div>

        {/* Cancellation reason */}
        {match.status === 'canceled' && match.cancellation_reason && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm font-medium text-red-900 mb-1">
              Cancellation Reason:
            </p>
            <p className="text-sm text-red-800">{match.cancellation_reason}</p>
          </div>
        )}

        {/* Timestamps */}
        <div className="border-t border-gray-200 pt-4 space-y-2 text-sm text-gray-600 mb-6">
          <p>
            Created: {new Date(match.created_at).toLocaleString()}
          </p>
          {match.confirmed_at && (
            <p>
              Confirmed: {new Date(match.confirmed_at).toLocaleString()}
            </p>
          )}
          {match.declined_at && (
            <p>
              Declined: {new Date(match.declined_at).toLocaleString()}
            </p>
          )}
          {match.canceled_at && (
            <p>
              Canceled: {new Date(match.canceled_at).toLocaleString()}
            </p>
          )}
        </div>

        {/* Actions */}
        {(showAcceptDecline || showCancel) && (
          <div className="flex gap-3">
            {showAcceptDecline && (
              <>
                <button
                  onClick={handleAccept}
                  disabled={submitting}
                  className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Processing...' : 'Accept Challenge'}
                </button>
                <button
                  onClick={handleDecline}
                  disabled={submitting}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Processing...' : 'Decline'}
                </button>
              </>
            )}
            {showCancel && (
              <button
                onClick={() => setShowCancelModal(true)}
                disabled={submitting}
                className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel Match
              </button>
            )}
          </div>
        )}
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Cancel Match?
            </h2>
            <p className="text-gray-700 mb-4">
              Are you sure you want to cancel your match with {opponent.name} on{' '}
              {dateStr} at {timeStr.split(' - ')[0]}?
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason (optional):
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="e.g., Something came up..."
              />
            </div>
            <p className="text-sm text-gray-600 mb-4">
              {opponent.name} will be notified.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelReason('');
                }}
                disabled={submitting}
                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50"
              >
                Go Back
              </button>
              <button
                onClick={handleCancelSubmit}
                disabled={submitting}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
              >
                {submitting ? 'Canceling...' : 'Yes, Cancel Match'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
