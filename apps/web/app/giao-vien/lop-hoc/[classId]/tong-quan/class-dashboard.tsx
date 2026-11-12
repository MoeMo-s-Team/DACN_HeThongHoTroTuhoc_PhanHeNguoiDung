'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import type { components } from '@dacn/contracts';
import { apiRequest } from '../../../../auth/api';
import {
  formatPercent,
  formatScore,
  TeacherError,
  TeacherHeading,
  TeacherSkeleton,
  teacherButton,
} from '../../../teacher-ui';
import { ClassNavigation } from '../../../class-navigation';

type DashboardData = components['schemas']['ClassDashboardResponseDto'];

export function ClassDashboard({ classId }: Readonly<{ classId: string }>) {
  const query = useQuery({
    queryKey: ['teacher', 'class', classId, 'dashboard'],
    queryFn: () => apiRequest<DashboardData>(`/teacher/classes/${classId}/dashboard`),
    retry: false,
  });

  const data = query.data;
  const weakTopics = data?.topicAverageScores.filter((t) => t.weakTopic) ?? [];

  return (
    <>
      <TeacherHeading
        breadcrumbs={
          <Link href="/giao-vien/lop-hoc" className="hover:underline">
            ← Danh sách lớp học
          </Link>
        }
        title={data ? `Bảng theo dõi: ${data.class.name}` : 'Bảng theo dõi lớp học'}
        description="Tổng hợp các chỉ số học tập, xác định chủ đề yếu và học viên cần can thiệp hỗ trợ kịp thời."
      />

      <ClassNavigation classId={classId} currentTab="tong-quan" />

      {query.isPending ? (
        <TeacherSkeleton label="Đang tải dữ liệu bảng theo dõi…" />
      ) : query.isError ? (
        <TeacherError onRetry={() => void query.refetch()} />
      ) : data ? (
        <div className="mt-8 space-y-8">
          {/* Summary Metric Cards */}
          <section aria-label="Chỉ số tổng hợp lớp học" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <article className="border border-ink bg-white p-5">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink/70">Sĩ số lớp</span>
              <p className="mt-4 text-3xl font-bold text-ink tabular-nums">{data.studentCount}</p>
            </article>

            <article className="border border-ink bg-white p-5">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink/70">Điểm trung bình</span>
              <p className="mt-4 text-3xl font-bold text-ink tabular-nums">{formatScore(data.classAverageScore)}</p>
            </article>

            <article className="border border-ink bg-white p-5">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink/70">Tỷ lệ hoàn thành</span>
              <p className="mt-4 text-3xl font-bold text-ink tabular-nums">{formatPercent(data.classCompletionRate)}</p>
            </article>

            <article className="border border-ink bg-white p-5">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink/70">Nhiệm vụ quá hạn</span>
              <p className="mt-4 text-3xl font-bold text-red-700 tabular-nums">
                {data.overdueTaskCount}
              </p>
            </article>
          </section>

          {/* Section 1: Weak Topics (FR-TEA-004: avg < 60) */}
          <section aria-labelledby="weak-topics-title" className="border border-ink bg-white p-6">
            <div className="flex items-center justify-between border-b border-ink/20 pb-4">
              <h2 id="weak-topics-title" className="text-lg font-bold text-ink">
                Chủ đề cần cải thiện (Điểm &lt; 60)
              </h2>
              <span className="text-xs font-bold text-red-700">
                {weakTopics.length} chủ đề yếu
              </span>
            </div>

            {weakTopics.length === 0 ? (
              <p className="mt-4 text-sm text-ink/70">
                Không có chủ đề nào có điểm trung bình dưới 60. Toàn bộ lớp đạt mức yêu cầu.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-ink/20 bg-ink/5">
                      <th className="py-2.5 px-3 font-semibold">Tên chủ đề</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Điểm trung bình</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weakTopics.map((item) => (
                      <tr key={item.topic.id} className="border-b border-ink/10">
                        <td className="py-3 px-3 font-medium text-ink">{item.topic.name}</td>
                        <td className="py-3 px-3 text-right font-bold text-red-700 tabular-nums">
                          {formatScore(item.averageScore)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Section 2: Students Needing Attention (FR-TEA-004) */}
          <section aria-labelledby="needs-attention-title" className="border border-ink bg-white p-6">
            <div className="flex items-center justify-between border-b border-ink/20 pb-4">
              <h2 id="needs-attention-title" className="text-lg font-bold text-ink">
                Sinh viên cần chú ý
              </h2>
              <span className="text-xs font-bold text-red-700">
                {data.needsAttentionStudents.length} sinh viên
              </span>
            </div>

            {data.needsAttentionStudents.length === 0 ? (
              <p className="mt-4 text-sm text-ink/70">
                Tất cả sinh viên đang theo kịp tiến độ học tập bình thường.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-ink/20 bg-ink/5">
                      <th className="py-2.5 px-3 font-semibold">Sinh viên</th>
                      <th className="py-2.5 px-3 font-semibold">Lý do cảnh báo</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.needsAttentionStudents.map((st) => (
                      <tr key={st.studentId} className="border-b border-ink/10">
                        <td className="py-3 px-3 font-medium text-ink">{st.fullName}</td>
                        <td className="py-3 px-3">
                          <ul className="list-disc pl-4 text-xs text-red-800 space-y-0.5">
                            {st.reasons.map((r, i) => (
                              <li key={i}>{r}</li>
                            ))}
                          </ul>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Link
                            href={`/giao-vien/lop-hoc/${classId}/sinh-vien/${st.studentId}`}
                            className={`${teacherButton} py-1 px-2.5 text-xs bg-accent`}
                          >
                            Xem hồ sơ
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Section 3: Progress Warnings (FR-TEA-004: actual < expected - 20) */}
          <section aria-labelledby="progress-warnings-title" className="border border-ink bg-white p-6">
            <h2 id="progress-warnings-title" className="text-lg font-bold text-ink border-b border-ink/20 pb-4">
              Cảnh báo tiến độ học tập (Chậm hơn dự kiến &ge; 20%)
            </h2>

            {data.progressWarnings.length === 0 ? (
              <p className="mt-4 text-sm text-ink/70">
                Không có sinh viên nào chậm hơn 20% so với tiến độ dự kiến.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-ink/20 bg-ink/5">
                      <th className="py-2.5 px-3 font-semibold">Sinh viên</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Tiến độ thực tế</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Tiến độ dự kiến</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Độ trễ</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.progressWarnings.map((w) => {
                      const lag = w.expectedProgress - w.actualProgress;
                      return (
                        <tr key={w.studentId} className="border-b border-ink/10">
                          <td className="py-3 px-3 font-medium text-ink">{w.fullName}</td>
                          <td className="py-3 px-3 text-right tabular-nums">{formatPercent(w.actualProgress)}</td>
                          <td className="py-3 px-3 text-right tabular-nums">{formatPercent(w.expectedProgress)}</td>
                          <td className="py-3 px-3 text-right font-bold text-red-700 tabular-nums">
                            -{Math.round(lag)}%
                          </td>
                          <td className="py-3 px-3 text-right">
                            <Link
                              href={`/giao-vien/lop-hoc/${classId}/sinh-vien/${w.studentId}`}
                              className={`${teacherButton} py-1 px-2.5 text-xs bg-accent`}
                            >
                              Xem hồ sơ
                            </Link>
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
