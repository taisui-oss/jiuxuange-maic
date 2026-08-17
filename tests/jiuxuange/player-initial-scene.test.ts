import { describe, expect, test } from 'vitest';
import { PENDING_SCENE_ID } from '@/lib/store/stage';
import { resolvePlayerInitialSceneId } from '@/lib/jiuxuange/player/initial-scene';

describe('player initial scene selection', () => {
  test('resumes the next unfinished server scene', () => {
    expect(resolvePlayerInitialSceneId(['one', 'two', 'three'], 1, 'in_progress')).toBe('two');
  });

  test('restores completed courses to the OpenMAIC completion scene', () => {
    expect(resolvePlayerInitialSceneId(['one', 'quiz'], 2, 'completed')).toBe(PENDING_SCENE_ID);
  });

  test('handles an empty package without inventing a scene', () => {
    expect(resolvePlayerInitialSceneId([], 0, 'not_started')).toBeNull();
  });
});
