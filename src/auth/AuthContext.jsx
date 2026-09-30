import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, clearCache, setUnauthenticatedHandler } from '../utils/api';

const AuthContext = createContext(null);

/*
 * Holds the one piece of state the whole app branches on: is there a session.
 *
 * The session itself lives in an httpOnly cookie the browser will not let us
 * read, which is the point — so "am I logged in" is answered by asking the
 * server once at startup, not by inspecting storage.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  const check = useCallback(async () => {
    try {
      const { data } = await api.get('/api/auth/session');
      setUser(data.authenticated ? data.user : null);
    } catch {
      // A network failure is not a logout; it just means we cannot confirm.
      setUser(null);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => { check(); }, [check]);

  /*
   * A 401 from any request anywhere in the app lands here, so an expired
   * session drops the UI back to the login screen instead of leaving a page
   * full of empty widgets and failed requests.
   */
  useEffect(() => {
    setUnauthenticatedHandler(() => setUser(null));
    return () => setUnauthenticatedHandler(null);
  }, []);

  const login = useCallback(async (username, password) => {
    const { data } = await api.post('/api/auth/login', { username, password });
    // Anything cached under the previous session must not bleed into this one.
    clearCache();
    setUser(data);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout');
    } finally {
      // Clear locally even if the request failed — the user asked to be out.
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
