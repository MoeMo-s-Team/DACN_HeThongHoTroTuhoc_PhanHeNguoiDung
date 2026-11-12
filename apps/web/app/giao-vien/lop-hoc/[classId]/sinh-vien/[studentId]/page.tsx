'use client';

import { use } from 'react';
import { TeacherShell } from '../../../../teacher-shell';
import { TeacherStudentDetail } from './student-detail';

export default function TeacherStudentDetailPage({
  params,
}: Readonly<{
  params: Promise<{ classId: string; studentId: string }>;
}>) {
  const { classId, studentId } = use(params);

  return (
    <TeacherShell currentPath="/giao-vien/lop-hoc">
      <TeacherStudentDetail classId={classId} studentId={studentId} />
    </TeacherShell>
  );
}
