import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { useAuth } from './hooks/useAuth';
import { RegisterPage } from './pages/RegisterPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>; // Optional: Replace with a proper loading component
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>; // Optional: Replace with a proper loading component
  }

  return (
    <Routes>
      {/* Landing Page Route */}
      <Route 
        path="/" 
        element={
          isAuthenticated ? (
            <LandingPage />
          ) : (
            <Navigate to="/login" replace />
          )
        } 
      />
      
      {/* Register Page Route */}
      <Route path="/register" element={<RegisterPage />} />

      {/* Login Page Route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Dashboard Route - Protected */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;