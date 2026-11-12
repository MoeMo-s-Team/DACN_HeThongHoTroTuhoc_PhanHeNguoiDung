'use client';

import type { ReactNode } from 'react';

export const teacherButton = 'min-h-11 border border-ink px-4 py-2 text-sm font-semibold transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 inline-flex items-center justify-center';
export const teacherInput = 'min-h-11 w-full border border-ink bg-white px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2';

export function formatScore(score: number | null | undefined): string {
  if (score === null || score === undefined) return 'N/A';
  return Number(score).toFixed(1);
}

export function formatPercent(rate: number | null | undefined): string {
  if (rate === null || rate === undefined) return 'N/A';
  return `${Math.round(rate)}%`;
}

export function localDateTime(value: string | Date | null | undefined): string {
  if (!value) return 'N/A';
  return new Date(value).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' });
}

export function TeacherHeading({
  title,
  description,
  breadcrumbs,
}: Readonly<{
  title: string;
  description?: string;
  breadcrumbs?: ReactNode;
}>) {
  return (
    <header className="border-b border-ink pb-6">
      {breadcrumbs && <div className="mb-2 text-xs font-semibold text-ink/70">{breadcrumbs}</div>}
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal">Giáo viên · Giảng dạy & Theo dõi</p>
      <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{title}</h1>
      {description && <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/75">{description}</p>}
    </header>
  );
}

export function TeacherSkeleton({ label }: Readonly<{ label: string }>) {
  return (
    <div role="status" className="mt-6" aria-live="polite">
      <p className="text-sm text-ink/80">{label}</p>
      <div aria-hidden="true" className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="h-28 border border-ink/20 bg-ink/5 motion-safe:animate-pulse" />
        ))}
      </div>
    </div>
  );
}

export function TeacherError({
  onRetry,
  message = 'Không thể tải dữ liệu. Kiểm tra kết nối rồi thử lại.',
}: Readonly<{
  onRetry: () => void;
  message?: string;
}>) {
  return (
    <div role="alert" className="mt-6 border border-ink border-l-4 border-l-red-600 bg-white p-5">
      <p className="font-medium text-ink">{message}</p>
      <button type="button" className={`${teacherButton} mt-4 bg-accent`} onClick={onRetry}>
        Thử lại
      </button>
    </div>
  );
}

export function AttentionBadge({ needsAttention }: Readonly<{ needsAttention: boolean }>) {
  if (needsAttention) {
    return (
      <span className="inline-flex items-center border border-red-700 bg-red-100 px-2 py-0.5 text-xs font-bold text-red-800">
        Cần chú ý
      </span>
    );
  }
  return (
    <span className="inline-flex items-center border border-green-700 bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
      Bình thường
    </span>
  );
}
