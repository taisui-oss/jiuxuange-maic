import { NextRequest, NextResponse } from 'next/server';
import type { StatelessChatRequest } from '@/lib/types/chat';
import { POST as openMaicChat } from '@/app/api/chat/route';
import { canAccessPlayerPackage, resolvePlayerActor } from '@/lib/server/jiuxuange-player/identity';
import { readPlayerPackage } from '@/lib/server/jiuxuange-player/package-repository';
import { buildPlayerChatRequest } from '@/lib/server/jiuxuange-player/chat-policy';
import { startPlayerAiRun, updatePlayerAiRun } from '@/lib/server/jiuxuange-player/ai-audit';
import {
  acquirePlayerAiSlot,
  playerChatInputChars,
  resolvePlayerAiLimits,
} from '@/lib/server/jiuxuange-player/ai-policy';

export const maxDuration = 60;

function forwardedRequest(request: NextRequest, body: StatelessChatRequest): NextRequest {
  return new NextRequest(request.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: request.signal,
  });
}

function withAudit(
  response: Response,
  runId: string,
  traceId: string,
  onSettled: () => void,
): Response {
  if (!response.body) {
    void updatePlayerAiRun(runId, {
      status: response.ok ? 'succeeded' : 'failed',
      errorCode: response.ok ? undefined : `HTTP_${response.status}`,
    }).finally(onSettled);
    return response;
  }
  const decoder = new TextDecoder();
  let sawErrorEvent = false;
  const stream = response.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        if (decoder.decode(chunk, { stream: true }).includes('"type":"error"')) {
          sawErrorEvent = true;
        }
        controller.enqueue(chunk);
      },
      flush() {
        void updatePlayerAiRun(runId, {
          status: sawErrorEvent ? 'failed' : 'succeeded',
          errorCode: sawErrorEvent ? 'SSE_ERROR' : undefined,
        }).finally(onSettled);
      },
    }),
  );
  const headers = new Headers(response.headers);
  headers.set('X-Player-Trace-Id', traceId);
  return new Response(stream, { status: response.status, headers });
}

export async function POST(request: NextRequest) {
  const packageId = request.headers.get('X-Player-Package-Id')?.trim();
  if (!packageId) {
    return NextResponse.json(
      { success: false, errorCode: 'INVALID_REQUEST', error: 'Player package is required' },
      { status: 400 },
    );
  }
  const actor = await resolvePlayerActor();
  if (!canAccessPlayerPackage(actor, packageId)) return new NextResponse(null, { status: 404 });
  const loaded = await readPlayerPackage(packageId);
  if (!loaded) return new NextResponse(null, { status: 404 });

  const body = (await request.json()) as StatelessChatRequest;
  const limits = resolvePlayerAiLimits();
  const inputChars = playerChatInputChars(body);
  if (inputChars > limits.maxInputChars) {
    return NextResponse.json(
      {
        success: false,
        errorCode: 'INPUT_LIMIT_EXCEEDED',
        error: 'Player chat input exceeds the configured limit',
      },
      { status: 413 },
    );
  }
  const primaryModel = process.env.JIUXUANGE_PLAYER_PRIMARY_MODEL?.trim();
  const fallbackModel = process.env.JIUXUANGE_PLAYER_FALLBACK_MODEL?.trim();
  if (!primaryModel) {
    return NextResponse.json(
      { success: false, errorCode: 'PROVIDER_UNAVAILABLE', error: 'Player AI is not configured' },
      { status: 503 },
    );
  }
  let sanitized: StatelessChatRequest;
  try {
    sanitized = buildPlayerChatRequest(body, loaded, primaryModel, limits.maxOutputTokens);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        errorCode: 'INVALID_REQUEST',
        error: error instanceof Error ? error.message : 'Invalid player Agent',
      },
      { status: 400 },
    );
  }

  const releaseSlot = acquirePlayerAiSlot(actor.userId, limits.maxConcurrentPerUser);
  if (!releaseSlot) {
    return NextResponse.json(
      {
        success: false,
        errorCode: 'AI_CONCURRENCY_LIMIT',
        error: 'Another Player Agent request is still running',
      },
      { status: 429 },
    );
  }
  let settled = false;
  const settle = () => {
    if (settled) return;
    settled = true;
    releaseSlot();
  };
  request.signal.addEventListener('abort', settle, { once: true });

  const traceId = crypto.randomUUID();
  try {
    const runId = await startPlayerAiRun({
      userId: actor.userId,
      packageId,
      traceId,
      primaryModel,
      promptVersion: loaded.manifest.contentVersion,
      inputChars,
      maxOutputTokens: limits.maxOutputTokens,
    });
    let response = await openMaicChat(forwardedRequest(request, sanitized));
    if (!response.ok && fallbackModel && fallbackModel !== primaryModel) {
      const fallbackRequest = buildPlayerChatRequest(
        body,
        loaded,
        fallbackModel,
        limits.maxOutputTokens,
      );
      response = await openMaicChat(forwardedRequest(request, fallbackRequest));
      await updatePlayerAiRun(runId, {
        selectedModel: fallbackModel,
        fallbackUsed: true,
      });
    }
    return withAudit(response, runId, traceId, settle);
  } catch (error) {
    settle();
    throw error;
  }
}
