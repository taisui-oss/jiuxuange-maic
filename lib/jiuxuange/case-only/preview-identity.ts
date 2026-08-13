export const CASE_ONLY_PREVIEW_COOKIE = 'jiuxuange_case_preview_id';
export const CASE_ONLY_PREVIEW_HEADER = 'x-jiuxuange-preview-user-id';
export const CASE_ONLY_PREVIEW_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface PreviewIdentity {
  userId: string;
  shouldSetCookie: boolean;
}

export function isStableUserId(value: string | null | undefined): value is string {
  return UUID_PATTERN.test(value?.trim() ?? '');
}

export function resolvePreviewIdentity(
  existingCookie: string | null | undefined,
  createUserId: () => string = () => crypto.randomUUID(),
): PreviewIdentity {
  const existingUserId = existingCookie?.trim();
  if (isStableUserId(existingUserId)) {
    return { userId: existingUserId, shouldSetCookie: false };
  }

  const userId = createUserId();
  if (!isStableUserId(userId)) {
    throw new Error('Preview identity generator must return a valid UUID');
  }
  return { userId, shouldSetCookie: true };
}
