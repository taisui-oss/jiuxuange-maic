import 'server-only';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface CaseOnlyActor {
  userId: string;
  identityMode: 'fixed-candidate';
}

export class CaseOnlyIdentityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CaseOnlyIdentityError';
  }
}

export function resolveCaseOnlyActor(): CaseOnlyActor {
  if (process.env.JIUXUANGE_CASE_ONLY_IDENTITY_MODE !== 'fixed-candidate') {
    throw new CaseOnlyIdentityError('Case-only trusted identity is not configured');
  }
  if (process.env.JIUXUANGE_CASE_ONLY_ALLOW_FIXED_IDENTITY !== 'true') {
    throw new CaseOnlyIdentityError('Fixed candidate identity requires an explicit allow flag');
  }

  const userId = process.env.JIUXUANGE_CASE_ONLY_FIXED_USER_ID?.trim() ?? '';
  if (!UUID_PATTERN.test(userId)) {
    throw new CaseOnlyIdentityError('Case-only fixed user_id must be a valid UUID');
  }

  return { userId, identityMode: 'fixed-candidate' };
}
