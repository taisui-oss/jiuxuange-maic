import { expect, test } from '@playwright/test';

const FIRST_CASE_PATH = '/courses/business-model/cases/breakfast-chain-six-elements-foundation';
const SCREENSHOT_DIRECTORY =
  'documentation/jiuxuange/case-only-v1/releases/screenshots/v6.1.0-rc.1';

test('preview identity is server-authoritative, browser-local, and versioned', async ({
  browser,
}) => {
  const firstBrowser = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const firstPage = await firstBrowser.newPage();
  const closedClientRequests: string[] = [];
  firstPage.on('request', (request) => {
    if (
      /\/api\/(server-providers|chat|classroom|generate-classroom)(?:\/|\?|$)/.test(request.url())
    ) {
      closedClientRequests.push(request.url());
    }
  });
  await firstPage.goto('/', { waitUntil: 'domcontentloaded' });

  await expect(firstPage.getByRole('heading', { name: '按顺序完成案例' })).toBeVisible();
  await expect(firstPage.getByText('v6.1.0-rc.1 预览')).toBeVisible();
  await expect(firstPage.getByText('0 / 5 已完成')).toBeVisible();
  await firstPage.screenshot({
    path: `${SCREENSHOT_DIRECTORY}/desktop-home.png`,
    fullPage: true,
  });

  const releaseResponse = await firstBrowser.request.get('/api/jiuxuange/case-only/release');
  expect(releaseResponse.status()).toBe(200);
  await expect(releaseResponse.json()).resolves.toMatchObject({
    success: true,
    release: { version: '6.1.0-rc.1', usage: 'preview-only' },
  });

  const firstProgressResponse = await firstBrowser.request.get('/api/jiuxuange/case-only/progress');
  const firstProgress = await firstProgressResponse.json();
  expect(firstProgress.success).toBe(true);
  expect(firstProgress.progress.userId).toMatch(/^[0-9a-f-]{36}$/);

  await firstPage.goto(FIRST_CASE_PATH, { waitUntil: 'domcontentloaded' });
  await expect(firstPage.getByRole('region', { name: '案例播放器' })).toHaveAttribute(
    'data-client-ready',
    'true',
    { timeout: 30_000 },
  );
  await firstPage.getByRole('button', { name: '下一场景' }).click();
  await expect(firstPage.getByText('2 / 10')).toBeVisible();
  await firstPage.evaluate(() => window.localStorage.clear());
  await firstPage.reload({ waitUntil: 'domcontentloaded' });
  await expect(firstPage.getByText('2 / 10')).toBeVisible();

  const secondBrowser = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const secondPage = await secondBrowser.newPage();
  await secondPage.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(secondPage.getByText('0 / 5 已完成')).toBeVisible();
  expect(
    await secondPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
  await secondPage.screenshot({
    path: `${SCREENSHOT_DIRECTORY}/mobile-home.png`,
    fullPage: true,
  });

  const secondProgressResponse = await secondBrowser.request.get(
    '/api/jiuxuange/case-only/progress',
  );
  const secondProgress = await secondProgressResponse.json();
  expect(secondProgress.success).toBe(true);
  expect(secondProgress.progress.userId).not.toBe(firstProgress.progress.userId);
  expect(secondProgress.progress.cases[0]).toMatchObject({
    nextSceneIndex: 0,
    progressVersion: 0,
  });

  const previewCookies = await firstBrowser.cookies();
  expect(
    previewCookies.find((cookie) => cookie.name === 'jiuxuange_case_preview_id'),
  ).toMatchObject({ httpOnly: true, sameSite: 'Lax' });
  expect(closedClientRequests).toEqual([]);

  await secondBrowser.close();
  await firstBrowser.close();
});
