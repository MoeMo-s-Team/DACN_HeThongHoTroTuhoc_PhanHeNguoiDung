'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import type { components } from '@dacn/contracts';
import { apiRequest } from '../../auth/api';
import { StudentNavigation } from '../student-navigation';

type ProgressResponse = components['schemas']['StudentProgressResponseDto'];

function ProgressBar({ label, value }: Readonly<{ label: string; value: number }>) {
  return <div className="border border-ink bg-white p-4">
    <div className="flex items-center justify-between gap-3">
      <h2 className="font-semibold">{label}</h2>
      <span className="font-bold">{value.toFixed(1)}%</span>
    </div>
    <progress aria-label={label} className="mt-3 h-3 w-full accent-teal" max={100} value={value} />
  </div>;
}

export function StudentProgress() {
  const query = useQuery({
    queryKey: ['student', 'progress'],
    queryFn: () => apiRequest<ProgressResponse>('/student/progress'),
  });
  const data = query.data;
  const metrics = data?.metrics;

  return <div className="grid w-full gap-8 px-5 py-8 sm:px-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:px-6">
    <StudentNavigation currentPath="/sinh-vien/tien-do" />
    <section aria-labelledby="progress-title" className="min-w-0">
      <header className="border-b border-ink pb-6">
        <p className="text-sm font-bold uppercase tracking-widest text-teal">Student · Học tập</p>
        <h1 id="progress-title" className="mt-2 text-3xl font-bold sm:text-4xl">Tiến độ học tập</h1>
        <p className="mt-3 max-w-2xl">Tiến độ được tính từ nhiệm vụ của kế hoạch hiện tại.</p>
      </header>

      {query.isPending && <div role="status" className="mt-6 border border-ink bg-white p-6">
        <p className="font-semibold">Đang tải tiến độ học tập…</p>
      </div>}

      {query.isError && <div role="alert" className="mt-6 border border-ink border-l-4 border-l-teal bg-white p-6">
        <h2 className="font-bold">Không thể tải tiến độ học tập.</h2>
        <p className="mt-2 text-sm">Kiểm tra kết nối rồi thử lại.</p>
        <button type="button" className="mt-4 min-h-11 border border-ink bg-accent px-4 py-2 font-semibold hover:bg-teal hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2" onClick={() => void query.refetch()}>
          Thử lại
        </button>
      </div>}

      {data && !data.hasCurrentPlan && <div className="mt-6 border border-ink bg-white p-6">
        <h2 className="text-lg font-bold">Chưa có kế hoạch học tập hiện tại.</h2>
        <Link href="/sinh-vien/ke-hoach-hoc-tap" className="mt-4 inline-flex min-h-11 items-center border border-ink bg-accent px-4 py-2 font-semibold hover:bg-teal hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2">
          Tạo kế hoạch học tập
        </Link>
      </div>}

      {data?.hasCurrentPlan && metrics && <div className="mt-6 space-y-6">
        <section aria-label="Tổng quan tiến độ" className="grid gap-3 sm:grid-cols-2">
          <article className="border border-ink bg-white p-4">
            <h2 className="font-semibold">Nhiệm vụ hoàn thành</h2>
            <p className="mt-3 text-2xl font-bold">{metrics.completedTasks} / {metrics.totalTasks} nhiệm vụ hoàn thành</p>
          </article>
          <article className="border border-ink bg-white p-4">
            <h2 className="font-semibold">Nhiệm vụ quá hạn</h2>
            <p className="mt-3 text-2xl font-bold">Nhiệm vụ quá hạn: {metrics.overdueTasks}</p>
          </article>
        </section>

        <section aria-label="So sánh tiến độ" className="grid gap-3 sm:grid-cols-2">
          <ProgressBar label="Tiến độ thực tế" value={metrics.actualProgress} />
          <ProgressBar label="Tiến độ dự kiến" value={metrics.expectedProgress} />
        </section>

        {metrics.slowProgress && <section role="region" aria-label="Cảnh báo chậm tiến độ" className="border border-ink bg-accent p-5">
          <p className="text-sm font-bold uppercase tracking-widest">Cảnh báo chậm tiến độ</p>
          <h2 className="mt-2 text-xl font-bold">Tiến độ thực tế đang thấp hơn tiến độ dự kiến.</h2>
          <p className="mt-2">Thực tế {metrics.actualProgress.toFixed(1)}% · Dự kiến {metrics.expectedProgress.toFixed(1)}%</p>
          <button type="button" disabled aria-describedby="ai-adjustment-status" className="mt-4 min-h-11 cursor-not-allowed border border-ink bg-white px-4 py-2 font-semibold opacity-60">
            Điều chỉnh bằng AI
          </button>
          <p id="ai-adjustment-status" className="mt-2 text-sm">Chức năng điều chỉnh bằng AI chưa được triển khai.</p>
        </section>}
      </div>}
    </section>
  </div>;
}
