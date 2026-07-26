import type { NextRequest } from 'next/server';

export interface LearnerIdentity {
  learnerId: string;
  source: 'trusted_header' | 'development_fixture';
}

const SAFE_ID = /^[a-zA-Z0-9_-]{2,80}$/;

export function resolveLearnerIdentity(req: NextRequest): LearnerIdentity | null {
  if (process.env.JIUXUANGE_TRUST_IDENTITY_HEADERS === 'true') {
    const learnerId = req.headers.get('x-jiuxuange-learner-id')?.trim();
    if (learnerId && SAFE_ID.test(learnerId)) {
      return { learnerId, source: 'trusted_header' };
    }
  }

  const hostname = req.nextUrl.hostname;
  const isLoopback =
    hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
  const allowFixture =
    isLoopback && process.env.JIUXUANGE_ALLOW_DEMO_IDENTITY !== 'false';
  if (allowFixture) {
    const requestedFixture = req.headers.get('x-jiuxuange-demo-learner')?.trim();
    const learnerId =
      requestedFixture === 'demo-teammate' ? 'demo-teammate' : 'demo-learner';
    return { learnerId, source: 'development_fixture' };
  }
  return null;
}
