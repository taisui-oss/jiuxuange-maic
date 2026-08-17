import { expect, test, type Page } from '@playwright/test';

const SCREENSHOT_DIRECTORY = 'documentation/jiuxuange/case-only-v1/gate-3/screenshots';

interface CaseDefinition {
  id: string;
  title: string;
  quizAnswers: Record<string, Record<string, string | string[]>>;
}

const cases: CaseDefinition[] = [
  {
    id: 'breakfast-chain-six-elements-foundation',
    title: '社区早餐连锁：从一笔订单到六要素因果图',
    quizAnswers: {
      'breakfast-objective-check': {
        'breakfast-q1': 'A',
        'breakfast-q2': 'B',
        'breakfast-q3': 'B',
        'breakfast-q4': 'A',
        'breakfast-q5': 'B',
      },
    },
  },
  {
    id: 'convenience-bee',
    title: '便利蜂：六要素事实迁移',
    quizAnswers: {
      'convenience-check-1': {
        'convenience-q1': 'B',
        'convenience-q2': 'B',
        'convenience-q3': 'B',
      },
      'convenience-check-2': {
        'convenience-q4': 'B',
        'convenience-q5': 'B',
      },
    },
  },
  {
    id: 'fresh-grocery-comparison',
    title: '生鲜零售：模式比较与迁移',
    quizAnswers: {
      'fresh-check-1': { 'fresh-q1': 'C', 'fresh-q2': 'A', 'fresh-q3': 'B' },
      'fresh-check-2': { 'fresh-q4': 'B', 'fresh-q5': 'B' },
    },
  },
  {
    id: 'shein-system-capabilities',
    title: 'SHEIN：业务系统与关键资源能力',
    quizAnswers: {
      'shein-check-1': { 'shein-q1': 'B', 'shein-q2': 'B', 'shein-q3': 'B' },
      'shein-check-2': { 'shein-q4': 'B', 'shein-q5': 'B' },
    },
  },
  {
    id: 'florasis-business-model',
    title: '花西子：定位与盈利模式',
    quizAnswers: {
      'florasis-check-1': {
        'florasis-q1': 'B',
        'florasis-q2': 'B',
        'florasis-q3': 'B',
      },
      'florasis-check-2': { 'florasis-q4': 'B', 'florasis-q5': 'B' },
    },
  },
];

function casePath(caseId: string): string {
  return `/courses/business-model/cases/${caseId}`;
}

async function fillAnswers(
  page: Page,
  answers: Record<string, string | string[]>,
  wrong = false,
): Promise<void> {
  for (const [questionId, configuredAnswer] of Object.entries(answers)) {
    const textarea = page.locator(`textarea[data-question-id="${questionId}"]`);
    if ((await textarea.count()) > 0) {
      await textarea.fill(wrong ? '这是一次用于验证不推进的开放回答。' : String(configuredAnswer));
      continue;
    }

    const correctValues = Array.isArray(configuredAnswer) ? configuredAnswer : [configuredAnswer];
    if (wrong) {
      const optionButtons = page.locator(`[data-question-id="${questionId}"]`);
      const optionValues = await optionButtons.evaluateAll((buttons) =>
        buttons.map((button) => button.getAttribute('data-option-value')).filter(Boolean),
      );
      const wrongValue = optionValues.find((value) => !correctValues.includes(value!));
      if (!wrongValue) throw new Error(`No wrong option available for ${questionId}`);
      await page
        .locator(`[data-question-id="${questionId}"][data-option-value="${wrongValue}"]`)
        .click();
      continue;
    }

    for (const value of correctValues) {
      await page
        .locator(`[data-question-id="${questionId}"][data-option-value="${value}"]`)
        .click();
    }
  }
}

async function completeCase(page: Page, definition: CaseDefinition): Promise<void> {
  let testedWrongAnswer = false;
  while ((await page.getByText('案例学习完成').count()) === 0) {
    const player = page.getByRole('region', { name: '案例播放器' });
    await expect(player).toHaveAttribute('data-scene-id', /.+/);
    const sceneId = await player.getAttribute('data-scene-id');
    if (!sceneId) throw new Error(`Missing scene id for ${definition.id}`);
    const quizAnswers = definition.quizAnswers[sceneId];

    if (quizAnswers) {
      if (!testedWrongAnswer) {
        const progressBefore = await page
          .locator('[data-progress-version]')
          .getAttribute('data-progress-version');
        await fillAnswers(page, quizAnswers, true);
        await page.getByRole('button', { name: '提交答案' }).click();
        await expect(page.getByRole('button', { name: '重新作答' })).toBeVisible();
        await expect(page.locator('[data-progress-version]')).toHaveAttribute(
          'data-progress-version',
          progressBefore!,
        );
        await page.getByRole('button', { name: '重新作答' }).click();
        testedWrongAnswer = true;
      }
      await fillAnswers(page, quizAnswers);
      await page.getByRole('button', { name: '提交答案' }).click();
      await expect(page.getByText('本轮互动已完成')).toBeVisible();
    }

    const nextButton = page.getByRole('button', { name: /下一场景|完成案例/ });
    await expect(nextButton).toBeEnabled();
    const completesCase = (await nextButton.getAttribute('aria-label')) === '完成案例';
    await nextButton.click();
    if (completesCase) {
      await expect(page.getByText('案例学习完成')).toBeVisible();
      break;
    }
    await expect.poll(() => player.getAttribute('data-scene-id')).not.toBe(sceneId);
    await expect(player).toHaveAttribute('data-scene-id', /.+/);
  }
  await expect(page.getByRole('heading', { name: definition.title, level: 2 })).toBeVisible();
}

test('five complete cases unlock sequentially with server-authoritative gates', async ({
  browser,
  page,
}) => {
  const pageRequest = page.context().request;
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '按顺序完成案例' })).toBeVisible();
  await expect(page.locator('main ol > li')).toHaveCount(5);
  await expect(page.locator(`a[href="${casePath(cases[0].id)}"]`)).toBeVisible();
  await expect(page.locator(`a[href="${casePath(cases[1].id)}"]`)).toHaveCount(0);
  await page.screenshot({
    path: `${SCREENSHOT_DIRECTORY}/gate3-desktop-five-cases-initial.png`,
    fullPage: true,
  });

  for (const [caseIndex, definition] of cases.entries()) {
    if (caseIndex + 1 < cases.length) {
      expect((await pageRequest.get(casePath(cases[caseIndex + 1].id))).status()).toBe(404);
    }
    await page.locator(`a[href="${casePath(definition.id)}"]`).click();
    await expect(page).toHaveURL(casePath(definition.id));
    await page.screenshot({
      path: `${SCREENSHOT_DIRECTORY}/gate3-case-${caseIndex + 1}-first-scene.png`,
      fullPage: true,
    });

    if (caseIndex === 0) {
      const initialHtml = await (await pageRequest.get(casePath(definition.id))).text();
      expect(initialHtml).not.toContain('\\"answer\\":');
      expect(initialHtml).not.toContain('\\"hasAnswer\\":');
      expect(initialHtml).not.toContain('\\"commentPrompt\\":');
      expect(initialHtml).not.toContain('定位首先约束交付场景与价值主张');
    }

    await completeCase(page, definition);
    await page.goto('/');
    await expect(page.getByText(`${caseIndex + 1} / 5 已完成`)).toBeVisible();
    if (caseIndex + 1 < cases.length) {
      await expect(page.locator(`a[href="${casePath(cases[caseIndex + 1].id)}"]`)).toBeVisible();
    }

    if (caseIndex === 1) {
      await page.evaluate(() => window.localStorage.clear());
      await page.reload();
      await expect(page.getByText('2 / 5 已完成')).toBeVisible();
    }

    if (caseIndex === 2) {
      const secondDevice = await browser.newContext({ viewport: { width: 390, height: 844 } });
      if (process.env.JIUXUANGE_PREVIEW_BASE_URL) {
        await secondDevice.addCookies(await page.context().cookies());
      }
      const mobilePage = await secondDevice.newPage();
      await mobilePage.goto('/');
      await expect(mobilePage.getByText('3 / 5 已完成')).toBeVisible();
      await expect(mobilePage.locator(`a[href="${casePath(cases[3].id)}"]`)).toBeVisible();
      expect(
        await mobilePage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      await mobilePage.screenshot({
        path: `${SCREENSHOT_DIRECTORY}/gate3-mobile-cross-device-three-cases.png`,
        fullPage: true,
      });
      await mobilePage.locator(`a[href="${casePath(cases[3].id)}"]`).click();
      await expect(mobilePage).toHaveURL(casePath(cases[3].id));
      expect(
        await mobilePage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      await mobilePage.screenshot({
        path: `${SCREENSHOT_DIRECTORY}/gate3-mobile-case-4-player.png`,
        fullPage: true,
      });
      await secondDevice.close();
    }
  }

  await expect(page.getByText('5 / 5 已完成')).toBeVisible();
  await page.screenshot({
    path: `${SCREENSHOT_DIRECTORY}/gate3-desktop-five-cases-complete.png`,
    fullPage: true,
  });

  const progressResponse = await pageRequest.get('/api/jiuxuange/case-only/progress');
  expect(progressResponse.status()).toBe(200);
  const progressBody = await progressResponse.json();
  expect(progressBody.progress.cases).toHaveLength(5);
  expect(
    progressBody.progress.cases.every((item: { status: string }) => item.status === 'completed'),
  ).toBe(true);
  expect(
    (
      await pageRequest.get('/documentation/jiuxuange/case-only-v1/coach/CASE_ANSWER_KEY.md')
    ).status(),
  ).toBe(404);
});
