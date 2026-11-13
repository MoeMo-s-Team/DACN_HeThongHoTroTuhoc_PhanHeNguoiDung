import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '../../auth/api';
import { LearningAnalysis } from './learning-analysis';

vi.mock('../../auth/api', () => ({ apiRequest: vi.fn() }));
vi.mock('../../auth/auth-context', () => ({ useAuth: () => ({ logout: vi.fn() }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }));

function renderPage() {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
    <LearningAnalysis />
  </QueryClientProvider>);
}

describe('LearningAnalysis', () => {
  beforeEach(() => vi.mocked(apiRequest).mockReset());
  afterEach(() => { cleanup(); sessionStorage.clear(); });

  it('sends a request through NestJS and renders validated AI insights', async () => {
    vi.mocked(apiRequest).mockImplementation(async (path, options) => {
      if (path === '/student/assessment-results') return { items: [{ topic: { id: 'topic-1', name: 'Cây' }, score: 58, classification: 'PRIORITY', evaluatedAt: '2098-01-01T00:00:00.000Z' }] } as never;
      if (path === '/student/ai/learning-analysis') return { strengths: ['Nắm traversal'], areasToImprove: ['Ôn cây'], priorityTopics: [{ topicId: 'topic-1', topicName: 'Cây', reason: 'Điểm thấp' }], reasons: ['Dựa trên kết quả mới nhất'] } as never;
      if (path == null) return { items: [] } as never;
      throw new Error(`Unexpected request ${JSON.stringify([path, options])}`);
    });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Phân tích bằng AI' }));
    expect(await screen.findByText('Nắm traversal')).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledWith('/student/ai/learning-analysis', expect.objectContaining({ method: 'POST' }));
  });
});
