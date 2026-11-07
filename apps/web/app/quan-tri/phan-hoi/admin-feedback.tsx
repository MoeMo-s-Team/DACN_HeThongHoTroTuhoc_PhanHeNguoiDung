'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import type { components } from '@dacn/contracts';
import { apiRequest } from '../../auth/api';
import { AdminError, AdminHeading, AdminPagination, AdminSkeleton, adminButton, adminInput, localDateTime, roleLabels, tagLabels } from '../admin-ui';
import { feedbackFormToParams, parseFeedbackSearch } from './feedback-filters';
import type { FeedbackForm } from './feedback-filters';

export function AdminFeedback() {
  const router = useRouter();
  const search = useSearchParams().toString();
  const parsed = useMemo(() => parseFeedbackSearch(new URLSearchParams(search)), [search]);
  const [validationError, setValidationError] = useState('');
  const { register, handleSubmit, reset } = useForm<FeedbackForm>({ defaultValues: parsed.form });
  useEffect(() => { reset(parsed.form); setValidationError(''); }, [parsed, reset]);
  const query = useQuery({
    queryKey: ['admin', 'feedback', parsed.filter, parsed.page, parsed.limit], enabled: !parsed.error, retry: false,
    queryFn: () => {
      const params = new URLSearchParams({ page: String(parsed.page), limit: String(parsed.limit), ...parsed.filter });
      return apiRequest<components['schemas']['AdminFeedbackResponseDto']>(`/admin/feedback?${params}`);
    },
  });
  const navigate = (params: URLSearchParams) => router.replace(`/quan-tri/phan-hoi${params.size ? `?${params}` : ''}`, { scroll: false });
  const submit = handleSubmit((form) => {
    try {
      const params = feedbackFormToParams(form);
      params.set('page', '1'); params.set('limit', String(parsed.limit));
      setValidationError(''); navigate(params);
    } catch (error) { setValidationError(error instanceof Error ? error.message : 'Bộ lọc không hợp lệ.'); }
  });
  const tags = Object.keys(tagLabels) as (keyof typeof tagLabels)[];

  return <>
    <AdminHeading title="Danh sách phản hồi" description="Xem phản hồi đã lưu và thống kê tag do hệ thống tính trên toàn bộ tập dữ liệu thỏa bộ lọc. Thời gian hiển thị theo thiết bị của bạn." />
    <form onSubmit={submit} className="mt-6 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className="text-sm font-semibold" htmlFor="feedback-from">Từ ngày<input id="feedback-from" type="date" className={`${adminInput} mt-2`} {...register('fromDate')} /></label>
        <label className="text-sm font-semibold" htmlFor="feedback-to">Đến ngày<input id="feedback-to" type="date" className={`${adminInput} mt-2`} {...register('toDate')} /></label>
        <label className="text-sm font-semibold" htmlFor="feedback-rating">Rating<select id="feedback-rating" className={`${adminInput} mt-2`} {...register('rating')}><option value="">Tất cả rating</option>{[1, 2, 3, 4, 5].map((rating) => <option key={rating} value={rating}>{rating} / 5</option>)}</select></label>
        <label className="text-sm font-semibold" htmlFor="feedback-tag">Tag<select id="feedback-tag" className={`${adminInput} mt-2`} {...register('tag')}><option value="">Tất cả tag</option>{tags.map((tag) => <option key={tag} value={tag}>{tagLabels[tag]}</option>)}</select></label>
      </div>
      <div className="flex flex-wrap gap-3"><button type="submit" className={`${adminButton} bg-accent`}>Áp dụng bộ lọc</button><button type="button" className={adminButton} onClick={() => { reset({ fromDate: '', toDate: '', rating: '', tag: '' }); setValidationError(''); navigate(new URLSearchParams()); }}>Xóa bộ lọc</button></div>
    </form>
    {(parsed.error || validationError) && <p role="alert" className="mt-4 border-l-4 border-ink bg-accent p-4 text-sm">{validationError || parsed.error}</p>}
    {!parsed.error && !validationError && (query.isPending ? <AdminSkeleton label="Đang tải phản hồi…" /> : query.isError ? <AdminError onRetry={() => void query.refetch()} /> : query.data && <div className="mt-7 space-y-6">
      <section aria-label="Thống kê tag trên toàn bộ kết quả" className="border border-ink bg-white p-5">
        <h2 className="text-lg font-bold">Thống kê theo tag</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{tags.map((tag) => <div key={tag} className="border-l-2 border-teal pl-3"><dt className="text-xs leading-5">{tagLabels[tag]}</dt><dd aria-label={`Số phản hồi ${tagLabels[tag]}`} className="mt-2 text-2xl font-bold tabular-nums">{query.data.tagStatistics[tag]}</dd></div>)}</dl>
      </section>
      <div>
        <p className="mb-3 text-sm font-semibold">Kết quả: {query.data.meta.total} phản hồi</p>
        {query.data.items.length ? <div className="overflow-x-auto border border-ink bg-white"><table className="w-full text-left text-sm"><caption className="sr-only">Phản hồi của người dùng</caption>
          <thead className="border-b border-ink bg-ink/5"><tr>{['Người gửi', 'Vai trò', 'Tag', 'Rating', 'Nội dung', 'Thời điểm gửi'].map((label) => <th key={label} scope="col" className="p-4 font-semibold">{label}</th>)}</tr></thead>
          <tbody>{query.data.items.map((item) => <tr key={item.id} className="border-b border-ink/20 align-top last:border-b-0">
            <th scope="row" className="min-w-32 p-4 font-semibold wrap-anywhere">{item.sender.fullName}</th><td className="p-4">{roleLabels[item.sender.role]}</td><td className="min-w-32 p-4">{tagLabels[item.tag]}</td><td className="p-4 whitespace-nowrap">{item.rating} / 5</td><td className="min-w-60 max-w-xl p-4 leading-6 whitespace-pre-wrap wrap-anywhere">{item.content}</td><td className="min-w-36 p-4">{localDateTime(item.createdAt)}</td>
          </tr>)}</tbody></table></div> : <p className="border border-ink p-6">Không có phản hồi phù hợp với bộ lọc.</p>}
        <AdminPagination meta={query.data.meta} pending={query.isFetching} onPage={(page) => { const params = new URLSearchParams({ ...parsed.filter, page: String(page), limit: String(parsed.limit) }); navigate(params); }} />
      </div>
      <section className="border-t border-ink/30 pt-5"><button type="button" className={`${adminButton} bg-accent`} disabled>Phân tích tập phản hồi này bằng AI</button><p className="mt-2 text-sm text-ink/70">Chức năng phân tích AI hiện chưa khả dụng.</p></section>
    </div>)}
  </>;
}
