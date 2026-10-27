'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ApiError, apiRequest, clearAccessToken, getAccessToken, setAccessToken, setAuthFailureHandler, User } from './api';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';
type LoginInput = { email: string; password: string };
type AuthContextValue = {
  user: User | null;
  status: AuthStatus;
  login(input: LoginInput): Promise<User>;
  logout(): Promise<void>;
  retry(): Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  const clearAuth = useCallback(() => {
    clearAccessToken();
    queryClient.clear();
    setUser(null);
    setStatus('unauthenticated');
  }, [queryClient]);

  const retry = useCallback(async () => {
    if (!getAccessToken()) {
      setUser(null);
      setStatus('unauthenticated');
      return;
    }
    setStatus('loading');
    try {
      setUser(await apiRequest<User>('/me'));
      setStatus('authenticated');
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.code === 'ACCOUNT_DISABLED')) clearAuth();
      else setStatus('error');
    }
  }, [clearAuth]);

  useEffect(() => setAuthFailureHandler(() => { clearAuth(); router.replace('/dang-nhap'); }), [clearAuth, router]);
  useEffect(() => { void retry(); }, [retry]);

  const login = useCallback(async (input: LoginInput) => {
    const result = await apiRequest<{ accessToken: string; user: User }>('/auth/login', {
      method: 'POST', body: JSON.stringify(input),
    });
    setAccessToken(result.accessToken);
    setUser(result.user);
    setStatus('authenticated');
    return result.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiRequest<void>('/auth/logout', { method: 'POST' });
    } catch {
      // Local logout must finish even when the server is unavailable.
    } finally {
      clearAuth();
    }
  }, [clearAuth]);

  const value = useMemo(() => ({ user, status, login, logout, retry }), [user, status, login, logout, retry]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}
