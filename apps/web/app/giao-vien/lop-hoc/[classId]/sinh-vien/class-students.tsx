'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import type { components } from '@dacn/contracts';
import { apiRequest } from '../../../../auth/api';
import {
  AttentionBadge,
  formatPercent,
  formatScore,
  TeacherError,
  TeacherHeading,
  TeacherSkeleton,
  teacherButton,
} from '../../../teacher-ui';
import { ClassNavigation } from '../../../class-navigation';

type StudentsData = components['schemas']['ClassStudentsResponseDto'];

export function ClassStudents({ classId }: Readonly<{ classId: string }>) {
  const query = useQuery({
    queryKey: ['teacher', 'class', classId, 'students'],
    queryFn: () => apiRequest<StudentsData>(`/teacher/classes/${classId}/students`),
    retry: false,
  });

  const data = query.data;

  return (
    <>
      <TeacherHeading
        breadcrumbs={
          <Link href="/giao-vien/lop-hoc" className="hover:underline">
            ← Danh sách lớp học
          </Link>
        }
        title={data ? `Danh sách sinh viên: ${data.class.name}` : 'Danh sách sinh viên'}
        description="Xem toàn bộ sinh viên trong lớp, theo dõi chỉ số học tập và truy cập hồ sơ chi tiết."
      />

      <ClassNavigation classId={classId} currentTab="sinh-vien" />

      {query.isPending ? (
        <TeacherSkeleton label="Đang tải danh sách sinh viên…" />
      ) : query.isError ? (
        <TeacherError onRetry={() => void query.refetch()} />
      ) : data ? (
        <div className="mt-8 space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-ink">
              Tổng số sinh viên: <span className="font-bold tabular-nums">{data.items.length}</span>
            </p>
          </div>

          {data.items.length === 0 ? (
            <div className="border border-ink bg-white p-8 text-center">
              <p className="font-medium text-ink">Lớp học hiện chưa có sinh viên nào.</p>
            </div>
          ) : (
            <div className="border border-ink bg-white overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-ink/20 bg-ink/5">
                    <th className="py-3 px-4 font-semibold">Họ và tên</th>
                    <th className="py-3 px-4 font-semibold text-right">Điểm TB</th>
                    <th className="py-3 px-4 font-semibold text-right">Hoàn thành</th>
                    <th className="py-3 px-4 font-semibold text-right">Nhiệm vụ trễ</th>
                    <th className="py-3 px-4 font-semibold text-center">Trạng thái</th>
                    <th className="py-3 px-4 font-semibold text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item) => (
                    <tr key={item.student.id} className="border-b border-ink/10 hover:bg-ink/[0.02]">
                      <td className="py-3.5 px-4 font-medium text-ink">{item.student.fullName}</td>
                      <td className="py-3.5 px-4 text-right tabular-nums">{formatScore(item.averageScore)}</td>
                      <td className="py-3.5 px-4 text-right tabular-nums">{formatPercent(item.completionRate)}</td>
                      <td className="py-3.5 px-4 text-right tabular-nums">
                        {item.overdueTaskCount > 0 ? (
                          <span className="font-bold text-red-700">{item.overdueTaskCount}</span>
                        ) : (
                          <span className="text-ink/60">0</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <AttentionBadge needsAttention={item.needsAttention} />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/giao-vien/lop-hoc/${classId}/sinh-vien/${item.student.id}`}
                          className={`${teacherButton} py-1 px-3 text-xs bg-accent`}
                        >
                          Xem chi tiết
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
    </>
  );
}
