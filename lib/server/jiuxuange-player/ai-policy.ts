import type { StatelessChatRequest } from '@/lib/types/chat';

export interface PlayerAiLimits {
  maxInputChars: number;
  maxOutputTokens: number;
  maxConcurrentPerUser: number;
}

function boundedInteger(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

export function resolvePlayerAiLimits(
  env: Record<string, string | undefined> = process.env,
): PlayerAiLimits {
  return {
    maxInputChars: boundedInteger(env.JIUXUANGE_PLAYER_MAX_INPUT_CHARS, 24_000, 1_000, 200_000),
    maxOutputTokens: boundedInteger(env.JIUXUANGE_PLAYER_MAX_OUTPUT_TOKENS, 1_200, 64, 8_192),
    maxConcurrentPerUser: boundedInteger(env.JIUXUANGE_PLAYER_MAX_CONCURRENT_AI, 1, 1, 4),
  };
}

export function playerChatInputChars(body: StatelessChatRequest): number {
  return JSON.stringify({
    messages: body.messages,
    directorState: body.directorState,
    userProfile: body.userProfile,
    discussionTopic: body.config?.discussionTopic,
    discussionPrompt: body.config?.discussionPrompt,
  }).length;
}

const activeByUser = new Map<string, number>();

export function acquirePlayerAiSlot(userId: string, limit: number): (() => void) | null {
  const active = activeByUser.get(userId) ?? 0;
  if (active >= limit) return null;
  activeByUser.set(userId, active + 1);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    const remaining = (activeByUser.get(userId) ?? 1) - 1;
    if (remaining > 0) activeByUser.set(userId, remaining);
    else activeByUser.delete(userId);
  };
}

export function clearPlayerAiSlotsForTests(): void {
  activeByUser.clear();
}
