export type PlayerRouteDecision =
  | { kind: 'allow' }
  | { kind: 'rewrite'; pathname: string }
  | { kind: 'block'; status: 403 | 404 };

const ALLOWED_PLAYER_API_PREFIXES = [
  '/api/health',
  '/api/player',
  '/api/admin/player-preview-links',
] as const;

export function isPlayerModeEnabled(env?: { JIUXUANGE_PLAYER?: string }): boolean {
  const source = env ?? (process.env as unknown as { JIUXUANGE_PLAYER?: string });
  return source.JIUXUANGE_PLAYER === 'true';
}

export function decidePlayerRoute(pathname: string): PlayerRouteDecision {
  if (pathname.startsWith('/api/')) {
    const allowed = ALLOWED_PLAYER_API_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );
    return allowed ? { kind: 'allow' } : { kind: 'block', status: 403 };
  }

  if (pathname === '/') {
    return { kind: 'rewrite', pathname: '/player' };
  }

  if (
    pathname === '/player' ||
    pathname.startsWith('/player/') ||
    pathname === '/launch' ||
    pathname.startsWith('/preview/')
  ) {
    return { kind: 'allow' };
  }

  return { kind: 'block', status: 404 };
}
