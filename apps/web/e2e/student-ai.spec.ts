import { expect, test } from '@playwright/test';

async function loginAsStudent(page: import('@playwright/test').Page) {
  await page.goto('/dang-nhap');
  await page.getByLabel('Email').fill('student.one@example.test');
  await page.getByLabel('Mật khẩu').fill(process.env.SEED_PASSWORD ?? '');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page).toHaveURL(/\/sinh-vien\/tong-quan$/);
}

test('Student learning analysis renders the API AI response', async ({ page }) => {
  await loginAsStudent(page);
  await page.route('**/api/v1/student/assessment-results', (route) => route.fulfill({ json: {
    items: [{ topic: { id: 'topic-1', name: 'Cấu trúc dữ liệu' }, score: 58, classification: 'PRIORITY', evaluatedAt: '2026-11-10T00:00:00.000Z' }],
  } }));
  await page.route('**/api/v1/student/ai/learning-analysis', (route) => route.fulfill({ json: {
    strengths: ['Duy trì tiến độ ôn tập'], areasToImprove: ['Ôn cây nhị phân'],
    priorityTopics: [{ topicId: 'topic-1', topicName: 'Cấu trúc dữ liệu', reason: 'Điểm còn thấp' }], reasons: ['Kết quả đánh giá mới nhất'],
  } }));

  await page.goto('/sinh-vien/phan-tich-ai');
  await page.getByRole('button', { name: 'Phân tích bằng AI' }).click();
  await expect(page.getByRole('heading', { name: 'Nhận định AI' })).toBeVisible();
  await expect(page.getByText('Ôn cây nhị phân')).toBeVisible();
});

test('StudyPlan Generation shows a preview and writes only after confirmation', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('studyContextDraft', JSON.stringify({
    goal: 'Học cây', availableMinutesPerWeek: 300, targetDeadline: '2098-12-01T00:00:00.000Z',
  })));
  await loginAsStudent(page);
  await page.route('**/api/v1/student/study-plans/current', (route) => route.fulfill({ json: { plan: null, tasks: [] } }));
  await page.route('**/api/v1/student/study-plans/generate', (route) => route.fulfill({ json: {
    planPreviewRef: 'preview-1', expiresAt: '2098-01-01T00:00:00.000Z', preview: {
      planTitle: 'Kế hoạch cây', goal: 'Học cây', availableMinutesPerWeek: 300, targetDeadline: '2098-12-01T00:00:00.000Z',
      tasks: [{ previewTaskId: 'preview-task-1', topic: { id: 'topic-1', name: 'Cây' }, title: 'Ôn cây', goal: 'Nắm khái niệm',
        expectedMinutes: 60, dueDate: '2098-11-01T00:00:00.000Z', priority: 'HIGH', reason: null }],
    },
  } }));
  let applyCount = 0;
  await page.route('**/api/v1/student/study-plans/apply', async (route) => {
    applyCount += 1;
    await route.fulfill({ json: { replayed: false, plan: { id: 'plan-1' }, tasks: [] } });
  });

  await page.goto('/sinh-vien/ke-hoach-hoc-tap');
  await page.getByRole('button', { name: 'Tạo kế hoạch bằng AI' }).click();
  await expect(page.getByText('Bản xem trước do AI đề xuất · Chưa lưu')).toBeVisible();
  await page.getByRole('button', { name: 'Xác nhận áp dụng' }).click();
  expect(applyCount).toBe(0);
  await page.getByRole('button', { name: 'Lưu kế hoạch' }).click();
  await expect(page.getByText('Kế hoạch đã được lưu.')).toBeVisible();
  expect(applyCount).toBe(1);
});

test('StudyPlan Adjustment requires confirmation before applying the AI proposal', async ({ page }) => {
  await loginAsStudent(page);
  await page.route('**/api/v1/student/study-plans/current', (route) => route.fulfill({ json: {
    plan: { id: 'plan-1', title: 'Kế hoạch', goal: 'Học cây', availableMinutesPerWeek: 300,
      startDate: '2026-11-01T00:00:00.000Z', endDate: '2098-12-01T00:00:00.000Z', status: 'ACTIVE' },
    tasks: [{ id: 'task-1', title: 'Ôn cây', goal: 'Nắm khái niệm', topic: { id: 'topic-1', name: 'Cây' }, expectedMinutes: 60,
      dueDate: '2098-11-01T00:00:00.000Z', priority: 'MEDIUM', status: 'TODO', completedAt: null }],
  } }));
  await page.route('**/api/v1/student/study-plan-adjustments/generate', (route) => route.fulfill({ json: {
    adjustmentRef: 'adjustment-1', expiresAt: '2098-01-01T00:00:00.000Z', preview: { planId: 'plan-1', changes: [{
      taskId: 'task-1', title: 'Ôn cây', expectedMinutes: 45, dueDate: '2098-11-01T00:00:00.000Z', priority: 'HIGH', reason: 'Điều chỉnh tiến độ',
    }] },
  } }));
  let applyCount = 0;
  await page.route('**/api/v1/student/study-plan-adjustments/apply', async (route) => {
    applyCount += 1;
    await route.fulfill({ json: { replayed: false, updatedTasks: [], progress: {} } });
  });

  await page.goto('/sinh-vien/ke-hoach-hoc-tap/dieu-chinh');
  await page.getByRole('button', { name: 'Yêu cầu AI đề xuất điều chỉnh' }).click();
  await expect(page.getByText('Điều chỉnh tiến độ')).toBeVisible();
  await page.getByRole('button', { name: 'Chấp nhận điều chỉnh' }).click();
  expect(applyCount).toBe(0);
  await page.getByRole('button', { name: 'Xác nhận' }).click();
  await expect(page.getByText('Điều chỉnh đã được áp dụng.')).toBeVisible();
  expect(applyCount).toBe(1);
});
