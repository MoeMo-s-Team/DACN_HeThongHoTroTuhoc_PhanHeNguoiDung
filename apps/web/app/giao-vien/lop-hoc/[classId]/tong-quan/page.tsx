'use client';

import { use } from 'react';
import { TeacherShell } from '../../../teacher-shell';
import { ClassDashboard } from './class-dashboard';

export default function ClassDashboardPage({
  params,
}: Readonly<{
  params: Promise<{ classId: string }>;
}>) {
  const { classId } = use(params);

  return (
    <TeacherShell currentPath="/giao-vien/lop-hoc">
      <ClassDashboard classId={classId} />
    </TeacherShell>
  );
}
