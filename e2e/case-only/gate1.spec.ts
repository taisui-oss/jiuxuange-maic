import { expect, test } from '@playwright/test';

const FIRST_CASE_PATH =
  '/courses/business-model/cases/breakfast-chain-six-elements-foundation';
const SCREENSHOT_DIRECTORY =
  'documentation/jiuxuange/case-only-v1/gate-1/screenshots';

test('desktop learner can finish the first case through the lightweight player', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);

  await expect(page.getByRole('heading', { name: '按顺序完成案例' })).toBeVisible();
  await expect(page.getByText('自由学习')).toHaveCount(0);
  await expect(page.getByText('个人项目测试')).toHaveCount(0);
  await expect(page.getByRole('link', { name: '进入案例' })).toHaveCount(1);
  await page.screenshot({
    path: `${SCREENSHOT_DIRECTORY}/gate1-desktop-home.png`,
    fullPage: true,
  });

  await page.getByRole('link', { name: '进入案例' }).click();
  await expect(page).toHaveURL(FIRST_CASE_PATH);
  await expect(page.getByRole('heading', { name: /六要素/ })).toBeVisible();
  await page.screenshot({
    path: `${SCREENSHOT_DIRECTORY}/gate1-desktop-player.png`,
    fullPage: true,
  });

  for (let index = 0; index < 9; index += 1) {
    await page.getByRole('button', { name: '下一场景' }).click();
  }

  await expect(page.getByRole('heading', { name: '完成知识检测' })).toBeVisible();
  for (const [questionId, option] of [
    ['breakfast-q1', 'A'],
    ['breakfast-q2', 'B'],
    ['breakfast-q3', 'B'],
    ['breakfast-q4', 'A'],
    ['breakfast-q5', 'B'],
  ] as const) {
    await page.locator(`[data-question-id="${questionId}"][data-option-value="${option}"]`).click();
  }
  await page.getByRole('button', { name: '提交答案' }).click();
  await expect(page.getByText('本轮互动已完成')).toBeVisible();
  await page.getByRole('button', { name: '完成案例' }).click();
  await expect(page.getByText('案例学习完成')).toBeVisible();
  await page.screenshot({
    path: `${SCREENSHOT_DIRECTORY}/gate1-desktop-complete.png`,
    fullPage: true,
  });
});

test('mobile learner surface fits the viewport and survives storage clearing', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '按顺序完成案例' })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
  await page.screenshot({
    path: `${SCREENSHOT_DIRECTORY}/gate1-mobile-home.png`,
    fullPage: true,
  });

  await page.getByRole('link', { name: '进入案例' }).click();
  await expect(page).toHaveURL(FIRST_CASE_PATH);
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await expect(page.getByRole('button', { name: '下一场景' })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
  await page.screenshot({
    path: `${SCREENSHOT_DIRECTORY}/gate1-mobile-player.png`,
    fullPage: true,
  });
});

test('closed pages and APIs are inaccessible in case-only mode', async ({ request }) => {
  for (const pathname of [
    '/generation-preview',
    '/assessment/bm-assessment-mckess-v2',
    '/courses/business-model/projects/mckess',
    '/classroom/jxg-bm-case-convenience-bee-v1',
  ]) {
    expect((await request.get(pathname)).status(), pathname).toBe(404);
  }

  for (const pathname of [
    '/api/chat',
    '/api/classroom',
    '/api/generate-classroom',
    '/api/jiuxuange/assessment/bm-assessment-mckess-v2',
  ]) {
    expect((await request.get(pathname)).status(), pathname).toBe(403);
  }

  expect((await request.get('/api/health')).status()).toBe(200);
});
