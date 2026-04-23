'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import { api } from '@/lib/api';

type User = {
  id: string;
  name: string;
  email: string;
  dob?: string;
  gender?: string;
  city?: string;
  country?: string;
  bio?: string;
  interests?: string[];
  avatar_url?: string;
  credits?: number;
  points?: number;
  is_blurred?: boolean;
  is_admin?: boolean;
  is_suspended?: boolean;
  is_banned?: boolean;
  warnings_count?: number;
  total_credits_spent?: number;
  created_at?: string;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

type RegisterData = {
  name: string;
  email: string;
  password: string;
  dob: string;
  gender: string;
  city: string;
  country: string;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const savedToken = localStorage.getItem('soulsync_token');
    if (!savedToken) {
      setLoading(false);
      return;
    }

    try {
      const data = await api<{ user: User }>('/api/users/me', {
        token: savedToken,
      });
      setUser(data.user);
      setToken(savedToken);
    } catch {
      localStorage.removeItem('soulsync_token');
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const data = await api<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    localStorage.setItem('soulsync_token', data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const register = async (registerData: RegisterData) => {
    const data = await api<{ token: string; user: User }>(
      '/api/auth/register',
      {
        method: 'POST',
        body: registerData,
      }
    );
    localStorage.setItem('soulsync_token', data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('soulsync_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, register, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
