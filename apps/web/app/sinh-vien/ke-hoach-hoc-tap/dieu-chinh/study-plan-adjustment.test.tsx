import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '../../../auth/api';
import { StudyPlanAdjustment } from './study-plan-adjustment';

vi.mock('../../../auth/api', () => ({ apiRequest: vi.fn() }));
vi.mock('../../../auth/auth-context', () => ({ useAuth: () => ({ logout: vi.fn() }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }));

function renderPage() {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
    <StudyPlanAdjustment />
  </QueryClientProvider>);
}

describe('StudyPlanAdjustment', () => {
  beforeEach(() => vi.mocked(apiRequest).mockReset());
  afterEach(cleanup);

  it('requires explicit confirmation before posting the adjustment reference', async () => {
    vi.mocked(apiRequest).mockImplementation(async (path) => {
      if (path === '/student/study-plans/current') return { plan: { id: 'plan-1', title: 'Kế hoạch', goal: 'Học', endDate: '2098-12-01T00:00:00.000Z' }, tasks: [{ id: 'task-1', title: 'Ôn cây', topic: { id: 'topic-1', name: 'Cây' }, expectedMinutes: 60, dueDate: '2098-11-01T00:00:00.000Z', priority: 'MEDIUM', status: 'TODO', completedAt: null }] } as never;
      if (path === '/student/study-plan-adjustments/generate') return { adjustmentRef: 'adjustment-1', expiresAt: '2098-01-01T00:00:00.000Z', preview: { planId: 'plan-1', changes: [{ taskId: 'task-1', title: 'Ôn cây', expectedMinutes: 45, dueDate: '2098-11-01T00:00:00.000Z', priority: 'HIGH', reason: 'Điều chỉnh theo tiến độ' }] } } as never;
      if (path === '/student/study-plan-adjustments/apply') return { replayed: false, updatedTasks: [], progress: {} } as never;
      if (path == null) return {} as never;
      throw new Error(`Unexpected path ${String(path)}`);
    });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Yêu cầu AI đề xuất điều chỉnh' }));
    expect(await screen.findByText(/Điều chỉnh theo tiến độ/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Chấp nhận điều chỉnh' }));
    expect(screen.getByRole('dialog', { name: 'Xác nhận áp dụng điều chỉnh' })).toBeInTheDocument();
    expect(apiRequest).not.toHaveBeenCalledWith('/student/study-plan-adjustments/apply', expect.anything());
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận' }));
    expect(await screen.findByText('Điều chỉnh đã được áp dụng.')).toBeInTheDocument();
  });
});
