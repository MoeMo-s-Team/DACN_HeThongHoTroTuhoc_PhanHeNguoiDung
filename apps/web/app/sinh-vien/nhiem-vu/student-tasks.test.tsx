import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import type { components } from '@dacn/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '../../auth/api';
import { requestTask, StudentTasks } from './student-tasks';

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

type TasksResponse = components['schemas']['StudentStudyTasksResponseDto'];
type Task = components['schemas']['StudyTaskViewDto'];
type UpdateResponse = components['schemas']['UpdateStudyTaskStatusResponseDto'];

const task: Task = {
  id: 'task-1',
  topic: { id: 'topic-1', name: 'Algorithms' },
  title: 'Review sorting',
  goal: 'Compare algorithms',
  expectedMinutes: 45,
  dueDate: '2026-11-04T03:00:00.000Z',
  priority: 'HIGH',
  status: 'TODO',
  completedAt: null,
};
const list: TasksResponse = { planId: 'plan-1', planStatus: 'ACTIVE', items: [task] };
const updated: UpdateResponse = {
  task: { id: task.id, status: 'COMPLETED', completedAt: '2026-11-02T10:00:00.000Z' },
  planStatus: 'COMPLETED',
  progress: {
    completedTasks: 1,
    totalTasks: 1,
    completionPercentage: 100,
    actualProgress: 100,
    expectedProgress: 0,
    overdueTasks: 0,
    slowProgress: false,
  },
};

function DashboardProbe() {
  useQuery({ queryKey: ['student', 'dashboard'], queryFn: () => apiRequest('/student/dashboard') });
  return null;
}

function ProgressProbe() {
  useQuery({ queryKey: ['student', 'progress'], queryFn: () => apiRequest('/student/progress') });
  return null;
}

function renderTasks(withDashboard = false, withProgress = false) {
  const queryClient = new QueryClient();
  const view = render(<QueryClientProvider client={queryClient}>
    {withDashboard && <DashboardProbe />}
    {withProgress && <ProgressProbe />}
    <StudentTasks />
  </QueryClientProvider>);
  return { ...view, queryClient };
}

describe('StudentTasks', () => {
  beforeEach(() => {
    auth.logout.mockReset();
    auth.replace.mockReset();
    vi.mocked(apiRequest).mockReset();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('shows loading while current tasks are requested', () => {
    vi.mocked(apiRequest).mockReturnValue(new Promise(() => {}));
    renderTasks();
    expect(screen.getByRole('status')).toHaveTextContent('Đang tải nhiệm vụ');
  });

  it('shows a failed list request and lets the Student retry', async () => {
    vi.mocked(apiRequest)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(list);
    renderTasks();

    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể tải nhiệm vụ học tập.');
    expect(screen.queryByText('Đang tải nhiệm vụ…')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByText('Review sorting')).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledTimes(2);
  });

  it('ends loading and allows retry when the task-list request times out', async () => {
    vi.useFakeTimers();
    vi.mocked(apiRequest)
      .mockImplementationOnce(() => new Promise(() => {}))
      .mockResolvedValueOnce(list);
    renderTasks();
    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBeGreaterThan(0);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
      await vi.runOnlyPendingTimersAsync();
      await Promise.resolve();
    });
    expect(vi.mocked(apiRequest).mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(screen.getByRole('alert')).toHaveTextContent('Không thể tải nhiệm vụ học tập.');
    expect(screen.queryByText('Đang tải nhiệm vụ…')).not.toBeInTheDocument();

    vi.useRealTimers();
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByText('Review sorting')).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledTimes(2);
  });

  it('settles and clears its timeout when canceled while the transport ignores abort', async () => {
    vi.useFakeTimers();
    vi.mocked(apiRequest).mockReturnValue(new Promise(() => {}));
    const controller = new AbortController();
    const request = requestTask('/student/study-tasks', { signal: controller.signal });
    const requestResult = expect(request).rejects.toBeDefined();
    expect(vi.getTimerCount()).toBe(1);

    controller.abort();
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });

    await requestResult;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('aborts the list transport when its TanStack query is canceled', async () => {
    let requestSignal: AbortSignal | undefined;
    vi.mocked(apiRequest).mockImplementation((_path, options) => {
      requestSignal = options?.signal as AbortSignal;
      return new Promise(() => {}) as never;
    });
    const { queryClient } = renderTasks();
    await waitFor(() => expect(apiRequest).toHaveBeenCalledTimes(1));

    await act(async () => { await queryClient.cancelQueries({ queryKey: ['student', 'study-tasks'] }); });

    expect(requestSignal?.aborted).toBe(true);
  });

  it('shows an empty message when the Student has no current plan', async () => {
    vi.mocked(apiRequest).mockResolvedValue({ planId: null, planStatus: null, items: [] });
    renderTasks();
    expect(await screen.findByText('Chưa có kế hoạch học tập hiện tại.')).toBeInTheDocument();
  });

  it('shows the current-plan empty state when the plan has no tasks', async () => {
    vi.mocked(apiRequest).mockResolvedValue({ planId: 'empty-plan', planStatus: 'ACTIVE', items: [] });
    renderTasks();
    expect(await screen.findByText('Kế hoạch hiện tại chưa có nhiệm vụ.')).toBeInTheDocument();
  });

  it('renders current plan and task fields with labels', async () => {
    vi.mocked(apiRequest).mockResolvedValue(list);
    renderTasks();
    expect(await screen.findByText('Review sorting')).toBeInTheDocument();
    expect(screen.getByText(/Algorithms · 45 phút/)).toBeInTheDocument();
    expect(screen.getByText(/Hạn:/)).toHaveTextContent(new Date(task.dueDate).toLocaleDateString('vi-VN'));
    expect(screen.getByText('Ưu tiên Cao')).toBeInTheDocument();
    expect(screen.getByText('Cần hoàn thành')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Đánh dấu hoàn thành: Review sorting' })).not.toBeChecked();
  });

  it('shows the failed update without changing task status and lets the Student retry', async () => {
    let rejectUpdate!: (error: Error) => void;
    let updateAttempts = 0;
    let tasks = list;
    vi.mocked(apiRequest).mockImplementation((path) => {
      if (path === '/student/study-tasks') return Promise.resolve(tasks) as never;
      updateAttempts += 1;
      if (updateAttempts === 1) return new Promise((_resolve, reject) => { rejectUpdate = reject; }) as never;
      tasks = { ...list, planStatus: 'COMPLETED', items: [{ ...task, status: 'COMPLETED', completedAt: updated.task.completedAt }] };
      return Promise.resolve(updated) as never;
    });
    renderTasks();
    const checkbox = await screen.findByRole('checkbox', { name: 'Đánh dấu hoàn thành: Review sorting' });
    fireEvent.click(checkbox);
    expect(await screen.findByRole('status')).toHaveTextContent('Đang cập nhật…');
    expect(checkbox).not.toBeChecked();
    expect(screen.getByText('Cần hoàn thành')).toBeInTheDocument();

    rejectUpdate(new Error('offline'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể cập nhật trạng thái nhiệm vụ.');
    expect(checkbox).not.toBeChecked();
    expect(screen.getByText('Cần hoàn thành')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByText('Đã cập nhật trạng thái.')).toBeInTheDocument();
    expect(apiRequest).toHaveBeenNthCalledWith(3, '/student/study-tasks/task-1/status', expect.objectContaining({
      method: 'PATCH', body: JSON.stringify({ status: 'COMPLETED' }),
    }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('ends pending and keeps the task unchanged when the PATCH reaches its timeout', async () => {
    vi.mocked(apiRequest).mockImplementation((path, options) => {
      if (path === '/student/study-tasks') return Promise.resolve(list) as never;
      return new Promise((_resolve, reject) => {
        options?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
      }) as never;
    });
    renderTasks();
    const checkbox = await screen.findByRole('checkbox', { name: 'Đánh dấu hoàn thành: Review sorting' });
    vi.useFakeTimers();
    fireEvent.click(checkbox);
    await act(async () => { await Promise.resolve(); });
    expect(apiRequest).toHaveBeenCalledTimes(2);
    const timeoutSignal = vi.mocked(apiRequest).mock.calls[1][1]?.signal;
    expect(timeoutSignal).toBeDefined();

    await act(async () => { await vi.advanceTimersByTimeAsync(14_999); });
    expect(screen.getByText('Đang cập nhật…')).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
      await vi.runOnlyPendingTimersAsync();
      await Promise.resolve();
    });

    expect(timeoutSignal?.aborted).toBe(true);
    expect(screen.getByRole('alert')).toHaveTextContent('Không thể cập nhật trạng thái nhiệm vụ.');
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();
    expect(screen.getByText('Cần hoàn thành')).toBeInTheDocument();
  });

  it('shows PATCH success without waiting for pending query refetches', async () => {
    let taskReads = 0;
    let dashboardReads = 0;
    let releaseTaskRefetch!: () => void;
    let releaseDashboardRefetch!: () => void;
    const pendingTaskRefetch = new Promise<TasksResponse>((resolve) => { releaseTaskRefetch = () => resolve(list); });
    const pendingDashboardRefetch = new Promise<object>((resolve) => { releaseDashboardRefetch = () => resolve({}); });
    vi.mocked(apiRequest).mockImplementation((path) => {
      if (path === '/student/study-tasks') return ++taskReads === 1 ? Promise.resolve(list) as never : pendingTaskRefetch as never;
      if (path === '/student/dashboard') return ++dashboardReads === 1 ? Promise.resolve({}) as never : pendingDashboardRefetch as never;
      return Promise.resolve(updated) as never;
    });
    renderTasks(true);
    const checkbox = await screen.findByRole('checkbox', { name: 'Đánh dấu hoàn thành: Review sorting' });
    fireEvent.click(checkbox);

    try {
      await waitFor(() => expect(screen.getByText('Đã cập nhật trạng thái.')).toBeInTheDocument(), { timeout: 1_000 });
      expect(screen.getByRole('checkbox', { name: 'Hoàn tác hoàn thành: Review sorting' })).toBeChecked();
    } finally {
      releaseTaskRefetch();
      releaseDashboardRefetch();
    }
  });

  it('updates a task and refreshes task, dashboard, and progress data after success', async () => {
    let tasks = list;
    let taskLoads = 0;
    let dashboardLoads = 0;
    let progressLoads = 0;
    vi.mocked(apiRequest).mockImplementation((path) => {
      if (path === '/student/study-tasks') {
        taskLoads += 1;
        return Promise.resolve(tasks) as never;
      }
      if (path === '/student/dashboard') {
        dashboardLoads += 1;
        return Promise.resolve({}) as never;
      }
      if (path === '/student/progress') {
        progressLoads += 1;
        return Promise.resolve({ hasCurrentPlan: true, planId: 'plan-1', metrics: updated.progress }) as never;
      }
      tasks = { ...list, planStatus: 'COMPLETED', items: [{ ...task, status: 'COMPLETED', completedAt: updated.task.completedAt }] };
      return Promise.resolve(updated) as never;
    });
    renderTasks(true, true);
    const checkbox = await screen.findByRole('checkbox', { name: 'Đánh dấu hoàn thành: Review sorting' });
    fireEvent.click(checkbox);

    expect(await screen.findByText('Đã cập nhật trạng thái.')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Hoàn tác hoàn thành: Review sorting' })).toBeChecked();
    expect(screen.getByText('Đã hoàn thành')).toBeInTheDocument();
    await waitFor(() => {
      expect(taskLoads).toBeGreaterThan(1);
      expect(dashboardLoads).toBeGreaterThan(1);
      expect(progressLoads).toBeGreaterThan(1);
    });
    expect(apiRequest).toHaveBeenCalledWith('/student/study-tasks/task-1/status', expect.objectContaining({
      method: 'PATCH', body: JSON.stringify({ status: 'COMPLETED' }),
    }));
  });
});
