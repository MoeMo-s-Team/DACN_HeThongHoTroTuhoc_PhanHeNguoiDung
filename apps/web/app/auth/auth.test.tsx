import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './auth-context';
import { apiRequest } from './api';
import { landingPath } from './login-form';

const user = { id: 'student-1', fullName: 'Student One', email: 'student.one@example.test', role: 'STUDENT', status: 'ACTIVE' as const };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

function AuthProbe() {
  const auth = useAuth();
  return <main>
    <p role="status">{auth.status}</p>
    <p>{auth.user?.email}</p>
    <button onClick={() => void auth.login({ email: user.email, password: 'password' })}>sign in</button>
    <button onClick={() => void auth.retry()}>retry</button>
    <button onClick={() => void apiRequest('/protected').catch(() => undefined)}>protected request</button>
    <button onClick={() => void auth.logout()}>sign out</button>
  </main>;
}

function renderAuth(queryClient = new QueryClient()) {
  return {
    queryClient,
    ...render(<QueryClientProvider client={queryClient}><AuthProvider><AuthProbe /></AuthProvider></QueryClientProvider>),
  };
}

describe('browser auth state', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it('stores a login token and the shared API client attaches it to protected requests', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(json({ accessToken: 'access-token', user }));
    renderAuth();
    fireEvent.click(screen.getByRole('button', { name: 'sign in' }));
    await waitFor(() => expect(sessionStorage.getItem('accessToken')).toBe('access-token'));
    vi.mocked(fetch).mockResolvedValueOnce(json(user));
    await apiRequest('/me');
    expect(new Headers(vi.mocked(fetch).mock.calls[1]?.[1]?.headers).get('authorization')).toBe('Bearer access-token');
  });

  it('rehydrates the current User from /me when a tab reloads with a token', async () => {
    sessionStorage.setItem('accessToken', 'surviving-token');
    vi.mocked(fetch).mockResolvedValueOnce(json(user));
    renderAuth();
    expect(await screen.findByText(user.email)).toBeInTheDocument();
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toContain('/me');
    expect(new Headers(vi.mocked(fetch).mock.calls[0]?.[1]?.headers).get('authorization')).toBe('Bearer surviving-token');
  });

  it('preserves token after transient /me failure and allows retry', async () => {
    sessionStorage.setItem('accessToken', 'surviving-token');
    vi.mocked(fetch).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(json(user));
    renderAuth();
    expect(await screen.findByRole('status')).toHaveTextContent('error');
    expect(sessionStorage.getItem('accessToken')).toBe('surviving-token');
    fireEvent.click(screen.getByRole('button', { name: 'retry' }));
    expect(await screen.findByText(user.email)).toBeInTheDocument();
  });

  it('clears token, user, and query cache when /me confirms invalid authentication', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['private'], { value: 'private' });
    sessionStorage.setItem('accessToken', 'invalid-token');
    vi.mocked(fetch).mockResolvedValueOnce(json({ code: 'AUTH_REQUIRED' }, 401));
    renderAuth(queryClient);
    expect(await screen.findByRole('status')).toHaveTextContent('unauthenticated');
    expect(sessionStorage.getItem('accessToken')).toBeNull();
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it.each([
    [401, 'AUTH_REQUIRED'],
    [403, 'ACCOUNT_DISABLED'],
  ])('clears auth and redirects after a protected request returns %s', async (status, code) => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['private'], { value: 'private' });
    sessionStorage.setItem('accessToken', 'valid-token');
    vi.mocked(fetch).mockResolvedValueOnce(json(user)).mockResolvedValueOnce(json({ code }, status));
    renderAuth(queryClient);
    await screen.findByText(user.email);
    fireEvent.click(screen.getByRole('button', { name: 'protected request' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('unauthenticated'));
    expect(sessionStorage.getItem('accessToken')).toBeNull();
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(replace).toHaveBeenCalledWith('/dang-nhap');
  });

  it('clears local auth and query cache even when logout request fails', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['private'], { value: 'private' });
    sessionStorage.setItem('accessToken', 'valid-token');
    vi.mocked(fetch).mockResolvedValueOnce(json(user)).mockRejectedValueOnce(new Error('offline'));
    renderAuth(queryClient);
    await screen.findByText(user.email);
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'sign out' })));
    expect(screen.getByRole('status')).toHaveTextContent('unauthenticated');
    expect(sessionStorage.getItem('accessToken')).toBeNull();
    expect(screen.queryByText(user.email)).not.toBeInTheDocument();
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });
});

describe('role landing route', () => {
  it.each([
    ['STUDENT', '/sinh-vien/tong-quan'],
    ['TEACHER', '/giao-vien/lop-hoc'],
    ['ADMINISTRATOR', '/quan-tri/tong-quan'],
  ])('maps %s to its baseline route', (role, path) => {
    expect(landingPath(role)).toBe(path);
  });
});
