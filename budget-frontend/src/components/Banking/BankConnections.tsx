import React, { useEffect, useState } from 'react';
import api from '../../client/api/client.ts';
import { generateAndStoreState } from '../../utils/redirector.ts';

interface BankConnection {
  id: number;
  provider_name: string;
  created_at: string;
}

const BankConnections: React.FC = () => {
  const [connections, setConnections] = useState<BankConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshingId, setRefreshingId] = useState<number | null>(null);
  const [refreshResult, setRefreshResult] = useState<{message: string, count: number} | null>(null);

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    try {
      setLoading(true);
      const response = await api.get('/bank/connections');
      setConnections(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch bank connections');
      console.error('Error fetching bank connections:', err);
    } finally {
      setLoading(false);
    }
  };

  const connectBank = async () => {
    try {
      // Generate and store state parameter for security
      const state = generateAndStoreState();
      
      // Get auth link from backend with state
      const response = await api.get(`/bank/auth-link?state=${state}`);
      console.log(response.data);
      // Redirect to bank authorization page
      window.location.href = response.data.auth_link;
    } catch (err) {
      setError('Failed to generate bank connection link');
      console.error('Error generating bank connection link:', err);
    }
  };

  const refreshTransactions = async (connectionId: number) => {
    try {
      setRefreshingId(connectionId);
      setRefreshResult(null);
      const response = await api.post(`/bank/refresh/${connectionId}`);
      setRefreshResult({
        message: response.data.message,
        count: response.data.transactions_imported
      });
      await fetchConnections(); // Refresh the list
    } catch (err) {
      setError('Failed to refresh transactions');
      console.error('Error refreshing transactions:', err);
    } finally {
      setRefreshingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Bank Connections</h1>
        <button
          onClick={connectBank}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
        >
          Connect Bank Account
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {refreshResult && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {refreshResult.message}: {refreshResult.count} new transactions imported
        </div>
      )}

      {loading && <p className="text-gray-500">Loading connections...</p>}

      {!loading && connections.length === 0 ? (
        <div className="bg-gray-100 p-6 rounded-lg text-center">
          <p className="text-lg text-gray-700 mb-4">No bank accounts connected yet</p>
          <p className="text-gray-500 mb-4">Connect your bank account to automatically import transactions</p>
          <button
            onClick={connectBank}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
          >
            Connect Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {connections.map((connection) => (
            <div key={connection.id} className="border rounded-lg p-4 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold">{connection.provider_name}</h2>
                  <p className="text-sm text-gray-500">
                    Connected on {formatDate(connection.created_at)}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => refreshTransactions(connection.id)}
                  disabled={refreshingId === connection.id}
                  className={`w-full ${
                    refreshingId === connection.id
                      ? 'bg-gray-400'
                      : 'bg-green-500 hover:bg-green-600'
                  } text-white px-4 py-2 rounded-md`}
                >
                  {refreshingId === connection.id ? 'Refreshing...' : 'Refresh Transactions'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BankConnections; 