import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) {
    return null;
  }

  const isAdmin = user.role === 'admin';

  return (
    <nav className="bg-blue-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="text-xl font-bold">
              Pickleball League
            </Link>
            <div className="hidden md:flex space-x-4">
              <Link to="/" className="hover:bg-blue-700 px-3 py-2 rounded-md">
                Dashboard
              </Link>
              <Link to="/availability" className="hover:bg-blue-700 px-3 py-2 rounded-md">
                Availability
              </Link>
              <Link to="/find-opponents" className="hover:bg-blue-700 px-3 py-2 rounded-md">
                Find Opponents
              </Link>
              <Link to="/matches" className="hover:bg-blue-700 px-3 py-2 rounded-md">
                Matches
              </Link>
              {isAdmin && (
                <div className="relative">
                  <button
                    onClick={() => setAdminDropdownOpen(!adminDropdownOpen)}
                    className="hover:bg-blue-700 px-3 py-2 rounded-md flex items-center"
                  >
                    Admin
                    <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {adminDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                      <Link
                        to="/admin"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setAdminDropdownOpen(false)}
                      >
                        Admin Dashboard
                      </Link>
                      <Link
                        to="/admin/users"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setAdminDropdownOpen(false)}
                      >
                        Manage Users
                      </Link>
                      <Link
                        to="/admin/matches"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setAdminDropdownOpen(false)}
                      >
                        Manage Matches
                      </Link>
                      <Link
                        to="/admin/action-log"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setAdminDropdownOpen(false)}
                      >
                        Action Log
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              to="/profile"
              className="text-sm hover:underline flex items-center"
            >
              <svg className="h-5 w-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {user.name}
              {isAdmin && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-500 text-black rounded-full font-semibold">
                  ADMIN
                </span>
              )}
            </Link>
            <button
              onClick={handleLogout}
              className="bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded-md text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
