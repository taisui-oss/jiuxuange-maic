import 'server-only';

import { eq } from 'drizzle-orm';
import { getCaseOnlyDatabase } from '@/lib/server/jiuxuange-case-only/db/client';
import { playerAiRuns } from '@/lib/server/jiuxuange-case-only/db/schema';

export async function startPlayerAiRun(input: {
  userId: string;
  packageId: string;
  traceId: string;
  primaryModel: string;
  promptVersion: string;
  inputChars: number;
  maxOutputTokens: number;
}): Promise<string> {
  const [row] = await getCaseOnlyDatabase()
    .insert(playerAiRuns)
    .values({
      userId: input.userId,
      packageId: input.packageId,
      traceId: input.traceId,
      primaryModel: input.primaryModel,
      selectedModel: input.primaryModel,
      promptVersion: input.promptVersion,
      inputChars: input.inputChars,
      maxOutputTokens: input.maxOutputTokens,
    })
    .returning({ id: playerAiRuns.id });
  return row.id;
}

export async function updatePlayerAiRun(
  id: string,
  patch: {
    selectedModel?: string;
    fallbackUsed?: boolean;
    status?: 'succeeded' | 'failed';
    errorCode?: string;
  },
): Promise<void> {
  await getCaseOnlyDatabase()
    .update(playerAiRuns)
    .set({
      ...(patch.selectedModel ? { selectedModel: patch.selectedModel } : {}),
      ...(patch.fallbackUsed !== undefined ? { fallbackUsed: patch.fallbackUsed ? 1 : 0 } : {}),
      ...(patch.status ? { status: patch.status, completedAt: new Date() } : {}),
      ...(patch.errorCode ? { errorCode: patch.errorCode } : {}),
    })
    .where(eq(playerAiRuns.id, id));
}
