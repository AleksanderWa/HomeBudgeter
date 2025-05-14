// components/Layout/MobileNav.tsx
import { Link, useLocation } from 'react-router-dom';
import React from 'react';
import { 
  HomeIcon, 
  ListBulletIcon, // Changed from ChartBarIcon for consistency with other list views
  CalendarDaysIcon, // Added for Planning
  TagIcon,          // Added for Categories
  BuildingLibraryIcon, // Added for Banking
  WalletIcon        // Added for Vault
} from '@heroicons/react/24/outline';

export default function MobileNav() {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  // Define navigation items
  const navItems = [
    { path: '/', icon: HomeIcon, label: 'Dashboard' },
    { path: '/list', icon: ListBulletIcon, label: 'Transactions' },
    { path: '/planning', icon: CalendarDaysIcon, label: 'Planning' },
    { path: '/category', icon: TagIcon, label: 'Categories' },
    { path: '/banking', icon: BuildingLibraryIcon, label: 'Banking' },
    { path: '/vault', icon: WalletIcon, label: 'Vault' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg sm:hidden z-50">
      {/* Navigation grid */}
      <div className="grid grid-cols-6 items-center h-14">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center py-1 px-1 transition-colors duration-150 ${active ? 'text-indigo-600' : 'text-gray-500 hover:text-indigo-600'}`}
              aria-label={item.label}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className={`text-xs font-medium truncate max-w-[95%] text-center ${active ? 'text-indigo-600' : 'text-gray-700'}`}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}