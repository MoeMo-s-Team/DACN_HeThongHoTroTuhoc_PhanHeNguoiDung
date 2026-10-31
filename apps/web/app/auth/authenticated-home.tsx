'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User } from './api';
import { useAuth } from './auth-context';
import { landingPath } from './login-form';

export function AuthenticatedHome({ role, children }: Readonly<{ role: User['role']; children?: React.ReactNode }>) {
  const router = useRouter();
  const { user, status, logout, retry } = useAuth();

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/dang-nhap');
    if (user && user.role !== role) router.replace(landingPath(user.role));
  }, [role, router, status, user]);

  if (status === 'loading') return <main className="mx-auto max-w-5xl px-6 py-16"><p role="status">Đang kiểm tra phiên đăng nhập…</p></main>;
  if (status === 'error') return <main className="mx-auto max-w-5xl px-6 py-16"><p role="alert">Không thể kiểm tra phiên đăng nhập.</p><button className="mt-4 border border-ink px-4 py-2" onClick={() => void retry()}>Thử lại</button></main>;
  if (!user || user.role !== role) return null;

  if (children) return <main className="min-h-dvh">
    <header className="flex items-center justify-end border-b border-ink px-6 py-4">
      <div className="text-right">
        <p className="text-sm font-semibold">{user.fullName}</p>
        <p className="text-xs text-ink/70">{user.email}</p>
      </div>
    </header>
    {children}
  </main>;

  return <main className="mx-auto flex min-h-dvh max-w-5xl items-center px-6 py-16">
    <section aria-labelledby="home-title" className="max-w-2xl border-l-4 border-teal pl-6 sm:pl-10">
      <h1 id="home-title" className="text-3xl font-bold">Hệ thống hỗ trợ tự học</h1>
      <p className="mt-5">{user.fullName} · {user.email}</p>
      <button className="mt-8 border border-ink px-4 py-2 font-semibold" onClick={async () => { await logout(); router.replace('/dang-nhap'); }}>Đăng xuất</button>
    </section>
  </main>;
}
