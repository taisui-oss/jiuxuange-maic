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
  const previewUserId =
    process.env.JIUXUANGE_CASE_ONLY_IDENTITY_MODE === 'anonymous-preview'
      ? (await headers()).get(CASE_ONLY_PREVIEW_HEADER)
      : null;
  return resolveCaseOnlyActorFromContext(process.env, previewUserId);
}
