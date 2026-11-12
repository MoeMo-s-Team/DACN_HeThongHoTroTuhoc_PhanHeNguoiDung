import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '../auth/api';
import { renderQuery } from '../quan-tri/test-support';
import { TeacherShell } from './teacher-shell';
import TeacherClassesPage from './lop-hoc/page';
import { ClassDashboard } from './lop-hoc/[classId]/tong-quan/class-dashboard';
import { ClassStudents } from './lop-hoc/[classId]/sinh-vien/class-students';
import { TeacherStudentDetail } from './lop-hoc/[classId]/sinh-vien/[studentId]/student-detail';
import { ClassHistory } from './lop-hoc/[classId]/lich-su-phan-tich/class-history';

const auth = vi.hoisted(() => ({
  user: {
    id: 'teacher-1',
    fullName: 'Cô Nguyễn Thị Hoa',
    email: 'teacher@example.test',
    role: 'TEACHER',
    status: 'ACTIVE',
  },
  status: 'authenticated',
  logout: vi.fn(),
  replace: vi.fn(),
}));

vi.mock('../auth/auth-context', () => ({ useAuth: () => auth }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: auth.replace }) }));
vi.mock('../auth/api', () => ({ apiRequest: vi.fn() }));

describe('Teacher UI Flow', () => {
  beforeEach(() => {
    vi.mocked(apiRequest).mockReset();
    auth.logout.mockReset();
    auth.replace.mockReset();
    auth.user.role = 'TEACHER';
    auth.status = 'authenticated';
  });

  afterEach(cleanup);

  it('renders navigation and logout in TeacherShell', async () => {
    renderQuery(
      <TeacherShell currentPath="/giao-vien/lop-hoc">
        <p>Teacher Area</p>
      </TeacherShell>,
    );

    expect(screen.getByRole('link', { name: 'Danh sách lớp học' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Hồ sơ' })).toHaveAttribute('href', '/tai-khoan/ho-so');

    fireEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }));
    await waitFor(() => expect(auth.replace).toHaveBeenCalledWith('/dang-nhap'));
    expect(auth.logout).toHaveBeenCalledOnce();
  });

  it('redirects unauthorized student away from TeacherShell', async () => {
    auth.user.role = 'STUDENT';
    renderQuery(
      <TeacherShell currentPath="/giao-vien/lop-hoc">
        <p>Forbidden</p>
      </TeacherShell>,
    );

    expect(screen.queryByText('Forbidden')).not.toBeInTheDocument();
    await waitFor(() => expect(auth.replace).toHaveBeenCalledWith('/sinh-vien/tong-quan'));
  });

  it('renders class list and empty state for SCR-TEA-001', async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({
      items: [
        { id: 'cls-1', name: 'Lớp 10A1' },
        { id: 'cls-2', name: 'Lớp 11B2' },
      ],
    });

    renderQuery(<TeacherClassesPage />);
    expect(await screen.findByText('Lớp 10A1')).toBeInTheDocument();
    expect(screen.getByText('Lớp 11B2')).toBeInTheDocument();
    expect(screen.getAllByText('Bảng theo dõi lớp →')).toHaveLength(2);
  });

  it('renders dashboard metrics, weak topics, and needs attention students for SCR-TEA-002', async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({
      class: { id: 'cls-1', name: 'Lớp 10A1' },
      studentCount: 30,
      classAverageScore: 58.5,
      classCompletionRate: 65,
      overdueTaskCount: 5,
      topicAverageScores: [
        { topic: { id: 'top-1', name: 'Hàm số bậc nhất' }, averageScore: 52.0, weakTopic: true },
        { topic: { id: 'top-2', name: 'Hình học phẳng' }, averageScore: 75.0, weakTopic: false },
      ],
      needsAttentionStudents: [
        {
          studentId: 'st-1',
          fullName: 'Trần Văn An',
          reasons: ['Điểm trung bình dưới 60 (52.0)', 'Có 3 nhiệm vụ quá hạn'],
        },
      ],
      progressWarnings: [
        {
          studentId: 'st-1',
          fullName: 'Trần Văn An',
          actualProgress: 40,
          expectedProgress: 65,
        },
      ],
    });

    renderQuery(<ClassDashboard classId="cls-1" />);

    expect(await screen.findByText('Bảng theo dõi: Lớp 10A1')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument(); // studentCount
    expect(screen.getByText('58.5')).toBeInTheDocument(); // classAverageScore
    expect(screen.getByText('Hàm số bậc nhất')).toBeInTheDocument();
    expect(screen.getAllByText('Trần Văn An')).toHaveLength(2);
    expect(screen.getByText('Điểm trung bình dưới 60 (52.0)')).toBeInTheDocument();
  });

  it('renders student roster for SCR-TEA-003', async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({
      class: { id: 'cls-1', name: 'Lớp 10A1' },
      items: [
        {
          student: { id: 'st-1', fullName: 'Trần Văn An' },
          averageScore: 52.0,
          completionRate: 45.0,
          overdueTaskCount: 3,
          needsAttention: true,
        },
        {
          student: { id: 'st-2', fullName: 'Lê Thị Bình' },
          averageScore: 85.0,
          completionRate: 90.0,
          overdueTaskCount: 0,
          needsAttention: false,
        },
      ],
    });

    renderQuery(<ClassStudents classId="cls-1" />);

    expect(await screen.findByText('Danh sách sinh viên: Lớp 10A1')).toBeInTheDocument();
    expect(screen.getByText('Trần Văn An')).toBeInTheDocument();
    expect(screen.getByText('Lê Thị Bình')).toBeInTheDocument();
    expect(screen.getByText('Cần chú ý')).toBeInTheDocument();
    expect(screen.getByText('Bình thường')).toBeInTheDocument();
  });

  it('renders student detail with read-only notice for SCR-TEA-004', async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({
      student: { id: 'st-1', fullName: 'Trần Văn An' },
      metrics: {
        averageScore: 52.0,
        completionRate: 45.0,
        overdueTaskCount: 3,
        actualProgress: 40,
        expectedProgress: 65,
      },
      assessmentResults: [
        {
          topic: { id: 'top-1', name: 'Hàm số bậc nhất' },
          score: 52.0,
          classification: 'PRIORITY',
          evaluatedAt: '2026-11-01T10:00:00.000Z',
        },
      ],
    });

    renderQuery(<TeacherStudentDetail classId="cls-1" studentId="st-1" />);

    expect(await screen.findByText('Hồ sơ sinh viên: Trần Văn An')).toBeInTheDocument();
    expect(screen.getByText(/Chế độ chỉ đọc/)).toBeInTheDocument();
    expect(screen.getByText('Hàm số bậc nhất')).toBeInTheDocument();
    expect(screen.getByText('Ưu tiên')).toBeInTheDocument();
  });

  it('renders saved analysis history for SCR-TEA-006', async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({
      items: [
        {
          id: 'rep-1',
          classId: 'cls-1',
          createdAt: '2026-11-05T08:00:00.000Z',
          summary: 'Báo cáo phân tích giữa kỳ',
        },
      ],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    renderQuery(<ClassHistory classId="cls-1" />);

    expect(await screen.findByText('Báo cáo phân tích giữa kỳ')).toBeInTheDocument();
    expect(screen.getByText('Xem chi tiết')).toBeInTheDocument();
  });
});
