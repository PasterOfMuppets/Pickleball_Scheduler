import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

interface NotificationStatus {
  email_enabled: boolean;
  sms_opt_in: boolean;
  last_sms_failure_at: string | null;
  last_email_failure_at: string | null;
  sms_consecutive_failures: number;
}

const NotificationBanner: React.FC = () => {
  const [status, setStatus] = useState<NotificationStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotificationStatus();
  }, []);

  const fetchNotificationStatus = async () => {
    try {
      const response = await axios.get('/api/notifications/preferences');
      setStatus(response.data);
    } catch (err) {
      console.error('Failed to fetch notification status:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !status || dismissed) {
    return null;
  }

  // Check if we should show a warning
  const hasSmsIssue = status.last_sms_failure_at || !status.sms_opt_in;
  const hasEmailIssue = status.last_email_failure_at || !status.email_enabled;
  const showWarning = hasSmsIssue && hasEmailIssue;

  if (!showWarning) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border-b border-yellow-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between flex-wrap">
          <div className="flex items-center flex-1">
            <svg
              className="h-5 w-5 text-yellow-600 mr-3"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800">
                Notification delivery issues detected
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                {!status.email_enabled && 'Email notifications are disabled. '}
                {status.last_email_failure_at && 'Email delivery has failed. '}
                {!status.sms_opt_in && 'SMS notifications are disabled. '}
                {status.last_sms_failure_at && `SMS delivery has failed ${status.sms_consecutive_failures > 1 ? `(${status.sms_consecutive_failures} times)` : ''}. `}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 mt-2 sm:mt-0">
            <Link
              to="/notifications"
              className="text-sm font-medium text-yellow-800 hover:text-yellow-900 underline"
            >
              Update Settings
            </Link>
            <button
              onClick={() => setDismissed(true)}
              className="text-yellow-600 hover:text-yellow-800 focus:outline-none"
              aria-label="Dismiss"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationBanner;
