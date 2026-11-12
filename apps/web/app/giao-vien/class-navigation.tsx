'use client';

import Link from 'next/link';

export function ClassNavigation({
  classId,
  currentTab,
}: Readonly<{
  classId: string;
  currentTab: 'tong-quan' | 'sinh-vien' | 'lich-su-phan-tich';
}>) {
  const tabs = [
    { id: 'tong-quan', label: 'Bảng theo dõi tổng quan', href: `/giao-vien/lop-hoc/${classId}/tong-quan` },
    { id: 'sinh-vien', label: 'Danh sách sinh viên', href: `/giao-vien/lop-hoc/${classId}/sinh-vien` },
    { id: 'lich-su-phan-tich', label: 'Lịch sử báo cáo AI', href: `/giao-vien/lop-hoc/${classId}/lich-su-phan-tich` },
  ];

  return (
    <div className="mt-4 border-b border-ink">
      <nav aria-label="Điều hướng lớp học" className="flex flex-wrap gap-1">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              aria-current={isActive ? 'page' : undefined}
              className={`border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
                isActive
                  ? 'border-ink bg-white text-ink'
                  : 'border-transparent text-ink/70 hover:border-ink/40 hover:text-ink'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
