import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';

import { POST } from '@/app/api/pbl/v2/task/update/route';
import { BUSINESS_MODEL_LEARNING_LOOP_PACKAGE } from '@/lib/c-cubic/course-package/business-model-v5';
import { createJiuxuangeProject } from '@/lib/c-cubic/project-factory';
import { setPendingTaskCompletion } from '@/lib/pbl/v2/operations/task-completion';

describe('V5 learning-loop task progression', () => {
  it('crosses a milestone without an evaluator or a second handover click', async () => {
    const project = createJiuxuangeProject(BUSINESS_MODEL_LEARNING_LOOP_PACKAGE, {
      now: '2026-07-20T16:00:00.000Z',
      learnerId: 'learner-v5-progress',
      sessionVariantId: 'business-model-learning-loop',
    });
    const baselineMilestone = project.milestones[0];
    const baselineTask = baselineMilestone.microtasks[0];
    setPendingTaskCompletion(project, {
      microtaskId: baselineTask.id,
      milestoneId: baselineMilestone.id,
      reason: 'jiuxuange_assisted_learning_loop',
      assessment: { resolution: 'fixture' },
    });

    const request = new NextRequest('http://localhost/api/pbl/v2/task/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project, action: 'complete_pending_task' }),
    });
    const response = await POST(request);
    const json = (await response.json()) as {
      project: typeof project;
      milestoneCompleted: boolean;
      activatedMicrotaskId?: string;
      evaluationSkipped?: boolean;
      autoAdvanced?: boolean;
    };

    expect(response.status).toBe(200);
    expect(json.milestoneCompleted).toBe(true);
    expect(json.evaluationSkipped).toBe(true);
    expect(json.autoAdvanced).toBe(true);
    expect(json.project.pendingHandover?.consumed).toBe(true);
    expect(json.project.milestones[1]).toMatchObject({ status: 'active' });
    expect(json.activatedMicrotaskId).toBe(
      json.project.milestones[1].microtasks[0].id,
    );
  });
});
