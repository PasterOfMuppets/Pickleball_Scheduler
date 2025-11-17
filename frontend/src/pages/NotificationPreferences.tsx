import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface NotificationPrefs {
  user_id: number;
  email_enabled: boolean;
  sms_opt_in: boolean;
  sms_opt_in_at: string | null;
  notify_match_requests: boolean;
  notify_match_responses: boolean;
  notify_reminders: boolean;
  notify_cancellations: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  last_sms_failure_at: string | null;
  last_email_failure_at: string | null;
  sms_consecutive_failures: number;
}

const NotificationPreferences: React.FC = () => {
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/notifications/preferences');
      setPrefs(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!prefs) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await axios.put('/api/notifications/preferences', {
        email_enabled: prefs.email_enabled,
        sms_opt_in: prefs.sms_opt_in,
        notify_match_requests: prefs.notify_match_requests,
        notify_match_responses: prefs.notify_match_responses,
        notify_reminders: prefs.notify_reminders,
        notify_cancellations: prefs.notify_cancellations,
        quiet_hours_enabled: prefs.quiet_hours_enabled,
        quiet_hours_start: prefs.quiet_hours_start,
        quiet_hours_end: prefs.quiet_hours_end,
      });

      setPrefs(response.data);
      setSuccess('Preferences saved successfully!');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const updatePref = (field: keyof NotificationPrefs, value: any) => {
    if (!prefs) return;
    setPrefs({ ...prefs, [field]: value });
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!prefs) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Failed to load notification preferences</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        Notification Preferences
      </h1>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800">{success}</p>
        </div>
      )}

      {/* SMS/Email Failure Warnings */}
      {prefs.last_sms_failure_at && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-900 mb-1">SMS Delivery Issues</h3>
          <p className="text-sm text-yellow-800">
            Last SMS failure: {new Date(prefs.last_sms_failure_at).toLocaleString()}
            {prefs.sms_consecutive_failures > 0 && ` (${prefs.sms_consecutive_failures} consecutive failures)`}
          </p>
          <p className="text-sm text-yellow-800 mt-2">
            Please verify your phone number or contact support.
          </p>
        </div>
      )}

      {prefs.last_email_failure_at && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-900 mb-1">Email Delivery Issues</h3>
          <p className="text-sm text-yellow-800">
            Last email failure: {new Date(prefs.last_email_failure_at).toLocaleString()}
          </p>
          <p className="text-sm text-yellow-800 mt-2">
            Please verify your email address or contact support.
          </p>
        </div>
      )}

      <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
        {/* Notification Channels */}
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Notification Channels
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <label htmlFor="email-enabled" className="font-medium text-gray-900">
                  Email Notifications
                </label>
                <p className="text-sm text-gray-600">
                  Receive notifications via email
                </p>
              </div>
              <input
                id="email-enabled"
                type="checkbox"
                checked={prefs.email_enabled}
                onChange={(e) => updatePref('email_enabled', e.target.checked)}
                className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <label htmlFor="sms-opt-in" className="font-medium text-gray-900">
                  SMS Notifications
                </label>
                <p className="text-sm text-gray-600">
                  Receive notifications via text message
                </p>
                {prefs.sms_opt_in && prefs.sms_opt_in_at && (
                  <p className="text-xs text-gray-500 mt-1">
                    Opted in: {new Date(prefs.sms_opt_in_at).toLocaleDateString()}
                  </p>
                )}
              </div>
              <input
                id="sms-opt-in"
                type="checkbox"
                checked={prefs.sms_opt_in}
                onChange={(e) => updatePref('sms_opt_in', e.target.checked)}
                className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
          </div>
        </div>

        {/* Notification Types */}
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Notification Types
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <label htmlFor="notify-match-requests" className="font-medium text-gray-900">
                  Match Requests
                </label>
                <p className="text-sm text-gray-600">
                  When someone challenges you to a match
                </p>
              </div>
              <input
                id="notify-match-requests"
                type="checkbox"
                checked={prefs.notify_match_requests}
                onChange={(e) => updatePref('notify_match_requests', e.target.checked)}
                className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <label htmlFor="notify-match-responses" className="font-medium text-gray-900">
                  Match Responses
                </label>
                <p className="text-sm text-gray-600">
                  When someone accepts or declines your challenge
                </p>
              </div>
              <input
                id="notify-match-responses"
                type="checkbox"
                checked={prefs.notify_match_responses}
                onChange={(e) => updatePref('notify_match_responses', e.target.checked)}
                className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <label htmlFor="notify-reminders" className="font-medium text-gray-900">
                  Match Reminders
                </label>
                <p className="text-sm text-gray-600">
                  24 hours and 2 hours before confirmed matches
                </p>
              </div>
              <input
                id="notify-reminders"
                type="checkbox"
                checked={prefs.notify_reminders}
                onChange={(e) => updatePref('notify_reminders', e.target.checked)}
                className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <label htmlFor="notify-cancellations" className="font-medium text-gray-900">
                  Match Cancellations
                </label>
                <p className="text-sm text-gray-600">
                  When a confirmed match is canceled
                </p>
              </div>
              <input
                id="notify-cancellations"
                type="checkbox"
                checked={prefs.notify_cancellations}
                onChange={(e) => updatePref('notify_cancellations', e.target.checked)}
                className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
          </div>
        </div>

        {/* Quiet Hours */}
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Quiet Hours
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <label htmlFor="quiet-hours-enabled" className="font-medium text-gray-900">
                  Enable Quiet Hours
                </label>
                <p className="text-sm text-gray-600">
                  Delay non-critical notifications during these hours
                </p>
              </div>
              <input
                id="quiet-hours-enabled"
                type="checkbox"
                checked={prefs.quiet_hours_enabled}
                onChange={(e) => updatePref('quiet_hours_enabled', e.target.checked)}
                className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>

            {prefs.quiet_hours_enabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label htmlFor="quiet-hours-start" className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time
                  </label>
                  <input
                    id="quiet-hours-start"
                    type="time"
                    value={prefs.quiet_hours_start}
                    onChange={(e) => updatePref('quiet_hours_start', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="quiet-hours-end" className="block text-sm font-medium text-gray-700 mb-1">
                    End Time
                  </label>
                  <input
                    id="quiet-hours-end"
                    type="time"
                    value={prefs.quiet_hours_end}
                    onChange={(e) => updatePref('quiet_hours_end', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            <div className="bg-blue-50 rounded-lg p-4 mt-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Critical notifications (match canceled less than 4 hours before start, 2-hour reminders) will be sent regardless of quiet hours.
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="p-6 bg-gray-50">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full md:w-auto px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationPreferences;
