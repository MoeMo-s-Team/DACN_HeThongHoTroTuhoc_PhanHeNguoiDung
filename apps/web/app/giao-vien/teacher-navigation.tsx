'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../auth/auth-context';
import { teacherButton } from './teacher-ui';

export function TeacherNavigation({ currentPath }: Readonly<{ currentPath: string }>) {
  const { logout } = useAuth();
  const router = useRouter();

  const isClassList = currentPath === '/giao-vien/lop-hoc';

  return (
    <aside className="border-b border-ink pb-6 lg:border-r lg:border-b-0 lg:pr-6">
      <p className="text-lg font-bold">Tự học · AI</p>
      <p className="mt-1 text-xs uppercase tracking-widest text-teal">Không gian Giáo viên</p>

      <nav aria-label="Điều hướng Giáo viên" className="mt-6 flex flex-wrap gap-2 lg:flex-col">
        <Link
          href="/giao-vien/lop-hoc"
          aria-current={isClassList ? 'page' : undefined}
          className={`${teacherButton} ${isClassList ? 'bg-accent' : 'bg-canvas'}`}
        >
          Danh sách lớp học
        </Link>
      </nav>

      <nav aria-label="Tài khoản" className="mt-6 flex flex-wrap gap-2 border-t border-ink/30 pt-5 lg:flex-col">
        <Link className={teacherButton} href="/tai-khoan/ho-so">
          Hồ sơ
        </Link>
        <button
          type="button"
          className={`${teacherButton} text-left`}
          onClick={async () => {
            await logout();
            router.replace('/dang-nhap');
          }}
        >
          Đăng xuất
        </button>
      </nav>
    </aside>
  );
}
