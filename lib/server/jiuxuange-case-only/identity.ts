import 'server-only';

import { headers } from 'next/headers';
import {
  CaseOnlyIdentityError,
  resolveCaseOnlyActorFromContext,
  type CaseOnlyActor,
} from '@/lib/jiuxuange/case-only/identity-policy';
import { CASE_ONLY_PREVIEW_HEADER } from '@/lib/jiuxuange/case-only/preview-identity';

export { CaseOnlyIdentityError };
export type { CaseOnlyActor };

export async function resolveCaseOnlyActor(): Promise<CaseOnlyActor> {
  const anonymousPreview =
    process.env.JIUXUANGE_CASE_ONLY_IDENTITY_MODE === 'anonymous-preview' ||
    process.env.JIUXUANGE_PLAYER_IDENTITY_MODE === 'anonymous-preview';
  const previewUserId =
    anonymousPreview ? (await headers()).get(CASE_ONLY_PREVIEW_HEADER) : null;
  const identityEnv = anonymousPreview
    ? {
        ...process.env,
        JIUXUANGE_CASE_ONLY_IDENTITY_MODE: 'anonymous-preview',
        JIUXUANGE_CASE_ONLY_ALLOW_ANONYMOUS_PREVIEW: 'true',
      }
    : process.env;
  return resolveCaseOnlyActorFromContext(identityEnv, previewUserId);
}
