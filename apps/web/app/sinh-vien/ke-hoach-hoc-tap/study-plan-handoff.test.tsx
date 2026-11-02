import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StudyPlanHandoff } from './study-plan-handoff';

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock('../../auth/auth-context', () => ({ useAuth: () => ({ logout: vi.fn() }) }));

describe('StudyPlanHandoff', () => {
  afterEach(() => { cleanup(); sessionStorage.clear(); });

  it('shows the validated draft without creating a plan or calling another API', async () => {
    sessionStorage.setItem('studyContextDraft', JSON.stringify({
      goal: 'Học cấu trúc dữ liệu', availableMinutesPerWeek: 450, targetDeadline: '2099-12-01T00:00:00.000Z',
    }));
    render(<StudyPlanHandoff />);
    expect(await screen.findByText('Dữ liệu đã xác nhận')).toBeInTheDocument();
    expect(screen.getByText('Học cấu trúc dữ liệu')).toBeInTheDocument();
    expect(screen.getByText('Tạo kế hoạch học tập chưa được triển khai.')).toBeInTheDocument();
  });
});
