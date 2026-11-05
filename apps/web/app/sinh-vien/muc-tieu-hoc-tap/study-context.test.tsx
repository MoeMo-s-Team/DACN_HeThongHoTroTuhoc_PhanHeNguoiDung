import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '../../auth/api';
import { StudyContextForm } from './study-context-form';

const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('../../auth/api', () => ({ apiRequest: vi.fn() }));

describe('StudyContextForm', () => {
  beforeEach(() => {
    router.push.mockReset();
    vi.mocked(apiRequest).mockReset();
    sessionStorage.clear();
  });
  afterEach(cleanup);

  it('starts with the wireframe default and disables submit while validating', async () => {
    vi.mocked(apiRequest).mockReturnValue(new Promise(() => {}));
    render(<StudyContextForm />);
    expect(screen.getByLabelText('Số giờ có thể học / tuần *')).toHaveValue(8);
    fireEvent.change(screen.getByLabelText('Mục tiêu học tập *'), { target: { value: 'Goal' } });
    fireEvent.change(screen.getByLabelText('Deadline mục tiêu *'), { target: { value: '2099-12-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận & tiếp tục' }));
    expect(await screen.findByRole('button', { name: 'Đang xác nhận…' })).toBeDisabled();
  });

  it('shows field errors and does not call the API for invalid values', async () => {
    render(<StudyContextForm />);
    fireEvent.change(screen.getByLabelText('Số giờ có thể học / tuần *'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận & tiếp tục' }));
    expect(await screen.findByText('Nhập mục tiêu học tập.')).toBeInTheDocument();
    expect(screen.getByText('Số giờ học mỗi tuần phải lớn hơn 0.')).toBeInTheDocument();
    expect(screen.getByText('Chọn thời hạn trong tương lai.')).toBeInTheDocument();
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it('validates through the API, stores the normalized draft and continues', async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      goal: 'Học cấu trúc dữ liệu', availableMinutesPerWeek: 450, targetDeadline: '2099-12-01T00:00:00.000Z',
    });
    render(<StudyContextForm />);
    fireEvent.change(screen.getByLabelText('Mục tiêu học tập *'), { target: { value: '  Học cấu trúc dữ liệu  ' } });
    fireEvent.change(screen.getByLabelText('Số giờ có thể học / tuần *'), { target: { value: '7.5' } });
    fireEvent.change(screen.getByLabelText('Deadline mục tiêu *'), { target: { value: '2099-12-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận & tiếp tục' }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/sinh-vien/ke-hoach-hoc-tap'));
    expect(apiRequest).toHaveBeenCalledWith('/student/study-context/validate', expect.objectContaining({ method: 'POST' }));
    expect(JSON.parse(sessionStorage.getItem('studyContextDraft') ?? 'null')).toEqual({
      goal: 'Học cấu trúc dữ liệu', availableMinutesPerWeek: 450, targetDeadline: '2099-12-01T00:00:00.000Z',
    });
  });

  it('shows an API error and stays on the form', async () => {
    vi.mocked(apiRequest).mockRejectedValue(new Error('offline'));
    render(<StudyContextForm />);
    fireEvent.change(screen.getByLabelText('Mục tiêu học tập *'), { target: { value: 'Học' } });
    fireEvent.change(screen.getByLabelText('Số giờ có thể học / tuần *'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Deadline mục tiêu *'), { target: { value: '2099-12-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận & tiếp tục' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể xác nhận dữ liệu lúc này.');
    expect(router.push).not.toHaveBeenCalled();
  });
});
