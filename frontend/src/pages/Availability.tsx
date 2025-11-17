import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

interface RecurringPattern {
  id: number;
  user_id: number;
  day_of_week: number;
  start_time_local: string;
  end_time_local: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface AvailabilityBlock {
  id: number;
  user_id: number;
  start_time: string;
  end_time: string;
  generated_from_recurring: number | null;
  created_at: string;
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const Availability: React.FC = () => {
  const { token } = useAuth();
  const [patterns, setPatterns] = useState<RecurringPattern[]>([]);
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
  const [activeTab, setActiveTab] = useState<'patterns' | 'blocks'>('patterns');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form state for new pattern
  const [newPattern, setNewPattern] = useState({
    day_of_week: 1,
    start_time: '19:00',
    end_time: '21:00',
    enabled: true,
  });

  useEffect(() => {
    if (token) {
      loadPatterns();
      loadBlocks();
    }
  }, [token]);

  const loadPatterns = async () => {
    try {
      const response = await axios.get('/api/availability/patterns');
      setPatterns(response.data);
    } catch (err) {
      console.error('Failed to load patterns:', err);
    }
  };

  const loadBlocks = async () => {
    try {
      // Load next 2 weeks
      const now = new Date();
      const twoWeeksLater = new Date();
      twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);

      const response = await axios.get('/api/availability/blocks', {
        params: {
          start_date: now.toISOString(),
          end_date: twoWeeksLater.toISOString(),
        },
      });
      setBlocks(response.data);
    } catch (err) {
      console.error('Failed to load blocks:', err);
    }
  };

  const handleCreatePattern = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await axios.post('/api/availability/patterns', newPattern);
      await loadPatterns();
      await loadBlocks();
      // Reset form
      setNewPattern({
        day_of_week: 1,
        start_time: '19:00',
        end_time: '21:00',
        enabled: true,
      });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create pattern');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePattern = async (patternId: number) => {
    if (!confirm('Delete this recurring pattern? This will also delete all generated availability blocks.')) {
      return;
    }

    try {
      await axios.delete(`/api/availability/patterns/${patternId}`);
      await loadPatterns();
      await loadBlocks();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete pattern');
    }
  };

  const handleTogglePattern = async (patternId: number, currentEnabled: boolean) => {
    try {
      await axios.put(`/api/availability/patterns/${patternId}`, {
        enabled: !currentEnabled,
      });
      await loadPatterns();
      await loadBlocks();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update pattern');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">My Availability</h1>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('patterns')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'patterns'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Recurring Patterns
          </button>
          <button
            onClick={() => setActiveTab('blocks')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'blocks'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Generated Blocks ({blocks.length})
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'patterns' && (
        <div className="space-y-6">
          {/* Create Pattern Form */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Add Recurring Pattern</h2>
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
            <form onSubmit={handleCreatePattern} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Day of Week
                </label>
                <select
                  value={newPattern.day_of_week}
                  onChange={(e) => setNewPattern({ ...newPattern, day_of_week: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  {DAY_NAMES.map((day, index) => (
                    <option key={index} value={index + 1}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={newPattern.start_time}
                  onChange={(e) => setNewPattern({ ...newPattern, start_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  value={newPattern.end_time}
                  onChange={(e) => setNewPattern({ ...newPattern, end_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add Pattern'}
                </button>
              </div>
            </form>
          </div>

          {/* Existing Patterns */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">My Recurring Patterns</h2>
            {patterns.length === 0 ? (
              <p className="text-gray-500">No recurring patterns set. Add one above to get started!</p>
            ) : (
              <div className="space-y-3">
                {patterns.map((pattern) => (
                  <div
                    key={pattern.id}
                    className={`flex items-center justify-between p-4 border rounded-md ${
                      pattern.enabled ? 'border-gray-200 bg-white' : 'border-gray-300 bg-gray-50'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {DAY_NAMES[pattern.day_of_week - 1]}
                      </div>
                      <div className="text-sm text-gray-600">
                        {pattern.start_time_local} - {pattern.end_time_local}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {pattern.enabled ? 'Active' : 'Disabled'}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleTogglePattern(pattern.id, pattern.enabled)}
                        className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded"
                      >
                        {pattern.enabled ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={() => handleDeletePattern(pattern.id)}
                        className="px-3 py-1 text-sm bg-red-100 text-red-700 hover:bg-red-200 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'blocks' && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Generated Availability Blocks (Next 2 Weeks)</h2>
          {blocks.length === 0 ? (
            <p className="text-gray-500">
              No availability blocks generated yet. Create a recurring pattern to generate blocks automatically.
            </p>
          ) : (
            <div className="space-y-2">
              {blocks.slice(0, 50).map((block) => (
                <div
                  key={block.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded"
                >
                  <div>
                    <div className="font-medium text-gray-900">
                      {new Date(block.start_time).toLocaleString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </div>
                    <div className="text-sm text-gray-600">
                      {block.generated_from_recurring ? 'From recurring pattern' : 'Manual block'}
                    </div>
                  </div>
                </div>
              ))}
              {blocks.length > 50 && (
                <p className="text-sm text-gray-500 text-center pt-2">
                  ... and {blocks.length - 50} more blocks
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Availability;
