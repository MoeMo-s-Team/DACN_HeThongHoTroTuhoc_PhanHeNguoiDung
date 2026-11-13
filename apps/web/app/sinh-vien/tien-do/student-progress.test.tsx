import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { components } from '@dacn/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '../../auth/api';
import { StudentProgress } from './student-progress';

const auth = vi.hoisted(() => ({ logout: vi.fn(), replace: vi.fn() }));
vi.mock('../../auth/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'student-1', fullName: 'Student One', email: 'student@example.test', role: 'STUDENT', status: 'ACTIVE' },
    status: 'authenticated',
    logout: auth.logout,
    retry: vi.fn(),
    login: vi.fn(),
  }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: auth.replace }) }));
vi.mock('../../auth/api', () => ({ apiRequest: vi.fn() }));

type ProgressResponse = components['schemas']['StudentProgressResponseDto'];

const progress: ProgressResponse = {
  hasCurrentPlan: true,
  planId: 'plan-1',
  metrics: {
    completedTasks: 2,
    totalTasks: 4,
    completionPercentage: 50,
    actualProgress: 50,
    expectedProgress: 75,
    overdueTasks: 1,
    slowProgress: true,
  },
};

function renderProgress() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}><StudentProgress /></QueryClientProvider>);
}

describe('StudentProgress', () => {
  beforeEach(() => {
    auth.logout.mockReset();
    auth.replace.mockReset();
    vi.mocked(apiRequest).mockReset();
  });
  afterEach(cleanup);

  it('shows loading while progress is being requested', () => {
    vi.mocked(apiRequest).mockReturnValue(new Promise(() => {}));
    renderProgress();
    expect(screen.getByRole('status')).toHaveTextContent('Đang tải tiến độ học tập');
  });

  it('shows an empty state and a plan-entry CTA when there is no current plan', async () => {
    vi.mocked(apiRequest).mockResolvedValue({ hasCurrentPlan: false, planId: null, metrics: null });
    renderProgress();
    expect(await screen.findByText('Chưa có kế hoạch học tập hiện tại.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tạo kế hoạch học tập' })).toHaveAttribute('href', '/sinh-vien/ke-hoach-hoc-tap');
  });

  it('shows task counts, progress bars, overdue count, and backend slow-progress warning', async () => {
    vi.mocked(apiRequest).mockResolvedValue(progress);
    renderProgress();

    expect(await screen.findByText('2 / 4 nhiệm vụ hoàn thành')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Tiến độ thực tế' })).toHaveAttribute('value', '50');
    expect(screen.getByRole('progressbar', { name: 'Tiến độ dự kiến' })).toHaveAttribute('value', '75');
    expect(screen.getByText('Nhiệm vụ quá hạn: 1')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Cảnh báo chậm tiến độ' })).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledWith('/student/progress');
  });

  it('links the slow-progress warning to the AI adjustment screen', async () => {
    vi.mocked(apiRequest).mockResolvedValue(progress);
    renderProgress();

    const link = await screen.findByRole('link', { name: 'Điều chỉnh bằng AI' });
    expect(link).toHaveAttribute('href', '/sinh-vien/ke-hoach-hoc-tap/dieu-chinh');
  });

  it('shows zero progress for a current plan with no tasks and no warning', async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      hasCurrentPlan: true,
      planId: 'empty-plan',
      metrics: {
        completedTasks: 0,
        totalTasks: 0,
        completionPercentage: 0,
        actualProgress: 0,
        expectedProgress: 0,
        overdueTasks: 0,
        slowProgress: false,
      },
    });
    renderProgress();

    expect(await screen.findByText('0 / 0 nhiệm vụ hoàn thành')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Tiến độ thực tế' })).toHaveAttribute('value', '0');
    expect(screen.queryByRole('region', { name: 'Cảnh báo chậm tiến độ' })).not.toBeInTheDocument();
  });

  it('shows an error and lets the Student retry', async () => {
    vi.mocked(apiRequest).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(progress);
    renderProgress();

    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể tải tiến độ học tập.');
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByText('2 / 4 nhiệm vụ hoàn thành')).toBeInTheDocument();
  });
});
