import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiRequest } from '../../../auth/api';
import { installDialogMock, renderQuery } from '../../test-support';
import { AdminHistory } from './admin-history';

vi.mock('../../../auth/api', async (importOriginal) => ({ ...await importOriginal<typeof import('../../../auth/api')>(), apiRequest: vi.fn() }));
const list = { items: [
  { id: 'saved1', createdAt: '2026-10-21T00:00:00.000Z', totalFeedback: 2, filter: { tag: 'UI_UX', rating: null } },
  { id: 'saved2', createdAt: '2026-10-20T00:00:00.000Z', totalFeedback: 1, filter: {} },
], meta: { page: 1, limit: 20, total: 2, totalPages: 1 } };
const detail = { id: 'saved1', createdAt: list.items[0].createdAt, inputSnapshot: { filter: list.items[0].filter, feedbackIds: ['snapshot-id-1', 'snapshot-id-2'], totalFeedback: 2, tagStatistics: { AI_PERFORMANCE: 0, STUDY_PLAN: 0, UI_UX: 2, LEARNING_ANALYTICS: 0, OTHER: 0 } }, analysisResult: { issueGroups: [{ title: 'Saved group', summary: 'Saved group summary', feedbackIds: ['snapshot-id-1'], count: 1 }], summary: 'Original saved summary', priorityAreas: ['Original priority'], recommendations: [{ title: 'Original recommendation', description: 'Original description' }] } };
beforeAll(installDialogMock);
beforeEach(() => { vi.mocked(apiRequest).mockReset(); });
afterEach(cleanup);

describe('Read-only analysis history', () => {
  it('shows loading and a valid empty history', async () => {
    vi.mocked(apiRequest).mockReturnValueOnce(new Promise(() => {}));
    const view = renderQuery(<AdminHistory />);
    expect(screen.getByRole('status')).toHaveTextContent('Đang tải lịch sử');
    view.unmount();
    vi.mocked(apiRequest).mockResolvedValue({ items: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } });
    renderQuery(<AdminHistory />);
    expect(await screen.findByText('Chưa có kết quả phân tích được lưu.')).toBeInTheDocument();
  });
  it('opens exact stored fields as plain text without live feedback or AI requests', async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce(list).mockResolvedValueOnce(detail);
    renderQuery(<AdminHistory />);
    fireEvent.click(await screen.findByRole('button', { name: 'Xem phân tích saved1' }));
    expect(await screen.findByText('Original saved summary')).toBeInTheDocument();
    for (const text of ['snapshot-id-1', 'Saved group', 'Original priority', 'Original recommendation', 'Original description']) expect(screen.getAllByText(text).length).toBeGreaterThan(0);
    expect(screen.getByText('Chỉ đọc · Kết quả AI đã lưu')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /lưu|xóa|chạy lại/i })).not.toBeInTheDocument();
    expect(vi.mocked(apiRequest).mock.calls.every(([path, options]) => path.startsWith('/admin/feedback/analyses') && !options?.method)).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('keeps loading details separate from a previous selection', async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce(list).mockResolvedValueOnce(detail);
    renderQuery(<AdminHistory />);
    fireEvent.click(await screen.findByRole('button', { name: 'Xem phân tích saved1' }));
    await screen.findByText('Original saved summary');
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    vi.mocked(apiRequest).mockReturnValue(new Promise(() => {}));
    fireEvent.click(screen.getByRole('button', { name: 'Xem phân tích saved2' }));
    expect(screen.getByRole('status')).toHaveTextContent('Đang tải chi tiết');
    expect(screen.queryByText('Original saved summary')).not.toBeInTheDocument();
  });
  it('supports empty issue groups and optional empty filter fields', async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce(list).mockResolvedValueOnce({ ...detail, inputSnapshot: { ...detail.inputSnapshot, filter: {} }, analysisResult: { ...detail.analysisResult, issueGroups: [], recommendations: [], priorityAreas: [] } });
    renderQuery(<AdminHistory />);
    fireEvent.click(await screen.findByRole('button', { name: 'Xem phân tích saved1' }));
    expect(await screen.findByText('Không có nhóm vấn đề nổi bật trong kết quả đã lưu.')).toBeInTheDocument();
    expect(screen.getAllByText('Toàn bộ phản hồi').length).toBeGreaterThan(0);
  });
  it('reports not found and retries generic detail errors', async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce(list).mockRejectedValueOnce(new ApiError(404, 'RESOURCE_NOT_FOUND', 'missing'));
    renderQuery(<AdminHistory />);
    fireEvent.click(await screen.findByRole('button', { name: 'Xem phân tích saved1' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tìm thấy bản phân tích');
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    vi.mocked(apiRequest).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(detail);
    fireEvent.click(screen.getByRole('button', { name: 'Xem phân tích saved2' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByText('Original saved summary')).toBeInTheDocument();
  });
  it('retries list errors and requests the next page', async () => {
    vi.mocked(apiRequest).mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ ...list, meta: { page: 1, limit: 20, total: 21, totalPages: 2 } });
    renderQuery(<AdminHistory />);
    fireEvent.click(await screen.findByRole('button', { name: 'Thử lại' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Trang sau' }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/admin/feedback/analyses?page=2&limit=20'));
  });
});
