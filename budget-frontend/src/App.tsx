import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext.tsx'
import Navigation from './components/Layout/Navigation.tsx'
import MobileNav from './components/Layout/MobileNav.tsx'
// import Home from './components/Home.tsx'
import Register from './components/Auth/Register.tsx'
import Login from './components/Auth/Login.tsx'
import Dashboard from './components/Dashboard/Dashboard.tsx'
import PrivateRoute from './components/Auth/ProtectedRoute.tsx'
import { useAuth } from './contexts/AuthContext.tsx'
import ExpenseList from './components/Dashboard/ExpenseList.tsx'
import Upload from './components/Upload/Upload.tsx'
import Planning from './components/Planning/Planning.tsx' // Added import statement
import Category from './components/Category/Category.tsx' // Added import statement
import axios from 'axios'

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

// Configure axios defaults and interceptors
axios.defaults.baseURL = API_URL;
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const AppContent: React.FC = () => {
  const { isAuthenticated } = useAuth()
  console.log('App Auth state:', isAuthenticated)

  // Optional: Add a loading spinner or placeholder
  if (isAuthenticated === undefined) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {isAuthenticated && <Navigation />}
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route element={<PrivateRoute />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/list" element={<ExpenseList />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/planning" element={<Planning />} /> // Added route
            <Route path="/category" element={<Category />} /> // Added route
          </Route>
        </Routes>
      </main>
      {isAuthenticated && <MobileNav />}
      <footer className="bg-gray-800 text-white py-4">
        <div className="container mx-auto px-4 text-center">
          &copy; 2025 Budget Tracker by Aleksander Walkowski. All rights reserved.
        </div>
      </footer>
    </div>
  )
}

interface AuthProviderProps {
  children: React.ReactNode;
}

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  )
}

export default App