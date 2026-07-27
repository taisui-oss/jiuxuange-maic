'use client';

import { useAgentRegistry } from '@/lib/orchestration/registry/store';
import { useSettingsStore } from '@/lib/store/settings';
import { useStageStore } from '@/lib/store/stage';
import { deleteStageWithRelatedData } from '@/lib/utils/database';

const DEFAULT_AGENT_IDS = ['default-1', 'default-2', 'default-3', 'default-4'];

export interface AgentSelectionSnapshot {
  selectedAgentIds: string[];
  agentSelectionIsUserSet: boolean;
}

/**
 * Remove every client-side artifact created before the first scene commits.
 * The caller must treat cleanup failure as diagnostic information and preserve
 * the original generation error shown to the user.
 */
export async function cleanupProvisionalStage(
  stageId: string,
  previousSelection: AgentSelectionSnapshot,
): Promise<void> {
  try {
    await deleteStageWithRelatedData(stageId);
  } finally {
    const registry = useAgentRegistry.getState();
    for (const agent of registry.listAgents()) {
      if (agent.isGenerated && agent.boundStageId === stageId) {
        registry.deleteAgent(agent.id);
      }
    }

    const validPreviousIds = previousSelection.selectedAgentIds.filter(
      (agentId) => registry.getAgent(agentId) !== undefined,
    );
    const fallbackIds = DEFAULT_AGENT_IDS.filter(
      (agentId) => registry.getAgent(agentId) !== undefined,
    );
    const restoredIds = validPreviousIds.length > 0 ? validPreviousIds : fallbackIds;
    const restoredExactly = validPreviousIds.length === previousSelection.selectedAgentIds.length;

    const settings = useSettingsStore.getState();
    settings.setSelectedAgentIds(restoredIds);
    settings.setAgentSelectionIsUserSet(
      restoredExactly && previousSelection.agentSelectionIsUserSet,
    );

    const stageStore = useStageStore.getState();
    if (stageStore.stage?.id === stageId) {
      stageStore.clearStore();
    }
  }
}
