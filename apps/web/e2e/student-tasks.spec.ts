import { expect, test } from '@playwright/test';

test('Student completes and reopens a current-plan task', async ({ page }) => {
  await page.goto('/dang-nhap');
  await page.getByLabel('Email').fill('student.one@example.test');
  await page.getByLabel('Mật khẩu').fill(process.env.SEED_PASSWORD ?? '');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page).toHaveURL(/\/sinh-vien\/tong-quan$/);

  const listResponsePromise = page.waitForResponse((response) =>
    response.request().method() === 'GET' && response.url().endsWith('/api/v1/student/study-tasks'));
  await page.goto('/sinh-vien/nhiem-vu');
  const listResponse = await listResponsePromise;
  expect(listResponse.status()).toBe(200);
  const { items } = await listResponse.json() as { items: Array<{ id: string; title: string; status: 'TODO' | 'COMPLETED' }> };
  const todo = items.find((item) => item.status === 'TODO');
  expect(todo).toBeDefined();

  const taskRow = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: todo!.title }) });
  const checkbox = taskRow.getByRole('checkbox', { name: `Đánh dấu hoàn thành: ${todo!.title}` });
  const completeResponsePromise = page.waitForResponse((response) =>
    response.request().method() === 'PATCH' && response.url().endsWith(`/student/study-tasks/${todo!.id}/status`));
  await checkbox.click();
  expect((await completeResponsePromise).status()).toBe(200);
  await expect(taskRow.getByRole('checkbox', { name: `Hoàn tác hoàn thành: ${todo!.title}` })).toBeChecked();
  await expect(taskRow.getByText('Đã hoàn thành', { exact: true })).toBeVisible();

  await page.goto('/sinh-vien/tien-do');
  await expect(page.getByText('2 / 3 nhiệm vụ hoàn thành')).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Tiến độ thực tế' })).toBeVisible();

  await page.goto('/sinh-vien/nhiem-vu');
  const refreshedRow = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: todo!.title }) });
  const undoResponsePromise = page.waitForResponse((response) =>
    response.request().method() === 'PATCH' && response.url().endsWith(`/student/study-tasks/${todo!.id}/status`));
  await refreshedRow.getByRole('checkbox', { name: `Hoàn tác hoàn thành: ${todo!.title}` }).click();
  expect((await undoResponsePromise).status()).toBe(200);
  await expect(refreshedRow.getByRole('checkbox', { name: `Đánh dấu hoàn thành: ${todo!.title}` })).not.toBeChecked();
  await expect(refreshedRow.getByText('Cần hoàn thành', { exact: true })).toBeVisible();
});

test('Student with an ACTIVE empty plan sees the current-plan empty state', async ({ page }) => {
  await page.goto('/dang-nhap');
  await page.getByLabel('Email').fill('student.09@example.test');
  await page.getByLabel('Mật khẩu').fill(process.env.SEED_PASSWORD ?? '');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page).toHaveURL(/\/sinh-vien\/tong-quan$/);

  await page.goto('/sinh-vien/nhiem-vu');
  await expect(page.getByRole('heading', { name: 'Kế hoạch hiện tại' })).toBeVisible();
  await expect(page.getByText('Kế hoạch đang thực hiện')).toBeVisible();
  await expect(page.getByText('Kế hoạch hiện tại chưa có nhiệm vụ.')).toBeVisible();
});
