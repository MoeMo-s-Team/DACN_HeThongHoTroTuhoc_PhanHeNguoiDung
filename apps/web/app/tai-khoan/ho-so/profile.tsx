'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../auth/auth-context';
import { AuthenticatedHome } from '../../auth/authenticated-home';
import { landingPath } from '../../auth/login-form';

export function Profile() {
  const { user, logout } = useAuth();
  const router = useRouter();
  return <AuthenticatedHome role={user?.role ?? 'STUDENT'}>
    <section className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
      <p className="text-xs font-bold uppercase tracking-widest text-teal">Tài khoản</p>
      <h1 className="mt-3 text-3xl font-bold">Hồ sơ cá nhân</h1>
      <p className="mt-3 text-sm">Thông tin của tài khoản đang đăng nhập. Hồ sơ chỉ đọc.</p>
      {user && <dl className="mt-7 divide-y divide-ink/20 border border-ink bg-white px-5">
        {[['Họ tên', user.fullName], ['Email', user.email], ['Vai trò', user.role], ['Trạng thái', user.status]].map(([label, value]) => <div key={label} className="grid gap-2 py-5 sm:grid-cols-[10rem_minmax(0,1fr)]"><dt className="text-sm font-semibold">{label}</dt><dd className="min-w-0 wrap-anywhere">{value}</dd></div>)}
      </dl>}
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={landingPath(user?.role ?? 'STUDENT')} className="min-h-11 border border-ink px-4 py-2 text-sm font-semibold hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2">Quay về trang chính</Link>
        <button type="button" className="min-h-11 border border-ink px-4 py-2 text-sm font-semibold hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2" onClick={async () => { await logout(); router.replace('/dang-nhap'); }}>Đăng xuất</button>
      </div>
    </section>
  </AuthenticatedHome>;
}
