import { describe, expect, test } from 'vitest';
import {
  decidePlayerRoute,
  isPlayerModeEnabled,
} from '@/lib/jiuxuange/player/route-policy';

describe('Jiuxuange Player route policy', () => {
  test('is opt-in and rewrites the service root', () => {
    expect(isPlayerModeEnabled({ JIUXUANGE_PLAYER: 'true' })).toBe(true);
    expect(isPlayerModeEnabled({ JIUXUANGE_PLAYER: 'false' })).toBe(false);
    expect(decidePlayerRoute('/')).toEqual({ kind: 'rewrite', pathname: '/player' });
  });

  test('allows only player surfaces and blocks authoring capabilities', () => {
    expect(decidePlayerRoute('/player/convenience-bee')).toEqual({ kind: 'allow' });
    expect(decidePlayerRoute('/launch')).toEqual({ kind: 'allow' });
    expect(decidePlayerRoute('/api/player/session')).toEqual({ kind: 'allow' });
    expect(decidePlayerRoute('/generation-preview')).toEqual({ kind: 'block', status: 404 });
    expect(decidePlayerRoute('/classroom/example')).toEqual({ kind: 'block', status: 404 });
    expect(decidePlayerRoute('/api/generate-classroom')).toEqual({
      kind: 'block',
      status: 403,
    });
    expect(decidePlayerRoute('/api/chat')).toEqual({ kind: 'block', status: 403 });
  });
});
