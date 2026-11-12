'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import type { components } from '@dacn/contracts';
import { apiRequest } from '../../../../auth/api';
import {
  localDateTime,
  TeacherError,
  TeacherHeading,
  TeacherSkeleton,
  teacherButton,
} from '../../../teacher-ui';
import { ClassNavigation } from '../../../class-navigation';

type HistoryListResponse = components['schemas']['TeacherHistoryResponseDto'];
type HistoryDetailResponse = components['schemas']['TeacherHistoryDetailDto'];

function ReportDetailDialog({
  classId,
  reportId,
  onClose,
}: Readonly<{
  classId: string;
  reportId: string;
  onClose: () => void;
}>) {
  const query = useQuery({
    queryKey: ['teacher', 'class', classId, 'report', reportId],
    queryFn: () => apiRequest<HistoryDetailResponse>(`/teacher/classes/${classId}/analysis-reports/${reportId}`),
    retry: false,
  });

  const report = query.data;
  const analysis = report?.analysisResult as {
    summary?: string;
    weakTopics?: string[];
    needsAttentionStudents?: string[];
    recommendations?: Array<{ title: string; description: string }>;
  } | undefined;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
    >
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto border border-ink bg-canvas p-6 sm:p-8">
        <div className="flex items-center justify-between border-b border-ink/20 pb-4">
          <h2 id="report-dialog-title" className="text-xl font-bold text-ink">
            Chi tiết báo cáo phân tích AI
          </h2>
          <button type="button" className={`${teacherButton} py-1 px-3`} onClick={onClose}>
            Đóng
          </button>
        </div>

        {query.isPending ? (
          <TeacherSkeleton label="Đang tải chi tiết báo cáo…" />
        ) : query.isError ? (
          <TeacherError onRetry={() => void query.refetch()} />
        ) : report && analysis ? (
          <div className="mt-6 space-y-6">
            <div>
              <span className="text-xs uppercase tracking-wider text-ink/70">Thời điểm tạo báo cáo</span>
              <p className="mt-1 font-semibold text-ink">{localDateTime(report.createdAt)}</p>
            </div>

            {analysis.summary && (
              <div className="border border-ink bg-white p-4">
                <h3 className="text-sm font-bold text-ink uppercase tracking-wider">Tóm tắt phân tích</h3>
                <p className="mt-2 text-sm text-ink leading-relaxed">{analysis.summary}</p>
              </div>
            )}

            {analysis.weakTopics && analysis.weakTopics.length > 0 && (
              <div className="border border-ink bg-white p-4">
                <h3 className="text-sm font-bold text-ink uppercase tracking-wider">Chủ đề cần cải thiện</h3>
                <ul className="mt-2 list-disc pl-5 text-sm text-ink space-y-1">
                  {analysis.weakTopics.map((topic, i) => (
                    <li key={i}>{topic}</li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.needsAttentionStudents && analysis.needsAttentionStudents.length > 0 && (
              <div className="border border-ink bg-white p-4">
                <h3 className="text-sm font-bold text-ink uppercase tracking-wider">Học viên cần quan tâm</h3>
                <ul className="mt-2 list-disc pl-5 text-sm text-ink space-y-1">
                  {analysis.needsAttentionStudents.map((st, i) => (
                    <li key={i}>{st}</li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.recommendations && analysis.recommendations.length > 0 && (
              <div className="border border-ink bg-white p-4">
                <h3 className="text-sm font-bold text-ink uppercase tracking-wider">Đề xuất can thiệp sư phạm</h3>
                <div className="mt-3 space-y-3">
                  {analysis.recommendations.map((rec, i) => (
                    <div key={i} className="border-l-2 border-teal pl-3">
                      <p className="font-semibold text-sm text-ink">{rec.title}</p>
                      <p className="mt-1 text-xs text-ink/80">{rec.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ClassHistory({ classId }: Readonly<{ classId: string }>) {
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['teacher', 'class', classId, 'history'],
    queryFn: () => apiRequest<HistoryListResponse>(`/teacher/classes/${classId}/analysis-reports`),
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
        title="Lịch sử báo cáo phân tích AI"
        description="Tra cứu các báo cáo phân tích lớp học đã được tạo trước đây (Chế độ xem lịch sử đã lưu)."
      />

      <ClassNavigation classId={classId} currentTab="lich-su-phan-tich" />

      {query.isPending ? (
        <TeacherSkeleton label="Đang tải lịch sử báo cáo…" />
      ) : query.isError ? (
        <TeacherError onRetry={() => void query.refetch()} />
      ) : data ? (
        <div className="mt-8 space-y-6">
          <p className="text-xs text-ink/70">
            Trang này chỉ hiển thị các báo cáo đã được lưu trong cơ sở dữ liệu. Mở trang này không thực hiện gọi AI.
          </p>

          {data.items.length === 0 ? (
            <div className="border border-ink bg-white p-8 text-center">
              <p className="font-medium text-ink">Lớp học này chưa có báo cáo phân tích nào được lưu.</p>
              <p className="mt-2 text-sm text-ink/70">
                Tính năng phân tích AI trực tiếp (SCR-TEA-005) sẽ được kết nối ở giai đoạn tích hợp AI Runtime.
              </p>
            </div>
          ) : (
            <div className="border border-ink bg-white overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-ink/20 bg-ink/5">
                    <th className="py-3 px-4 font-semibold">Thời điểm lập báo cáo</th>
                    <th className="py-3 px-4 font-semibold">Tóm tắt phân tích</th>
                    <th className="py-3 px-4 font-semibold text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item) => (
                    <tr key={item.id} className="border-b border-ink/10 hover:bg-ink/[0.02]">
                      <td className="py-3.5 px-4 font-medium text-ink tabular-nums">
                        {localDateTime(item.createdAt)}
                      </td>
                      <td className="py-3.5 px-4 text-ink max-w-md truncate">
                        {item.summary || 'Không có tóm tắt'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          className={`${teacherButton} py-1 px-3 text-xs bg-accent`}
                          onClick={() => setSelectedReportId(item.id)}
                        >
                          Xem chi tiết
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      {selectedReportId && (
        <ReportDetailDialog
          classId={classId}
          reportId={selectedReportId}
          onClose={() => setSelectedReportId(null)}
        />
      )}
    </>
  );
}
