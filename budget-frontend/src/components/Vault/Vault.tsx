import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext.tsx';

interface VaultEntry {
  id: number;
  amount: number;
  description: string;
  created_at: string;
  updated_at: string;
}

interface VaultBalance {
  amount: number;
  description: string;
}

const Vault: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [balance, setBalance] = useState<VaultBalance | null>(null);
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [removeAmount, setRemoveAmount] = useState<string>('');
  const [removeDescription, setRemoveDescription] = useState<string>('');

  const fetchVaultBalance = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/vault');
      if (response.data && typeof response.data.amount === 'number') {
        setBalance(response.data);
      } else {
        console.error('Received invalid balance data from backend:', response.data);
        setBalance({ amount: 0, description: '' });
      }
    } catch (err) {
      setError('Failed to fetch vault balance');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchVaultEntries = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/vault/history');
      setEntries(response.data);
    } catch (err) {
      setError('Failed to fetch vault entries');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCash = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount) {
      setError('Amount is required');
      return;
    }
    
    try {
      setLoading(true);
      await axios.post('/vault', {
        amount: parseFloat(amount),
        description: description || 'Cash deposit'
      });
      setAmount('');
      setDescription('');
      fetchVaultBalance();
      fetchVaultEntries();
    } catch (err) {
      setError('Failed to add cash to vault');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCash = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!removeAmount) {
      setError('Amount is required');
      return;
    }
    
    try {
      setLoading(true);
      await axios.post('/vault', {
        amount: -Math.abs(parseFloat(removeAmount)),
        description: removeDescription || 'Cash withdrawal'
      });
      setRemoveAmount('');
      setRemoveDescription('');
      fetchVaultBalance();
      fetchVaultEntries();
    } catch (err) {
      setError('Failed to remove cash from vault');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEntry = async (id: number) => {
    try {
      setLoading(true);
      await axios.delete(`/vault/${id}`);
      fetchVaultBalance();
      fetchVaultEntries();
    } catch (err) {
      setError('Failed to delete entry');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchVaultBalance();
      fetchVaultEntries();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <div>Please log in to view your vault</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Cash Vault</h1>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          <p>{error}</p>
          <button 
            onClick={() => setError(null)}
            className="text-sm underline"
          >
            Dismiss
          </button>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-3">Current Balance</h2>
        {loading && !balance ? (
          <p>Loading balance...</p>
        ) : balance ? (
          <div className="text-4xl font-bold text-green-600">
            ${balance && typeof balance.amount === 'number' && isFinite(balance.amount) ? balance.amount.toFixed(2) : '0.00'}
          </div>
        ) : (
          <p>Balance not available</p>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Add Cash</h2>
          <form onSubmit={handleAddCash}>
            <div className="mb-4">
              <label htmlFor="add-amount" className="block text-sm font-medium text-gray-700 mb-1">
                Amount
              </label>
              <input
                id="add-amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="0.00"
                required
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="add-description" className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <input
                id="add-description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Cash deposit"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition"
            >
              {loading ? 'Processing...' : 'Add Cash'}
            </button>
          </form>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Remove Cash</h2>
          <form onSubmit={handleRemoveCash}>
            <div className="mb-4">
              <label htmlFor="remove-amount" className="block text-sm font-medium text-gray-700 mb-1">
                Amount
              </label>
              <input
                id="remove-amount"
                type="number"
                step="0.01"
                min="0.01"
                value={removeAmount}
                onChange={(e) => setRemoveAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="0.00"
                required
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="remove-description" className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <input
                id="remove-description"
                type="text"
                value={removeDescription}
                onChange={(e) => setRemoveDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Cash withdrawal"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition"
            >
              {loading ? 'Processing...' : 'Remove Cash'}
            </button>
          </form>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Transactions</h2>
        {loading && entries.length === 0 ? (
          <p>Loading transactions...</p>
        ) : entries.length === 0 ? (
          <p className="text-gray-500">No transactions yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.description}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                      entry.amount >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      ${typeof entry.amount === 'number' && isFinite(entry.amount) ? Number(entry.amount).toFixed(2) : '0.00'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => handleDeleteEntry(entry.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Vault; 