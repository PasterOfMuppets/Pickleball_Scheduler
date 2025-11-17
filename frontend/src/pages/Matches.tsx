import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import MatchCard, { type Match } from '../components/MatchCard';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

type TabType = 'incoming' | 'outgoing' | 'upcoming' | 'past';

export default function Matches() {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('incoming');
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMatches();
  }, [activeTab, token]);

  const fetchMatches = async () => {
    if (!token || !user) return;

    setLoading(true);
    setError(null);

    try {
      let params: any = {};

      // Determine filters based on active tab
      if (activeTab === 'incoming') {
        params.status = 'pending';
        // Will filter on client side for player B
      } else if (activeTab === 'outgoing') {
        params.status = 'pending';
        // Will filter on client side for player A
      } else if (activeTab === 'upcoming') {
        params.status = 'confirmed';
        params.time = 'upcoming';
      } else if (activeTab === 'past') {
        params.time = 'past';
      }

      const response = await axios.get(`${API_BASE_URL}/api/matches`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params,
      });

      let filteredMatches = response.data;

      // Client-side filtering for incoming/outgoing
      if (activeTab === 'incoming') {
        filteredMatches = filteredMatches.filter(
          (match: Match) => match.player_b.id === user.id && match.status === 'pending'
        );
      } else if (activeTab === 'outgoing') {
        filteredMatches = filteredMatches.filter(
          (match: Match) => match.created_by === user.id && match.status === 'pending'
        );
      }

      setMatches(filteredMatches);
    } catch (err: any) {
      console.error('Error fetching matches:', err);
      setError(err.response?.data?.detail || 'Failed to load matches');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (matchId: number) => {
    if (!token) return;

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
      // Refresh matches after accepting
      fetchMatches();
    } catch (err: any) {
      console.error('Error accepting match:', err);
      alert(err.response?.data?.detail || 'Failed to accept match');
    }
  };

  const handleDecline = async (matchId: number) => {
    if (!token) return;

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
      // Refresh matches after declining
      fetchMatches();
    } catch (err: any) {
      console.error('Error declining match:', err);
      alert(err.response?.data?.detail || 'Failed to decline match');
    }
  };

  const handleCancel = async (matchId: number) => {
    const reason = prompt('Why are you canceling? (optional)');
    if (reason === null) return; // User clicked cancel

    if (!token) return;

    try {
      await axios.post(
        `${API_BASE_URL}/api/matches/${matchId}/cancel`,
        { reason: reason || undefined },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      // Refresh matches after canceling
      fetchMatches();
    } catch (err: any) {
      console.error('Error canceling match:', err);
      alert(err.response?.data?.detail || 'Failed to cancel match');
    }
  };

  const tabs: { key: TabType; label: string }[] = [
    { key: 'incoming', label: 'Incoming' },
    { key: 'outgoing', label: 'Outgoing' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'past', label: 'Past' },
  ];

  if (!user) {
    return <div>Please log in to view matches</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">My Matches</h1>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error}
        </div>
      ) : matches.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No matches found in this category.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {matches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              currentUserId={user.id}
              onAccept={handleAccept}
              onDecline={handleDecline}
              onCancel={handleCancel}
            />
          ))}
        </div>
      )}
    </div>
  );
}
