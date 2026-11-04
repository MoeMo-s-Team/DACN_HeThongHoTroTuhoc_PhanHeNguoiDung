import { expect, test } from '@playwright/test';

test('Student opens feedback from the sidebar, submits, and stays on the form', async ({ page }) => {
  await page.goto('/dang-nhap');
  await page.getByLabel('Email').fill('student.one@example.test');
  await page.getByLabel('Mật khẩu').fill(process.env.SEED_PASSWORD ?? '');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page).toHaveURL(/\/sinh-vien\/tong-quan$/);

  await page.getByRole('link', { name: 'Gửi phản hồi' }).click();
  await expect(page).toHaveURL(/\/phan-hoi\/gui$/);
  await page.route('**/api/v1/feedback', async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      tag: 'UI_UX', rating: 5, content: 'Phản hồi E2E.',
    });
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'e2e-feedback', tag: 'UI_UX', rating: 5, content: 'Phản hồi E2E.', createdAt: '2026-11-04T03:00:00.000Z',
      }),
    });
  });

  await page.getByLabel('Nhóm phản hồi *').selectOption('UI_UX');
  await page.getByRole('radio', { name: '5 sao' }).check();
  await page.getByLabel('Nội dung phản hồi *').fill('Phản hồi E2E.');
  await page.getByRole('button', { name: 'Gửi phản hồi' }).click();

  await expect(page.getByRole('status')).toHaveText('Đã gửi phản hồi. Cảm ơn bạn!');
  await expect(page).toHaveURL(/\/phan-hoi\/gui$/);
  await expect(page.getByLabel('Nhóm phản hồi *')).toHaveValue('');
  await expect(page.getByRole('radio', { name: '5 sao' })).not.toBeChecked();
  await expect(page.getByLabel('Nội dung phản hồi *')).toHaveValue('');
});
