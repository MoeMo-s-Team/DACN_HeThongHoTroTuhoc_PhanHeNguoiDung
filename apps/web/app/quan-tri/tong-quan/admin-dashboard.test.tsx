import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '../../auth/api';
import { renderQuery } from '../test-support';
import { AdminShell } from '../admin-shell';
import { AdminDashboard } from './admin-dashboard';

const auth = vi.hoisted(() => ({ user: { id: 'admin', fullName: 'Admin One', email: 'admin@example.test', role: 'ADMINISTRATOR', status: 'ACTIVE' }, status: 'authenticated', logout: vi.fn(), replace: vi.fn(), retry: vi.fn() }));
vi.mock('../../auth/auth-context', () => ({ useAuth: () => auth }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: auth.replace }) }));
vi.mock('../../auth/api', () => ({ apiRequest: vi.fn() }));

describe('Administrator overview', () => {
  beforeEach(() => { vi.mocked(apiRequest).mockReset(); auth.logout.mockReset(); auth.replace.mockReset(); auth.user.role = 'ADMINISTRATOR'; auth.status = 'authenticated'; });
  afterEach(cleanup);

  it('uses a skeleton while data is loading', () => {
    vi.mocked(apiRequest).mockReturnValue(new Promise(() => {}));
    renderQuery(<AdminDashboard />);
    expect(screen.getByRole('status')).toHaveTextContent('Đang tải tổng quan');
  });
  it('renders all server metrics including valid zeros', async () => {
    vi.mocked(apiRequest).mockResolvedValue({ totalUsers: 0, usersByRole: { STUDENT: 0, TEACHER: 0, ADMINISTRATOR: 0 }, totalFeedback: 0, totalAIRequests: 0, failedAIRequests: 0 });
    renderQuery(<AdminDashboard />);
    expect(await screen.findByText('Tổng người dùng')).toBeInTheDocument();
    expect(screen.getByText('Lượt gọi AI thất bại')).toBeInTheDocument();
    expect(screen.getAllByText('0')).toHaveLength(7);
    expect(apiRequest).toHaveBeenCalledWith('/admin/dashboard');
  });
  it('offers retry after a request error', async () => {
    vi.mocked(apiRequest).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ totalUsers: 8, usersByRole: { STUDENT: 6, TEACHER: 1, ADMINISTRATOR: 1 }, totalFeedback: 4, totalAIRequests: 0, failedAIRequests: 0 });
    renderQuery(<AdminDashboard />);
    fireEvent.click(await screen.findByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByText('8')).toBeInTheDocument();
  });
  it('preserves navigation, profile and logout in the protected shell', async () => {
    renderQuery(<AdminShell currentPath="/quan-tri/tong-quan"><p>Protected content</p></AdminShell>);
    expect(screen.getByRole('link', { name: 'Tổng quan' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Người dùng' })).toHaveAttribute('href', '/quan-tri/nguoi-dung');
    expect(screen.getByRole('link', { name: 'Hồ sơ' })).toHaveAttribute('href', '/tai-khoan/ho-so');
    fireEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }));
    await waitFor(() => expect(auth.replace).toHaveBeenCalledWith('/dang-nhap'));
    expect(auth.logout).toHaveBeenCalledOnce();
  });
  it('does not render Administrator children for another role', async () => {
    auth.user.role = 'STUDENT';
    renderQuery(<AdminShell currentPath="/quan-tri/tong-quan"><p>Protected content</p></AdminShell>);
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
    await waitFor(() => expect(auth.replace).toHaveBeenCalledWith('/sinh-vien/tong-quan'));
  });
});
