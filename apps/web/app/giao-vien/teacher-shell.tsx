'use client';

import type { ReactNode } from 'react';
import { AuthenticatedHome } from '../auth/authenticated-home';
import { TeacherNavigation } from './teacher-navigation';

export function TeacherShell({
  currentPath,
  children,
}: Readonly<{
  currentPath: string;
  children: ReactNode;
}>) {
  return (
    <AuthenticatedHome role="TEACHER">
      <div className="grid min-w-0 gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-10">
        <TeacherNavigation currentPath={currentPath} />
        <section className="min-w-0">{children}</section>
      </div>
    </AuthenticatedHome>
  );
}
