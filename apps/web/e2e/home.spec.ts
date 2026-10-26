import { expect, test } from '@playwright/test';

test('loads the bootstrap home page', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Hệ thống hỗ trợ tự học' })).toBeVisible();
});
