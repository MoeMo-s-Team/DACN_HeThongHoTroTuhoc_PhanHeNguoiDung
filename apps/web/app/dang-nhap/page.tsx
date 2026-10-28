'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoginForm, landingPath } from '../auth/login-form';
import { useAuth } from '../auth/auth-context';

export default function LoginPage() {
  const router = useRouter();
  const { user, status, retry } = useAuth();
  useEffect(() => { if (user) router.replace(landingPath(user.role)); }, [router, user]);
  if (status === 'loading' || user) return <main className="mx-auto max-w-5xl px-6 py-16"><p role="status">Đang kiểm tra phiên đăng nhập…</p></main>;
  if (status === 'error') return <main className="mx-auto max-w-5xl px-6 py-16"><p role="alert">Không thể kiểm tra phiên đăng nhập.</p><button className="mt-4 border border-ink px-4 py-2" onClick={() => void retry()}>Thử lại</button></main>;
  return <LoginForm />;
}
