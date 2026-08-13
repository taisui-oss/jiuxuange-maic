import { describe, expect, it } from 'vitest';
import {
  decideCaseOnlyRoute,
  isCaseOnlyModeEnabled,
} from '@/lib/jiuxuange/case-only/route-policy';

describe('case-only route policy', () => {
  it('is opt-in and does not change the existing product by default', () => {
    expect(isCaseOnlyModeEnabled({})).toBe(false);
    expect(isCaseOnlyModeEnabled({ JIUXUANGE_CASE_ONLY: 'true' })).toBe(true);
  });

  it('converges learner entry points on the case-only site', () => {
    expect(decideCaseOnlyRoute('/')).toEqual({ kind: 'rewrite', pathname: '/case-only' });
    expect(decideCaseOnlyRoute('/courses/business-model')).toEqual({
      kind: 'rewrite',
      pathname: '/case-only',
    });
    expect(
      decideCaseOnlyRoute(
        '/courses/business-model/cases/breakfast-chain-six-elements-foundation',
      ),
    ).toEqual({ kind: 'allow' });
  });

  it('returns 404 for closed learner pages without deleting their source', () => {
    for (const pathname of [
      '/generation-preview',
      '/assessment/bm-assessment-mckess-v2',
      '/courses/business-model/projects/mckess',
      '/classroom/jxg-bm-case-convenience-bee-v1',
      '/eval/whiteboard',
    ]) {
      expect(decideCaseOnlyRoute(pathname)).toEqual({ kind: 'block', status: 404 });
    }
  });

  it('allows only case-only, access and health APIs', () => {
    expect(decideCaseOnlyRoute('/api/jiuxuange/case-only/progress')).toEqual({ kind: 'allow' });
    expect(decideCaseOnlyRoute('/api/health')).toEqual({ kind: 'allow' });
    expect(decideCaseOnlyRoute('/api/access-code/status')).toEqual({ kind: 'allow' });
    for (const pathname of [
      '/api/chat',
      '/api/classroom',
      '/api/generate-classroom',
      '/api/jiuxuange/assessment/bm-assessment-mckess-v2',
      '/api/pbl/v2/instructor',
    ]) {
      expect(decideCaseOnlyRoute(pathname)).toEqual({ kind: 'block', status: 403 });
    }
  });
});
