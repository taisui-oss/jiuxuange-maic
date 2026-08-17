import { NextResponse } from 'next/server';
import {
  PLAYER_SESSION_COOKIE,
  consumePlayerLaunchTicket,
} from '@/lib/server/jiuxuange-player/session-repository';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ticket = url.searchParams.get('ticket')?.trim();
  if (!ticket) return new NextResponse('Launch ticket is required', { status: 400 });
  try {
    const session = await consumePlayerLaunchTicket(ticket);
    const target = new URL(`/player/${encodeURIComponent(session.packageId)}`, url.origin);
    const response = NextResponse.redirect(target);
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
    return new NextResponse(error instanceof Error ? error.message : 'Launch failed', {
      status: 401,
    });
  }
}
