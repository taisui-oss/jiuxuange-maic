import { describe, expect, it } from 'vitest';
import { setAsciiHeader } from '@/lib/utils/http-headers';

describe('browser request header safety', () => {
  it('drops non-ASCII configuration values before fetch constructs ByteString headers', () => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    expect(setAsciiHeader(headers, 'x-user-locale', 'zh-CN 中文')).toBe(false);
    expect(setAsciiHeader(headers, 'x-model', 'deepseek:deepseek-chat')).toBe(true);
    expect(headers).toEqual({
      'Content-Type': 'application/json',
      'x-model': 'deepseek:deepseek-chat',
    });
  });
});
