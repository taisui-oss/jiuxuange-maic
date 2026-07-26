import { mkdtemp, rm } from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getPortal } from '@/app/api/jiuxuange/portal/route';
import { POST as startAssessment } from '@/app/api/jiuxuange/assessment/[assignmentId]/route';
import { POST as updateAssessment } from '@/app/api/jiuxuange/assessment/session/[sessionId]/route';
import { readPortalState, writePortalState } from '@/lib/server/jiuxuange/repository';

const originalDataDir = process.env.JIUXUANGE_PORTAL_DATA_DIR;
const originalTrustHeaders = process.env.JIUXUANGE_TRUST_IDENTITY_HEADERS;
let dataDir = '';

function request(
  url: string,
  learnerId: string,
  init?: { method?: string; body?: BodyInit | null },
) {
  return new NextRequest(url, {
    ...init,
    headers: {
      'x-jiuxuange-learner-id': learnerId,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
}

describe('Jiuxuange dual-entry APIs', () => {
  beforeEach(async () => {
    dataDir = await mkdtemp(path.join(os.tmpdir(), 'jiuxuange-portal-'));
    process.env.JIUXUANGE_PORTAL_DATA_DIR = dataDir;
    process.env.JIUXUANGE_TRUST_IDENTITY_HEADERS = 'true';
  });

  afterEach(async () => {
    await rm(dataDir, { recursive: true, force: true });
    if (originalDataDir === undefined) delete process.env.JIUXUANGE_PORTAL_DATA_DIR;
    else process.env.JIUXUANGE_PORTAL_DATA_DIR = originalDataDir;
    if (originalTrustHeaders === undefined) delete process.env.JIUXUANGE_TRUST_IDENTITY_HEADERS;
    else process.env.JIUXUANGE_TRUST_IDENTITY_HEADERS = originalTrustHeaders;
  });

  it('returns only the authenticated learner portal', async () => {
    const response = await getPortal(
      request('http://localhost/api/jiuxuange/portal', 'demo-learner'),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.portal.learnerId).toBe('demo-learner');
    expect(body.portal.courses).toHaveLength(1);
    expect(body.portal.assessments).toHaveLength(1);
  });

  it('allows the demo identity only on loopback requests', async () => {
    delete process.env.JIUXUANGE_TRUST_IDENTITY_HEADERS;
    const localResponse = await getPortal(
      new NextRequest('http://127.0.0.1/api/jiuxuange/portal'),
    );
    const remoteResponse = await getPortal(
      new NextRequest('https://learning.example.com/api/jiuxuange/portal'),
    );

    expect(localResponse.status).toBe(200);
    expect(remoteResponse.status).toBe(401);
  });

  it('keeps two group members on the same frozen assignment but separate sessions', async () => {
    const context = { params: Promise.resolve({ assignmentId: 'bm-assessment-v1' }) };
    const firstResponse = await startAssessment(
      request(
        'http://localhost/api/jiuxuange/assessment/bm-assessment-v1',
        'demo-learner',
        { method: 'POST' },
      ),
      context,
    );
    const first = await firstResponse.json();

    const secondResponse = await startAssessment(
      request(
        'http://localhost/api/jiuxuange/assessment/bm-assessment-v1',
        'demo-teammate',
        { method: 'POST' },
      ),
      context,
    );
    const second = await secondResponse.json();

    expect(first.detail.session.id).not.toBe(second.detail.session.id);
    expect(first.detail.session.projectCardVersionId).toBe(
      second.detail.session.projectCardVersionId,
    );
    expect(first.detail.session.questions).toEqual(second.detail.session.questions);

    await updateAssessment(
      request(
        `http://localhost/api/jiuxuange/assessment/session/${first.detail.session.id}`,
        'demo-learner',
        {
          method: 'POST',
          body: JSON.stringify({
            action: 'save_draft',
            answers: { 'positioning-1': '这是第一名学员的私人判断草稿。' },
          }),
        },
      ),
      { params: Promise.resolve({ sessionId: first.detail.session.id }) },
    );

    const teammateResume = await startAssessment(
      request(
        'http://localhost/api/jiuxuange/assessment/bm-assessment-v1',
        'demo-teammate',
        { method: 'POST' },
      ),
      context,
    );
    const teammateBody = await teammateResume.json();
    expect(teammateBody.detail.session.draftAnswers).toEqual({});
  });

  it('does not expose a draft assignment by guessed URL', async () => {
    const state = await readPortalState();
    state.assessmentAssignments[0].status = 'draft';
    await writePortalState(state);

    const response = await startAssessment(
      request(
        'http://localhost/api/jiuxuange/assessment/bm-assessment-v1',
        'demo-learner',
        { method: 'POST' },
      ),
      { params: Promise.resolve({ assignmentId: 'bm-assessment-v1' }) },
    );
    expect(response.status).toBe(409);
  });
});
