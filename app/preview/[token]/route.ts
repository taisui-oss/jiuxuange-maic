import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import {
  PLAYER_SESSION_COOKIE,
  consumePlayerPreviewLink,
} from '@/lib/server/jiuxuange-player/session-repository';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const session = await consumePlayerPreviewLink((await params).token, randomUUID());
    const url = new URL(request.url);
    const response = NextResponse.redirect(
      new URL(`/player/${encodeURIComponent(session.packageId)}`, url.origin),
    );
    response.cookies.set({
      name: PLAYER_SESSION_COOKIE,
      value: session.sessionToken,
      httpOnly: true,
      secure: url.protocol === 'https:',
      sameSite: 'lax',
      path: '/',
      maxAge: Number(process.env.JIUXUANGE_PLAYER_SESSION_TTL_SECONDS ?? 8 * 60 * 60),
    });
    return response;
  } catch (error) {
    return new NextResponse(error instanceof Error ? error.message : 'Preview failed', {
      status: 401,
    });
  }
}
