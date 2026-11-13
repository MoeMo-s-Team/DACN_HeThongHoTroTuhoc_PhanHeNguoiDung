import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '../../auth/api';
import { StudyPlanHandoff } from './study-plan-handoff';

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock('../../auth/auth-context', () => ({ useAuth: () => ({ logout: vi.fn() }) }));
vi.mock('../../auth/api', () => ({ apiRequest: vi.fn() }));

const previewResponse = { planPreviewRef: 'preview-1', expiresAt: '2098-01-01T00:00:00.000Z', preview: {
  planTitle: 'Kế hoạch cây', goal: 'Học cây', availableMinutesPerWeek: 300, targetDeadline: '2098-12-01T00:00:00.000Z',
  tasks: [{ previewTaskId: 'task-preview-1', topic: { id: 'topic-1', name: 'Cây' }, title: 'Ôn cây', goal: 'Hiểu cây',
    expectedMinutes: 60, dueDate: '2098-11-01T00:00:00.000Z', priority: 'HIGH', reason: 'Cần củng cố' }],
} };

function renderHandoff() {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
    <StudyPlanHandoff />
  </QueryClientProvider>);
}

describe('StudyPlanHandoff', () => {
  beforeEach(() => { vi.mocked(apiRequest).mockReset(); });
  afterEach(() => { cleanup(); sessionStorage.clear(); });

  it('generates a server preview and applies it only after explicit confirmation', async () => {
    sessionStorage.setItem('studyContextDraft', JSON.stringify({
      goal: 'Học cây', availableMinutesPerWeek: 300, targetDeadline: '2098-12-01T00:00:00.000Z',
    }));
    vi.mocked(apiRequest).mockImplementation(async (path, options) => {
      if (path === '/student/study-plans/current') return { plan: null, tasks: [] } as never;
      if (path === '/student/study-plans/generate') return previewResponse as never;
      if (path === '/student/study-plans/apply') return { replayed: false, plan: { id: 'plan-1' }, tasks: [] } as never;
      throw new Error(`Unexpected API path ${path} ${options?.method ?? ''}`);
    });
    renderHandoff();

    fireEvent.click(await screen.findByRole('button', { name: 'Tạo kế hoạch bằng AI' }));
    expect(await screen.findByText(/Cần củng cố/)).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledWith('/student/study-plans/generate', expect.objectContaining({ method: 'POST' }));
    expect(screen.getByText(/Bản xem trước do AI đề xuất · Chưa lưu/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận áp dụng' }));
    expect(apiRequest).not.toHaveBeenCalledWith('/student/study-plans/apply', expect.anything());
    fireEvent.click(screen.getByRole('button', { name: 'Lưu kế hoạch' }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/student/study-plans/apply', expect.objectContaining({ method: 'POST' })));
  });

  it('requires a fresh goal and future deadline before replacing a past-deadline plan', async () => {
    vi.mocked(apiRequest).mockImplementation(async (path) => {
      if (path === '/student/study-plans/current') return { plan: {
        id: 'plan-old', title: 'Kế hoạch cũ', goal: 'Ôn cây', availableMinutesPerWeek: 120,
        startDate: '2026-01-01T00:00:00.000Z', endDate: '2026-01-02T00:00:00.000Z', status: 'ACTIVE',
      }, tasks: [] } as never;
      throw new Error(`Unexpected API path ${path}`);
    });
    renderHandoff();

    expect(await screen.findByText(/Kế hoạch hiện tại đã quá hạn/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tạo kế hoạch mới bằng AI' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Nhập mục tiêu học tập' })).toHaveAttribute('href', '/sinh-vien/muc-tieu-hoc-tap');
  });
});
