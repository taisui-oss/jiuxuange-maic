import { expect, test } from '@playwright/test';

const FIRST_CASE_PATH = '/courses/business-model/cases/breakfast-chain-six-elements-foundation';
const SECOND_CASE_PATH = '/courses/business-model/cases/convenience-bee';
const SCREENSHOT_DIRECTORY = 'documentation/jiuxuange/case-only-v1/gate-2/screenshots';

test('server-authoritative progress survives refresh, storage clearing, and a second device', async ({
  browser,
  page,
  request,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '按顺序完成案例' })).toBeVisible();
  await expect(page.locator(`a[href="${FIRST_CASE_PATH}"]`)).toBeVisible();
  await expect(page.locator(`a[href="${SECOND_CASE_PATH}"]`)).toHaveCount(0);
  expect((await request.get(SECOND_CASE_PATH)).status()).toBe(404);
  await page.screenshot({
    path: `${SCREENSHOT_DIRECTORY}/gate2-desktop-initial.png`,
    fullPage: true,
  });

  await page.locator(`a[href="${FIRST_CASE_PATH}"]`).click();
  await expect(page).toHaveURL(FIRST_CASE_PATH);
  const contentVersion = await page
    .locator('[data-content-version]')
    .getAttribute('data-content-version');
  const progressVersion = Number(
    await page.locator('[data-progress-version]').getAttribute('data-progress-version'),
  );
  const sceneId = await page
    .getByRole('region', { name: '案例播放器' })
    .getAttribute('data-scene-id');
  expect(contentVersion).toMatch(/^sha256:[0-9a-f]{64}$/);
  expect(progressVersion).toBe(0);
  expect(sceneId).toBeTruthy();

  const duplicatePayload = {
    caseId: 'breakfast-chain-six-elements-foundation',
    contentVersion,
    progressVersion,
    sceneId,
  };
  const duplicateResponses = await Promise.all([
    request.post('/api/jiuxuange/case-only/progress/submit', {
      headers: { 'Idempotency-Key': 'browser-concurrent-duplicate' },
      data: duplicatePayload,
    }),
    request.post('/api/jiuxuange/case-only/progress/submit', {
      headers: { 'Idempotency-Key': 'browser-concurrent-duplicate' },
      data: duplicatePayload,
    }),
  ]);
  expect(duplicateResponses.map((response) => response.status())).toEqual([200, 200]);
  const duplicateBodies = await Promise.all(duplicateResponses.map((response) => response.json()));
  expect(duplicateBodies.filter((body) => body.replayed === true)).toHaveLength(1);

  await page.reload();
  await expect(page.getByText('2 / 10')).toBeVisible();
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await expect(page.getByText('2 / 10')).toBeVisible();

  const secondDevice = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobilePage = await secondDevice.newPage();
  await mobilePage.goto(FIRST_CASE_PATH);
  await expect(mobilePage.getByText('2 / 10')).toBeVisible();
  expect(
    await mobilePage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
  await mobilePage.screenshot({
    path: `${SCREENSHOT_DIRECTORY}/gate2-mobile-cross-device-resume.png`,
    fullPage: true,
  });

  for (let index = 0; index < 8; index += 1) {
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
    path: `${SCREENSHOT_DIRECTORY}/gate2-desktop-server-complete.png`,
    fullPage: true,
  });

  await page.goto('/');
  await expect(page.locator(`a[href="${SECOND_CASE_PATH}"]`)).toBeVisible();
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await expect(page.locator(`a[href="${SECOND_CASE_PATH}"]`)).toBeVisible();

  await mobilePage.goto('/');
  await expect(mobilePage.locator(`a[href="${SECOND_CASE_PATH}"]`)).toBeVisible();
  await mobilePage.screenshot({
    path: `${SCREENSHOT_DIRECTORY}/gate2-mobile-next-case-unlocked.png`,
    fullPage: true,
  });
  await secondDevice.close();

  const progressResponse = await request.get('/api/jiuxuange/case-only/progress', {
    headers: { 'x-jiuxuange-user-id': '99999999-9999-4999-8999-999999999999' },
  });
  expect(progressResponse.status()).toBe(200);
  const progressBody = await progressResponse.json();
  expect(progressBody.progress.userId).toBe('10000000-0000-4000-8000-000000000002');
  expect(progressBody.progress.cases[0]).toMatchObject({
    status: 'completed',
    nextSceneIndex: 10,
    progressVersion: 10,
  });
  expect(progressBody.progress.cases[0].contentVersion).toMatch(/^sha256:[0-9a-f]{64}$/);
  expect(progressBody.progress.cases[1].unlocked).toBe(true);
});

test('closed pages and APIs remain inaccessible after Gate 2', async ({ request }) => {
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
});
