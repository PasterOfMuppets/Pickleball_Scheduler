import React, { useState } from 'react';
import axios from 'axios';

interface ChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  opponentId: number;
  opponentName: string;
  suggestedStartTime?: string; // ISO format
  onSuccess?: () => void;
}

const ChallengeModal: React.FC<ChallengeModalProps> = ({
  isOpen,
  onClose,
  opponentId,
  opponentName,
  suggestedStartTime,
  onSuccess,
}) => {
  const [startTime, setStartTime] = useState<string>(
    suggestedStartTime || new Date().toISOString().slice(0, 16)
  );
  const [duration, setDuration] = useState<number>(90); // minutes
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Calculate end time
      const start = new Date(startTime);
      const end = new Date(start.getTime() + duration * 60000);

      await axios.post('/api/matches', {
        player_b_id: opponentId,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
      });

      alert('Challenge sent successfully!');
      onSuccess?.();
      onClose();
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Failed to send challenge';
      setError(errorMsg);
      console.error('Error sending challenge:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Challenge {opponentName}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Start Time */}
          <div className="mb-4">
            <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-2">
              Start Time
            </label>
            <input
              type="datetime-local"
              id="startTime"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Select a time when you're both available
            </p>
          </div>

          {/* Duration */}
          <div className="mb-6">
            <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
              Duration
            </label>
            <div className="flex gap-2">
              {[60, 90, 120].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={`flex-1 py-2 px-4 rounded-md font-medium ${
                    duration === d
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {d} min
                </button>
              ))}
            </div>
          </div>

          {/* Match Summary */}
          <div className="mb-6 p-4 bg-blue-50 rounded-md">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">Match Summary</h3>
            <p className="text-sm text-blue-800">
              <strong>Opponent:</strong> {opponentName}
            </p>
            <p className="text-sm text-blue-800">
              <strong>Start:</strong>{' '}
              {new Date(startTime).toLocaleString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              })}
            </p>
            <p className="text-sm text-blue-800">
              <strong>Duration:</strong> {duration} minutes
            </p>
            <p className="text-sm text-blue-800">
              <strong>End:</strong>{' '}
              {new Date(new Date(startTime).getTime() + duration * 60000).toLocaleString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              })}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Challenge'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChallengeModal;
