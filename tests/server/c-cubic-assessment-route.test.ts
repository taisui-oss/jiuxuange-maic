import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/server/resolve-model', () => ({
  resolveModelFromRequest: vi.fn(async () => {
    throw new Error('model unavailable');
  }),
}));

import { POST } from '@/app/api/c-cubic/assessment/route';

describe('POST /api/c-cubic/assessment', () => {
  beforeEach(() => vi.clearAllMocks());

  it('requires all six original answers', async () => {
    const response = await POST(
      new NextRequest('http://localhost/api/c-cubic/assessment', {
        method: 'POST',
        body: JSON.stringify({ answers: [{ questionId: 'one', rawAnswer: 'answer' }] }),
      }),
    );
    expect(response.status).toBe(400);
  });

  it('returns a non-numeric fallback report when the model is unavailable', async () => {
    const answers = Array.from({ length: 6 }, (_, index) => ({
      questionId: `question-${index}`,
      rawAnswer: `这是第${index}题的完整事实与推理回答。`,
    }));
    const response = await POST(
      new NextRequest('http://localhost/api/c-cubic/assessment', {
        method: 'POST',
        body: JSON.stringify({ answers }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(Object.values(body.feedback.observations)).toHaveLength(5);
    expect(body.feedback.nextStep).toEqual(expect.any(String));
    expect(body.feedback).not.toHaveProperty('score');
  });
});
