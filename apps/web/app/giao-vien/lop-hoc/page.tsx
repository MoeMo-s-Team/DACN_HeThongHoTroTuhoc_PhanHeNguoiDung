'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import type { components } from '@dacn/contracts';
import { apiRequest } from '../../auth/api';
import { TeacherError, TeacherHeading, TeacherSkeleton, teacherButton } from '../teacher-ui';
import { TeacherShell } from '../teacher-shell';

type TeacherClassesResponse = components['schemas']['TeacherClassesResponseDto'];

export default function TeacherClassesPage() {
  const query = useQuery({
    queryKey: ['teacher', 'classes'],
    queryFn: () => apiRequest<TeacherClassesResponse>('/teacher/classes'),
    retry: false,
  });

  const data = query.data;

  return (
    <TeacherShell currentPath="/giao-vien/lop-hoc">
      <TeacherHeading
        title="Danh sách lớp học phụ trách"
        description="Theo dõi danh sách các lớp học được phân công và truy cập bảng theo dõi tiến độ học tập của từng lớp."
      />

      {query.isPending ? (
        <TeacherSkeleton label="Đang tải danh sách lớp học…" />
      ) : query.isError ? (
        <TeacherError onRetry={() => void query.refetch()} />
      ) : data ? (
        <div className="mt-8 space-y-6">
          {data.items.length === 0 ? (
            <div className="border border-ink bg-white p-8 text-center">
              <p className="font-medium text-ink">Chưa được phân công phụ trách lớp học nào.</p>
              <p className="mt-2 text-sm text-ink/70">
                Khi quản trị viên phân công lớp học, danh sách sẽ hiển thị tại đây.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {data.items.map((cls) => (
                <article
                  key={cls.id}
                  className="flex flex-col justify-between border border-ink bg-white p-6 transition-shadow hover:shadow-sm"
                >
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-teal">Lớp học</span>
                    <h2 className="mt-2 text-xl font-bold text-ink">{cls.name}</h2>
                    <p className="mt-2 text-xs font-mono text-ink/60">ID: {cls.id}</p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-ink/20">
                    <Link
                      href={`/giao-vien/lop-hoc/${cls.id}/tong-quan`}
                      className={`${teacherButton} w-full bg-accent text-ink`}
                    >
                      Bảng theo dõi lớp →
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </TeacherShell>
  );
}
