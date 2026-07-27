import { describe, expect, it } from 'vitest';
import { redactChatFailureForLearner } from '@/lib/chat/user-facing-error';
import zhCN from '@/lib/i18n/locales/zh-CN.json';
import providerFailure from '@/tests/replay/jiuxuange-chat-provider-unavailable-20260727.json';

describe('learner-facing chat failures', () => {
  it('keeps provider and credential details out of the classroom conversation', () => {
    const message = redactChatFailureForLearner(
      new Error(providerFailure.rawError),
      zhCN.chat.error.temporarilyUnavailable,
    );

    expect(message).toBe(providerFailure.expectedLearnerMessage);
    for (const forbidden of providerFailure.forbiddenLearnerSubstrings) {
      expect(message).not.toContain(forbidden);
    }
  });
});
