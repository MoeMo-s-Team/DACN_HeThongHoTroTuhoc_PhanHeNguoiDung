'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../auth/auth-context';
import { adminButton } from './admin-ui';

const links = [
  { label: 'Tổng quan', href: '/quan-tri/tong-quan' },
  { label: 'Người dùng', href: '/quan-tri/nguoi-dung' },
  { label: 'Phản hồi', href: '/quan-tri/phan-hoi' },
  { label: 'Lịch sử phân tích', href: '/quan-tri/phan-hoi/lich-su-phan-tich' },
];

export function AdminNavigation({ currentPath }: Readonly<{ currentPath: string }>) {
  const { logout } = useAuth();
  const router = useRouter();
  return <aside className="border-b border-ink pb-6 lg:border-r lg:border-b-0 lg:pr-6">
    <p className="text-lg font-bold">Tự học · AI</p>
    <p className="mt-1 text-xs uppercase tracking-widest text-teal">Không gian quản trị</p>
    <nav aria-label="Điều hướng Administrator" className="mt-6 flex flex-wrap gap-2 lg:flex-col">
      {links.map(({ label, href }) => <Link key={href} href={href} aria-current={currentPath === href ? 'page' : undefined} className={`${adminButton} ${currentPath === href ? 'bg-accent' : 'bg-canvas'}`}>{label}</Link>)}
    </nav>
    <nav aria-label="Tài khoản" className="mt-6 flex flex-wrap gap-2 border-t border-ink/30 pt-5 lg:flex-col">
      <Link className={adminButton} href="/tai-khoan/ho-so">Hồ sơ</Link>
      <button type="button" className={`${adminButton} text-left`} onClick={async () => { await logout(); router.replace('/dang-nhap'); }}>Đăng xuất</button>
    </nav>
  </aside>;
}
