import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/client';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requires2FA, setRequires2FA] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      // Check if we have a stored session
      const session = await AsyncStorage.getItem('rentkeepers_session');
      if (session) {
        // Validate session with backend
        // For now, just set as logged in
        setUser(JSON.parse(session));
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password) {
    try {
      const result = await api.login(email, password);
      
      if (result.requires2FA) {
        setRequires2FA(true);
        return { requires2FA: true };
      }

      // Store session
      const userData = { email, loggedIn: new Date().toISOString() };
      await AsyncStorage.setItem('rentkeepers_session', JSON.stringify(userData));
      setUser(userData);
      setRequires2FA(false);
      return { success: true };
    } catch (error) {
      throw error;
    }
  }

  async function verify2FA(token) {
    try {
      await api.verify2FA(token);
      
      const userData = { email: user?.email, loggedIn: new Date().toISOString() };
      await AsyncStorage.setItem('rentkeepers_session', JSON.stringify(userData));
      setUser(userData);
      setRequires2FA(false);
      return { success: true };
    } catch (error) {
      throw error;
    }
  }

  async function logout() {
    await AsyncStorage.removeItem('rentkeepers_session');
    setUser(null);
    setRequires2FA(false);
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      requires2FA,
      login,
      verify2FA,
      logout,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
