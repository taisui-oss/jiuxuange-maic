import { NextRequest, NextResponse } from 'next/server';
import { decideCaseOnlyRoute, isCaseOnlyModeEnabled } from '@/lib/jiuxuange/case-only/route-policy';
import {
  CASE_ONLY_PREVIEW_COOKIE,
  CASE_ONLY_PREVIEW_COOKIE_MAX_AGE,
  CASE_ONLY_PREVIEW_HEADER,
  resolvePreviewIdentity,
} from '@/lib/jiuxuange/case-only/preview-identity';
import { decidePlayerRoute, isPlayerModeEnabled } from '@/lib/jiuxuange/player/route-policy';

interface CaseOnlyRequestContext {
  requestHeaders: Headers;
  previewUserIdToPersist?: string;
}

function prepareCaseOnlyRequest(request: NextRequest): CaseOnlyRequestContext {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(CASE_ONLY_PREVIEW_HEADER);

  const caseOnlyPreview =
    process.env.JIUXUANGE_CASE_ONLY_IDENTITY_MODE === 'anonymous-preview' &&
    process.env.JIUXUANGE_CASE_ONLY_ALLOW_ANONYMOUS_PREVIEW === 'true';
  const playerPreview =
    process.env.JIUXUANGE_PLAYER_IDENTITY_MODE === 'anonymous-preview' &&
    process.env.JIUXUANGE_PLAYER_ALLOW_ANONYMOUS_PREVIEW === 'true';
  if (!caseOnlyPreview && !playerPreview) {
    return { requestHeaders };
  }

  const identity = resolvePreviewIdentity(request.cookies.get(CASE_ONLY_PREVIEW_COOKIE)?.value);
  requestHeaders.set(CASE_ONLY_PREVIEW_HEADER, identity.userId);
  return {
    requestHeaders,
    previewUserIdToPersist: identity.shouldSetCookie ? identity.userId : undefined,
  };
}

function attachCaseOnlyPreviewCookie(
  response: NextResponse,
  request: NextRequest,
  context: CaseOnlyRequestContext | null,
): NextResponse {
  if (!context?.previewUserIdToPersist) return response;
  response.cookies.set({
    name: CASE_ONLY_PREVIEW_COOKIE,
    value: context.previewUserIdToPersist,
    httpOnly: true,
    sameSite: 'lax',
    secure: request.nextUrl.protocol === 'https:',
    path: '/',
    maxAge: CASE_ONLY_PREVIEW_COOKIE_MAX_AGE,
  });
  return response;
}

function continueRequest(
  request: NextRequest,
  context: CaseOnlyRequestContext | null,
): NextResponse {
  const response = context
    ? NextResponse.next({ request: { headers: context.requestHeaders } })
    : NextResponse.next();
  return attachCaseOnlyPreviewCookie(response, request, context);
}

/** Convert string to Uint8Array */
function encode(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/** Convert ArrayBuffer to hex string */
function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Verify an HMAC-signed token using Web Crypto API (Edge-compatible) */
async function verifyToken(token: string, accessCode: string): Promise<boolean> {
  const dotIndex = token.indexOf('.');
  if (dotIndex === -1) return false;

  const timestamp = token.substring(0, dotIndex);
  const signature = token.substring(dotIndex + 1);

  const keyData = encode(accessCode);
  const key = await crypto.subtle.importKey(
    'raw',
    keyData.buffer as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const data = encode(timestamp);
  const expected = bufToHex(await crypto.subtle.sign('HMAC', key, data.buffer as ArrayBuffer));

  // Constant-length comparison (not truly constant-time in JS, but sufficient here)
  if (signature.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < signature.length; i++) {
    mismatch |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function middleware(request: NextRequest) {
  let caseOnlyContext: CaseOnlyRequestContext | null = null;

  if (isPlayerModeEnabled()) {
    const decision = decidePlayerRoute(request.nextUrl.pathname);
    if (decision.kind === 'block') {
      return new NextResponse(null, {
        status: decision.status,
        headers: { 'x-jiuxuange-player': 'blocked' },
      });
    }
    caseOnlyContext = prepareCaseOnlyRequest(request);
    if (decision.kind === 'rewrite') {
      const rewrittenUrl = request.nextUrl.clone();
      rewrittenUrl.pathname = decision.pathname;
      const response = NextResponse.rewrite(rewrittenUrl, {
        request: { headers: caseOnlyContext.requestHeaders },
      });
      response.headers.set('x-jiuxuange-player', 'active');
      return attachCaseOnlyPreviewCookie(response, request, caseOnlyContext);
    }
    return continueRequest(request, caseOnlyContext);
  }

  if (isCaseOnlyModeEnabled()) {
    const decision = decideCaseOnlyRoute(request.nextUrl.pathname);
    if (decision.kind === 'block') {
      return new NextResponse(null, {
        status: decision.status,
        headers: { 'x-jiuxuange-case-only': 'blocked' },
      });
    }

    caseOnlyContext = prepareCaseOnlyRequest(request);
    if (decision.kind === 'rewrite') {
      const rewrittenUrl = request.nextUrl.clone();
      rewrittenUrl.pathname = decision.pathname;
      const response = NextResponse.rewrite(rewrittenUrl, {
        request: { headers: caseOnlyContext.requestHeaders },
      });
      response.headers.set('x-jiuxuange-case-only', 'active');
      return attachCaseOnlyPreviewCookie(response, request, caseOnlyContext);
    }
  }

  const accessCode = process.env.ACCESS_CODE;
  if (!accessCode) {
    return continueRequest(request, caseOnlyContext);
  }

  const { pathname } = request.nextUrl;

  // Whitelist: access-code endpoints, health check
  if (pathname.startsWith('/api/access-code/') || pathname === '/api/health') {
    return continueRequest(request, caseOnlyContext);
  }

  // Check cookie — validate HMAC signature, not just existence
  const cookie = request.cookies.get('openmaic_access');
  if (cookie?.value && (await verifyToken(cookie.value, accessCode))) {
    return continueRequest(request, caseOnlyContext);
  }

  // API requests without valid cookie → 401
  if (pathname.startsWith('/api/')) {
    const response = NextResponse.json(
      { success: false, errorCode: 'INVALID_REQUEST', error: 'Access code required' },
      { status: 401 },
    );
    return attachCaseOnlyPreviewCookie(response, request, caseOnlyContext);
  }

  // Page requests → let through, frontend shows modal
  return continueRequest(request, caseOnlyContext);
}

export const config = {
  // Skip HMAC verification for static assets (images, fonts, media, etc.) —
  // the check only matters for pages and API routes.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logos/|.*\\.(?:png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|otf|mp4|webm|mp3|wav|pdf)$).*)',
  ],
};
