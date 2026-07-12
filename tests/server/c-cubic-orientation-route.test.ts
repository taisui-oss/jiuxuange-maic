import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/server/resolve-model', () => ({
  resolveModelFromRequest: vi.fn(async () => {
    throw new Error('model unavailable');
  }),
}));

import { POST } from '@/app/api/c-cubic/orientation/route';

describe('POST /api/c-cubic/orientation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects an empty learner problem', async () => {
    const response = await POST(
      new NextRequest('http://localhost/api/c-cubic/orientation', {
        method: 'POST',
        body: JSON.stringify({ message: ' ' }),
      }),
    );
    expect(response.status).toBe(400);
  });

  it('returns one deterministic professor question when the model is unavailable', async () => {
    const response = await POST(
      new NextRequest('http://localhost/api/c-cubic/orientation', {
        method: 'POST',
        body: JSON.stringify({ message: '加盟店增长很快，但续约率持续下降。' }),
      }),
    );
    const body = (await response.json()) as { question: string; recommendedCourseId: string };

    expect(response.status).toBe(200);
    expect(body.question).toBe('你现在最想通过这次学习解决哪个具体判断？');
    expect(body.question.match(/[？?]/g)).toHaveLength(1);
    expect(body.recommendedCourseId).toBe('business-model');
  });
});
