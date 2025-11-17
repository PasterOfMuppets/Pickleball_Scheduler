import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        Welcome, {user?.name}!
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link
          to="/availability"
          className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Set Availability
          </h2>
          <p className="text-gray-600">
            Manage your weekly availability and recurring patterns
          </p>
        </Link>

        <div className="bg-gray-100 p-6 rounded-lg shadow opacity-50 cursor-not-allowed">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Find Opponents
          </h2>
          <p className="text-gray-600">
            Coming soon...
          </p>
        </div>

        <div className="bg-gray-100 p-6 rounded-lg shadow opacity-50 cursor-not-allowed">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            My Matches
          </h2>
          <p className="text-gray-600">
            Coming soon...
          </p>
        </div>
      </div>

      <div className="mt-8 bg-blue-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">
          Account Status
        </h3>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-blue-700">Email</dt>
            <dd className="text-sm text-gray-900">{user?.email}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-blue-700">Phone</dt>
            <dd className="text-sm text-gray-900">{user?.phone || 'Not provided'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-blue-700">Status</dt>
            <dd className="text-sm text-gray-900 capitalize">{user?.status}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-blue-700">Role</dt>
            <dd className="text-sm text-gray-900 capitalize">{user?.role}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
};

export default Dashboard;
