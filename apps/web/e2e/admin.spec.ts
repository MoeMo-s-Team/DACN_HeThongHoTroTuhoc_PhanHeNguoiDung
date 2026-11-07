import { expect, test } from '@playwright/test';
import type { APIRequestContext, Page } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const apiBase = 'http://127.0.0.1:3101/api/v1';
const targetId = '97000000-0000-4000-8000-000000000001';
const analysisId = '98000000-0000-4000-8000-000000000001';

function fixture(mode: 'setup' | 'history' | 'cleanup') {
  const result = spawnSync('pnpm', ['--filter', '@dacn/api', 'exec', 'tsx', 'scripts/prepare-admin-e2e.ts', mode], { cwd: resolve(__dirname, '../../..'), env: process.env, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`Administrator fixture ${mode} failed: ${result.error?.message ?? result.stderr.slice(-1200)}`);
}

async function login(page: Page, email = 'admin@example.test') {
  await page.goto('/dang-nhap');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mật khẩu').fill(process.env.SEED_PASSWORD ?? '');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
}

async function loginToken(request: APIRequestContext, email: string): Promise<string> {
  const response = await request.post(`${apiBase}/auth/login`, { data: { email, password: process.env.SEED_PASSWORD } });
  expect(response.status()).toBe(200);
  return (await response.json()).accessToken as string;
}

test.use({ screenshot: 'only-on-failure' });

test.describe('Administrator Phase 1', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => { fixture('setup'); });
  test.afterAll(() => { fixture('cleanup'); });

  test('real dashboard, user status, feedback filters, stored history, profile and logout', async ({ page, request }, testInfo) => {
    test.setTimeout(120_000);
    const aiRequests: string[] = [];
    page.on('request', (req) => {
      if (req.method() !== 'GET' && /\/admin\/feedback\/(analysis|analyses)(\/|$)/.test(new URL(req.url()).pathname)) aiRequests.push(req.url());
    });
    await login(page);
    await expect(page).toHaveURL(/\/quan-tri\/tong-quan$/);
    await expect(page.getByText('Tổng người dùng', { exact: true })).toBeVisible();
    const adminToken = await loginToken(request, 'admin@example.test');
    const targetToken = await loginToken(request, 'administrator.phase1.target@example.test');
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };
    const logsBefore = (await (await request.get(`${apiBase}/admin/dashboard`, { headers: adminHeaders })).json()).totalAIRequests;
    await page.screenshot({ path: testInfo.outputPath('administrator-dashboard.png'), fullPage: true });

    await page.getByRole('link', { name: 'Người dùng', exact: true }).click();
    await page.getByLabel('Tìm theo tên hoặc email').fill('administrator.phase1.target@example.test');
    await page.getByRole('button', { name: 'Tìm kiếm', exact: true }).click();
    const disable = page.getByRole('button', { name: 'Vô hiệu hóa E2E Admin Target' });
    await disable.click();
    await expect(page.getByRole('button', { name: 'Hủy', exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(disable).toBeFocused();
    try {
      await disable.click();
      await page.getByRole('button', { name: 'Xác nhận vô hiệu hóa', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Kích hoạt E2E Admin Target' })).toBeEnabled();
      const blocked = await request.get(`${apiBase}/me`, { headers: { Authorization: `Bearer ${targetToken}` } });
      expect(blocked.status()).toBe(403);
      expect((await blocked.json()).code).toBe('ACCOUNT_DISABLED');
      await page.getByRole('button', { name: 'Kích hoạt E2E Admin Target' }).click();
      await expect(disable).toBeEnabled();
      expect((await request.get(`${apiBase}/me`, { headers: { Authorization: `Bearer ${targetToken}` } })).status()).toBe(200);
    } finally {
      const restored = await request.patch(`${apiBase}/admin/users/${targetId}/status`, { headers: adminHeaders, data: { status: 'ACTIVE' } });
      expect(restored.status()).toBe(200);
    }

    await page.getByRole('link', { name: 'Phản hồi', exact: true }).click();
    await page.getByRole('combobox', { name: 'Rating', exact: true }).selectOption('2');
    await page.getByRole('combobox', { name: 'Tag', exact: true }).selectOption('UI_UX');
    await page.getByRole('button', { name: 'Áp dụng bộ lọc', exact: true }).click();
    await expect(page).toHaveURL(/rating=2/);
    await expect(page.getByRole('button', { name: 'Phân tích tập phản hồi này bằng AI' })).toBeDisabled();
    await page.reload();
    await expect(page.getByRole('combobox', { name: 'Tag', exact: true })).toHaveValue('UI_UX');
    await page.getByRole('button', { name: 'Xóa bộ lọc', exact: true }).click();
    await expect(page).toHaveURL(/\/quan-tri\/phan-hoi$/);

    const existingHistory = await request.get(`${apiBase}/admin/feedback/analyses`, { headers: adminHeaders });
    expect(existingHistory.status()).toBe(200);
    await page.getByRole('link', { name: 'Lịch sử phân tích', exact: true }).click();
    if ((await existingHistory.json()).meta.total === 0) await expect(page.getByText('Chưa có kết quả phân tích được lưu.', { exact: true })).toBeVisible();
    fixture('history');
    await page.reload();
    const view = page.getByRole('button', { name: `Xem phân tích ${analysisId}` });
    await view.click();
    await expect(page.getByText('Bản tóm tắt snapshot E2E đã lưu.', { exact: true })).toBeVisible();
    await expect(page.getByText('Chỉ đọc · Kết quả AI đã lưu', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /chạy lại|lưu kết quả|xóa phân tích/i })).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(view).toBeFocused();
    expect((await (await request.get(`${apiBase}/admin/dashboard`, { headers: adminHeaders })).json()).totalAIRequests).toBe(logsBefore);
    expect(aiRequests).toEqual([]);

    await page.getByRole('link', { name: 'Hồ sơ', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Hồ sơ cá nhân' })).toBeVisible();
    await expect(page.getByRole('textbox')).toHaveCount(0);
    await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
    await expect(page).toHaveURL(/\/dang-nhap$/);
    expect(await page.evaluate(() => sessionStorage.getItem('accessToken'))).toBeNull();
  });

  test('rejects Student and Teacher access to Admin API and redirects protected pages', async ({ page, request }) => {
    test.setTimeout(60_000);
    for (const email of ['student.one@example.test', 'teacher@example.test']) {
      const token = await loginToken(request, email);
      const response = await request.get(`${apiBase}/admin/users`, { headers: { Authorization: `Bearer ${token}` } });
      expect(response.status()).toBe(403);
      expect((await response.json()).code).toBe('FORBIDDEN_RESOURCE');
    }
    await login(page, 'student.one@example.test');
    await expect(page).toHaveURL(/\/sinh-vien\/tong-quan$/);
    await page.goto('/quan-tri/nguoi-dung');
    await expect(page).toHaveURL(/\/sinh-vien\/tong-quan$/);
    await expect(page.getByRole('heading', { name: 'Quản lý người dùng' })).toHaveCount(0);
  });

  test('validates URL filters and works at narrow width in a non-UTC timezone', async ({ browser }, testInfo) => {
    test.setTimeout(90_000);
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Ho_Chi_Minh', baseURL: 'http://127.0.0.1:3100' });
    const page = await context.newPage();
    try {
      await login(page);
      await expect(page).toHaveURL(/\/quan-tri\/tong-quan$/);
      await page.goto('/quan-tri/phan-hoi?rating=8');
      await expect(page.getByRole('alert').filter({ hasText: 'Bộ lọc không hợp lệ' })).toBeVisible();
      await page.getByRole('button', { name: 'Xóa bộ lọc', exact: true }).click();
      await expect(page).toHaveURL(/\/quan-tri\/phan-hoi$/);
      await page.getByLabel('Từ ngày', { exact: true }).fill('2026-10-01');
      await page.getByLabel('Đến ngày', { exact: true }).fill('2026-10-02');
      await page.getByRole('button', { name: 'Áp dụng bộ lọc', exact: true }).click();
      await expect.poll(() => new URL(page.url()).searchParams.get('fromDate')).toBe('2026-09-30T17:00:00.000Z');
      expect(new URL(page.url()).searchParams.get('toDate')).toBe('2026-10-02T16:59:59.999Z');
      await expect(page.getByRole('button', { name: 'Phân tích tập phản hồi này bằng AI' })).toBeDisabled();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath('administrator-feedback-mobile.png'), fullPage: true });
      await page.getByRole('link', { name: 'Lịch sử phân tích', exact: true }).click();
      await page.getByRole('button', { name: `Xem phân tích ${analysisId}` }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      expect(await page.getByRole('dialog').evaluate((element) => element.getBoundingClientRect().width <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath('administrator-history-mobile.png'), fullPage: true });
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
    } finally { await context.close(); }
  });
});
