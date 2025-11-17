import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
  vacation_until?: string;
  created_at: string;
}

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [newStatus, setNewStatus] = useState<string>('');
  const [vacationUntil, setVacationUntil] = useState<string>('');

  useEffect(() => {
    fetchUsers();
  }, [statusFilter, searchTerm]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status_filter', statusFilter);
      if (searchTerm) params.append('search', searchTerm);

      const response = await axios.get(`/api/admin/users?${params.toString()}`);
      setUsers(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (userId: number) => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'vacation' && vacationUntil) {
        updateData.vacation_until = vacationUntil;
      }

      await axios.patch(`/api/admin/users/${userId}/status`, updateData);

      // Refresh users list
      await fetchUsers();

      // Clear editing state
      setEditingUserId(null);
      setNewStatus('');
      setVacationUntil('');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update user status');
    }
  };

  const handleImpersonate = async (userId: number) => {
    try {
      await axios.post(`/api/admin/impersonate/${userId}`);
      // Reload the page to refresh with impersonated context
      window.location.href = '/';
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to start impersonation');
    }
  };

  const startEditing = (user: User) => {
    setEditingUserId(user.id);
    setNewStatus(user.status);
    setVacationUntil(user.vacation_until || '');
  };

  const cancelEditing = () => {
    setEditingUserId(null);
    setNewStatus('');
    setVacationUntil('');
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Manage Users</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="vacation">Vacation</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search by Name or Email
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vacation Until
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className={user.role === 'admin' ? 'bg-blue-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                    {user.role === 'admin' && (
                      <span className="text-xs text-blue-600 font-semibold">ADMIN</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.phone || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingUserId === user.id ? (
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        className="text-sm px-2 py-1 border border-gray-300 rounded"
                      >
                        <option value="active">Active</option>
                        <option value="vacation">Vacation</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    ) : (
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.status === 'active' ? 'bg-green-100 text-green-800' :
                        user.status === 'vacation' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {user.status}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {editingUserId === user.id && newStatus === 'vacation' ? (
                      <input
                        type="date"
                        value={vacationUntil}
                        onChange={(e) => setVacationUntil(e.target.value)}
                        className="text-sm px-2 py-1 border border-gray-300 rounded"
                      />
                    ) : (
                      user.vacation_until ? new Date(user.vacation_until).toLocaleDateString() : '-'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    {editingUserId === user.id ? (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(user.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        {user.role !== 'admin' && (
                          <>
                            <button
                              onClick={() => startEditing(user)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Edit Status
                            </button>
                            <button
                              onClick={() => handleImpersonate(user.id)}
                              className="text-purple-600 hover:text-purple-900"
                            >
                              Impersonate
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {users.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-500">
          No users found.
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
