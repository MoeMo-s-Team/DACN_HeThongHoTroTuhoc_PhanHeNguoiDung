import { expect, test } from '@playwright/test';

test('routes the app entry point to the login screen', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/dang-nhap$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Đăng nhập' })).toBeVisible();
});
