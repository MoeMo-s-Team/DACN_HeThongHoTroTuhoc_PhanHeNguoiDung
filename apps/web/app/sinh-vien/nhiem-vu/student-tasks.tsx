'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@dacn/contracts';
import { apiRequest } from '../../auth/api';
import { StudentNavigation } from '../student-navigation';

type TasksResponse = components['schemas']['StudentStudyTasksResponseDto'];
type Task = components['schemas']['StudyTaskViewDto'];
type UpdateResponse = components['schemas']['UpdateStudyTaskStatusResponseDto'];
type TaskStatus = Task['status'];

const taskQueryKey = ['student', 'study-tasks'];
const taskUpdateTimeoutMs = 15_000;
const priorityLabel = { LOW: 'Thấp', MEDIUM: 'Trung bình', HIGH: 'Cao' };
const planStatusLabel = { ACTIVE: 'Kế hoạch đang thực hiện', COMPLETED: 'Kế hoạch đã hoàn thành' };

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('vi-VN');
}

export function StudentTasks() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: taskQueryKey,
    queryFn: () => apiRequest<TasksResponse>('/student/study-tasks'),
  });
  const mutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: TaskStatus }) => {
      const controller = new AbortController();
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        return await Promise.race([
          apiRequest<UpdateResponse>(
            `/student/study-tasks/${taskId}/status`,
            { method: 'PATCH', body: JSON.stringify({ status }), signal: controller.signal },
          ),
          new Promise<never>((_resolve, reject) => {
            timeout = setTimeout(() => {
              controller.abort();
              reject(new Error('StudyTask update request timed out.'));
            }, taskUpdateTimeoutMs);
          }),
        ]);
      } finally {
        if (timeout) clearTimeout(timeout);
      }
    },
    onSuccess: (result, variables) => {
      queryClient.setQueryData<TasksResponse>(taskQueryKey, (current) => current && ({
        ...current,
        planStatus: result.planStatus,
        items: current.items.map((task) => task.id === variables.taskId
          ? { ...task, status: result.task.status, completedAt: result.task.completedAt }
          : task),
      }));
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: taskQueryKey }),
        queryClient.invalidateQueries({ queryKey: ['student', 'dashboard'] }),
      ]);
    },
  });

  return <div className="grid w-full gap-8 px-5 py-8 sm:px-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:px-6">
    <StudentNavigation currentPath="/sinh-vien/nhiem-vu" />
    <section aria-labelledby="tasks-title" className="min-w-0">
      <header className="border-b border-ink pb-6">
        <p className="text-sm font-bold uppercase tracking-widest text-teal">Student · Học tập</p>
        <h1 id="tasks-title" className="mt-2 text-3xl font-bold sm:text-4xl">Nhiệm vụ học tập</h1>
        <p className="mt-3 max-w-2xl">Theo dõi nhiệm vụ trong kế hoạch hiện tại và cập nhật khi hoàn thành.</p>
      </header>

      {query.isPending && <div role="status" className="mt-6 border border-ink bg-white p-6">
        <p className="font-semibold">Đang tải nhiệm vụ…</p>
      </div>}

      {query.isError && <div role="alert" className="mt-6 border border-ink border-l-4 border-l-teal bg-white p-6">
        <h2 className="font-bold">Không thể tải nhiệm vụ học tập.</h2>
        <p className="mt-2 text-sm">Kiểm tra kết nối rồi thử lại.</p>
        <button type="button" className="mt-4 min-h-11 border border-ink bg-accent px-4 py-2 font-semibold hover:bg-teal hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2" onClick={() => void query.refetch()}>
          Thử lại
        </button>
      </div>}

      {query.data && <>
        {query.data.planId ? <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border border-ink bg-white p-4">
          <h2 className="text-lg font-bold">Kế hoạch hiện tại</h2>
          <span className="border border-ink bg-teal px-3 py-1 text-sm font-semibold text-white">{query.data.planStatus && planStatusLabel[query.data.planStatus]}</span>
        </div> : null}

        {query.data.items.length ? <ul className="mt-5 grid gap-3">
          {query.data.items.map((task: Task) => {
            const isPending = mutation.isPending && mutation.variables?.taskId === task.id;
            const failedUpdate = mutation.isError && mutation.variables?.taskId === task.id ? mutation.variables : null;
            const isCompleted = task.status === 'COMPLETED';
            return <li key={task.id} className="grid gap-4 border border-ink bg-white p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5">
              <div className="min-w-0">
                <h3 className="text-lg font-bold">{task.title}</h3>
                <p className="mt-2 text-sm">{task.topic.name} · {task.expectedMinutes} phút</p>
                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  <span className="border border-ink px-2 py-1">Hạn: {formatDate(task.dueDate)}</span>
                  <span className="border border-ink px-2 py-1">Ưu tiên {priorityLabel[task.priority]}</span>
                  <span className="border border-ink px-2 py-1">{isCompleted ? 'Đã hoàn thành' : 'Cần hoàn thành'}</span>
                </div>
              </div>
              <div className="flex flex-col items-start gap-2 sm:items-end">
                <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 border border-ink px-3 py-2 font-semibold focus-within:outline-2 focus-within:outline-offset-2">
                  <input
                    type="checkbox"
                    checked={isCompleted}
                    disabled={mutation.isPending}
                    aria-label={`${isCompleted ? 'Hoàn tác hoàn thành' : 'Đánh dấu hoàn thành'}: ${task.title}`}
                    onChange={(event) => mutation.mutate({ taskId: task.id, status: event.currentTarget.checked ? 'COMPLETED' : 'TODO' })}
                  />
                  {isCompleted ? 'Hoàn tác hoàn thành' : 'Đánh dấu hoàn thành'}
                </label>
                {isPending && <p role="status" className="text-sm">Đang cập nhật…</p>}
                {mutation.isSuccess && mutation.variables?.taskId === task.id && <p role="status" className="text-sm">Đã cập nhật trạng thái.</p>}
                {failedUpdate && <>
                  <p role="alert" className="text-sm">Không thể cập nhật trạng thái nhiệm vụ.</p>
                  <button type="button" className="min-h-11 border border-ink bg-accent px-3 py-2 text-sm font-semibold hover:bg-teal hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2" onClick={() => mutation.mutate(failedUpdate)}>
                    Thử lại
                  </button>
                </>}
              </div>
            </li>;
          })}
        </ul> : <p className="mt-6 border-t border-ink pt-5">{query.data.planId ? 'Kế hoạch hiện tại chưa có nhiệm vụ.' : 'Chưa có kế hoạch học tập hiện tại.'}</p>}

        <div className="mt-6 flex justify-end">
          <Link href="/sinh-vien/tien-do" className="inline-flex min-h-11 items-center border border-ink bg-accent px-4 py-2 font-semibold hover:bg-teal hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2">
            Xem tiến độ
          </Link>
        </div>
      </>}
    </section>
  </div>;
}
