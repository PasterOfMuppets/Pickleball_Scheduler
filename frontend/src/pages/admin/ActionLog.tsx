import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface ActionLogEntry {
  id: number;
  admin_id: number;
  admin_name: string;
  acting_as_user_id?: number;
  acting_as_user_name?: string;
  action: string;
  resource_type?: string;
  resource_id?: number;
  metadata?: any;
  description?: string;
  timestamp: string;
}

const AdminActionLog: React.FC = () => {
  const [entries, setEntries] = useState<ActionLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adminIdFilter, setAdminIdFilter] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<string>('');
  const [expandedEntry, setExpandedEntry] = useState<number | null>(null);

  useEffect(() => {
    fetchActionLog();
  }, [adminIdFilter, actionFilter]);

  const fetchActionLog = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (adminIdFilter) params.append('admin_id', adminIdFilter);
      if (actionFilter) params.append('action', actionFilter);

      const response = await axios.get(`/api/admin/action-log?${params.toString()}`);
      setEntries(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load action log');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const getActionColor = (action: string) => {
    if (action.includes('impersonate')) return 'bg-purple-100 text-purple-800';
    if (action.includes('cancel')) return 'bg-red-100 text-red-800';
    if (action.includes('update')) return 'bg-blue-100 text-blue-800';
    if (action.includes('delete')) return 'bg-red-100 text-red-800';
    if (action.includes('create')) return 'bg-green-100 text-green-800';
    return 'bg-gray-100 text-gray-800';
  };

  const toggleExpanded = (entryId: number) => {
    setExpandedEntry(expandedEntry === entryId ? null : entryId);
  };

  if (loading && entries.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Action Log</h1>

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
              Filter by Admin ID
            </label>
            <input
              type="number"
              value={adminIdFilter}
              onChange={(e) => setAdminIdFilter(e.target.value)}
              placeholder="Enter admin ID..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Action Type
            </label>
            <input
              type="text"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              placeholder="e.g., impersonate_start, update_user_status..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Action Log Entries */}
      <div className="space-y-4">
        {entries.map((entry) => (
          <div key={entry.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div
              className="p-4 cursor-pointer hover:bg-gray-50"
              onClick={() => toggleExpanded(entry.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${getActionColor(entry.action)}`}>
                      {entry.action}
                    </span>
                    <span className="text-sm text-gray-500">
                      {formatDateTime(entry.timestamp)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-900 mb-1">
                    <span className="font-semibold">Admin:</span> {entry.admin_name} (ID: {entry.admin_id})
                  </div>
                  {entry.acting_as_user_id && (
                    <div className="text-sm text-purple-700">
                      <span className="font-semibold">Acting as:</span> {entry.acting_as_user_name} (ID: {entry.acting_as_user_id})
                    </div>
                  )}
                  {entry.description && (
                    <div className="text-sm text-gray-700 mt-2">
                      {entry.description}
                    </div>
                  )}
                </div>
                <div className="ml-4">
                  <svg
                    className={`w-5 h-5 text-gray-400 transform transition-transform ${expandedEntry === entry.id ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {expandedEntry === entry.id && (
              <div className="px-4 pb-4 bg-gray-50 border-t border-gray-200">
                <div className="mt-3 space-y-2">
                  {entry.resource_type && (
                    <div className="text-sm">
                      <span className="font-semibold text-gray-700">Resource:</span>{' '}
                      <span className="text-gray-600">{entry.resource_type}</span>
                      {entry.resource_id && (
                        <span className="text-gray-600"> (ID: {entry.resource_id})</span>
                      )}
                    </div>
                  )}
                  {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                    <div className="text-sm">
                      <div className="font-semibold text-gray-700 mb-1">Metadata:</div>
                      <pre className="bg-white border border-gray-200 rounded p-2 text-xs overflow-x-auto">
                        {JSON.stringify(entry.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {entries.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-500">
          No action log entries found.
        </div>
      )}
    </div>
  );
};

export default AdminActionLog;
