import 'fake-indexeddb/auto';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { db, mediaFileKey, type MediaFileRecord } from '@/lib/utils/database';
import { getFirstSlideByStages } from '@/lib/utils/stage-storage';

// Node has no URL.createObjectURL — stub it so we can assert which blobs get
// object-URL'd (the memory behavior under test).
const createdUrls: string[] = [];
beforeAll(() => {
  vi.stubGlobal('URL', Object.assign(URL, {
    createObjectURL: vi.fn(() => `blob:mock-${createdUrls.push('x')}`),
    revokeObjectURL: vi.fn(),
  }));
});

function makeSlide(id: string, elements: unknown[] = []) {
  return { id, viewportSize: 1000, viewportRatio: 0.5625, elements };
}

async function putScene(
  stageId: string,
  id: string,
  order: number,
  content: Record<string, unknown>,
) {
  await db.scenes.put({
    id,
    stageId,
    type: 'slide',
    title: id,
    order,
    content,
    createdAt: 1,
    updatedAt: 1,
  } as never);
}

function mediaRecord(
  stageId: string,
  elementId: string,
  type: 'image' | 'video',
  overrides: Partial<MediaFileRecord> = {},
): MediaFileRecord {
  return {
    id: mediaFileKey(stageId, elementId),
    stageId,
    type,
    blob: new Blob(['blob-bytes'], { type: type === 'image' ? 'image/png' : 'video/mp4' }),
    mimeType: type === 'image' ? 'image/png' : 'video/mp4',
    size: 10,
    prompt: 'p',
    params: '{}',
    createdAt: 1,
    ...overrides,
  };
}

beforeEach(async () => {
  createdUrls.length = 0;
  vi.mocked(URL.createObjectURL).mockClear();
  await db.transaction('rw', db.scenes, db.mediaFiles, async () => {
    await db.scenes.clear();
    await db.mediaFiles.clear();
  });
});

describe('getFirstSlideByStages', () => {
  it('returns the first slide-type scene in order, skipping non-slide scenes', async () => {
    await putScene('s1', 'scene-quiz', 0, { type: 'quiz', quiz: {} });
    await putScene('s1', 'scene-slide-late', 2, {
      type: 'slide',
      canvas: makeSlide('late'),
    });
    await putScene('s1', 'scene-slide-first', 1, {
      type: 'slide',
      canvas: makeSlide('first'),
    });

    const result = await getFirstSlideByStages(['s1']);
    expect(result.s1?.id).toBe('first');
  });

  it('returns nothing for stages without a slide scene', async () => {
    await putScene('s1', 'scene-quiz', 0, { type: 'quiz', quiz: {} });
    const result = await getFirstSlideByStages(['s1']);
    expect(result.s1).toBeUndefined();
  });

  it('resolves a generated image ref via point lookup into an object URL', async () => {
    await putScene('s1', 'scene-slide', 0, {
      type: 'slide',
      canvas: makeSlide('slide', [
        { id: 'e1', type: 'image', src: 'gen_img_abc' },
        { id: 'e2', type: 'image', src: 'gen_img_missing' },
      ]),
    });
    await db.mediaFiles.put(mediaRecord('s1', 'gen_img_abc', 'image'));

    const result = await getFirstSlideByStages(['s1']);
    const [resolved, missing] = result.s1.elements as { id: string; src: string }[];
    expect(resolved.src).toMatch(/^blob:mock-/);
    // Unresolved placeholder is blanked (no stale media-store subscription).
    expect(missing.src).toBe('');
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  });

  it('uses the poster for videos when available and never object-URLs the video blob', async () => {
    await putScene('s1', 'scene-slide', 0, {
      type: 'slide',
      canvas: makeSlide('slide', [{ id: 'e1', type: 'video', mediaRef: 'gen_vid_xyz' }]),
    });
    await db.mediaFiles.put(
      mediaRecord('s1', 'gen_vid_xyz', 'video', {
        poster: new Blob(['poster'], { type: 'image/jpeg' }),
      }),
    );

    const result = await getFirstSlideByStages(['s1']);
    const [video] = result.s1.elements as { src: string; poster?: string }[];
    expect(video.src).toBe('');
    expect(video.poster).toMatch(/^blob:mock-/);
    // Exactly one object URL: the poster, not the video blob.
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(vi.mocked(URL.createObjectURL).mock.calls[0][0]).toBeInstanceOf(Blob);
    expect((vi.mocked(URL.createObjectURL).mock.calls[0][0] as Blob).type).toBe('image/jpeg');
  });

  it('keeps the video blob object URL when no poster exists (first-frame display)', async () => {
    await putScene('s1', 'scene-slide', 0, {
      type: 'slide',
      canvas: makeSlide('slide', [{ id: 'e1', type: 'video', src: 'gen_vid_xyz' }]),
    });
    await db.mediaFiles.put(mediaRecord('s1', 'gen_vid_xyz', 'video'));

    const result = await getFirstSlideByStages(['s1']);
    const [video] = result.s1.elements as { src: string }[];
    expect(video.src).toMatch(/^blob:mock-/);
  });

  it('falls back to the single usable video record for legacy gen_vid_<n> refs', async () => {
    await putScene('s1', 'scene-slide', 0, {
      type: 'slide',
      canvas: makeSlide('slide', [{ id: 'e1', type: 'video', src: 'gen_vid_1' }]),
    });
    // Legacy courses have no compound-key record for the ref — only one video.
    await db.mediaFiles.put(
      mediaRecord('s1', 'some-other-element', 'video', {
        poster: new Blob(['poster'], { type: 'image/jpeg' }),
      }),
    );

    const result = await getFirstSlideByStages(['s1']);
    const [video] = result.s1.elements as { src: string; poster?: string }[];
    expect(video.poster).toMatch(/^blob:mock-/);
  });

  it('does not apply the legacy fallback when multiple usable videos exist', async () => {
    await putScene('s1', 'scene-slide', 0, {
      type: 'slide',
      canvas: makeSlide('slide', [{ id: 'e1', type: 'video', src: 'gen_vid_1' }]),
    });
    await db.mediaFiles.put(mediaRecord('s1', 'video-a', 'video'));
    await db.mediaFiles.put(mediaRecord('s1', 'video-b', 'video'));

    const result = await getFirstSlideByStages(['s1']);
    const [video] = result.s1.elements as { src: string; poster?: string }[];
    expect(video.src).toBe('gen_vid_1');
    expect(video.poster).toBeUndefined();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('skips errored media records', async () => {
    await putScene('s1', 'scene-slide', 0, {
      type: 'slide',
      canvas: makeSlide('slide', [{ id: 'e1', type: 'image', src: 'gen_img_err' }]),
    });
    await db.mediaFiles.put(mediaRecord('s1', 'gen_img_err', 'image', { error: 'failed' }));

    const result = await getFirstSlideByStages(['s1']);
    const [image] = result.s1.elements as { src: string }[];
    expect(image.src).toBe('');
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});
