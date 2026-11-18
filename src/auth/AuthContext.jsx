import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, clearCache, setUnauthenticatedHandler } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  const check = useCallback(async () => {
    try {
      const { data } = await api.get('/api/auth/session');
      setUser(data.authenticated ? data.user : null);
    } catch {

      setUser(null);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => { check(); }, [check]);

  useEffect(() => {
    setUnauthenticatedHandler(() => setUser(null));
    return () => setUnauthenticatedHandler(null);
  }, []);

  const login = useCallback(async (username, password) => {
    const { data } = await api.post('/api/auth/login', { username, password });

    clearCache();
    setUser(data);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout');
    } finally {

      clearCache();
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, checking, isAuthenticated: user !== null, login, logout, refresh: check }),
    [user, checking, login, logout, check]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside an <AuthProvider>.');
  return ctx;
}
