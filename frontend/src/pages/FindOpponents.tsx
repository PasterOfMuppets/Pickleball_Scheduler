import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import PlayerCard from '../components/PlayerCard';
import SharedCalendar from '../components/SharedCalendar';
import ChallengeModal from '../components/ChallengeModal';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface PlayerOverlap {
  user_id: number;
  name: string;
  email: string;
  overlap_hours: number;
  overlap_count: number;
}

interface TimeSlot {
  start_time: string;
  end_time: string;
  duration_minutes: number;
}

interface SharedAvailability {
  user_a_id: number;
  user_b_id: number;
  week_start: string;
  week_end: string;
  slots: TimeSlot[];
}

export default function FindOpponents() {
  const { token } = useAuth();
  const [players, setPlayers] = useState<PlayerOverlap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [sharedAvailability, setSharedAvailability] = useState<SharedAvailability | null>(null);
  const [loadingShared, setLoadingShared] = useState(false);

  const [showNoOverlap, setShowNoOverlap] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  useEffect(() => {
    fetchPlayers();
  }, [token]);

  const fetchPlayers = async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`${API_BASE_URL}/api/overlap`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setPlayers(response.data);
    } catch (err: any) {
      console.error('Error fetching overlaps:', err);
      setError(err.response?.data?.detail || 'Failed to load players');
    } finally {
      setLoading(false);
    }
  };

  const fetchSharedAvailability = async (userId: number) => {
    if (!token) return;

    setLoadingShared(true);

    try {
      const response = await axios.get(`${API_BASE_URL}/api/overlap/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setSharedAvailability(response.data);
    } catch (err: any) {
      console.error('Error fetching shared availability:', err);
      alert(err.response?.data?.detail || 'Failed to load shared availability');
    } finally {
      setLoadingShared(false);
    }
  };

  const handleViewSchedule = (userId: number) => {
    setSelectedPlayerId(userId);
    fetchSharedAvailability(userId);
  };

  const handleSlotClick = (slot: TimeSlot) => {
    setSelectedSlot(slot);
    setShowChallengeModal(true);
  };

  const handleChallengeSuccess = () => {
    setShowChallengeModal(false);
    setSelectedSlot(null);
    // Refresh data
    fetchPlayers();
    if (selectedPlayerId) {
      fetchSharedAvailability(selectedPlayerId);
    }
  };

  // Filter players based on search and toggle
  const filteredPlayers = players.filter((player) => {
    const matchesSearch =
      player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      player.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesOverlap = showNoOverlap || player.overlap_hours > 0;

    return matchesSearch && matchesOverlap;
  });

  const selectedPlayer = players.find((p) => p.user_id === selectedPlayerId);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Find Opponents</h1>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error}
        </div>
      )}

      {/* Search and Filters */}
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <label className="flex items-center space-x-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={showNoOverlap}
            onChange={(e) => setShowNoOverlap(e.target.checked)}
            className="rounded text-blue-600 focus:ring-blue-500"
          />
          <span>Show players with no overlap</span>
        </label>
      </div>

      {/* Desktop: Two-panel layout */}
      <div className="hidden lg:grid lg:grid-cols-3 gap-6">
        {/* Player List */}
        <div className="lg:col-span-1 space-y-3 max-h-[calc(100vh-16rem)] overflow-y-auto pr-2">
          {filteredPlayers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No players found</p>
            </div>
          ) : (
            filteredPlayers.map((player) => (
              <PlayerCard
                key={player.user_id}
                userId={player.user_id}
                name={player.name}
                email={player.email}
                overlapHours={player.overlap_hours}
                overlapCount={player.overlap_count}
                onViewSchedule={handleViewSchedule}
                isSelected={player.user_id === selectedPlayerId}
              />
            ))
          )}
        </div>

        {/* Shared Calendar */}
        <div className="lg:col-span-2">
          {selectedPlayerId && selectedPlayer ? (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Shared Availability with {selectedPlayer.name}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Click any time slot to send a challenge
                </p>
              </div>

              {loadingShared ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : sharedAvailability ? (
                <SharedCalendar
                  slots={sharedAvailability.slots}
                  onSlotClick={handleSlotClick}
                />
              ) : null}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
              <p className="text-gray-500 text-lg">
                Select a player to view shared availability
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile: List view */}
      <div className="lg:hidden space-y-3">
        {filteredPlayers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No players found</p>
          </div>
        ) : (
          filteredPlayers.map((player) => (
            <PlayerCard
              key={player.user_id}
              userId={player.user_id}
              name={player.name}
              email={player.email}
              overlapHours={player.overlap_hours}
              overlapCount={player.overlap_count}
              onViewSchedule={handleViewSchedule}
              isSelected={player.user_id === selectedPlayerId}
            />
          ))
        )}

        {/* Mobile: Shared availability modal-style view */}
        {selectedPlayerId && selectedPlayer && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
            <div className="min-h-screen p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-2xl mx-auto my-8">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">
                        {selectedPlayer.name}
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">
                        Shared availability
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedPlayerId(null)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ✕
                    </button>
                  </div>

                  {loadingShared ? (
                    <div className="flex justify-center items-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : sharedAvailability ? (
                    <SharedCalendar
                      slots={sharedAvailability.slots}
                      onSlotClick={handleSlotClick}
                    />
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Challenge Modal */}
      {showChallengeModal && selectedSlot && selectedPlayer && (
        <ChallengeModal
          isOpen={showChallengeModal}
          onClose={() => {
            setShowChallengeModal(false);
            setSelectedSlot(null);
          }}
          opponentId={selectedPlayer.user_id}
          opponentName={selectedPlayer.name}
          suggestedStartTime={selectedSlot.start_time}
          onSuccess={handleChallengeSuccess}
        />
      )}
    </div>
  );
}
