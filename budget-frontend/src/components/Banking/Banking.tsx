import React from 'react';
import BankConnections from './BankConnections.tsx';

const Banking: React.FC = () => {
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Banking</h1>
            <p className="mt-2 text-gray-600">
              Connect your bank accounts to automatically import transactions
            </p>
          </div>
          <BankConnections />
        </div>
      </div>
    </div>
  );
};

export default Banking; 