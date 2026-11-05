'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@dacn/contracts';
import { apiRequest } from '../../auth/api';
import { useAuth } from '../../auth/auth-context';
import { AdminDialog, AdminError, AdminHeading, AdminPagination, AdminSkeleton, adminButton, adminInput, roleLabels } from '../admin-ui';

type User = components['schemas']['AdminUserDto'];
type Action = { user: User; status: 'ACTIVE' | 'DISABLED' };

export function AdminUsers() {
  const { user: currentUser } = useAuth();
  const client = useQueryClient();
  const [filters, setFilters] = useState({ q: '', page: 1 });
  const [confirmation, setConfirmation] = useState<User | null>(null);
  const [notice, setNotice] = useState('');
  const { register, handleSubmit } = useForm({ defaultValues: { q: '' } });
  const query = useQuery({
    queryKey: ['admin', 'users', filters.q, filters.page, 20], retry: false,
    queryFn: () => {
      const params = new URLSearchParams({ page: String(filters.page), limit: '20' });
      if (filters.q) params.set('q', filters.q);
      return apiRequest<components['schemas']['AdminUsersResponseDto']>(`/admin/users?${params}`);
    },
  });
  const mutation = useMutation({
    mutationFn: ({ user, status }: Action) => apiRequest<components['schemas']['AdminUserStatusResponseDto']>(`/admin/users/${encodeURIComponent(user.id)}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    onSuccess: async () => {
      setConfirmation(null);
      setNotice('Đã cập nhật trạng thái tài khoản.');
      await Promise.all([client.invalidateQueries({ queryKey: ['admin', 'users'] }), client.invalidateQueries({ queryKey: ['admin', 'dashboard'] })]);
    },
  });
  const closeConfirmation = () => { setConfirmation(null); mutation.reset(); };
  const updateError = <p role="alert" className="border-l-4 border-ink bg-accent p-4 text-sm">Không thể cập nhật trạng thái. Vui lòng thử lại.</p>;

  return <>
    <AdminHeading title="Quản lý người dùng" description="Tìm tài khoản theo họ tên hoặc email và quản lý trạng thái truy cập. Tài khoản hiện tại không thể tự vô hiệu hóa." />
    <form className="mt-6 flex flex-wrap items-end gap-3" onSubmit={handleSubmit(({ q }) => setFilters({ q: q.trim(), page: 1 }))}>
      <label className="min-w-0 flex-1 text-sm font-semibold" htmlFor="user-search">Tìm theo tên hoặc email
        <input id="user-search" className={`${adminInput} mt-2`} type="search" {...register('q')} />
      </label>
      <button type="submit" className={`${adminButton} bg-accent`}>Tìm kiếm</button>
    </form>
    {notice && <p role="status" className="mt-4 border-l-2 border-teal pl-3 text-sm">{notice}</p>}
    {mutation.isError && !confirmation && <div className="mt-4">{updateError}</div>}
    {query.isPending ? <AdminSkeleton label="Đang tải người dùng…" /> : query.isError ? <AdminError onRetry={() => void query.refetch()} /> : query.data && <div className="mt-6">
      {query.data.items.length ? <div className="overflow-x-auto border border-ink bg-white">
        <table className="w-full text-left text-sm"><caption className="sr-only">Danh sách người dùng</caption>
          <thead className="border-b border-ink bg-ink/5"><tr>{['Họ tên', 'Email', 'Vai trò', 'Trạng thái', 'Thao tác'].map((label) => <th key={label} scope="col" className="p-4 font-semibold">{label}</th>)}</tr></thead>
          <tbody>{query.data.items.map((user) => <tr key={user.id} className="border-b border-ink/20 last:border-b-0">
            <th scope="row" className="min-w-40 p-4 font-semibold wrap-anywhere">{user.fullName}{user.id === currentUser?.id && <span className="mt-1 block text-xs font-normal text-teal">Tài khoản của bạn</span>}</th>
            <td className="max-w-72 p-4 wrap-anywhere">{user.email}</td><td className="p-4">{roleLabels[user.role]}</td>
            <td className="p-4"><span className={`inline-block border border-ink px-2 py-1 text-xs ${user.status === 'ACTIVE' ? 'bg-teal text-white' : 'bg-ink/5'}`}>{user.status}</span></td>
            <td className="p-4"><button type="button" aria-label={`${user.status === 'ACTIVE' ? 'Vô hiệu hóa' : 'Kích hoạt'} ${user.fullName}`} className={`${adminButton} whitespace-nowrap`}
              disabled={mutation.isPending || (user.status === 'ACTIVE' && user.id === currentUser?.id)}
              onClick={() => { mutation.reset(); setNotice(''); if (user.status === 'ACTIVE') setConfirmation(user); else mutation.mutate({ user, status: 'ACTIVE' }); }}>
              {mutation.isPending && mutation.variables?.user.id === user.id ? 'Đang cập nhật…' : user.status === 'ACTIVE' ? 'Vô hiệu hóa' : 'Kích hoạt'}
            </button></td>
          </tr>)}</tbody>
        </table>
      </div> : <p className="border border-ink p-6">Không tìm thấy người dùng phù hợp.</p>}
      <AdminPagination meta={query.data.meta} pending={query.isFetching || mutation.isPending} onPage={(page) => setFilters((current) => ({ ...current, page }))} />
    </div>}
    {confirmation && <AdminDialog title="Vô hiệu hóa tài khoản" onClose={closeConfirmation} closeDisabled={mutation.isPending}>
      <p>Bạn muốn vô hiệu hóa <strong>{confirmation.fullName}</strong> ({confirmation.email})?</p>
      <p className="text-sm">Người dùng sẽ bị từ chối ở lần truy cập tiếp theo. Bạn có thể kích hoạt lại tài khoản sau.</p>
      {mutation.isError && updateError}
      <div className="flex flex-wrap justify-end gap-3"><button type="button" data-dialog-initial-focus="" className={adminButton} disabled={mutation.isPending} onClick={closeConfirmation}>Hủy</button>
        <button type="button" className={`${adminButton} bg-accent`} disabled={mutation.isPending} onClick={() => mutation.mutate({ user: confirmation, status: 'DISABLED' })}>{mutation.isPending ? 'Đang cập nhật…' : 'Xác nhận vô hiệu hóa'}</button>
      </div>
    </AdminDialog>}
  </>;
}
