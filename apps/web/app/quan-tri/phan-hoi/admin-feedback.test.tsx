import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '../../auth/api';
import { renderQuery } from '../test-support';
import { AdminFeedback } from './admin-feedback';

const navigation = vi.hoisted(() => ({ params: '', replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(navigation.params), useRouter: () => ({ replace: navigation.replace }) }));
vi.mock('../../auth/api', () => ({ apiRequest: vi.fn() }));
const response = { items: [{ id: 'feedback1', sender: { id: 'student', fullName: 'Student A', role: 'STUDENT' }, tag: 'UI_UX', rating: 2, content: '<script>Feedback text</script>', createdAt: '2026-10-01T00:00:00.000Z' }], tagStatistics: { AI_PERFORMANCE: 0, STUDY_PLAN: 0, UI_UX: 21, LEARNING_ANALYTICS: 0, OTHER: 0 }, meta: { page: 1, limit: 20, total: 21, totalPages: 2 } };
beforeEach(() => { vi.mocked(apiRequest).mockReset(); navigation.params = ''; navigation.replace.mockReset(); });
afterEach(cleanup);

describe('Administrator feedback', () => {
  it('shows a loading skeleton', () => {
    vi.mocked(apiRequest).mockReturnValue(new Promise(() => {}));
    renderQuery(<AdminFeedback />);
    expect(screen.getByRole('status')).toHaveTextContent('Đang tải phản hồi');
  });
  it('renders server statistics and safely displays feedback without calling AI', async () => {
    vi.mocked(apiRequest).mockResolvedValue(response);
    renderQuery(<AdminFeedback />);
    expect(await screen.findByText('<script>Feedback text</script>')).toBeInTheDocument();
    expect(screen.getByText('Student A')).toBeInTheDocument();
    expect(screen.getByLabelText('Số phản hồi Giao diện / trải nghiệm')).toHaveTextContent('21');
    expect(screen.getByRole('button', { name: 'Phân tích tập phản hồi này bằng AI' })).toBeDisabled();
    expect(apiRequest).toHaveBeenCalledTimes(1);
  });
  it('applies filters, resets pagination and clears URL filters', async () => {
    navigation.params = 'page=2';
    vi.mocked(apiRequest).mockResolvedValue(response);
    renderQuery(<AdminFeedback />);
    await screen.findByText('Student A');
    fireEvent.change(screen.getByLabelText('Rating'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Tag'), { target: { value: 'UI_UX' } });
    fireEvent.click(screen.getByRole('button', { name: 'Áp dụng bộ lọc' }));
    await waitFor(() => expect(navigation.replace).toHaveBeenCalled());
    const url = new URL(navigation.replace.mock.calls[0][0], 'http://localhost');
    expect(url.searchParams.get('page')).toBe('1');
    expect(url.searchParams.get('rating')).toBe('2');
    expect(url.searchParams.get('tag')).toBe('UI_UX');
    fireEvent.click(screen.getByRole('button', { name: 'Xóa bộ lọc' }));
    expect(navigation.replace).toHaveBeenLastCalledWith('/quan-tri/phan-hoi', { scroll: false });
  });
  it('blocks invalid URL queries before requesting data and hides stale rows on navigation', async () => {
    navigation.params = 'rating=8';
    vi.mocked(apiRequest).mockResolvedValue(response);
    const view = renderQuery(<AdminFeedback />);
    expect(screen.getByRole('alert')).toHaveTextContent('Bộ lọc không hợp lệ');
    expect(apiRequest).not.toHaveBeenCalled();
    navigation.params = '';
    view.rerender(<AdminFeedback />);
    await screen.findByText('Student A');
    navigation.params = 'tag=OTHER';
    vi.mocked(apiRequest).mockReturnValue(new Promise(() => {}));
    view.rerender(<AdminFeedback />);
    expect(screen.queryByText('Student A')).not.toBeInTheDocument();
  });
  it('shows empty results and retries a failed query', async () => {
    vi.mocked(apiRequest).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ ...response, items: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } });
    renderQuery(<AdminFeedback />);
    fireEvent.click(await screen.findByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByText('Không có phản hồi phù hợp với bộ lọc.')).toBeInTheDocument();
  });
  it('hides previous rows and statistics after submitting an invalid calendar range', async () => {
    vi.mocked(apiRequest).mockResolvedValue(response);
    renderQuery(<AdminFeedback />);
    await screen.findByText('Student A');
    fireEvent.change(screen.getByLabelText('Từ ngày'), { target: { value: '2026-10-02' } });
    fireEvent.change(screen.getByLabelText('Đến ngày'), { target: { value: '2026-10-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Áp dụng bộ lọc' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Từ ngày phải trước hoặc bằng đến ngày');
    expect(screen.queryByText('Student A')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Số phản hồi Giao diện / trải nghiệm')).not.toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Xóa bộ lọc' }));
    expect(await screen.findByText('Student A')).toBeInTheDocument();
  });
});
