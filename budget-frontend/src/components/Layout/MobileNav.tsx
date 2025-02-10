// components/Layout/MobileNav.tsx
import { Link, useLocation } from 'react-router-dom';
import React from 'react';
import { HomeIcon, ChartBarIcon, DocumentArrowUpIcon, UserIcon } from '@heroicons/react/24/outline';

export default function MobileNav() {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t sm:hidden">
      <div className="flex justify-around p-2">
        <Link 
          to="/" 
          className={`p-2 ${isActive('/') ? 'text-primary' : 'text-gray-600'} hover:text-primary`}
        >
          <HomeIcon className="w-6 h-6" />
        </Link>
        <Link 
          to="/list" 
          className={`p-2 ${isActive('/list') ? 'text-primary' : 'text-gray-600'} hover:text-primary`}
        >
          <ChartBarIcon className="w-6 h-6" />
        </Link>
        <Link 
          to="/upload" 
          className={`p-2 ${isActive('/upload') ? 'text-primary' : 'text-gray-600'} hover:text-primary`}
        >
          <DocumentArrowUpIcon className="w-6 h-6" />
        </Link>
        <Link 
          to="/profile" 
          className={`p-2 ${isActive('/profile') ? 'text-primary' : 'text-gray-600'} hover:text-primary`}
        >
          <UserIcon className="w-6 h-6" />
        </Link>
      </div>
    </nav>
  );
}