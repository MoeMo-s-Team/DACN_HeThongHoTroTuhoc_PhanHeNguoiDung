import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { components } from '@dacn/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '../../auth/api';
import { AuthenticatedHome } from '../../auth/authenticated-home';
import { StudentDashboard } from './student-dashboard';

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

type DashboardResponse = components['schemas']['StudentDashboardResponseDto'];

const response: DashboardResponse = {
  assessmentResults: [{
    topic: { id: 'topic-1', name: 'Algorithms' },
    score: 80,
    classification: 'GOOD',
    evaluatedAt: '2026-10-31T00:00:00.000Z',
  }],
  currentPlan: {
    id: 'plan-1',
    title: 'Weekly plan',
    goal: 'Review algorithms',
    status: 'ACTIVE',
    startDate: '2026-10-25T00:00:00.000Z',
    endDate: '2026-11-08T00:00:00.000Z',
  },
  progress: {
    completedTasks: 1,
    totalTasks: 2,
    completionPercentage: 50,
    actualProgress: 50,
    expectedProgress: 100,
    overdueTasks: 1,
    slowProgress: true,
  },
  nearDueTasks: [{
    id: 'task-near',
    topic: { id: 'topic-1', name: 'Algorithms' },
    title: 'Practice trees',
    goal: 'Understand binary trees',
    expectedMinutes: 45,
    dueDate: '2026-11-01T00:00:00.000Z',
    priority: 'HIGH',
    status: 'TODO',
    completedAt: null,
  }],
  overdueTaskItems: [{
    id: 'task-overdue',
    topic: { id: 'topic-1', name: 'Algorithms' },
    title: 'Review sorting',
    goal: 'Compare sorting algorithms',
    expectedMinutes: 30,
    dueDate: '2026-10-30T00:00:00.000Z',
    priority: 'MEDIUM',
    status: 'TODO',
    completedAt: null,
  }],
};

function renderDashboard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>
    <AuthenticatedHome role="STUDENT"><StudentDashboard /></AuthenticatedHome>
  </QueryClientProvider>);
}

describe('StudentDashboard', () => {
  beforeEach(() => {
    auth.logout.mockReset();
    auth.replace.mockReset();
    vi.mocked(apiRequest).mockReset();
  });
  afterEach(cleanup);

  it('shows a loading state while dashboard data is requested', () => {
    vi.mocked(apiRequest).mockReturnValue(new Promise(() => {}));
    renderDashboard();
    expect(screen.getByRole('status')).toHaveTextContent('Đang tải tổng quan học tập');
  });

  it('shows a retry action after an API failure', async () => {
    vi.mocked(apiRequest).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(response);
    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByText('Weekly plan')).toBeInTheDocument();
  });

  it('shows empty and N/A states without fabricating scores or plan metrics', async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      assessmentResults: [], currentPlan: null, progress: null, nearDueTasks: [], overdueTaskItems: [],
    });
    renderDashboard();
    expect(await screen.findByText('Chưa có kết quả học tập.')).toBeInTheDocument();
    expect(screen.getByText('Chưa có kế hoạch hiện tại.')).toBeInTheDocument();
    expect(screen.getAllByText('N/A').length).toBeGreaterThan(0);
    expect(screen.queryByText('0%')).not.toBeInTheDocument();
  });

  it('keeps results visible when the Student has no current StudyPlan', async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      ...response, currentPlan: null, progress: null, nearDueTasks: [], overdueTaskItems: [],
    });
    renderDashboard();
    expect(await screen.findByText('Algorithms')).toBeInTheDocument();
    expect(screen.getByText('Tốt')).toBeInTheDocument();
    expect(screen.getByText('Chưa có kế hoạch hiện tại.')).toBeInTheDocument();
  });

  it('renders backend metrics, task lists, and Student navigation', async () => {
    vi.mocked(apiRequest).mockResolvedValue(response);
    renderDashboard();
    expect(await screen.findByText('Weekly plan')).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledWith('/student/dashboard');
    expect(screen.getByText('50.0%')).toBeInTheDocument();
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    expect(screen.getByText('Practice trees')).toBeInTheDocument();
    expect(screen.getByText('Review sorting')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Kết quả học tập' })).toHaveAttribute('href', '/sinh-vien/ket-qua-hoc-tap');
    expect(screen.getByRole('link', { name: 'Nhiệm vụ' })).toHaveAttribute('href', '/sinh-vien/nhiem-vu');
    expect(screen.getByRole('link', { name: 'Tiến độ' })).toHaveAttribute('href', '/sinh-vien/tien-do');
    expect(screen.getByRole('region', { name: 'Cảnh báo chậm tiến độ' })).toBeInTheDocument();
  });

  it('retains logout when AuthenticatedHome renders Student children', async () => {
    vi.mocked(apiRequest).mockReturnValue(new Promise(() => {}));
    auth.logout.mockResolvedValue(undefined);
    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }));
    await waitFor(() => expect(auth.logout).toHaveBeenCalledOnce());
    expect(auth.replace).toHaveBeenCalledWith('/dang-nhap');
  });
});
