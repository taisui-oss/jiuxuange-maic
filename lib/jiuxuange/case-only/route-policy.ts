export type CaseOnlyRouteDecision =
  | { kind: 'allow' }
  | { kind: 'rewrite'; pathname: string }
  | { kind: 'block'; status: 403 | 404 };

const ALLOWED_API_PREFIXES = [
  '/api/access-code/',
  '/api/health',
  '/api/jiuxuange/case-only',
] as const;

function isAllowedApi(pathname: string): boolean {
  return ALLOWED_API_PREFIXES.some(
    (prefix) =>
      pathname === prefix || pathname.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`),
  );
}

export function isCaseOnlyModeEnabled(env?: { JIUXUANGE_CASE_ONLY?: string }): boolean {
  const source = env ?? (process.env as unknown as { JIUXUANGE_CASE_ONLY?: string });
  return source.JIUXUANGE_CASE_ONLY === 'true';
}

export function decideCaseOnlyRoute(pathname: string): CaseOnlyRouteDecision {
  if (pathname.startsWith('/api/')) {
    return isAllowedApi(pathname) ? { kind: 'allow' } : { kind: 'block', status: 403 };
  }

  if (pathname === '/' || pathname === '/courses/business-model') {
    return { kind: 'rewrite', pathname: '/case-only' };
  }

  if (pathname === '/case-only' || pathname.startsWith('/courses/business-model/cases/')) {
    return { kind: 'allow' };
  }

  return { kind: 'block', status: 404 };
}
