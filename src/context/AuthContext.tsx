import React, { createContext, useReducer, useEffect } from 'react';
import axios from 'axios';

interface AuthState {
  token: string | null;
  user: any | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const initialState: AuthState = {
  token: localStorage.getItem('token'),
  user: null,
  loading: true,
  error: null,
};

export const AuthContext = createContext<AuthContextType>({} as AuthContextType);

const authReducer = (state: AuthState, action: any): AuthState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: true };
    case 'USER_LOADED':
      return { ...state, user: action.payload, loading: false };
    case 'LOGIN_SUCCESS':
    case 'REGISTER_SUCCESS':
      localStorage.setItem('token', action.payload.token);
      return { ...state, token: action.payload.token, user: action.payload.user, loading: false };
    case 'AUTH_ERROR':
    case 'LOGIN_FAIL':
    case 'REGISTER_FAIL':
    case 'LOGOUT':
      localStorage.removeItem('token');
      return { ...state, token: null, user: null, loading: false, error: action.payload || null };
    default:
      return state;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const loadUser = async () => {
      try {
        if (!state.token) {
          dispatch({ type: 'AUTH_ERROR' });
          return;
        }

        const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/auth/me`);
        dispatch({ type: 'USER_LOADED', payload: res.data });
      } catch {
        dispatch({ type: 'AUTH_ERROR' });
      }
    };

    loadUser();
  }, [state.token]);

  const login = async (email: string, password: string) => {
    try {
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/auth/login`, { email, password });
      dispatch({ type: 'LOGIN_SUCCESS', payload: res.data });
    } catch (err: any) {
      dispatch({ type: 'LOGIN_FAIL', payload: err.response?.data?.message || 'Login failed' });
      throw err;
    }
  };

  const register = async (email: string, password: string) => {
    try {
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/auth/register`, { email, password });
      dispatch({ type: 'REGISTER_SUCCESS', payload: res.data });
    } catch (err: any) {
      dispatch({ type: 'REGISTER_FAIL', payload: err.response?.data?.message || 'Registration failed' });
      throw err;
    }
  };

  const logout = () => {
    dispatch({ type: 'LOGOUT' });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};