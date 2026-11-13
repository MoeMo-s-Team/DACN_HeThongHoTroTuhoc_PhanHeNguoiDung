'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../../../auth/api';
import { StudentNavigation } from '../../student-navigation';

type Task = { id: string; title: string; topic: { id: string; name: string }; expectedMinutes: number; dueDate: string; priority: string; status: string; completedAt: string | null };
type CurrentPlan = { plan: { id: string; title: string; goal: string; endDate: string } | null; tasks: Task[] };
type Adjustment = { adjustmentRef: string; expiresAt: string; preview: { planId: string; changes: Array<{ taskId: string; title: string; expectedMinutes: number; dueDate: string; priority: string; reason?: string }> } };

function errorText(error: unknown) {
  return error instanceof ApiError ? error.message : 'Không thể xử lý yêu cầu. Kiểm tra kết nối rồi thử lại.';
}

export function StudyPlanAdjustment() {
  const queryClient = useQueryClient();
  const [adjustment, setAdjustment] = useState<Adjustment | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const current = useQuery({ queryKey: ['student', 'study-plan-current'], queryFn: () => apiRequest<CurrentPlan>('/student/study-plans/current') });
  const generate = useMutation({
    mutationFn: () => apiRequest<Adjustment>('/student/study-plan-adjustments/generate', { method: 'POST' }),
    onSuccess: setAdjustment,
  });
  const apply = useMutation({
    mutationFn: () => {
      if (!adjustment) throw new Error('Missing adjustment preview');
      return apiRequest('/student/study-plan-adjustments/apply', { method: 'POST', body: JSON.stringify({ adjustmentRef: adjustment.adjustmentRef }) });
    },
    onSuccess: async () => {
      setConfirmOpen(false);
      setAdjustment(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['student', 'study-plan-current'] }),
        queryClient.invalidateQueries({ queryKey: ['student', 'progress'] }),
      ]);
    },
  });

  return <div className="grid w-full gap-8 px-5 py-8 sm:px-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:px-6">
    <StudentNavigation currentPath="/sinh-vien/ke-hoach-hoc-tap/dieu-chinh" />
    <section aria-labelledby="adjustment-title" className="min-w-0">
      <header className="border-b border-ink pb-6">
        <p className="text-sm font-bold uppercase tracking-widest text-teal">Student · AI hỗ trợ học tập</p>
        <h1 id="adjustment-title" className="mt-2 text-3xl font-bold sm:text-4xl">Điều chỉnh kế hoạch bằng AI</h1>
      </header>
      {current.isPending && <p role="status" className="mt-6 border border-ink bg-white p-5">Đang tải kế hoạch…</p>}
      {current.isError && <p role="alert" className="mt-6 border border-ink bg-white p-5">{errorText(current.error)}</p>}
      {current.data && !current.data.plan && <div className="mt-6 border border-ink bg-white p-5">
        <p>Chưa có kế hoạch học tập hiện tại.</p><Link href="/sinh-vien/ke-hoach-hoc-tap" className="mt-4 inline-flex min-h-11 items-center border border-ink bg-accent px-4 py-2">Tạo kế hoạch học tập</Link>
      </div>}
      {current.data?.plan && <section className="mt-6 max-w-3xl border border-ink bg-white p-5">
        <h2 className="text-xl font-bold">{current.data.plan.title}</h2>
        <p className="mt-2">{current.data.plan.goal}</p>
        <ul className="mt-4 space-y-3">
          {current.data.tasks.map((task) => <li key={task.id} className="border-t border-ink/30 pt-3"><strong>{task.title}</strong><p className="text-sm">{task.topic.name} · {task.expectedMinutes} phút · {task.status}</p></li>)}
        </ul>
        {!adjustment && <button type="button" disabled={generate.isPending} className="mt-5 min-h-11 border border-ink bg-accent px-4 py-2 font-semibold disabled:opacity-60" onClick={() => generate.mutate()}>
          {generate.isPending ? 'Đang phân tích tiến độ…' : 'Yêu cầu AI đề xuất điều chỉnh'}
        </button>}
      </section>}
      {generate.isError && <p role="alert" className="mt-4 border border-ink bg-white p-4">{errorText(generate.error)}</p>}
      {adjustment && current.data?.plan && <section aria-labelledby="adjustment-preview-title" className="mt-6 max-w-3xl border border-ink bg-white p-5">
        <p className="text-sm font-bold uppercase tracking-widest">Đề xuất AI · Chưa áp dụng</p>
        <h2 id="adjustment-preview-title" className="mt-2 text-xl font-bold">Xem lại thay đổi</h2>
        <ul className="mt-4 space-y-4">
          {adjustment.preview.changes.map((change) => {
            const oldTask = current.data!.tasks.find((task) => task.id === change.taskId);
            return <li key={change.taskId} className="border-t border-ink/30 pt-4">
              <h3 className="font-semibold">{change.title} · {oldTask?.topic.name}</h3>
              <p className="mt-1">Thời lượng: {oldTask?.expectedMinutes} → {change.expectedMinutes} phút</p>
              <p>Hạn: {oldTask && new Date(oldTask.dueDate).toLocaleDateString('vi-VN')} → {new Date(change.dueDate).toLocaleDateString('vi-VN')}</p>
              <p>Ưu tiên: {oldTask?.priority} → {change.priority}</p>
              {change.reason && <p className="mt-1 text-sm">Lý do: {change.reason}</p>}
            </li>;
          })}
        </ul>
        {apply.isError && <p role="alert" className="mt-4 border border-ink p-3">{errorText(apply.error)}</p>}
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" disabled={apply.isPending} className="min-h-11 border border-ink bg-accent px-4 py-2 font-semibold disabled:opacity-60" onClick={() => setConfirmOpen(true)}>Chấp nhận điều chỉnh</button>
          <button type="button" disabled={apply.isPending} className="min-h-11 border border-ink px-4 py-2" onClick={() => setAdjustment(null)}>Từ chối</button>
        </div>
      </section>}
      {confirmOpen && <div role="dialog" aria-modal="true" aria-labelledby="confirm-adjustment-title" className="fixed inset-0 z-50 grid place-items-center bg-ink/60 p-5">
        <section className="w-full max-w-md border border-ink bg-canvas p-6">
          <h2 id="confirm-adjustment-title" className="text-xl font-bold">Xác nhận áp dụng điều chỉnh</h2>
          <p className="mt-3">Toàn bộ thay đổi cho nhiệm vụ chưa hoàn thành sẽ được áp dụng.</p>
          {apply.isPending && <p role="status" className="mt-3">Đang cập nhật kế hoạch…</p>}
          <div className="mt-5 flex gap-3">
            <button type="button" disabled={apply.isPending} className="min-h-11 border border-ink bg-accent px-4 py-2 font-semibold" onClick={() => apply.mutate()}>Xác nhận</button>
            <button type="button" disabled={apply.isPending} className="min-h-11 border border-ink px-4 py-2" onClick={() => setConfirmOpen(false)}>Hủy</button>
          </div>
        </section>
      </div>}
      {apply.isSuccess && <p role="status" className="mt-4 border border-ink bg-white p-4">Điều chỉnh đã được áp dụng.</p>}
    </section>
  </div>;
}
