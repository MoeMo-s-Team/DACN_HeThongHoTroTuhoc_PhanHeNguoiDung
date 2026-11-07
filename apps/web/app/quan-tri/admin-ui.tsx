'use client';

import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import type { components } from '@dacn/contracts';

export const adminButton = 'min-h-11 border border-ink px-4 py-2 text-sm font-semibold transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
export const adminInput = 'min-h-11 w-full border border-ink bg-white px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2';
export const roleLabels = { STUDENT: 'Sinh viên', TEACHER: 'Giáo viên', ADMINISTRATOR: 'Quản trị viên' };
export const tagLabels = { AI_PERFORMANCE: 'Hiệu năng AI', STUDY_PLAN: 'Kế hoạch học tập', UI_UX: 'Giao diện / trải nghiệm', LEARNING_ANALYTICS: 'Phân tích học tập', OTHER: 'Khác' };

export function localDateTime(value: string) {
  return new Date(value).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' });
}

export function AdminHeading({ title, description }: Readonly<{ title: string; description: string }>) {
  return <header className="border-b border-ink pb-6">
    <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal">Administrator · Quản trị</p>
    <h1 className="mt-3 text-3xl font-bold sm:text-4xl">{title}</h1>
    <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/75">{description}</p>
  </header>;
}

export function AdminSkeleton({ label }: Readonly<{ label: string }>) {
  return <div role="status" className="mt-6" aria-live="polite">
    <p className="text-sm">{label}</p>
    <div aria-hidden="true" className="mt-4 grid gap-3 sm:grid-cols-2">
      {[0, 1, 2, 3].map((index) => <div key={index} className="h-24 border border-ink/20 bg-ink/5 motion-safe:animate-pulse" />)}
    </div>
  </div>;
}

export function AdminError({ onRetry, message = 'Không thể tải dữ liệu. Kiểm tra kết nối rồi thử lại.' }: Readonly<{ onRetry: () => void; message?: string }>) {
  return <div role="alert" className="mt-6 border border-ink border-l-4 border-l-teal bg-white p-5">
    <p>{message}</p>
    <button type="button" className={`${adminButton} mt-4 bg-accent`} onClick={onRetry}>Thử lại</button>
  </div>;
}

export function AdminPagination({ meta, onPage, pending = false }: Readonly<{ meta: components['schemas']['PaginationMetaDto']; onPage: (page: number) => void; pending?: boolean }>) {
  return <nav aria-label="Phân trang" className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-ink/30 pt-4">
    <p className="text-sm">{meta.total} kết quả · {meta.totalPages ? `Trang ${meta.page} / ${meta.totalPages}` : 'Chưa có trang'}</p>
    <div className="flex gap-2">
      <button type="button" className={adminButton} disabled={pending || meta.page <= 1} onClick={() => onPage(meta.page - 1)}>Trang trước</button>
      <button type="button" className={adminButton} disabled={pending || meta.page >= meta.totalPages} onClick={() => onPage(meta.page + 1)}>Trang sau</button>
    </div>
  </nav>;
}

export function AdminDialog({ title, children, onClose, closeDisabled = false }: Readonly<{ title: string; children: ReactNode; onClose: () => void; closeDisabled?: boolean }>) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    const trigger = document.activeElement;
    dialog?.showModal();
    dialog?.querySelector<HTMLElement>('[data-dialog-initial-focus]')?.focus();
    return () => {
      dialog?.close();
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();
    };
  }, []);
  return <dialog ref={ref} aria-labelledby={titleId} className="m-auto max-h-[85dvh] w-[min(44rem,calc(100vw-2rem))] overflow-y-auto border border-ink bg-canvas p-5 text-ink backdrop:bg-ink/40 sm:p-7"
    onCancel={(event) => { event.preventDefault(); if (!closeDisabled) onClose(); }}>
    <div className="flex items-start justify-between gap-4 border-b border-ink pb-4">
      <h2 id={titleId} className="min-w-0 text-xl font-bold wrap-anywhere">{title}</h2>
      <button type="button" className={adminButton} disabled={closeDisabled} onClick={onClose}>Đóng</button>
    </div>
    <div className="mt-5 min-w-0 space-y-4 wrap-anywhere">{children}</div>
  </dialog>;
}
