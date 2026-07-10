import { describe, expect, it } from 'vitest';
import {
  JIUXUANGE_AGENT_PROMPT_SOURCE,
  JIUXUANGE_SHARED_AGENT_RULES,
  getJiuxuangeRoleProfiles,
} from '@/lib/c-cubic/agent-prompts';

describe('Jiuxuange role prompts', () => {
  const profiles = getJiuxuangeRoleProfiles();

  it('adapts the supplied three-role source into the approved four-role product', () => {
    expect(JIUXUANGE_AGENT_PROMPT_SOURCE.sourceTitle).toBe('C立方 AI 教学平台 — 三角色 System Prompt');
    expect(JIUXUANGE_AGENT_PROMPT_SOURCE.version).toBe('2026-07-11.v1');
    expect(profiles.map((profile) => profile.name)).toEqual([
      '教授',
      '学长',
      '神秘角色',
      '成长反馈官',
    ]);
  });

  it('keeps current orchestration rules: one role and one question per turn', () => {
    expect(JIUXUANGE_SHARED_AGENT_RULES).toContain('每轮只有一个角色发言');
    expect(JIUXUANGE_SHARED_AGENT_RULES).toContain('每轮最多一个问题');
    expect(JIUXUANGE_SHARED_AGENT_RULES).not.toContain('最多两个角色发言');
  });

  it('gives the professor the Wei-Zhu concept boundary', () => {
    const professor = profiles.find((profile) => profile.id === 'jiuxuange-professor');
    expect(professor?.systemPrompt).toContain('商业模式 = 利益相关者的交易结构');
    expect(professor?.systemPrompt).toContain('定位、业务系统、关键资源能力、盈利模式、现金流结构、企业价值');
    expect(professor?.systemPrompt).toContain('不引入 SWOT、波特五力');
  });

  it('keeps the senior practical and evidence-led', () => {
    const senior = profiles.find((profile) => profile.id === 'jiuxuange-senior');
    expect(senior?.systemPrompt).toContain('收入结构、成本结构、利润率、现金流');
    expect(senior?.systemPrompt).toContain('找到支持或反驳的项目事实');
  });

  it('keeps challenge and feedback roles from leaking answers or scores', () => {
    const mystery = profiles.find((profile) => profile.id === 'jiuxuange-mystery');
    const feedback = profiles.find((profile) => profile.id === 'jiuxuange-growth-feedback');
    expect(mystery?.systemPrompt).toContain('客户、案主、投资人、竞争对手或红蓝军');
    expect(mystery?.systemPrompt).toContain('不替学员命名矛盾');
    expect(feedback?.systemPrompt).toContain('不显示分数、分数区间或隐藏维度');
    expect(feedback?.systemPrompt).toContain('回到原始消息和项目事实');
  });
});
