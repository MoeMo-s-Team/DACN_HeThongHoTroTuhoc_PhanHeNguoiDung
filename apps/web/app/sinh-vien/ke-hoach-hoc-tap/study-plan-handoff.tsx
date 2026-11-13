'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { ApiError, apiRequest } from '../../auth/api';
import { StudentNavigation } from '../student-navigation';
import { clearStudyContextDraft, getStudyContextDraft, StudyContextDraft } from '../muc-tieu-hoc-tap/study-context-draft';

type PreviewTask = {
  previewTaskId: string; topic: { id: string; name: string }; title: string; goal: string; expectedMinutes: number;
  dueDate: string; priority: 'LOW' | 'MEDIUM' | 'HIGH'; reason: string | null;
};
type PreviewResponse = {
  planPreviewRef: string; expiresAt: string;
  preview: { planTitle: string; goal: string; availableMinutesPerWeek: number; targetDeadline: string; tasks: PreviewTask[] };
};
type CurrentPlanResponse = {
  plan: { id: string; title: string; goal: string; availableMinutesPerWeek: number; startDate: string; endDate: string; status: string } | null;
  tasks: Array<Omit<PreviewTask, 'previewTaskId' | 'reason'> & { id: string; status: string; completedAt: string | null }>;
};
type TaskEdit = { title?: string };

function errorText(error: unknown) {
  return error instanceof ApiError ? error.message : 'Không thể xử lý yêu cầu. Kiểm tra kết nối rồi thử lại.';
}

export function StudyPlanHandoff() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<StudyContextDraft | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [planTitle, setPlanTitle] = useState('');
  const [taskEdits, setTaskEdits] = useState<Record<string, TaskEdit>>({});
  const current = useQuery({
    queryKey: ['student', 'study-plan-current'],
    queryFn: () => apiRequest<CurrentPlanResponse>('/student/study-plans/current'),
  });
  const generate = useMutation({
    mutationFn: (value: StudyContextDraft) => apiRequest<PreviewResponse>('/student/study-plans/generate', {
      method: 'POST',
      body: JSON.stringify({ goal: value.goal, availableHoursPerWeek: value.availableMinutesPerWeek / 60, targetDeadline: value.targetDeadline }),
    }),
    onSuccess: (value) => { setPreview(value); setPlanTitle(value.preview.planTitle); setTaskEdits({}); },
  });
  const apply = useMutation({
    mutationFn: () => {
      if (!preview) throw new Error('Missing plan preview');
      const edits = Object.entries(taskEdits).map(([previewTaskId, edit]) => {
        const task = preview.preview.tasks.find((item) => item.previewTaskId === previewTaskId)!;
        return edit.title !== undefined && edit.title !== task.title ? { previewTaskId, title: edit.title } : null;
      }).filter((edit): edit is { previewTaskId: string; title: string } => edit !== null);
      return apiRequest('/student/study-plans/apply', {
        method: 'POST',
        body: JSON.stringify({ planPreviewRef: preview.planPreviewRef, planTitle, taskEdits: edits }),
      });
    },
    onSuccess: async () => {
      setConfirmOpen(false);
      clearStudyContextDraft();
      setDraft(null);
      setPreview(null);
      await queryClient.invalidateQueries({ queryKey: ['student', 'study-plan-current'] });
    },
  });

  useEffect(() => setDraft(getStudyContextDraft()), []);
  const currentPlanIsPastDeadline = current.data?.plan ? Date.parse(current.data.plan.endDate) <= Date.now() : false;
  const generationDraft = draft ?? (current.data?.plan && !currentPlanIsPastDeadline ? {
    goal: current.data.plan.goal,
    availableMinutesPerWeek: current.data.plan.availableMinutesPerWeek,
    targetDeadline: current.data.plan.endDate,
  } : null);

  return <div className="grid w-full gap-8 px-5 py-8 sm:px-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:px-6">
    <StudentNavigation currentPath="/sinh-vien/ke-hoach-hoc-tap" />
    <section aria-labelledby="study-plan-title" className="min-w-0">
      <header className="border-b border-ink pb-6">
        <p className="text-sm font-bold uppercase tracking-widest text-teal">Student · Học tập</p>
        <h1 id="study-plan-title" className="mt-2 text-3xl font-bold sm:text-4xl">Kế hoạch học tập</h1>
      </header>

      {current.isPending && <p role="status" className="mt-6 border border-ink bg-white p-5">Đang tải kế hoạch học tập…</p>}
      {current.isError && <div role="alert" className="mt-6 border border-ink bg-white p-5">
        <p>{errorText(current.error)}</p>
        <button type="button" className="mt-3 min-h-11 border border-ink px-4 py-2" onClick={() => void current.refetch()}>Thử lại</button>
      </div>}

      {current.data?.plan && <section aria-labelledby="current-plan-title" className="mt-6 border border-ink bg-white p-5">
        <h2 id="current-plan-title" className="text-xl font-bold">{current.data.plan.title}</h2>
        <p className="mt-2">{current.data.plan.goal}</p>
        <p className="mt-1 text-sm">{current.data.plan.availableMinutesPerWeek} phút / tuần · Hạn {new Date(current.data.plan.endDate).toLocaleDateString('vi-VN')}</p>
        <ul className="mt-4 space-y-3">
          {current.data.tasks.map((task) => <li key={task.id} className="border-t border-ink/30 pt-3">
            <h3 className="font-semibold">{task.title}</h3><p className="text-sm">{task.topic.name} · {task.expectedMinutes} phút · {task.status === 'COMPLETED' ? 'Hoàn thành' : 'Cần làm'}</p>
          </li>)}
        </ul>
        <Link href="/sinh-vien/ke-hoach-hoc-tap/dieu-chinh" className="mt-5 inline-flex min-h-11 items-center border border-ink bg-accent px-4 py-2 font-semibold hover:bg-teal hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2">
          Điều chỉnh bằng AI
        </Link>
      </section>}

      <section className="mt-6 max-w-2xl border border-ink bg-white p-5">
        {generationDraft ? <>
          <p className="text-sm font-bold uppercase tracking-widest">{current.data?.plan ? 'Tạo kế hoạch mới từ mục tiêu hiện tại' : 'Dữ liệu mục tiêu đã xác nhận'}</p>
          <p className="mt-3">{generationDraft.goal}</p>
          <p className="mt-1 text-sm">{generationDraft.availableMinutesPerWeek} phút / tuần · Hạn {new Date(generationDraft.targetDeadline).toLocaleDateString('vi-VN')}</p>
          {!preview && <button type="button" disabled={generate.isPending} className="mt-5 min-h-11 border border-ink bg-accent px-4 py-2 font-semibold disabled:opacity-60" onClick={() => generate.mutate(generationDraft)}>
            {generate.isPending ? 'Đang tạo bản xem trước…' : current.data?.plan ? 'Tạo kế hoạch mới bằng AI' : 'Tạo kế hoạch bằng AI'}
          </button>}
        </> : <>
          <p>{currentPlanIsPastDeadline ? 'Kế hoạch hiện tại đã quá hạn. Cập nhật mục tiêu và hạn mới để tạo kế hoạch khác.' : 'Chưa có dữ liệu mục tiêu đã xác nhận. Hãy nhập mục tiêu học tập trước.'}</p>
          <Link className="mt-4 inline-flex min-h-11 items-center border border-ink bg-accent px-4 py-2" href="/sinh-vien/muc-tieu-hoc-tap">Nhập mục tiêu học tập</Link>
        </>}
      </section>

      {generate.isError && <p role="alert" className="mt-4 border border-ink border-l-4 border-l-teal bg-white p-4">{errorText(generate.error)}</p>}
      {preview && <section aria-labelledby="preview-title" className="mt-6 max-w-3xl border border-ink bg-white p-5">
        <p className="text-sm font-bold uppercase tracking-widest">Bản xem trước do AI đề xuất · Chưa lưu</p>
        <h2 id="preview-title" className="mt-2 text-xl font-bold">Kiểm tra kế hoạch trước khi áp dụng</h2>
        <label className="mt-4 block font-semibold" htmlFor="preview-plan-title">Tên kế hoạch</label>
        <input id="preview-plan-title" className="mt-1 min-h-11 w-full border border-ink px-3" value={planTitle} onChange={(event) => setPlanTitle(event.target.value)} />
        <p className="mt-2 text-sm">{preview.preview.goal} · {preview.preview.availableMinutesPerWeek} phút / tuần</p>
        <ul className="mt-4 space-y-4">
          {preview.preview.tasks.map((task) => {
            const edit = taskEdits[task.previewTaskId] ?? {};
            const setEdit = (value: TaskEdit) => setTaskEdits((previous) => ({ ...previous, [task.previewTaskId]: { ...previous[task.previewTaskId], ...value } }));
            return <li key={task.previewTaskId} className="border-t border-ink/30 pt-4">
              <p className="font-semibold">{task.topic.name}</p>
              <label className="mt-2 block text-sm" htmlFor={`task-title-${task.previewTaskId}`}>Nhiệm vụ</label>
              <input id={`task-title-${task.previewTaskId}`} className="min-h-11 w-full border border-ink px-3" value={edit.title ?? task.title} onChange={(event) => setEdit({ title: event.target.value })} />
              <p className="mt-1 text-sm">{task.goal}{task.reason ? ` · ${task.reason}` : ''}</p>
              <p className="mt-2 text-sm">{task.expectedMinutes} phút · {new Date(task.dueDate).toLocaleDateString('vi-VN')} · Ưu tiên {task.priority}</p>
            </li>;
          })}
        </ul>
        {apply.isError && <p role="alert" className="mt-4 border border-ink p-3">{errorText(apply.error)}</p>}
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" disabled={apply.isPending} className="min-h-11 border border-ink bg-accent px-4 py-2 font-semibold disabled:opacity-60" onClick={() => setConfirmOpen(true)}>
            Xác nhận áp dụng
          </button>
          <button type="button" disabled={apply.isPending} className="min-h-11 border border-ink px-4 py-2" onClick={() => setPreview(null)}>Từ chối đề xuất</button>
        </div>
      </section>}
      {confirmOpen && <div role="dialog" aria-modal="true" aria-labelledby="confirm-plan-title" className="fixed inset-0 z-50 grid place-items-center bg-ink/60 p-5">
        <section className="w-full max-w-md border border-ink bg-canvas p-6">
          <h2 id="confirm-plan-title" className="text-xl font-bold">Xác nhận lưu kế hoạch</h2>
          <p className="mt-3">Kế hoạch hiện tại sẽ được lưu và thay thế kế hoạch đang hoạt động (nếu có).</p>
          {apply.isPending && <p role="status" className="mt-3">Đang lưu kế hoạch…</p>}
          <div className="mt-5 flex gap-3">
            <button type="button" disabled={apply.isPending} className="min-h-11 border border-ink bg-accent px-4 py-2 font-semibold" onClick={() => apply.mutate()}>Lưu kế hoạch</button>
            <button type="button" disabled={apply.isPending} className="min-h-11 border border-ink px-4 py-2" onClick={() => setConfirmOpen(false)}>Hủy</button>
          </div>
        </section>
      </div>}
      {apply.isSuccess && <p role="status" className="mt-4 border border-ink bg-white p-4">Kế hoạch đã được lưu.</p>}
    </section>
  </div>;
}
