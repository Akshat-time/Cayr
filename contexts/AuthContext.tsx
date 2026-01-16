
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, AuthContextType } from '../types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('cayr_token'));
  const [isLoading, setIsLoading] = useState(true);

  // Initialize from local storage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('cayr_user');
    const savedToken = localStorage.getItem('cayr_token');
    
    if (savedToken && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        setToken(savedToken);
      } catch (e) {
        console.error("Failed to parse saved session", e);
        localStorage.clear();
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback((newToken: string, userData: User) => {
    localStorage.setItem('cayr_token', newToken);
    localStorage.setItem('cayr_user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
    setIsLoading(false);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('cayr_token');
    localStorage.removeItem('cayr_user');
    setToken(null);
    setUser(null);
    setIsLoading(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
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
