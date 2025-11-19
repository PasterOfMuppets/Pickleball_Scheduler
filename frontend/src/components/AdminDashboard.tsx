import { useState, useEffect } from 'react';
import { Users, Calendar, Ban, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface Stats {
  total_users: number;
  active_users: number;
  vacation_users: number;
  inactive_users: number;
  total_matches: number;
  confirmed_matches: number;
  pending_matches: number;
  canceled_matches: number;
}

export function AdminDashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchStats();
    }
  }, [token]);

  const fetchStats = async () => {
    if (!token) return;

    try {
      // Fetch stats from admin endpoint (you may need to create this)
      const [usersRes, matchesRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/admin/users`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_BASE_URL}/api/admin/matches`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const users = usersRes.data;
      const matches = matchesRes.data;

      const calculatedStats: Stats = {
        total_users: users.length,
        active_users: users.filter((u: any) => u.status === 'active').length,
        vacation_users: users.filter((u: any) => u.status === 'vacation').length,
        inactive_users: users.filter((u: any) => u.status === 'inactive').length,
        total_matches: matches.length,
        confirmed_matches: matches.filter((m: any) => m.status === 'confirmed').length,
        pending_matches: matches.filter((m: any) => m.status === 'pending').length,
        canceled_matches: matches.filter((m: any) => m.status === 'canceled').length,
      };

      setStats(calculatedStats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-4 md:p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Failed to load admin dashboard</p>
        </div>
      </div>
    );
  }

  const cancelRate = stats.total_matches > 0
    ? ((stats.canceled_matches / stats.total_matches) * 100).toFixed(1)
    : '0';

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-slate-500 mt-1">Manage players, matches, and system settings</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold">{stats.total_users}</div>
          </div>
          <div className="text-slate-600 font-medium">Total Players</div>
          <div className="text-sm text-slate-500 mt-1">
            {stats.active_users} active, {stats.vacation_users} on vacation
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold">{stats.confirmed_matches}</div>
          </div>
          <div className="text-slate-600 font-medium">Confirmed Matches</div>
          <div className="text-sm text-slate-500 mt-1">
            {stats.pending_matches} pending
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <Ban className="w-5 h-5 text-red-600" />
            </div>
            <div className="text-2xl font-bold">{cancelRate}%</div>
          </div>
          <div className="text-slate-600 font-medium">Cancel Rate</div>
          <div className="text-sm text-slate-500 mt-1">
            {stats.canceled_matches} of {stats.total_matches} matches
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-purple-600" />
            </div>
            <div className="text-2xl font-bold">{stats.total_matches}</div>
          </div>
          <div className="text-slate-600 font-medium">Total Matches</div>
          <div className="text-sm text-slate-500 mt-1">
            All time
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h2 className="text-xl font-semibold mb-4">Admin Pages</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <a
            href="/admin/users"
            className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <h3 className="font-medium">User Management</h3>
            <p className="text-sm text-slate-500 mt-1">View and manage all users</p>
          </a>
          <a
            href="/admin/matches"
            className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <h3 className="font-medium">Match Management</h3>
            <p className="text-sm text-slate-500 mt-1">View and manage all matches</p>
          </a>
          <a
            href="/admin/action-log"
            className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <h3 className="font-medium">Action Log</h3>
            <p className="text-sm text-slate-500 mt-1">View admin action history</p>
          </a>
        </div>
      </div>
    </div>
  );
}
