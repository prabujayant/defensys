import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const navigate = useNavigate();

  // Login function
  const login = async (email: string, password: string) => {
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) throw new Error('Invalid credentials');
    const data = await response.json();

    // Save token to localStorage
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setIsAuthenticated(true);
    setLoading(false);

    // Redirect to the LandingPage ("/")
    navigate('/'); 
  };

  // Logout function
  const logout = () => {
    // Clear token and authentication state
    localStorage.removeItem('token');
    setToken(null);
    setIsAuthenticated(false);
    navigate('/login'); // Redirect to login page after logout
  };

  // Register function
  const register = async (email: string, password: string) => {
    const response = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) throw new Error('Registration failed');
    const data = await response.json();
    return data;
  };

  // Check if the user is authenticated when the app is initialized
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setToken(token);
      setIsAuthenticated(true);
    }
    setLoading(false); // Set loading to false after checking token
  }, []);

  return { login, register, logout, isAuthenticated, loading, token };
};