'use client';

import { useQuery } from '@tanstack/react-query';
import type { components } from '@dacn/contracts';
import { apiRequest } from '../../auth/api';
import { AdminError, AdminHeading, AdminSkeleton, roleLabels } from '../admin-ui';

export function AdminDashboard() {
  const query = useQuery({ queryKey: ['admin', 'dashboard'], queryFn: () => apiRequest<components['schemas']['AdminDashboardResponseDto']>('/admin/dashboard'), retry: false });
  const data = query.data;
  const metrics = data ? [
    ['Tổng người dùng', data.totalUsers], ['Tổng phản hồi', data.totalFeedback],
    ['Lượt gọi AI', data.totalAIRequests], ['Lượt gọi AI thất bại', data.failedAIRequests],
  ] as const : [];
  return <>
    <AdminHeading title="Tổng quan hệ thống" description="Số liệu toàn thời gian do hệ thống tính từ dữ liệu đã lưu, bao gồm tài khoản đang hoạt động và đã vô hiệu hóa." />
    {query.isPending ? <AdminSkeleton label="Đang tải tổng quan…" /> : query.isError ? <AdminError onRetry={() => void query.refetch()} /> : data && <div className="mt-7 space-y-8">
      <section aria-label="Chỉ số hệ thống" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value]) => <article key={label} className="border border-ink bg-white p-5">
          <h2 className="text-sm font-semibold">{label}</h2>
          <p className="mt-5 text-4xl font-bold tabular-nums">{value.toLocaleString('vi-VN')}</p>
        </article>)}
      </section>
      <section aria-labelledby="users-by-role" className="border border-ink bg-white p-5 sm:p-7">
        <h2 id="users-by-role" className="text-xl font-bold">Người dùng theo vai trò</h2>
        <dl className="mt-5 grid gap-4 sm:grid-cols-3">{(Object.keys(roleLabels) as (keyof typeof roleLabels)[]).map((role) => <div key={role} className="border-l-2 border-teal pl-4">
          <dt className="text-sm">{roleLabels[role]}</dt><dd className="mt-2 text-2xl font-bold tabular-nums">{data.usersByRole[role].toLocaleString('vi-VN')}</dd>
        </div>)}</dl>
      </section>
      <p className="text-sm text-ink/70">Chỉ số AI phản ánh các lần gọi đã được ghi nhận; mở trang này không gọi AI.</p>
    </div>}
  </>;
}
