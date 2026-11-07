import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { AdminDialog, AdminPagination } from './admin-ui';
import { installDialogMock, renderQuery } from './test-support';

beforeAll(installDialogMock);
afterEach(cleanup);

describe('Administrator UI controls', () => {
  it('labels a modal and allows close without rendering untrusted markup', () => {
    const onClose = vi.fn();
    renderQuery(<AdminDialog title="Xem chi tiết" onClose={onClose}><p>{'<script>unsafe</script>'}</p></AdminDialog>);
    expect(screen.getByRole('dialog', { name: 'Xem chi tiết' })).toBeVisible();
    expect(screen.getByText('<script>unsafe</script>')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    expect(onClose).toHaveBeenCalledOnce();
  });
  it('blocks empty pagination and emits only valid neighboring pages', () => {
    const onPage = vi.fn();
    const { rerender } = renderQuery(<AdminPagination meta={{ page: 1, limit: 20, total: 0, totalPages: 0 }} onPage={onPage} />);
    expect(screen.getByRole('button', { name: 'Trang trước' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Trang sau' })).toBeDisabled();
    rerender(<AdminPagination meta={{ page: 1, limit: 20, total: 21, totalPages: 2 }} onPage={onPage} />);
    fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }));
    expect(onPage).toHaveBeenCalledWith(2);
  });
  it('focuses the safe confirmation action after the native dialog opens', () => {
    const showModal = vi.spyOn(HTMLDialogElement.prototype, 'showModal').mockImplementationOnce(function (this: HTMLDialogElement) {
      this.open = true;
      this.querySelector<HTMLButtonElement>('button')?.focus();
    });
    try {
      renderQuery(<AdminDialog title="Xác nhận" onClose={() => {}}><button type="button" data-dialog-initial-focus="">Hủy</button><button type="button">Thực hiện</button></AdminDialog>);
      expect(screen.getByRole('button', { name: 'Hủy' })).toHaveFocus();
    } finally { showModal.mockRestore(); }
  });
});
