'use client';

import { use } from 'react';
import { TeacherShell } from '../../../teacher-shell';
import { ClassStudents } from './class-students';

export default function ClassStudentsPage({
  params,
}: Readonly<{
  params: Promise<{ classId: string }>;
}>) {
  const { classId } = use(params);

  return (
    <TeacherShell currentPath="/giao-vien/lop-hoc">
      <ClassStudents classId={classId} />
    </TeacherShell>
  );
}
