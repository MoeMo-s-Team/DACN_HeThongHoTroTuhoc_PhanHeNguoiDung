import { expect, test } from '@playwright/test';

test('login, restore through /me after reload, then make protected logout', async ({ page }) => {
  await page.goto('/dang-nhap');
  await page.getByLabel('Email').fill('student.one@example.test');
  await page.getByLabel('Mật khẩu').fill(process.env.SEED_PASSWORD ?? '');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page).toHaveURL(/\/sinh-vien\/tong-quan$/);
  await expect(page.getByRole('button', { name: 'Đăng xuất' })).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem('accessToken'))).toBeTruthy();

  const meResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/me'));
  await page.reload();
  const meResponse = await meResponsePromise;
  expect(meResponse.status()).toBe(200);
  expect(meResponse.request().headers().authorization).toMatch(/^Bearer /);
  await expect(page.getByText('student.one@example.test')).toBeVisible();

  const logoutResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/logout'));
  await page.getByRole('button', { name: 'Đăng xuất' }).click();
  const logoutResponse = await logoutResponsePromise;
  expect(logoutResponse.status()).toBe(204);
  await expect(page.getByRole('heading', { name: 'Đăng nhập' })).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem('accessToken'))).toBeNull();
});
