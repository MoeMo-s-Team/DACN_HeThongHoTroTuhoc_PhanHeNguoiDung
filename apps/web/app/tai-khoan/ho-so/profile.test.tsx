import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderQuery } from '../../quan-tri/test-support';
import { Profile } from './profile';

const auth = vi.hoisted(() => ({ user: { id: 'admin', fullName: 'Current Admin', email: 'current@example.test', role: 'ADMINISTRATOR', status: 'ACTIVE' }, status: 'authenticated', retry: vi.fn(), logout: vi.fn(), replace: vi.fn() }));
vi.mock('../../auth/auth-context', () => ({ useAuth: () => auth }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: auth.replace }) }));
beforeEach(() => { auth.status = 'authenticated'; auth.user.role = 'ADMINISTRATOR'; auth.retry.mockReset(); });
afterEach(cleanup);

describe('Read-only profile', () => {
  it('shows the current account with no editable fields and role-aware return navigation', () => {
    renderQuery(<Profile />);
    expect(screen.getByRole('heading', { name: 'Hồ sơ cá nhân' })).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Quay về trang chính' })).toHaveAttribute('href', '/quan-tri/tong-quan');
    expect(screen.getByRole('button', { name: 'Đăng xuất' })).toBeInTheDocument();
  });
  it('uses existing auth loading and retry states', () => {
    auth.status = 'loading';
    const view = renderQuery(<Profile />);
    expect(screen.getByRole('status')).toHaveTextContent('Đang kiểm tra phiên');
    view.unmount();
    auth.status = 'error';
    renderQuery(<Profile />);
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(auth.retry).toHaveBeenCalledOnce();
  });
  it('returns Teachers to their assigned class page', () => {
    auth.user.role = 'TEACHER';
    renderQuery(<Profile />);
    expect(screen.getByRole('link', { name: 'Quay về trang chính' })).toHaveAttribute('href', '/giao-vien/lop-hoc');
  });
});
