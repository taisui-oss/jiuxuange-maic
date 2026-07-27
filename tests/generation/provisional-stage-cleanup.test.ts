import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  deleteStageWithRelatedData: vi.fn(),
  deleteAgent: vi.fn(),
  getAgent: vi.fn(),
  listAgents: vi.fn(),
  setSelectedAgentIds: vi.fn(),
  setAgentSelectionIsUserSet: vi.fn(),
  clearStore: vi.fn(),
  stage: { id: 'provisional-stage' } as { id: string } | null,
}));

vi.mock('@/lib/utils/database', () => ({
  deleteStageWithRelatedData: mocks.deleteStageWithRelatedData,
}));

vi.mock('@/lib/orchestration/registry/store', () => ({
  useAgentRegistry: {
    getState: () => ({
      deleteAgent: mocks.deleteAgent,
      getAgent: mocks.getAgent,
      listAgents: mocks.listAgents,
    }),
  },
}));

vi.mock('@/lib/store/settings', () => ({
  useSettingsStore: {
    getState: () => ({
      setSelectedAgentIds: mocks.setSelectedAgentIds,
      setAgentSelectionIsUserSet: mocks.setAgentSelectionIsUserSet,
    }),
  },
}));

vi.mock('@/lib/store/stage', () => ({
  useStageStore: {
    getState: () => ({
      stage: mocks.stage,
      clearStore: mocks.clearStore,
    }),
  },
}));

import { cleanupProvisionalStage } from '@/lib/generation/provisional-stage-cleanup';

describe('provisional stage cleanup', () => {
  beforeEach(() => {
    for (const mock of [
      mocks.deleteStageWithRelatedData,
      mocks.deleteAgent,
      mocks.getAgent,
      mocks.listAgents,
      mocks.setSelectedAgentIds,
      mocks.setAgentSelectionIsUserSet,
      mocks.clearStore,
    ]) {
      mock.mockReset();
    }
    mocks.stage = { id: 'provisional-stage' };
    mocks.deleteStageWithRelatedData.mockResolvedValue(undefined);
    mocks.listAgents.mockReturnValue([
      {
        id: 'generated-current',
        isGenerated: true,
        boundStageId: 'provisional-stage',
      },
      {
        id: 'generated-other',
        isGenerated: true,
        boundStageId: 'other-stage',
      },
      { id: 'default-1', isGenerated: false },
    ]);
    mocks.getAgent.mockImplementation((id: string) =>
      ['default-1', 'default-2', 'default-3', 'default-4'].includes(id)
        ? { id, isGenerated: false }
        : undefined,
    );
  });

  it('removes provisional records, agents and zero-page in-memory state', async () => {
    await cleanupProvisionalStage('provisional-stage', {
      selectedAgentIds: ['generated-current'],
      agentSelectionIsUserSet: false,
    });

    expect(mocks.deleteStageWithRelatedData).toHaveBeenCalledWith('provisional-stage');
    expect(mocks.deleteAgent).toHaveBeenCalledTimes(1);
    expect(mocks.deleteAgent).toHaveBeenCalledWith('generated-current');
    expect(mocks.setSelectedAgentIds).toHaveBeenCalledWith([
      'default-1',
      'default-2',
      'default-3',
      'default-4',
    ]);
    expect(mocks.setAgentSelectionIsUserSet).toHaveBeenCalledWith(false);
    expect(mocks.clearStore).toHaveBeenCalledOnce();
  });

  it('restores a valid prior preset selection without clearing another classroom', async () => {
    mocks.stage = { id: 'another-stage' };

    await cleanupProvisionalStage('provisional-stage', {
      selectedAgentIds: ['default-2'],
      agentSelectionIsUserSet: true,
    });

    expect(mocks.setSelectedAgentIds).toHaveBeenCalledWith(['default-2']);
    expect(mocks.setAgentSelectionIsUserSet).toHaveBeenCalledWith(true);
    expect(mocks.clearStore).not.toHaveBeenCalled();
  });
});
