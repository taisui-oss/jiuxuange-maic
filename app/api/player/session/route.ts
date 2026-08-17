import { NextResponse } from 'next/server';
import { resolvePlayerActor } from '@/lib/server/jiuxuange-player/identity';

export async function GET() {
  const actor = await resolvePlayerActor();
  return NextResponse.json({ success: true, actor });
}
