import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../client/api/client.ts';
import { verifyState } from '../../utils/redirector.ts';

const BankCallback: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing your bank connection...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get code and state from URL parameters
        const params = new URLSearchParams(location.search);
        const code = params.get('code');
        const state = params.get('state');
        
        // Add debug logging
        console.log('Callback received with params:', { code: code?.substring(0, 10), state });

        if (!code) {
          setStatus('error');
          setMessage('No authorization code received from bank');
          return;
        }

        if (!state || !verifyState(state)) {
          setStatus('error');
          setMessage('Invalid state parameter. This could be a security risk.');
          return;
        }

        // Send code to backend
        console.log('Sending to backend endpoint: /bank/callback');
        const response = await api.get(`/bank/callback?code=${code}&state=${state}`);
        console.log('Backend response:', response.data);
        
        setStatus('success');
        setMessage(`Successfully connected! ${response.data.transactions_imported} transactions imported.`);
        
        // Redirect after a delay
        setTimeout(() => {
          navigate('/banking');
        }, 3000);
      } catch (error) {
        console.error('Error in bank callback:', error);
        setStatus('error');
        setMessage('Failed to connect bank account. Please try again.');
      }
    };

    handleCallback();
  }, [location.search, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        {status === 'loading' && (
          <>
            <div className="flex justify-center mb-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
            <h2 className="text-xl font-semibold text-center mb-2">Connecting Your Bank</h2>
            <p className="text-gray-600 text-center">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="flex justify-center mb-4 text-green-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-center mb-2">Success!</h2>
            <p className="text-gray-600 text-center">{message}</p>
            <p className="text-gray-500 text-center text-sm mt-4">Redirecting you to the banking page...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="flex justify-center mb-4 text-red-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-center mb-2">Connection Failed</h2>
            <p className="text-gray-600 text-center">{message}</p>
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => navigate('/banking')}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
              >
                Return to Banking
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BankCallback; 