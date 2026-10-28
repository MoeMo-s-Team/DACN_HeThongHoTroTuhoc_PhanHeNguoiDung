import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from './page';
import { AuthProvider } from '../auth/auth-context';

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));
const wrapper = ({ children }: React.PropsWithChildren) => <QueryClientProvider client={new QueryClient()}><AuthProvider>{children}</AuthProvider></QueryClientProvider>;

describe('login route during auth bootstrap failure', () => {
  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem('accessToken', 'still-valid-unconfirmed');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(new Response(JSON.stringify({
      id: 'student-1', fullName: 'Student One', email: 'student.one@example.test', role: 'STUDENT', status: 'ACTIVE',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })));
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

  it('keeps the login route in retryable auth-check error state', async () => {
    render(<LoginPage />, { wrapper });
    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể kiểm tra phiên đăng nhập.');
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
    expect(sessionStorage.getItem('accessToken')).toBe('still-valid-unconfirmed');
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/sinh-vien/tong-quan'));
    expect(sessionStorage.getItem('accessToken')).toBe('still-valid-unconfirmed');
  });

  it('keeps the token and offers retry when /me returns 5xx', async () => {
    vi.mocked(fetch).mockReset()
      .mockResolvedValueOnce(new Response(JSON.stringify({ code: 'DATABASE_FAILURE' }), { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: 'student-1', fullName: 'Student One', email: 'student.one@example.test', role: 'STUDENT', status: 'ACTIVE',
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    render(<LoginPage />, { wrapper });
    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể kiểm tra phiên đăng nhập.');
    expect(sessionStorage.getItem('accessToken')).toBe('still-valid-unconfirmed');
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/sinh-vien/tong-quan'));
    expect(sessionStorage.getItem('accessToken')).toBe('still-valid-unconfirmed');
  });
});
