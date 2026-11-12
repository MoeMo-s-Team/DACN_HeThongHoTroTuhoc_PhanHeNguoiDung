'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import type { components } from '@dacn/contracts';
import { apiRequest } from '../../../../../auth/api';
import {
  formatPercent,
  formatScore,
  localDateTime,
  TeacherError,
  TeacherHeading,
  TeacherSkeleton,
} from '../../../../teacher-ui';

type StudentDetail = components['schemas']['StudentDetailResponseDto'];

const classificationLabels: Record<string, { label: string; className: string }> = {
  GOOD: { label: 'Tốt', className: 'text-green-800 bg-green-100 border-green-700' },
  NEEDS_REINFORCEMENT: { label: 'Cần củng cố', className: 'text-amber-800 bg-amber-100 border-amber-700' },
  PRIORITY: { label: 'Ưu tiên', className: 'text-red-800 bg-red-100 border-red-700' },
};

export function TeacherStudentDetail({
  classId,
  studentId,
}: Readonly<{
  classId: string;
  studentId: string;
}>) {
  const query = useQuery({
    queryKey: ['teacher', 'class', classId, 'student', studentId],
    queryFn: () => apiRequest<StudentDetail>(`/teacher/classes/${classId}/students/${studentId}`),
    retry: false,
  });

  const data = query.data;

  return (
    <>
      <TeacherHeading
        breadcrumbs={
          <Link href={`/giao-vien/lop-hoc/${classId}/sinh-vien`} className="hover:underline">
            ← Quay lại danh sách sinh viên
          </Link>
        }
        title={data ? `Hồ sơ sinh viên: ${data.student.fullName}` : 'Chi tiết học viên'}
        description="Theo dõi kết quả đánh giá theo chủ đề và các chỉ số học tập của sinh viên."
      />

      {/* Read-only Indicator (SCR-TEA-004) */}
      <div className="mt-4 border border-ink border-l-4 border-l-teal bg-white p-4">
        <p className="text-xs font-semibold text-ink">
          <span className="font-bold text-teal">Chế độ chỉ đọc:</span> Trang này chỉ dành cho việc theo dõi kết quả
          đánh giá và tiến độ học tập. Giáo viên không có quyền chỉnh sửa điểm số hoặc kế hoạch học tập của sinh viên.
        </p>
      </div>

      {query.isPending ? (
        <TeacherSkeleton label="Đang tải thông tin chi tiết sinh viên…" />
      ) : query.isError ? (
        <TeacherError onRetry={() => void query.refetch()} />
      ) : data ? (
        <div className="mt-8 space-y-8">
          {/* Header Info Card */}
          <section aria-labelledby="student-info-heading" className="border border-ink bg-white p-6">
            <h2 id="student-info-heading" className="text-xl font-bold text-ink">
              Thông tin học viên
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <span className="text-xs uppercase tracking-wider text-ink/70">Họ và tên</span>
                <p className="mt-1 font-semibold text-ink">{data.student.fullName}</p>
              </div>
              <div>
                <span className="text-xs uppercase tracking-wider text-ink/70">Mã định danh</span>
                <p className="mt-1 font-mono text-sm text-ink">{data.student.id}</p>
              </div>
            </div>
          </section>

          {/* Metrics Summary */}
          <section aria-label="Chỉ số học tập của sinh viên" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <article className="border border-ink bg-white p-5">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink/70">Điểm trung bình</span>
              <p className="mt-4 text-3xl font-bold text-ink tabular-nums">{formatScore(data.metrics.averageScore)}</p>
            </article>

            <article className="border border-ink bg-white p-5">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink/70">Tỷ lệ hoàn thành</span>
              <p className="mt-4 text-3xl font-bold text-ink tabular-nums">
                {formatPercent(data.metrics.completionRate)}
              </p>
            </article>

            <article className="border border-ink bg-white p-5">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink/70">Nhiệm vụ quá hạn</span>
              <p className="mt-4 text-3xl font-bold text-red-700 tabular-nums">
                {data.metrics.overdueTaskCount}
              </p>
            </article>
          </section>

          {/* Topic Scores Table */}
          <section aria-labelledby="topic-scores-heading" className="border border-ink bg-white p-6">
            <h2 id="topic-scores-heading" className="text-lg font-bold text-ink border-b border-ink/20 pb-4">
              Kết quả đánh giá theo chủ đề
            </h2>

            {data.assessmentResults.length === 0 ? (
              <p className="mt-4 text-sm text-ink/70">Sinh viên chưa có kết quả đánh giá cho môn học này.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-ink/20 bg-ink/5">
                      <th className="py-2.5 px-3 font-semibold">Chủ đề</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Điểm đánh giá</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Phân loại</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Ngày đánh giá</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.assessmentResults.map((item, idx) => {
                      const badge = classificationLabels[item.classification] ?? {
                        label: item.classification,
                        className: 'text-ink bg-ink/10 border-ink/40',
                      };
                      return (
                        <tr key={idx} className="border-b border-ink/10">
                          <td className="py-3 px-3 font-medium text-ink">{item.topic.name}</td>
                          <td className="py-3 px-3 text-right font-bold tabular-nums">
                            <span className={item.score < 60 ? 'text-red-700' : 'text-ink'}>
                              {formatScore(item.score)}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`inline-flex items-center border px-2 py-0.5 text-xs font-semibold ${badge.className}`}
                            >
                              {badge.label}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right text-xs text-ink/70 tabular-nums">
                            {localDateTime(item.evaluatedAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}
