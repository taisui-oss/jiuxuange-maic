import { describe, expect, it } from 'vitest';

import { BUSINESS_MODEL_SIX_LEVEL_PACKAGE } from '@/lib/c-cubic/course-package/business-model-v3';
import { deriveJiuxuangeJourneyProgress } from '@/lib/c-cubic/journey-progress';
import { createJiuxuangeProject } from '@/lib/c-cubic/project-factory';

describe('Jiuxuange six-level journey progress', () => {
  it('derives a prelude state without creating a second progress store', () => {
    const project = createJiuxuangeProject(BUSINESS_MODEL_SIX_LEVEL_PACKAGE, {
      now: '2026-07-20T00:00:00.000Z',
    });

    const progress = deriveJiuxuangeJourneyProgress(project, BUSINESS_MODEL_SIX_LEVEL_PACKAGE);

    expect(progress.phase).toBe('prelude');
    expect(progress.levels.map((level) => level.status)).toEqual([
      'locked',
      'locked',
      'locked',
      'locked',
      'locked',
      'locked',
    ]);
    expect(project).not.toHaveProperty('journeyProgress');
  });

  it('keeps a level current until its calibration case is complete', () => {
    const project = createJiuxuangeProject(BUSINESS_MODEL_SIX_LEVEL_PACKAGE, {
      now: '2026-07-20T00:00:00.000Z',
    });
    for (const milestone of project.milestones) {
      if (milestone.id === 'jgx-milestone-key-resources-capabilities') {
        milestone.status = 'completed';
        milestone.microtasks.forEach((task) => {
          task.status = 'completed';
        });
      } else if (milestone.id === 'jgx-milestone-case-convenience-bee') {
        milestone.status = 'active';
        milestone.microtasks[0]!.status = 'in_progress';
      } else if (milestone.order < 4) {
        milestone.status = 'completed';
        milestone.microtasks.forEach((task) => {
          task.status = 'completed';
        });
      }
    }

    const progress = deriveJiuxuangeJourneyProgress(project, BUSINESS_MODEL_SIX_LEVEL_PACKAGE);

    expect(progress.phase).toBe('levels');
    expect(progress.currentLevel?.id).toBe('key-resources-capabilities');
    expect(progress.levels[2]).toMatchObject({ status: 'current' });
    expect(progress.levels[3]).toMatchObject({ status: 'locked' });
  });

  it('reports postlude only after all six visible levels are complete', () => {
    const project = createJiuxuangeProject(BUSINESS_MODEL_SIX_LEVEL_PACKAGE, {
      now: '2026-07-20T00:00:00.000Z',
    });
    const postludeIds = new Set(
      BUSINESS_MODEL_SIX_LEVEL_PACKAGE.journey?.postludeModuleIds.map(
        (id) => `jgx-milestone-${id}`,
      ),
    );
    for (const milestone of project.milestones) {
      milestone.status = postludeIds.has(milestone.id) ? 'locked' : 'completed';
      milestone.microtasks.forEach((task) => {
        task.status = milestone.status === 'completed' ? 'completed' : 'todo';
      });
    }
    const firstPostlude = project.milestones.find((milestone) => postludeIds.has(milestone.id));
    firstPostlude!.status = 'active';
    firstPostlude!.microtasks[0]!.status = 'in_progress';

    const progress = deriveJiuxuangeJourneyProgress(project, BUSINESS_MODEL_SIX_LEVEL_PACKAGE);

    expect(progress.phase).toBe('postlude');
    expect(progress.currentLevel).toBeUndefined();
    expect(progress.levels.every((level) => level.status === 'completed')).toBe(true);
  });
});
