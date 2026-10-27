'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from './api';
import { useAuth } from './auth-context';

export function landingPath(role: string) {
  if (role === 'TEACHER') return '/giao-vien/lop-hoc';
  if (role === 'ADMINISTRATOR') return '/quan-tri/tong-quan';
  return '/sinh-vien/tong-quan';
}

export function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = await login({ email, password });
      router.replace(landingPath(user.role));
    } catch (cause) {
      setError(cause instanceof ApiError && cause.code === 'ACCOUNT_DISABLED'
        ? 'Tài khoản đã bị vô hiệu hóa.'
        : cause instanceof ApiError && cause.status === 401
          ? 'Email hoặc mật khẩu không đúng.'
          : 'Không thể đăng nhập lúc này. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  }

  return <main className="mx-auto flex min-h-dvh max-w-5xl items-center justify-center px-6 py-16">
    <section aria-labelledby="login-title" className="w-full max-w-md border-l-4 border-teal pl-6 sm:pl-10">
      <p className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-teal">Hệ thống hỗ trợ tự học</p>
      <h1 id="login-title" className="mb-8 text-3xl font-bold">Đăng nhập</h1>
      <form className="space-y-5" onSubmit={submit}>
        <div>
          <label className="mb-2 block text-sm font-semibold" htmlFor="email">Email</label>
          <input className="w-full border border-ink bg-white px-3 py-3" id="email" name="email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold" htmlFor="password">Mật khẩu</label>
          <input className="w-full border border-ink bg-white px-3 py-3" id="password" name="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
        </div>
        <button className="w-full bg-teal px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={submitting} type="submit">
          {submitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </button>
        <p aria-live="polite" className="min-h-6 text-sm text-red-800">{error}</p>
      </form>
    </section>
  </main>;
}
