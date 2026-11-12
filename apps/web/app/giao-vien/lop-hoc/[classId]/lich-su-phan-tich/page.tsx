'use client';

import { use } from 'react';
import { TeacherShell } from '../../../teacher-shell';
import { ClassHistory } from './class-history';

export default function ClassAnalysisHistoryPage({
  params,
}: Readonly<{
  params: Promise<{ classId: string }>;
}>) {
  const { classId } = use(params);

  return (
    <TeacherShell currentPath="/giao-vien/lop-hoc">
      <ClassHistory classId={classId} />
    </TeacherShell>
  );
}
