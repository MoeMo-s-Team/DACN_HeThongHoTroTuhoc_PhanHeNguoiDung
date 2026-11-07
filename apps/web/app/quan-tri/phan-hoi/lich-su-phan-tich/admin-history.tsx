'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { components } from '@dacn/contracts';
import { ApiError, apiRequest } from '../../../auth/api';
import { AdminDialog, AdminError, AdminHeading, AdminPagination, AdminSkeleton, adminButton, localDateTime, tagLabels } from '../../admin-ui';

function describeFilter(filter?: components['schemas']['FeedbackAnalysisFilterDto']) {
  const parts = [
    filter?.fromDate ? `Từ ${localDateTime(filter.fromDate)}` : '', filter?.toDate ? `Đến ${localDateTime(filter.toDate)}` : '',
    filter?.rating != null ? `Rating ${filter.rating} / 5` : '', filter?.tag ? tagLabels[filter.tag] : '',
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Toàn bộ phản hồi';
}

function HistoryDetails({ data }: Readonly<{ data: components['schemas']['AdminHistoryDetailDto'] }>) {
  const input = data.inputSnapshot;
  const result = data.analysisResult;
  return <>
    <p className="border-l-2 border-teal pl-3 text-sm font-semibold text-teal">Chỉ đọc · Kết quả AI đã lưu</p>
    <dl className="space-y-2 text-sm"><div><dt className="font-semibold">Mã phân tích</dt><dd className="font-mono">{data.id}</dd></div><div><dt className="font-semibold">Thời điểm lưu</dt><dd>{localDateTime(data.createdAt)}</dd></div></dl>
    <section className="border border-ink bg-white p-4">
      <h3 className="font-bold">Dữ liệu đầu vào đã lưu</h3>
      <p className="mt-2 text-sm">Bộ lọc: {describeFilter(input.filter)}</p>
      <p className="mt-2 text-sm">Số phản hồi trong snapshot: {input.totalFeedback ?? 'Không có trong snapshot'}</p>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">{(Object.keys(tagLabels) as (keyof typeof tagLabels)[]).map((tag) => <div key={tag} className="flex justify-between gap-3"><dt>{tagLabels[tag]}</dt><dd className="font-semibold tabular-nums">{input.tagStatistics[tag]}</dd></div>)}</dl>
      <h4 className="mt-4 text-sm font-semibold">Mã phản hồi trong snapshot</h4>
      <ul className="mt-2 space-y-1 font-mono text-xs">{input.feedbackIds.map((id) => <li key={id}>{id}</li>)}</ul>
    </section>
    <section className="space-y-5 border-l-4 border-teal bg-white p-4">
      <h3 className="font-bold text-teal">Kết quả AI đã lưu</h3>
      <section><h4 className="font-semibold">Tóm tắt</h4><p className="mt-2 text-sm leading-6 whitespace-pre-wrap">{result.summary}</p></section>
      <section><h4 className="font-semibold">Nhóm vấn đề</h4>{result.issueGroups.length ? <ul className="mt-3 space-y-3">{result.issueGroups.map((group, index) => <li key={index} className="border border-ink/30 p-3"><h5 className="font-semibold">{group.title}</h5><p className="mt-1 text-sm whitespace-pre-wrap">{group.summary}</p><p className="mt-2 text-sm">Số lượng đã lưu: {group.count}</p><ul className="mt-2 space-y-1 font-mono text-xs">{group.feedbackIds.map((id) => <li key={id}>{id}</li>)}</ul></li>)}</ul> : <p className="mt-2 text-sm">Không có nhóm vấn đề nổi bật trong kết quả đã lưu.</p>}</section>
      <section><h4 className="font-semibold">Khu vực ưu tiên</h4>{result.priorityAreas.length ? <ul className="mt-2 list-disc space-y-2 pl-5 text-sm">{result.priorityAreas.map((area, index) => <li key={index}>{area}</li>)}</ul> : <p className="mt-2 text-sm">Không có khu vực ưu tiên được lưu.</p>}</section>
      <section><h4 className="font-semibold">Đề xuất cải thiện</h4>{result.recommendations.length ? <ul className="mt-2 space-y-3">{result.recommendations.map((recommendation, index) => <li key={index}><h5 className="text-sm font-semibold">{recommendation.title}</h5><p className="mt-1 text-sm leading-6 whitespace-pre-wrap">{recommendation.description}</p></li>)}</ul> : <p className="mt-2 text-sm">Không có đề xuất được lưu.</p>}</section>
    </section>
  </>;
}

export function AdminHistory() {
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const query = useQuery({ queryKey: ['admin', 'history', page, 20], queryFn: () => apiRequest<components['schemas']['AdminHistoryResponseDto']>(`/admin/feedback/analyses?page=${page}&limit=20`), retry: false });
  const detail = useQuery({ queryKey: ['admin', 'history', selectedId], queryFn: () => apiRequest<components['schemas']['AdminHistoryDetailDto']>(`/admin/feedback/analyses/${encodeURIComponent(selectedId!)}`), enabled: selectedId !== null, retry: false });
  return <>
    <AdminHeading title="Lịch sử phân tích phản hồi" description="Xem lại bộ lọc, snapshot dữ liệu và kết quả AI đã lưu. Dữ liệu lịch sử được giữ nguyên theo thời điểm phân tích; xem lịch sử không chạy lại AI." />
    {query.isPending ? <AdminSkeleton label="Đang tải lịch sử…" /> : query.isError ? <AdminError onRetry={() => void query.refetch()} /> : query.data && <div className="mt-7">
      {query.data.items.length ? <div className="overflow-x-auto border border-ink bg-white"><table className="w-full text-left text-sm"><caption className="sr-only">Các bản phân tích phản hồi đã lưu</caption>
        <thead className="border-b border-ink bg-ink/5"><tr>{['Mã phân tích', 'Thời điểm lưu', 'Số phản hồi', 'Bộ lọc đã lưu', 'Chi tiết'].map((label) => <th key={label} scope="col" className="p-4 font-semibold">{label}</th>)}</tr></thead>
        <tbody>{query.data.items.map((item) => <tr key={item.id} className="border-b border-ink/20 align-top last:border-b-0"><th scope="row" className="max-w-48 p-4 font-mono text-xs font-normal wrap-anywhere">{item.id}</th><td className="min-w-36 p-4">{localDateTime(item.createdAt)}</td><td className="p-4 tabular-nums">{item.totalFeedback ?? 'Không có trong snapshot'}</td><td className="min-w-44 p-4 leading-6">{describeFilter(item.filter)}</td><td className="p-4"><button type="button" className={adminButton} aria-label={`Xem phân tích ${item.id}`} onClick={() => setSelectedId(item.id)}>Xem</button></td></tr>)}</tbody>
      </table></div> : <p className="border border-ink bg-white p-6">Chưa có kết quả phân tích được lưu.</p>}
      <AdminPagination meta={query.data.meta} pending={query.isFetching} onPage={(next) => { setSelectedId(null); setPage(next); }} />
    </div>}
    {selectedId !== null && <AdminDialog title="Chi tiết phân tích đã lưu" onClose={() => setSelectedId(null)}>
      {detail.isPending ? <AdminSkeleton label="Đang tải chi tiết…" /> : detail.isError ? detail.error instanceof ApiError && detail.error.code === 'RESOURCE_NOT_FOUND'
        ? <p role="alert">Không tìm thấy bản phân tích.</p> : <AdminError onRetry={() => void detail.refetch()} message="Không thể tải chi tiết phân tích. Vui lòng thử lại." />
        : detail.data && <HistoryDetails data={detail.data} />}
    </AdminDialog>}
  </>;
}
