// components/Layout/MobileNav.tsx
import { Link, useLocation } from 'react-router-dom';
import React from 'react';
import { 
  HomeIcon, 
  ListBulletIcon, // Changed from ChartBarIcon for consistency with other list views
  CalendarDaysIcon, // Added for Planning
  TagIcon,          // Added for Categories
  BuildingLibraryIcon // Added for Banking
} from '@heroicons/react/24/outline';
import { PlusIcon } from '@heroicons/react/24/solid'; // Added PlusIcon

export default function MobileNav() {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  // Define navigation items (excluding the central add button)
  const navItems = [
    { path: '/', icon: HomeIcon, label: 'Dashboard' },
    { path: '/list', icon: ListBulletIcon, label: 'Transactions' },
    // Central space reserved for Add button
    { path: '/category', icon: TagIcon, label: 'Categories' },
    { path: '/banking', icon: BuildingLibraryIcon, label: 'Banking' },
  ];

  const handleAddClick = () => {
    // Dispatch a global event that Navigation.tsx can listen for
    window.dispatchEvent(new CustomEvent('openAddTransactionModal'));
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-inner sm:hidden z-40">
      <div className="flex justify-around items-center p-1 h-16">
        {/* Render first half of nav items */}
        {navItems.slice(0, 2).map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center p-1 rounded-md transition-colors duration-150 w-16 h-full ${active ? 'text-indigo-600 bg-indigo-50' : 'text-gray-500 hover:text-indigo-600 hover:bg-indigo-50'}`}
              aria-label={item.label}
            >
              <Icon className="w-6 h-6 mb-0.5" />
              <span className={`text-xs font-medium ${active ? 'text-indigo-600' : 'text-gray-700'}`}>{item.label}</span>
            </Link>
          );
        })}

        {/* Central Add Transaction Button */}
        <button
          onClick={handleAddClick}
          className="flex items-center justify-center w-12 h-12 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 -mt-4 z-10"
          aria-label="Add Transaction"
        >
          <PlusIcon className="w-6 h-6" />
        </button>

        {/* Render second half of nav items */}
        {navItems.slice(2).map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center p-1 rounded-md transition-colors duration-150 w-16 h-full ${active ? 'text-indigo-600 bg-indigo-50' : 'text-gray-500 hover:text-indigo-600 hover:bg-indigo-50'}`}
              aria-label={item.label}
            >
              <Icon className="w-6 h-6 mb-0.5" />
              <span className={`text-xs font-medium ${active ? 'text-indigo-600' : 'text-gray-700'}`}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}