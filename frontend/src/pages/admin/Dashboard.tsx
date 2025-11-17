import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

interface Analytics {
  total_users: number;
  active_users: number;
  users_on_vacation: number;
  inactive_users: number;
  total_matches: number;
  pending_matches: number;
  confirmed_matches: number;
  completed_matches: number;
  canceled_matches: number;
  matches_this_week: number;
  matches_last_week: number;
  cancellation_rate: number;
}

const AdminDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/analytics');
      setAnalytics(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link
          to="/admin/users"
          className="bg-blue-600 text-white p-6 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <h3 className="text-xl font-semibold mb-2">Manage Users</h3>
          <p className="text-blue-100">View and manage all users</p>
        </Link>
        <Link
          to="/admin/matches"
          className="bg-green-600 text-white p-6 rounded-lg hover:bg-green-700 transition-colors"
        >
          <h3 className="text-xl font-semibold mb-2">Manage Matches</h3>
          <p className="text-green-100">View and manage all matches</p>
        </Link>
        <Link
          to="/admin/action-log"
          className="bg-purple-600 text-white p-6 rounded-lg hover:bg-purple-700 transition-colors"
        >
          <h3 className="text-xl font-semibold mb-2">Action Log</h3>
          <p className="text-purple-100">View admin action history</p>
        </Link>
      </div>

      {/* User Statistics */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">User Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="text-gray-500 text-sm mb-1">Total Users</div>
            <div className="text-3xl font-bold text-gray-900">{analytics.total_users}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="text-gray-500 text-sm mb-1">Active Users</div>
            <div className="text-3xl font-bold text-green-600">{analytics.active_users}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="text-gray-500 text-sm mb-1">On Vacation</div>
            <div className="text-3xl font-bold text-yellow-600">{analytics.users_on_vacation}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="text-gray-500 text-sm mb-1">Inactive</div>
            <div className="text-3xl font-bold text-red-600">{analytics.inactive_users}</div>
          </div>
        </div>
      </div>

      {/* Match Statistics */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Match Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="text-gray-500 text-sm mb-1">Total Matches</div>
            <div className="text-3xl font-bold text-gray-900">{analytics.total_matches}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="text-gray-500 text-sm mb-1">This Week</div>
            <div className="text-3xl font-bold text-blue-600">{analytics.matches_this_week}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="text-gray-500 text-sm mb-1">Last Week</div>
            <div className="text-3xl font-bold text-gray-600">{analytics.matches_last_week}</div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="text-gray-500 text-sm mb-1">Pending</div>
            <div className="text-3xl font-bold text-yellow-600">{analytics.pending_matches}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="text-gray-500 text-sm mb-1">Confirmed</div>
            <div className="text-3xl font-bold text-green-600">{analytics.confirmed_matches}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="text-gray-500 text-sm mb-1">Completed</div>
            <div className="text-3xl font-bold text-blue-600">{analytics.completed_matches}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="text-gray-500 text-sm mb-1">Canceled</div>
            <div className="text-3xl font-bold text-red-600">{analytics.canceled_matches}</div>
          </div>
        </div>
      </div>

      {/* Cancellation Rate */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Performance Metrics</h2>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-gray-500 text-sm mb-1">Cancellation Rate</div>
              <div className="text-3xl font-bold text-gray-900">{analytics.cancellation_rate}%</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">
                {analytics.canceled_matches} canceled out of{' '}
                {analytics.canceled_matches + analytics.confirmed_matches + analytics.completed_matches} total
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
