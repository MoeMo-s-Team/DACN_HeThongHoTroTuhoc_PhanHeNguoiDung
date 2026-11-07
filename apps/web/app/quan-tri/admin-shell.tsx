'use client';

import type { ReactNode } from 'react';
import { AuthenticatedHome } from '../auth/authenticated-home';
import { AdminNavigation } from './admin-navigation';

export function AdminShell({ currentPath, children }: Readonly<{ currentPath: string; children: ReactNode }>) {
  return <AuthenticatedHome role="ADMINISTRATOR">
    <div className="grid min-w-0 gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-10">
      <AdminNavigation currentPath={currentPath} />
      <section className="min-w-0">{children}</section>
    </div>
  </AuthenticatedHome>;
}
