import { expect, test } from '@playwright/test';

test.describe('Teacher Phase 1 E2E', () => {
  test('teacher login, view classes, explore dashboard and student roster, read-only detail', async ({ page }) => {
    // 1. Login as Demo Teacher
    await page.goto('/dang-nhap');
    await page.getByLabel('Email').fill('teacher@example.test');
    await page.getByLabel('Mật khẩu').fill(process.env.SEED_PASSWORD ?? '');
    await page.getByRole('button', { name: 'Đăng nhập' }).click();

    // 2. Redirects to /giao-vien/lop-hoc
    await expect(page).toHaveURL(/\/giao-vien\/lop-hoc$/);
    await expect(page.getByRole('heading', { name: 'Danh sách lớp học phụ trách' })).toBeVisible();

    // 3. Check class card exists and click into class dashboard
    const classButton = page.getByRole('link', { name: /Bảng theo dõi lớp/i }).first();
    await expect(classButton).toBeVisible();
    await classButton.click();

    // 4. Verify Class Dashboard (/tong-quan)
    await expect(page).toHaveURL(/\/giao-vien\/lop-hoc\/[^/]+\/tong-quan$/);
    await expect(page.getByRole('heading', { name: /Bảng theo dõi:/i })).toBeVisible();
    await expect(page.getByText('Sĩ số lớp')).toBeVisible();
    await expect(page.getByText('Điểm trung bình')).toBeVisible();

    // 5. Navigate to Students roster tab
    await page.getByRole('link', { name: 'Danh sách sinh viên' }).click();
    await expect(page).toHaveURL(/\/giao-vien\/lop-hoc\/[^/]+\/sinh-vien$/);
    await expect(page.getByRole('heading', { name: /Danh sách sinh viên:/i })).toBeVisible();

    // 6. Navigate to Analysis History tab
    await page.getByRole('link', { name: 'Lịch sử báo cáo AI' }).click();
    await expect(page).toHaveURL(/\/giao-vien\/lop-hoc\/[^/]+\/lich-su-phan-tich$/);
    await expect(page.getByRole('heading', { name: 'Lịch sử báo cáo phân tích AI' })).toBeVisible();
    await expect(page.getByText(/Trang này chỉ hiển thị các báo cáo đã được lưu/i)).toBeVisible();

    // 7. Logout
    await page.getByRole('button', { name: 'Đăng xuất' }).click();
    await expect(page).toHaveURL(/\/dang-nhap$/);
  });
});
