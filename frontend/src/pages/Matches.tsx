import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import MatchCard, { Match } from '../components/MatchCard';

type TabType = 'incoming' | 'outgoing' | 'upcoming' | 'past';

const Matches: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('incoming');
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get('/api/matches', {
        params: {
          include_past: true,
          limit: 100,
        },
      });
      setMatches(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch matches');
      console.error('Error fetching matches:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (matchId: number) => {
    try {
      await axios.post(`/api/matches/${matchId}/accept`);
      // Refresh matches
      fetchMatches();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to accept match');
    }
  };

  const handleDecline = async (matchId: number) => {
    try {
      await axios.post(`/api/matches/${matchId}/decline`);
      // Refresh matches
      fetchMatches();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to decline match');
    }
  };

  const handleCancel = async (matchId: number) => {
    const reason = prompt('Optional: Enter a cancellation reason');
    try {
      await axios.post(`/api/matches/${matchId}/cancel`, {
        cancellation_reason: reason || undefined,
      });
      // Refresh matches
      fetchMatches();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to cancel match');
    }
  };

  // Filter matches based on active tab
  const getFilteredMatches = (): Match[] => {
    if (!user) return [];

    const now = new Date();

    switch (activeTab) {
      case 'incoming':
        // Pending challenges where current user is player B
        return matches.filter(
          (m) => m.status === 'pending' && m.player_b_id === user.id
        );

      case 'outgoing':
        // Pending challenges where current user is player A
        return matches.filter(
          (m) => m.status === 'pending' && m.player_a_id === user.id
        );

      case 'upcoming':
        // Confirmed matches in the future
        return matches.filter(
          (m) => m.status === 'confirmed' && new Date(m.start_time) > now
        );

      case 'past':
        // All past matches (confirmed, declined, expired, canceled)
        return matches.filter(
          (m) =>
            m.status !== 'pending' &&
            (m.status !== 'confirmed' || new Date(m.start_time) <= now)
        );

      default:
        return [];
    }
  };

  const filteredMatches = getFilteredMatches();

  const tabs: { key: TabType; label: string }[] = [
    { key: 'incoming', label: 'Incoming' },
    { key: 'outgoing', label: 'Outgoing' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'past', label: 'Past' },
  ];

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p className="text-gray-600">Loading matches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">My Matches</h1>
        <p className="text-gray-600 mt-2">View and manage your match challenges</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm
                ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.label}
              {filteredMatches.length > 0 && activeTab === tab.key && (
                <span className="ml-2 bg-blue-100 text-blue-600 py-0.5 px-2 rounded-full text-xs">
                  {filteredMatches.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Matches Grid */}
      {filteredMatches.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No matches to display</p>
          <p className="text-gray-400 mt-2">
            {activeTab === 'incoming' && 'You have no pending challenges'}
            {activeTab === 'outgoing' && "You haven't challenged anyone yet"}
            {activeTab === 'upcoming' && 'You have no upcoming matches'}
            {activeTab === 'past' && 'You have no past matches'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMatches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              currentUserId={user!.id}
              onAccept={handleAccept}
              onDecline={handleDecline}
              onCancel={handleCancel}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Matches;
