import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Match } from '../components/MatchCard';

const MatchDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [cancellationReason, setCancellationReason] = useState<string>('');

  useEffect(() => {
    fetchMatch();
  }, [id]);

  const fetchMatch = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`/api/matches/${id}`);
      setMatch(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch match');
      console.error('Error fetching match:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    try {
      await axios.post(`/api/matches/${id}/accept`);
      alert('Match accepted!');
      fetchMatch();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to accept match');
    }
  };

  const handleDecline = async () => {
    if (!confirm('Are you sure you want to decline this challenge?')) {
      return;
    }

    try {
      await axios.post(`/api/matches/${id}/decline`);
      alert('Match declined');
      navigate('/matches');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to decline match');
    }
  };

  const handleCancelSubmit = async () => {
    try {
      await axios.post(`/api/matches/${id}/cancel`, {
        cancellation_reason: cancellationReason || undefined,
      });
      alert('Match canceled');
      setShowCancelModal(false);
      navigate('/matches');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to cancel match');
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p className="text-gray-600">Loading match details...</p>
        </div>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error || 'Match not found'}</p>
          <button
            onClick={() => navigate('/matches')}
            className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to Matches
          </button>
        </div>
      </div>
    );
  }

  const isPlayerA = match.player_a_id === user?.id;
  const isPlayerB = match.player_b_id === user?.id;
  const opponent = isPlayerA ? match.player_b : match.player_a;

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      date: date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
    };
  };

  const startDateTime = formatDateTime(match.start_time);
  const endTime = new Date(match.end_time).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const duration = Math.round(
    (new Date(match.end_time).getTime() - new Date(match.start_time).getTime()) / (1000 * 60)
  );

  const showAcceptDecline = match.status === 'pending' && isPlayerB;
  const showCancel =
    (match.status === 'pending' || match.status === 'confirmed') && (isPlayerA || isPlayerB);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <button
        onClick={() => navigate('/matches')}
        className="mb-4 text-blue-600 hover:text-blue-800 font-medium flex items-center"
      >
        ← Back to Matches
      </button>

      {/* Match Card */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{opponent?.name || 'Unknown Player'}</h1>
            <p className="text-gray-600 mt-1">{opponent?.email}</p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-sm font-semibold ${
              match.status === 'pending'
                ? 'bg-yellow-100 text-yellow-800'
                : match.status === 'confirmed'
                ? 'bg-green-100 text-green-800'
                : match.status === 'declined'
                ? 'bg-red-100 text-red-800'
                : match.status === 'expired'
                ? 'bg-gray-100 text-gray-800'
                : 'bg-orange-100 text-orange-800'
            }`}
          >
            {match.status.charAt(0).toUpperCase() + match.status.slice(1)}
          </span>
        </div>

        {/* Match Details */}
        <div className="space-y-4 mb-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase">Date</h3>
            <p className="text-lg text-gray-900">{startDateTime.date}</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase">Time</h3>
            <p className="text-lg text-gray-900">
              {startDateTime.time} - {endTime}
            </p>
            <p className="text-sm text-gray-600">{duration} minutes</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase">Challenge Details</h3>
            <p className="text-sm text-gray-700">
              {isPlayerA ? 'You challenged' : 'You were challenged by'} {opponent?.name}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Created {new Date(match.created_at).toLocaleString()}
            </p>
          </div>

          {match.status === 'confirmed' && match.confirmed_at && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase">Confirmed</h3>
              <p className="text-sm text-gray-700">
                {new Date(match.confirmed_at).toLocaleString()}
              </p>
            </div>
          )}

          {match.status === 'canceled' && match.cancellation_reason && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-md">
              <h3 className="text-sm font-semibold text-orange-800 uppercase mb-2">
                Cancellation Reason
              </h3>
              <p className="text-sm text-orange-700">{match.cancellation_reason}</p>
              {match.canceled_at && (
                <p className="text-xs text-orange-600 mt-2">
                  Canceled {new Date(match.canceled_at).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        {(showAcceptDecline || showCancel) && (
          <div className="border-t pt-6">
            {showAcceptDecline && (
              <div className="flex gap-4">
                <button
                  onClick={handleAccept}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-md font-medium"
                >
                  Accept Challenge
                </button>
                <button
                  onClick={handleDecline}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-md font-medium"
                >
                  Decline
                </button>
              </div>
            )}

            {showCancel && !showAcceptDecline && (
              <button
                onClick={() => setShowCancelModal(true)}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-md font-medium"
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
            <h2 className="text-xl font-bold text-gray-900 mb-4">Cancel Match</h2>
            <p className="text-gray-600 mb-4">
              Are you sure you want to cancel this match? You can optionally provide a reason.
            </p>

            <textarea
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              placeholder="Cancellation reason (optional)"
              className="w-full border border-gray-300 rounded-md px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              maxLength={500}
            />

            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md font-medium"
              >
                Keep Match
              </button>
              <button
                onClick={handleCancelSubmit}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md font-medium"
              >
                Cancel Match
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchDetail;
