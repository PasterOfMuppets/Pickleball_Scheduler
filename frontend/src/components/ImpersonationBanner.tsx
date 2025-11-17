import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface ImpersonationStatus {
  is_impersonating: boolean;
  impersonated_user_id: number | null;
  impersonated_user_name: string | null;
}

const ImpersonationBanner: React.FC = () => {
  const [status, setStatus] = useState<ImpersonationStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const checkImpersonationStatus = async () => {
    try {
      const response = await axios.get('/api/admin/impersonation-status');
      setStatus(response.data);
    } catch (err) {
      // User is not an admin or not authenticated
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkImpersonationStatus();

    // Poll every 5 seconds to check if impersonation status changed
    const interval = setInterval(checkImpersonationStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleStopImpersonation = async () => {
    try {
      await axios.post('/api/admin/stop-impersonate');
      setStatus({
        is_impersonating: false,
        impersonated_user_id: null,
        impersonated_user_name: null
      });
      // Reload the page to refresh all data
      window.location.reload();
    } catch (err) {
      console.error('Failed to stop impersonation:', err);
      alert('Failed to stop impersonation. Please try again.');
    }
  };

  if (loading || !status || !status.is_impersonating) {
    return null;
  }

  return (
    <div className="bg-yellow-500 text-black py-3 px-4 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span className="font-semibold">
            You are impersonating: {status.impersonated_user_name}
          </span>
          <span className="text-sm">
            (All actions will be logged)
          </span>
        </div>
        <button
          onClick={handleStopImpersonation}
          className="bg-black text-yellow-500 px-4 py-2 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
        >
          Stop Impersonating
        </button>
      </div>
    </div>
  );
};

export default ImpersonationBanner;
