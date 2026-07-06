/**
 * Agent Registry Store
 * Manages configurable AI agents using Zustand with localStorage persistence
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AgentConfig } from './types';
import { getActionsForRole } from './types';
import type { TTSProviderId } from '@/lib/audio/types';
import type { VoiceDesign } from '@/lib/audio/voice-design';
import { USER_AVATAR } from '@/lib/types/roundtable';
import type { Participant, ParticipantRole } from '@/lib/types/roundtable';
import { useUserProfileStore } from '@/lib/store/user-profile';
import type { AgentInfo } from '@/lib/generation/pipeline-types';

interface AgentRegistryState {
  agents: Record<string, AgentConfig>; // Map of agentId -> config

  // Actions
  addAgent: (agent: AgentConfig) => void;
  updateAgent: (id: string, updates: Partial<AgentConfig>) => void;
  deleteAgent: (id: string) => void;
  getAgent: (id: string) => AgentConfig | undefined;
  listAgents: () => AgentConfig[];
}

// Action types available to agents
const WHITEBOARD_ACTIONS = [
  'wb_open',
  'wb_close',
  'wb_draw_text',
  'wb_draw_shape',
  'wb_draw_chart',
  'wb_draw_latex',
  'wb_draw_table',
  'wb_draw_line',
  'wb_draw_code',
  'wb_edit_code',
  'wb_clear',
  'wb_delete',
];

const SLIDE_ACTIONS = ['spotlight', 'laser', 'play_video'];

// Default agents - always available on both server and client
const DEFAULT_AGENTS: Record<string, AgentConfig> = {
  'default-1': {
    id: 'default-1',
    name: '教授',
    role: 'teacher',
    persona: `你是九轩阁商业模式大课里的“教授”。你的责任是把课程概念讲清楚，把商业模式判断的底层框架校准准。

你的教学方式：
- 先讲清一个概念，再带学员看它在真实项目里的作用
- 用商业模式、用户、付费方、渠道、留存、增长、组织能力等事实来解释抽象概念
- 只在必要时追问，不连续抛出多个问题
- 不替学员直接命名矛盾，而是制造事实之间的张力，让学员自己看见
- 不暴露内部评分维度、证据卡、反速通机制或后台判断逻辑

你可以使用幻灯片指示和白板来帮助解释。动作要自然融入教学，不要宣布自己在调用工具。

语气：稳、准、有高度，像一位真正关心学员认知成长的主理导师。`,
    avatar: '/avatars/teacher.png',
    color: '#2563eb',
    allowedActions: [...SLIDE_ACTIONS, ...WHITEBOARD_ACTIONS],
    priority: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
    isDefault: true,
  },
  'default-2': {
    id: 'default-2',
    name: '学长',
    role: 'assistant',
    persona: `你是九轩阁里的“学长”，也是学员最常遇到的伴学伙伴。你负责断点续聊、把教授讲过的概念带回学员自己的项目和小组标的。

你的方式：
- 记住当前学习节点、上次卡点和下一步该推进的一问
- 把复杂框架翻译成学员能马上使用的判断动作
- 每轮只推进一个小问题或一个小任务
- 帮学员形成“概念理解卡”和“案例观察卡”这类可见学习记录
- 学员泛泛而谈时，温和地拉回项目事实，不替他完成判断

你不抢教授的主线，也不替成长反馈官打分。你负责陪学员走下去。

语气：亲近、懂路径、有耐心，像一个靠谱的学长坐在旁边。`,
    avatar: '/avatars/assist.png',
    color: '#059669',
    allowedActions: [...WHITEBOARD_ACTIONS],
    priority: 7,
    createdAt: new Date(),
    updatedAt: new Date(),
    isDefault: true,
  },
  'default-3': {
    id: 'default-3',
    name: '神秘角色',
    role: 'student',
    persona: `你是九轩阁里的“神秘角色”。你会在合适的时候以客户、案主、投资人、竞争对手、红军或蓝军的方式进入讨论，制造真实场景里的阻力和张力。

你的方式：
- 不直接给标准答案，而是用反问、反例、异议和现场角色压力推动学员思考
- 挑战套话、空泛判断和没有事实支撑的结论
- 在角色扮演里只说该角色会说的话，不暴露自己是模拟器
- 对学员的商业模式假设提出现实约束：谁付费、为什么续费、渠道是否可复制、资源是否可持续
- 点到即止，不压过教授和学长

语气：有一点出其不意，但不羞辱学员；有对抗感，也有分寸。`,
    avatar: '/avatars/thinker.png',
    color: '#7c3aed',
    allowedActions: [...WHITEBOARD_ACTIONS],
    priority: 6,
    createdAt: new Date(),
    updatedAt: new Date(),
    isDefault: true,
  },
  'default-4': {
    id: 'default-4',
    name: '成长反馈官',
    role: 'student',
    persona: `你是九轩阁里的“成长反馈官”。你帮助学员看见自己的学习质量、证据积累和思考变化，但正式评分仍交给系统评价链路完成。

你的方式：
- 用学员能理解的语言反馈阶段收获，不抛出后台术语
- 提醒学员沉淀概念理解卡和案例观察卡
- 在必要时提示“这个判断还缺项目事实支撑”
- 后台会记录矛盾发现卡和商模判断卡，但你不能把这些内部卡名直接暴露给学员
- 反馈要回到原始对话和项目事实，不编造成长证据

语气：冷静、温和、客观，让学员感觉自己正在被认真看见。`,
    avatar: '/avatars/note-taker.png',
    color: '#0891b2',
    allowedActions: [...WHITEBOARD_ACTIONS],
    priority: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
    isDefault: true,
  },
};

/**
 * Return the built-in default agents as lightweight AgentInfo objects
 * suitable for the generation pipeline (no UI-only fields like avatar/color).
 */
export function getDefaultAgents(): AgentInfo[] {
  return Object.values(DEFAULT_AGENTS).map((a) => ({
    id: a.id,
    name: a.name,
    role: a.role,
    persona: a.persona,
  }));
}

export const useAgentRegistry = create<AgentRegistryState>()(
  persist(
    (set, get) => ({
      // Initialize with default agents so they're available on server
      agents: { ...DEFAULT_AGENTS },

      addAgent: (agent) =>
        set((state) => ({
          agents: { ...state.agents, [agent.id]: agent },
        })),

      updateAgent: (id, updates) =>
        set((state) => ({
          agents: {
            ...state.agents,
            [id]: { ...state.agents[id], ...updates, updatedAt: new Date() },
          },
        })),

      deleteAgent: (id) =>
        set((state) => {
          const { [id]: _removed, ...rest } = state.agents;
          return { agents: rest };
        }),

      getAgent: (id) => get().agents[id],

      listAgents: () => Object.values(get().agents),
    }),
    {
      name: 'agent-registry-storage',
      version: 11, // Bumped: add voiceOverrides field to AgentConfig
      migrate: (persistedState: unknown) => persistedState,
      // Merge persisted state with default agents
      // Default agents always use code-defined values (not cached)
      // Custom agents use persisted values
      merge: (persistedState: unknown, currentState) => {
        const persisted = persistedState as Record<string, unknown> | undefined;
        const persistedAgents = (persisted?.agents || {}) as Record<string, AgentConfig>;
        const mergedAgents: Record<string, AgentConfig> = { ...DEFAULT_AGENTS };

        // Only preserve non-default, non-generated (custom) agents from cache
        // Generated agents are loaded on-demand from IndexedDB per stage
        for (const [id, agent] of Object.entries(persistedAgents)) {
          const agentConfig = agent as AgentConfig;
          if (!id.startsWith('default-') && !agentConfig.isGenerated) {
            mergedAgents[id] = agentConfig;
          }
        }

        return {
          ...currentState,
          agents: mergedAgents,
        };
      },
    },
  ),
);

/**
 * Convert agents to roundtable participants
 * Maps agent roles to participant roles for the UI
 * @param t - i18n translation function for localized display names
 */
export function agentsToParticipants(
  agentIds: string[],
  t?: (key: string) => string,
): Participant[] {
  const registry = useAgentRegistry.getState();
  const participants: Participant[] = [];
  let hasTeacher = false;

  // Resolve agents and sort: teacher first (by role then priority desc)
  const resolved = agentIds
    .map((id) => registry.getAgent(id))
    .filter((a): a is AgentConfig => a != null);
  resolved.sort((a, b) => {
    if (a.role === 'teacher' && b.role !== 'teacher') return -1;
    if (a.role !== 'teacher' && b.role === 'teacher') return 1;
    return (b.priority ?? 0) - (a.priority ?? 0);
  });

  for (const agent of resolved) {
    // Map agent role to participant role:
    // The first agent with role "teacher" becomes the left-side teacher.
    // If no agent has role "teacher", the highest-priority agent becomes teacher.
    let role: ParticipantRole = 'student';
    if (!hasTeacher) {
      role = 'teacher';
      hasTeacher = true;
    }

    // Use i18n name for default agents, fall back to registry name
    const i18nName = t?.(`settings.agentNames.${agent.id}`);
    const displayName =
      i18nName && i18nName !== `settings.agentNames.${agent.id}` ? i18nName : agent.name;

    participants.push({
      id: agent.id,
      name: displayName,
      role,
      avatar: agent.avatar,
      isOnline: true,
      isSpeaking: false,
    });
  }

  // Always add user participant — use profile store when available
  const userProfile = useUserProfileStore.getState();
  const userName = userProfile.nickname || t?.('common.you') || 'You';
  const userAvatar = userProfile.avatar || USER_AVATAR;

  participants.push({
    id: 'user-1',
    name: userName,
    role: 'user',
    avatar: userAvatar,
    isOnline: true,
    isSpeaking: false,
  });

  return participants;
}

/**
 * Load generated agents for a stage from IndexedDB into the registry.
 * Clears any previously loaded generated agents first.
 * Returns the loaded agent IDs.
 */
export async function loadGeneratedAgentsForStage(stageId: string): Promise<string[]> {
  const { getGeneratedAgentsByStageId } = await import('@/lib/utils/database');
  const records = await getGeneratedAgentsByStageId(stageId);

  const registry = useAgentRegistry.getState();

  // Always clear previously loaded generated agents — even when the new stage
  // has none — to prevent stale agents from a prior auto-classroom leaking
  // into the current preset classroom.
  const currentAgents = registry.listAgents();
  for (const agent of currentAgents) {
    if (agent.isGenerated) {
      registry.deleteAgent(agent.id);
    }
  }

  if (records.length === 0) return [];

  // Add new ones
  const ids: string[] = [];
  for (const record of records) {
    registry.addAgent({
      ...record,
      allowedActions: getActionsForRole(record.role),
      isDefault: false,
      isGenerated: true,
      boundStageId: record.stageId,
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.createdAt),
    });
    ids.push(record.id);
  }

  return ids;
}

/**
 * Save generated agents to IndexedDB and registry.
 * Clears old generated agents for this stage first.
 */
export async function saveGeneratedAgents(
  stageId: string,
  agents: Array<{
    id: string;
    name: string;
    role: string;
    persona: string;
    avatar: string;
    color: string;
    priority: number;
    voiceConfig?: { providerId: string; voiceId: string };
    voiceDesign?: VoiceDesign;
  }>,
): Promise<string[]> {
  const { db } = await import('@/lib/utils/database');

  // Clear old generated agents for this stage
  await db.generatedAgents.where('stageId').equals(stageId).delete();

  // Clear from registry
  const registry = useAgentRegistry.getState();
  for (const agent of registry.listAgents()) {
    if (agent.isGenerated) registry.deleteAgent(agent.id);
  }

  // Write to IndexedDB
  const records = agents.map((a) => ({ ...a, stageId, createdAt: Date.now() }));
  await db.generatedAgents.bulkPut(records);

  // Add to registry
  for (const record of records) {
    const { voiceConfig, ...rest } = record;
    registry.addAgent({
      ...rest,
      allowedActions: getActionsForRole(record.role),
      isDefault: false,
      isGenerated: true,
      boundStageId: stageId,
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.createdAt),
      ...(voiceConfig
        ? {
            voiceConfig: {
              providerId: voiceConfig.providerId as TTSProviderId,
              voiceId: voiceConfig.voiceId,
            },
          }
        : {}),
    });
  }

  // Eager warm-up: pre-register each generated agent's auto voice so the first
  // spoken line is already stable. Same idempotent ensure as the TTS path;
  // fire-and-forget. Dynamic import keeps this client-only dep out of the
  // server-importable store module.
  void import('@/lib/audio/agent-voice')
    .then((m) => m.warmUpAgentVoices(registry.listAgents().filter((a) => a.isGenerated)))
    .catch(() => undefined);

  return records.map((r) => r.id);
}
