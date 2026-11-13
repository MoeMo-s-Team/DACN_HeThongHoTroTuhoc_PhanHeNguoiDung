'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../auth/auth-context';

const navigation = [
  { label: 'Tổng quan', href: '/sinh-vien/tong-quan' },
  { label: 'Kết quả học tập', href: '/sinh-vien/ket-qua-hoc-tap' },
  { label: 'Mục tiêu học tập', href: '/sinh-vien/muc-tieu-hoc-tap' },
  { label: 'Phân tích AI', href: '/sinh-vien/phan-tich-ai' },
  { label: 'Nhiệm vụ', href: '/sinh-vien/nhiem-vu' },
  { label: 'Tiến độ', href: '/sinh-vien/tien-do' },
  { label: 'Gửi phản hồi', href: '/phan-hoi/gui' },
];

export function StudentNavigation({ currentPath }: Readonly<{ currentPath: string }>) {
  const router = useRouter();
  const { logout } = useAuth();

  return <aside className="border-b border-ink pb-5 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-6">
    <p className="text-sm font-bold uppercase tracking-widest">Học tập</p>
    <nav aria-label="Điều hướng Student" className="mt-4 flex flex-wrap gap-2 lg:flex-col">
      {navigation.map((item) => <Link key={item.href} href={item.href} aria-current={item.href === currentPath ? 'page' : undefined}
        className={`min-h-11 border border-ink px-3 py-2 text-sm font-semibold hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 ${item.href === currentPath ? 'bg-accent' : 'bg-canvas'}`}>
        {item.label}
      </Link>)}
    </nav>
    <div className="mt-6 border-t border-ink/30 pt-4 lg:mt-8">
      <button
        type="button"
        className="min-h-11 w-full border border-ink bg-canvas px-3 py-2 text-left text-sm font-semibold hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2"
        onClick={async () => {
          await logout();
          router.replace('/dang-nhap');
        }}
      >
        Đăng xuất
      </button>
    </div>
  </aside>;
}
