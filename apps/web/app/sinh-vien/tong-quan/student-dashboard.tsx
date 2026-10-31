'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import type { components } from '@dacn/contracts';
import { useAuth } from '../../auth/auth-context';
import { apiRequest } from '../../auth/api';

type Dashboard = components['schemas']['StudentDashboardResponseDto'];
type Task = components['schemas']['StudyTaskViewDto'];

const navigation = [
  { label: 'Tổng quan', href: '/sinh-vien/tong-quan', current: true },
  { label: 'Kết quả học tập', href: '/sinh-vien/ket-qua-hoc-tap' },
  { label: 'Nhiệm vụ', href: '/sinh-vien/nhiem-vu' },
  { label: 'Tiến độ', href: '/sinh-vien/tien-do' },
];

const classificationLabel = {
  GOOD: 'Tốt',
  NEEDS_REINFORCEMENT: 'Cần củng cố',
  NEEDS_PRIORITY: 'Cần ưu tiên',
};

const priorityLabel = { LOW: 'Thấp', MEDIUM: 'Trung bình', HIGH: 'Cao' };

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('vi-VN');
}

function TaskList({ title, headingId, tasks, emptyMessage }: Readonly<{ title: string; headingId: string; tasks: Task[]; emptyMessage: string }>) {
  return <section aria-labelledby={headingId} className="border-t border-ink pt-5">
    <h2 id={headingId} className="text-xl font-bold">{title}</h2>
    {tasks.length ? <ul className="mt-4 grid gap-3 sm:grid-cols-2">
      {tasks.map((task) => <li key={task.id} className="border border-ink bg-white p-4">
        <h3 className="font-bold">{task.title}</h3>
        <div className="mt-2">
          <span className="inline-block border border-ink px-2 py-1 text-sm">Ưu tiên {priorityLabel[task.priority]}</span>
        </div>
        <p className="mt-2 text-sm">{task.topic.name} · {task.expectedMinutes} phút</p>
        <p className="mt-1 text-sm">Hạn: {formatDate(task.dueDate)}</p>
      </li>)}
    </ul> : <p className="mt-3 text-sm">{emptyMessage}</p>}
  </section>;
}

function metricValue(value: number | null | undefined) {
  return value == null ? 'N/A' : `${value.toFixed(1)}%`;
}

export function StudentDashboard() {
  const router = useRouter();
  const { logout } = useAuth();
  const query = useQuery({
    queryKey: ['student', 'dashboard'],
    queryFn: () => apiRequest<Dashboard>('/student/dashboard'),
  });

  const data = query.data;
  const progress = data?.progress;
  const metrics = [
    { label: 'Tiến độ', value: metricValue(progress?.actualProgress) },
    { label: 'Hoàn thành', value: progress ? `${progress.completedTasks} / ${progress.totalTasks}` : 'N/A' },
    { label: 'Quá hạn', value: progress ? String(progress.overdueTasks) : 'N/A' },
    { label: 'Kế hoạch', value: data?.currentPlan?.status ?? 'N/A' },
  ];

  return <div className="grid w-full gap-8 px-5 py-8 sm:px-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:px-6">
    <aside className="border-b border-ink pb-5 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-6">
      <p className="text-sm font-bold uppercase tracking-widest">Học tập</p>
      <nav aria-label="Điều hướng Student" className="mt-4 flex flex-wrap gap-2 lg:flex-col">
        {navigation.map((item) => <Link key={item.href} href={item.href} aria-current={item.current ? 'page' : undefined}
          className={`min-h-11 border border-ink px-3 py-2 text-sm font-semibold hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 ${item.current ? 'bg-accent' : 'bg-canvas'}`}>
          {item.label}
        </Link>)}
      </nav>
      <div className="mt-6 border-t border-ink/30 pt-4 lg:mt-8">
        <button
          type="button"
          className="min-h-11 w-full border border-ink bg-canvas px-3 py-2 text-left text-sm font-semibold hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2"
          onClick={async () => {
            await logout();
            router.replace('/dang-nhap');
          }}
        >
          Đăng xuất
        </button>
      </div>
    </aside>

    <section aria-labelledby="dashboard-title" className="min-w-0">
      <header className="border-b border-ink pb-6">
        <p className="text-sm font-bold uppercase tracking-widest text-teal">Student · Tổng quan</p>
        <h1 id="dashboard-title" className="mt-2 text-3xl font-bold sm:text-4xl">Tổng quan học tập</h1>
        <p className="mt-3 max-w-2xl">Trạng thái học tập hiện tại, tính từ dữ liệu của bạn.</p>
      </header>

      {query.isPending && <div role="status" className="mt-6 border border-ink bg-white p-6">
        <p className="font-semibold">Đang tải tổng quan học tập…</p>
      </div>}

      {query.isError && <div role="alert" className="mt-6 border border-ink border-l-4 border-l-teal bg-white p-6">
        <h2 className="font-bold">Không thể tải dashboard.</h2>
        <p className="mt-2 text-sm">Kiểm tra kết nối rồi thử lại.</p>
        <button className="mt-4 min-h-11 border border-ink bg-accent px-4 py-2 font-semibold hover:bg-teal hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2" onClick={() => void query.refetch()}>
          Thử lại
        </button>
      </div>}

      {data && <div className="mt-6 space-y-8">
        <section aria-label="Chỉ số học tập" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => <article key={metric.label} className="border border-ink bg-white p-4">
            <h2 className="text-sm font-semibold">{metric.label}</h2>
            <p className="mt-3 text-2xl font-bold">{metric.value}</p>
          </article>)}
        </section>

        {progress?.slowProgress && <section role="region" aria-label="Cảnh báo chậm tiến độ" className="border border-ink bg-accent p-5">
          <p className="text-sm font-bold uppercase tracking-widest">Cảnh báo chậm tiến độ</p>
          <h2 className="mt-2 text-xl font-bold">Tiến độ thực tế đang thấp hơn tiến độ dự kiến.</h2>
          <p className="mt-2">Thực tế {metricValue(progress.actualProgress)} · Dự kiến {metricValue(progress.expectedProgress)}</p>
          <Link href="/sinh-vien/tien-do" className="mt-4 inline-flex min-h-11 items-center border border-ink bg-white px-4 py-2 font-semibold hover:bg-teal hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2">
            Xem tiến độ
          </Link>
        </section>}

        <section aria-labelledby="current-plan-title" className="border-t border-ink pt-5">
          <h2 id="current-plan-title" className="text-xl font-bold">Kế hoạch hiện tại</h2>
          {data.currentPlan ? <div className="mt-4 border border-ink bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h3 className="text-lg font-bold">{data.currentPlan.title}</h3>
              <span className="border border-ink bg-teal px-3 py-1 text-sm font-semibold text-white">{data.currentPlan.status}</span>
            </div>
            <p className="mt-3">{data.currentPlan.goal}</p>
            <p className="mt-3 text-sm">{formatDate(data.currentPlan.startDate)} – {formatDate(data.currentPlan.endDate)}</p>
          </div> : <p className="mt-3 text-sm">Chưa có kế hoạch hiện tại.</p>}
        </section>

        <section aria-labelledby="assessment-results-title" className="border-t border-ink pt-5">
          <h2 id="assessment-results-title" className="text-xl font-bold">Kết quả theo chủ đề</h2>
          {data.assessmentResults.length ? <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead><tr className="border-b border-ink">
                <th scope="col" className="py-3 pr-4">Chủ đề</th>
                <th scope="col" className="py-3 pr-4">Điểm</th>
                <th scope="col" className="py-3 pr-4">Trạng thái</th>
                <th scope="col" className="py-3">Ngày đánh giá</th>
              </tr></thead>
              <tbody>{data.assessmentResults.map((result) => <tr key={result.topic.id} className="border-b border-ink/30">
                <td className="py-3 pr-4 font-semibold">{result.topic.name}</td>
                <td className="py-3 pr-4">{result.score}</td>
                <td className="py-3 pr-4">{classificationLabel[result.classification]}</td>
                <td className="py-3">{formatDate(result.evaluatedAt)}</td>
              </tr>)}</tbody>
            </table>
          </div> : <p className="mt-3 text-sm">Chưa có kết quả học tập.</p>}
        </section>

        <div className="grid gap-8 xl:grid-cols-2">
          <TaskList title="Nhiệm vụ gần hạn" headingId="near-due-title" tasks={data.nearDueTasks} emptyMessage="Không có nhiệm vụ gần hạn." />
          <TaskList title="Nhiệm vụ quá hạn" headingId="overdue-title" tasks={data.overdueTaskItems} emptyMessage="Không có nhiệm vụ quá hạn." />
        </div>
      </div>}
    </section>
  </div>;
}
