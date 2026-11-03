import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { components } from '@dacn/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '../../auth/api';
import { StudentAssessmentResults } from './student-assessment-results';

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

type Results = components['schemas']['StudentAssessmentResultsResponseDto'];

const response: Results = { items: [
  { topic: { id: 'topic-1', name: 'Algorithms' }, score: 0, classification: 'PRIORITY', evaluatedAt: '2026-10-31T03:00:00.000Z' },
  { topic: { id: 'topic-2', name: 'Databases' }, score: 60, classification: 'NEEDS_REINFORCEMENT', evaluatedAt: '2026-10-30T03:00:00.000Z' },
  { topic: { id: 'topic-3', name: 'Networking' }, score: 100, classification: 'GOOD', evaluatedAt: '2026-10-29T03:00:00.000Z' },
] };

function renderResults() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}><StudentAssessmentResults /></QueryClientProvider>);
}

describe('StudentAssessmentResults', () => {
  beforeEach(() => {
    auth.logout.mockReset();
    auth.replace.mockReset();
    vi.mocked(apiRequest).mockReset();
  });
  afterEach(cleanup);

  it('shows a loading state while the API request is pending', () => {
    vi.mocked(apiRequest).mockReturnValue(new Promise(() => {}));
    renderResults();
    expect(screen.getByRole('status')).toHaveTextContent('Đang tải kết quả học tập');
  });

  it('shows the empty state when the API has no results', async () => {
    vi.mocked(apiRequest).mockResolvedValue({ items: [] });
    renderResults();
    expect(await screen.findByText('Chưa có kết quả học tập.')).toBeInTheDocument();
  });

  it('shows retry after API failure and then displays the returned results', async () => {
    vi.mocked(apiRequest).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(response);
    renderResults();
    fireEvent.click(await screen.findByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByText('Algorithms')).toBeInTheDocument();
  });

  it('renders API results with Vietnamese states, local timestamps, and the AI analysis link', async () => {
    vi.mocked(apiRequest).mockResolvedValue(response);
    renderResults();
    expect(await screen.findByText('Algorithms')).toBeInTheDocument();
    expect(screen.getByText('Cần ưu tiên')).toBeInTheDocument();
    expect(screen.getByText('Cần củng cố')).toBeInTheDocument();
    expect(screen.getByText('Tốt')).toBeInTheDocument();
    expect(screen.getByText(new Date(response.items[0].evaluatedAt).toLocaleString('vi-VN'))).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledWith('/student/assessment-results');
    expect(screen.getByRole('link', { name: 'Phân tích bằng AI' })).toHaveAttribute('href', '/sinh-vien/phan-tich-ai');
  });
});
