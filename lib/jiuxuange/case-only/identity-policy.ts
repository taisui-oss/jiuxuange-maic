import { isStableUserId } from './preview-identity';

export type CaseOnlyIdentityMode = 'fixed-candidate' | 'anonymous-preview';

export interface CaseOnlyActor {
  userId: string;
  identityMode: CaseOnlyIdentityMode;
}

export interface CaseOnlyIdentityEnvironment {
  [key: string]: string | undefined;
  JIUXUANGE_CASE_ONLY_IDENTITY_MODE?: string;
  JIUXUANGE_CASE_ONLY_ALLOW_FIXED_IDENTITY?: string;
  JIUXUANGE_CASE_ONLY_FIXED_USER_ID?: string;
  JIUXUANGE_CASE_ONLY_ALLOW_ANONYMOUS_PREVIEW?: string;
}

export class CaseOnlyIdentityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CaseOnlyIdentityError';
  }
}

export function resolveCaseOnlyActorFromContext(
  env: CaseOnlyIdentityEnvironment,
  previewUserId?: string | null,
): CaseOnlyActor {
  const mode = env.JIUXUANGE_CASE_ONLY_IDENTITY_MODE;

  if (mode === 'fixed-candidate') {
    if (env.JIUXUANGE_CASE_ONLY_ALLOW_FIXED_IDENTITY !== 'true') {
      throw new CaseOnlyIdentityError('Fixed candidate identity requires an explicit allow flag');
    }

    const userId = env.JIUXUANGE_CASE_ONLY_FIXED_USER_ID?.trim() ?? '';
    if (!isStableUserId(userId)) {
      throw new CaseOnlyIdentityError('Case-only fixed user_id must be a valid UUID');
    }
    return { userId, identityMode: mode };
  }

  if (mode === 'anonymous-preview') {
    if (env.JIUXUANGE_CASE_ONLY_ALLOW_ANONYMOUS_PREVIEW !== 'true') {
      throw new CaseOnlyIdentityError('Anonymous preview identity requires an explicit allow flag');
    }
    if (!isStableUserId(previewUserId)) {
      throw new CaseOnlyIdentityError('Anonymous preview user_id is missing or invalid');
    }
    return { userId: previewUserId, identityMode: mode };
  }

  throw new CaseOnlyIdentityError('Case-only trusted identity is not configured');
}
