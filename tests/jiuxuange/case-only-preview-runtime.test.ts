import { describe, expect, it } from 'vitest';
import {
  CaseOnlyIdentityError,
  resolveCaseOnlyActorFromContext,
} from '@/lib/jiuxuange/case-only/identity-policy';
import {
  CASE_ONLY_PREVIEW_COOKIE,
  CASE_ONLY_PREVIEW_HEADER,
  resolvePreviewIdentity,
} from '@/lib/jiuxuange/case-only/preview-identity';
import { JIUXUANGE_CASE_ONLY_RELEASE } from '@/lib/jiuxuange/case-only/release';
import { resolveCaseOnlyDatabaseUrl } from '@/lib/server/jiuxuange-case-only/db/client';

const FIXED_USER_ID = '10000000-0000-4000-8000-000000000010';
const PREVIEW_USER_ID = '20000000-0000-4000-8000-000000000020';

describe('case-only preview runtime', () => {
  it('publishes a product release without changing the upstream package version', () => {
    expect(JIUXUANGE_CASE_ONLY_RELEASE).toMatchObject({
      version: '6.1.0-rc.1',
      channel: 'preview-candidate',
      usage: 'preview-only',
    });
  });

  it('keeps a valid preview user id and replaces an invalid cookie', () => {
    expect(CASE_ONLY_PREVIEW_COOKIE).toBe('jiuxuange_case_preview_id');
    expect(CASE_ONLY_PREVIEW_HEADER).toBe('x-jiuxuange-preview-user-id');
    expect(resolvePreviewIdentity(PREVIEW_USER_ID, () => FIXED_USER_ID)).toEqual({
      userId: PREVIEW_USER_ID,
      shouldSetCookie: false,
    });
    expect(resolvePreviewIdentity('not-a-uuid', () => FIXED_USER_ID)).toEqual({
      userId: FIXED_USER_ID,
      shouldSetCookie: true,
    });
  });

  it('requires explicit permission for both candidate and preview identity modes', () => {
    expect(() =>
      resolveCaseOnlyActorFromContext(
        {
          JIUXUANGE_CASE_ONLY_IDENTITY_MODE: 'fixed-candidate',
          JIUXUANGE_CASE_ONLY_ALLOW_FIXED_IDENTITY: 'true',
          JIUXUANGE_CASE_ONLY_FIXED_USER_ID: FIXED_USER_ID,
        },
        null,
      ),
    ).not.toThrow();

    expect(() =>
      resolveCaseOnlyActorFromContext(
        {
          JIUXUANGE_CASE_ONLY_IDENTITY_MODE: 'anonymous-preview',
          JIUXUANGE_CASE_ONLY_ALLOW_ANONYMOUS_PREVIEW: 'true',
        },
        PREVIEW_USER_ID,
      ),
    ).not.toThrow();

    expect(() =>
      resolveCaseOnlyActorFromContext(
        { JIUXUANGE_CASE_ONLY_IDENTITY_MODE: 'anonymous-preview' },
        PREVIEW_USER_ID,
      ),
    ).toThrow(CaseOnlyIdentityError);
  });

  it('uses the project database override before the managed Netlify connection', () => {
    expect(
      resolveCaseOnlyDatabaseUrl({
        JIUXUANGE_DATABASE_URL: 'postgresql://project-override',
        NETLIFY_DB_URL: 'postgresql://managed-netlify',
      }),
    ).toBe('postgresql://project-override');
    expect(resolveCaseOnlyDatabaseUrl({ NETLIFY_DB_URL: 'postgresql://managed-netlify' })).toBe(
      'postgresql://managed-netlify',
    );
    expect(() => resolveCaseOnlyDatabaseUrl({})).toThrow(/NETLIFY_DB_URL/);
  });
});
