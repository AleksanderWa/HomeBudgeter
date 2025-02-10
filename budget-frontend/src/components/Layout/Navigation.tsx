import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.tsx';

export default function Navigation() {
  const { logout } = useAuth();

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link to="/" className="flex items-center">
              <span className="text-xl font-bold">Budget Tracker</span>
            </Link>
          </div>
          <div className="hidden sm:flex sm:items-center sm:space-x-4">
            <Link to="/" className="text-gray-700 hover:text-gray-900 px-3 py-2">
              Dashboard
            </Link>
            <Link to="/list" className="text-gray-700 hover:text-gray-900 px-3 py-2">
              Transactions
            </Link>
            <Link to="/upload" className="text-gray-700 hover:text-gray-900 px-3 py-2">
              Upload
            </Link>
            <button
              onClick={logout}
              className="text-gray-700 hover:text-gray-900 px-3 py-2"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
} 