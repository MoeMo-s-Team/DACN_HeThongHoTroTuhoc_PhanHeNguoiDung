import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { components } from '@dacn/contracts';
import { apiRequest } from '../../auth/api';
import { installDialogMock, renderQuery } from '../test-support';
import { AdminUsers } from './admin-users';

vi.mock('../../auth/auth-context', () => ({ useAuth: () => ({ user: { id: 'admin' } }) }));
vi.mock('../../auth/api', () => ({ apiRequest: vi.fn() }));
const response: components['schemas']['AdminUsersResponseDto'] = { items: [
  { id: 'admin', fullName: 'Admin One', email: 'admin@example.test', role: 'ADMINISTRATOR', status: 'ACTIVE' },
  { id: 'target', fullName: 'Student A', email: 'student@example.test', role: 'STUDENT', status: 'ACTIVE' },
], meta: { page: 1, limit: 20, total: 2, totalPages: 1 } };

beforeAll(installDialogMock);
beforeEach(() => { vi.mocked(apiRequest).mockReset(); });
afterEach(cleanup);

describe('Administrator users', () => {
  it('shows loading and prevents self-disable', async () => {
    vi.mocked(apiRequest).mockReturnValueOnce(new Promise(() => {}));
    const view = renderQuery(<AdminUsers />);
    expect(screen.getByRole('status')).toHaveTextContent('Đang tải người dùng');
    view.unmount();
    vi.mocked(apiRequest).mockResolvedValue(response);
    renderQuery(<AdminUsers />);
    expect(await screen.findByRole('button', { name: 'Vô hiệu hóa Admin One' })).toBeDisabled();
  });
  it('searches and resets the page without inventing results', async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce(response).mockResolvedValue({ items: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } });
    renderQuery(<AdminUsers />);
    await screen.findByText('Student A');
    fireEvent.change(screen.getByLabelText('Tìm theo tên hoặc email'), { target: { value: 'Nobody' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tìm kiếm' }));
    expect(await screen.findByText('Không tìm thấy người dùng phù hợp.')).toBeInTheDocument();
    expect(apiRequest).toHaveBeenLastCalledWith('/admin/users?page=1&limit=20&q=Nobody');
  });
  it('requires confirmation and cancel does not mutate', async () => {
    vi.mocked(apiRequest).mockResolvedValue(response);
    renderQuery(<AdminUsers />);
    fireEvent.click(await screen.findByRole('button', { name: 'Vô hiệu hóa Student A' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Hủy' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledTimes(1);
  });
  it('confirms a single mutation and refreshes the list and dashboard cache', async () => {
    let disabled = false;
    vi.mocked(apiRequest).mockImplementation(async (_path, options) => {
      if (options?.method === 'PATCH') { disabled = true; return { id: 'target', status: 'DISABLED' }; }
      return { ...response, items: response.items.map((item) => item.id === 'target' && disabled ? { ...item, status: 'DISABLED' } : item) };
    });
    const { queryClient } = renderQuery(<AdminUsers />);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    fireEvent.click(await screen.findByRole('button', { name: 'Vô hiệu hóa Student A' }));
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận vô hiệu hóa' }));
    expect(await screen.findByRole('button', { name: 'Kích hoạt Student A' })).toBeEnabled();
    expect(apiRequest).toHaveBeenCalledWith('/admin/users/target/status', { method: 'PATCH', body: JSON.stringify({ status: 'DISABLED' }) });
    expect(vi.mocked(apiRequest).mock.calls.filter(([, options]) => options?.method === 'PATCH')).toHaveLength(1);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['admin', 'dashboard'] });
  });
  it('keeps the old status and reports a failed update', async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce(response).mockRejectedValueOnce(new Error('Update failed'));
    renderQuery(<AdminUsers />);
    fireEvent.click(await screen.findByRole('button', { name: 'Vô hiệu hóa Student A' }));
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận vô hiệu hóa' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể cập nhật trạng thái');
    expect(screen.getByRole('button', { name: 'Vô hiệu hóa Student A' })).toBeInTheDocument();
  });
  it('offers retry after a list error', async () => {
    vi.mocked(apiRequest).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(response);
    renderQuery(<AdminUsers />);
    fireEvent.click(await screen.findByRole('button', { name: 'Thử lại' }));
    await waitFor(() => expect(screen.getByText('Student A')).toBeInTheDocument());
  });
  it('loads the requested next page', async () => {
    vi.mocked(apiRequest).mockResolvedValue({ ...response, meta: { page: 1, limit: 20, total: 21, totalPages: 2 } });
    renderQuery(<AdminUsers />);
    fireEvent.click(await screen.findByRole('button', { name: 'Trang sau' }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/admin/users?page=2&limit=20'));
  });
  it('blocks duplicate submission and closing during a status update', async () => {
    let finish!: (value: unknown) => void;
    vi.mocked(apiRequest).mockImplementation((_path, options) => options?.method === 'PATCH' ? new Promise((resolve) => { finish = resolve; }) : Promise.resolve(response));
    renderQuery(<AdminUsers />);
    fireEvent.click(await screen.findByRole('button', { name: 'Vô hiệu hóa Student A' }));
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận vô hiệu hóa' }));
    await waitFor(() => expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Đang cập nhật…' })).toBeDisabled());
    expect(screen.getByRole('button', { name: 'Hủy' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Đóng' })).toBeDisabled();
    expect(vi.mocked(apiRequest).mock.calls.filter(([, options]) => options?.method === 'PATCH')).toHaveLength(1);
    await act(async () => { finish({ id: 'target', status: 'DISABLED' }); });
  });
});
