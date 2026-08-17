import type { StatelessChatRequest } from '@/lib/types/chat';
import type { LoadedPlayerPackage } from '@/lib/jiuxuange/player/types';

export function buildPlayerChatRequest(
  body: StatelessChatRequest,
  loaded: LoadedPlayerPackage,
  model: string,
  maxOutputTokens: number,
): StatelessChatRequest {
  const allowedAgentIds = new Set(loaded.manifest.agents.map((agent) => agent.id));
  const agentIds = (body.config?.agentIds ?? []).filter((agentId) => allowedAgentIds.has(agentId));
  if (agentIds.length === 0) throw new Error('No authorized player Agent');

  return {
    ...body,
    apiKey: '',
    baseUrl: undefined,
    providerType: undefined,
    model,
    maxOutputTokens,
    storeState: {
      ...body.storeState,
      stage: loaded.classroom.stage,
      scenes: loaded.classroom.scenes,
    },
    config: {
      ...body.config,
      agentIds,
      agentConfigs: loaded.manifest.agents.map((agent) => ({
        id: agent.id,
        name: agent.name,
        role: agent.role,
        persona: agent.persona,
        avatar: agent.avatar ?? '',
        color: agent.color ?? '#64748b',
        allowedActions: [],
        priority: agent.priority ?? 1,
        isGenerated: true,
        boundStageId: loaded.classroom.id,
      })),
    },
  };
}
