import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

interface User {
  id: number;
  username: string;
  email: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for token when the app loads
    const checkAuth = async () => {
      console.log('Checking authentication...');
      const token = localStorage.getItem('token');
      console.log('Token found:', !!token);

      if (token) {
        try {
          // Verify token with backend using full URL
          const response = await axios.get(`/auth/me`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });  
          console.log('Token validation successful');
          console.log('User data:', response.data);
          
          setIsAuthenticated(true);
          setUser(response.data);  // Assuming the backend returns user info
        } catch (error) {
          if (error.response && error.response.status === 401) {
            navigate('/login'); // Redirect to login page
          }
          console.error('Token validation failed:', error);
          
          // If token is invalid, clear it
          localStorage.removeItem('token');
          setIsAuthenticated(false);
          setUser(null);
        } finally {
          setIsLoading(false);
        }
      } else {
        console.log('No token found');
        setIsAuthenticated(false);
        setUser(null);
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = (token: string) => {
    console.log('Logging in with token');
    localStorage.setItem('token', token);
    setIsAuthenticated(true);
  };

  const logout = () => {
    console.log('Logging out');
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setUser(null);
  };

  // If still loading, return a loading state
  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};