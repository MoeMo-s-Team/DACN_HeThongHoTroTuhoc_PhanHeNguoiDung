import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '../../auth/api';
import { StudentFeedback } from './student-feedback';

const auth = vi.hoisted(() => ({ logout: vi.fn(), replace: vi.fn() }));
vi.mock('../../auth/auth-context', () => ({
  useAuth: () => ({ logout: auth.logout, user: { id: 'student-1', role: 'STUDENT', status: 'ACTIVE' } }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: auth.replace }) }));
vi.mock('../../auth/api', () => ({ apiRequest: vi.fn() }));

function renderFeedback() {
  return render(<QueryClientProvider client={new QueryClient()}><StudentFeedback /></QueryClientProvider>);
}

function fillForm() {
  fireEvent.change(screen.getByLabelText('Nhóm phản hồi *'), { target: { value: 'UI_UX' } });
  fireEvent.click(screen.getByRole('radio', { name: '4 sao' }));
  fireEvent.change(screen.getByLabelText('Nội dung phản hồi *'), { target: { value: 'Điều hướng dễ dùng.' } });
}

describe('StudentFeedback', () => {
  beforeEach(() => vi.mocked(apiRequest).mockReset());
  afterEach(() => cleanup());

  it('shows a clear validation message for each required field', async () => {
    renderFeedback();
    fireEvent.click(screen.getByRole('button', { name: 'Gửi phản hồi' }));

    expect(await screen.findByText('Chọn nhóm phản hồi.')).toBeInTheDocument();
    expect(screen.getByText('Chọn mức đánh giá từ 1 đến 5.')).toBeInTheDocument();
    expect(screen.getByText('Nội dung phản hồi không được để trống.')).toBeInTheDocument();
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it('sends once while pending and resets the form after success without navigating', async () => {
    let finish!: (value: object) => void;
    vi.mocked(apiRequest).mockReturnValue(new Promise((resolve) => { finish = resolve; }) as never);
    renderFeedback();
    fillForm();

    const submit = screen.getByRole('button', { name: 'Gửi phản hồi' });
    fireEvent.click(submit);
    expect(await screen.findByRole('button', { name: 'Đang gửi…' })).toBeDisabled();
    const form = screen.getByRole('button', { name: 'Đang gửi…' }).closest('form')!;
    await act(async () => {
      fireEvent.submit(form);
      fireEvent.submit(form);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    const requestCount = vi.mocked(apiRequest).mock.calls.length;

    await act(async () => finish({ id: 'feedback-id', tag: 'UI_UX', rating: 4, content: 'Điều hướng dễ dùng.', createdAt: '2026-11-04T03:00:00.000Z' }));
    expect(requestCount).toBe(1);
    expect(apiRequest).toHaveBeenCalledWith('/feedback', {
      method: 'POST', body: JSON.stringify({ tag: 'UI_UX', rating: 4, content: 'Điều hướng dễ dùng.' }),
    });

    expect(await screen.findByRole('status')).toHaveTextContent('Đã gửi phản hồi. Cảm ơn bạn!');
    expect(screen.getByLabelText('Nhóm phản hồi *')).toHaveValue('');
    expect(screen.getByLabelText('Nội dung phản hồi *')).toHaveValue('');
    expect(screen.getAllByRole('radio').every((radio) => !(radio as HTMLInputElement).checked)).toBe(true);
    expect(auth.replace).not.toHaveBeenCalled();
  });

  it('shows an error and keeps the form values after an API failure', async () => {
    vi.mocked(apiRequest).mockRejectedValueOnce(new Error('offline'));
    renderFeedback();
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'Gửi phản hồi' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể gửi phản hồi. Vui lòng thử lại.');
    expect(screen.getByLabelText('Nhóm phản hồi *')).toHaveValue('UI_UX');
    expect(screen.getByLabelText('Nội dung phản hồi *')).toHaveValue('Điều hướng dễ dùng.');
  });
});
