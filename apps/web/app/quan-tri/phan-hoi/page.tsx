import { Suspense } from 'react';
import { AdminShell } from '../admin-shell';
import { AdminSkeleton } from '../admin-ui';
import { AdminFeedback } from './admin-feedback';

export default function FeedbackPage() {
  return <AdminShell currentPath="/quan-tri/phan-hoi"><Suspense fallback={<AdminSkeleton label="Đang tải phản hồi…" />}><AdminFeedback /></Suspense></AdminShell>;
}
