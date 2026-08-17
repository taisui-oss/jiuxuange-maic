import { NextRequest, NextResponse } from 'next/server';
import { POST as openMaicTts } from '@/app/api/generate/tts/route';
import { resolvePlayerActor } from '@/lib/server/jiuxuange-player/identity';
import { readPlayerPackage } from '@/lib/server/jiuxuange-player/package-repository';
import { getAccessiblePlayerContent } from '@/lib/server/jiuxuange-player/access';

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const packageId = request.headers.get('X-Player-Package-Id')?.trim();
  if (!packageId) {
    return NextResponse.json({ success: false, error: 'Player package is required' }, { status: 400 });
  }
  const actor = await resolvePlayerActor();
  const [access, loaded] = await Promise.all([
    getAccessiblePlayerContent(actor, packageId),
    readPlayerPackage(packageId),
  ]);
  if (!access || !loaded) {
    return new NextResponse(null, { status: 404 });
  }
  const providerId = process.env.JIUXUANGE_PLAYER_TTS_PROVIDER?.trim();
  const voice = process.env.JIUXUANGE_PLAYER_TTS_VOICE?.trim();
  if (!providerId || !voice) {
    return NextResponse.json(
      { success: false, errorCode: 'PROVIDER_UNAVAILABLE', error: 'Player TTS is not configured' },
      { status: 503 },
    );
  }
  const body = (await request.json()) as Record<string, unknown>;
  const sanitized = {
    ...body,
    ttsProviderId: providerId,
    ttsVoice: voice,
    ttsModelId: process.env.JIUXUANGE_PLAYER_TTS_MODEL,
    ttsApiKey: undefined,
    ttsBaseUrl: undefined,
  };
  return openMaicTts(
    new NextRequest(request.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sanitized),
      signal: request.signal,
    }),
  );
}
