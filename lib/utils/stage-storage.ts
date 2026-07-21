/**
 * Stage Storage Manager
 *
 * Manages multiple stage data in IndexedDB
 * Each stage has its own storage key based on stageId
 */

import Dexie from 'dexie';
import { makeScene, Stage, Scene } from '../types/stage';
import { ChatSession } from '../types/chat';
import { db, mediaFileKey, type MediaFileRecord, type SceneRecord } from './database';
import { saveChatSessions, loadChatSessions, deleteChatSessions } from './chat-storage';
import { clearPlaybackState } from './playback-storage';
import { clearAllForScene } from '@/lib/quiz/persistence';
import { createLogger } from '@/lib/logger';

const log = createLogger('StageStorage');

export interface StageStoreData {
  stage: Stage;
  scenes: Scene[];
  currentSceneId: string | null;
  chats: ChatSession[];
}

export interface StageListItem {
  id: string;
  name: string;
  description?: string;
  sceneCount: number;
  createdAt: number;
  updatedAt: number;
  interactiveMode?: boolean;
  taskEngineMode?: boolean;
}

/**
 * Save stage data to IndexedDB
 */
export async function saveStageData(stageId: string, data: StageStoreData): Promise<void> {
  try {
    const now = Date.now();

    // Save to stages table
    await db.stages.put({
      id: stageId,
      name: data.stage.name || 'Untitled Stage',
      description: data.stage.description,
      createdAt: data.stage.createdAt || now,
      updatedAt: now,
      languageDirective: data.stage.languageDirective,
      style: data.stage.style,
      currentSceneId: data.currentSceneId || undefined,
      agentIds: data.stage.agentIds,
      videoManifest: data.stage.videoManifest,
      interactiveMode: data.stage.interactiveMode,
      taskEngineMode: data.stage.taskEngineMode,
      generatedAgentConfigs: data.stage.generatedAgentConfigs,
    });

    // Delete old scenes first to avoid orphaned data
    await db.scenes.where('stageId').equals(stageId).delete();

    // Save new scenes
    if (data.scenes && data.scenes.length > 0) {
      await db.scenes.bulkPut(
        data.scenes.map((scene, index) => ({
          ...scene,
          stageId,
          order: scene.order ?? index,
          createdAt: scene.createdAt || now,
          updatedAt: scene.updatedAt || now,
        })),
      );
    }

    // Save chat sessions to independent table
    if (data.chats) {
      await saveChatSessions(stageId, data.chats);
    }

    log.info(`Saved stage: ${stageId}`);
  } catch (error) {
    log.error('Failed to save stage:', error);
    throw error;
  }
}

/**
 * Load stage data from IndexedDB
 */
export async function loadStageData(stageId: string): Promise<StageStoreData | null> {
  try {
    // Load stage
    const stage = await db.stages.get(stageId);
    if (!stage) {
      log.info(`Stage not found: ${stageId}`);
      return null;
    }

    // Load scenes
    const scenes = await db.scenes.where('stageId').equals(stageId).sortBy('order');

    // Load chat sessions from independent table
    const chats = await loadChatSessions(stageId);

    log.info(`Loaded stage: ${stageId}, scenes: ${scenes.length}, chats: ${chats.length}`);

    return {
      stage,
      // `SceneRecord` is the loose persisted shape (independent `type` + `content`);
      // re-bind each to a discriminated `AppScene`, deriving `type` from the stored
      // `content.type`. Spreads the full record, so `whiteboard` etc. are preserved.
      scenes: scenes.map((s) => makeScene(s, s.content)),
      currentSceneId: stage.currentSceneId || scenes[0]?.id || null,
      chats,
    };
  } catch (error) {
    log.error('Failed to load stage:', error);
    return null;
  }
}

/**
 * Delete stage and all related data
 */
export async function deleteStageData(stageId: string): Promise<void> {
  try {
    // Collect scene ids before deletion so we can sweep per-scene localStorage
    // keys (quiz draft / submitted answers / graded results).
    const sceneIds = (await db.scenes.where('stageId').equals(stageId).toArray()).map((s) => s.id);

    // Delete stage
    await db.stages.delete(stageId);

    // Delete scenes
    await db.scenes.where('stageId').equals(stageId).delete();

    // Delete chat sessions and playback state
    await deleteChatSessions(stageId);
    await clearPlaybackState(stageId);
    await db.learningEvaluations.where('classroomId').equals(stageId).delete();
    await db.learningPaths.filter((record) => record.stageId === stageId).delete();

    // Sweep quiz persistence keys for each deleted scene.
    for (const sceneId of sceneIds) {
      clearAllForScene(sceneId);
    }

    log.info(`Deleted stage: ${stageId}`);
  } catch (error) {
    log.error('Failed to delete stage:', error);
    throw error;
  }
}

/**
 * List all stages
 */
export async function listStages(): Promise<StageListItem[]> {
  try {
    const stages = await db.stages.orderBy('updatedAt').reverse().toArray();

    const stageList: StageListItem[] = await Promise.all(
      stages.map(async (stage) => {
        const sceneCount = await db.scenes.where('stageId').equals(stage.id).count();

        return {
          id: stage.id,
          name: stage.name,
          description: stage.description,
          sceneCount,
          createdAt: stage.createdAt,
          updatedAt: stage.updatedAt,
          interactiveMode: stage.interactiveMode,
          taskEngineMode: stage.taskEngineMode,
        };
      }),
    );

    return stageList;
  } catch (error) {
    log.error('Failed to list stages:', error);
    return [];
  }
}

type ThumbnailMediaElement = {
  type: string;
  src?: string;
  mediaRef?: string;
  poster?: string;
};

type ThumbnailSlide = import('@openmaic/dsl').Slide;

function isGeneratedMediaRef(value: unknown): value is string {
  return typeof value === 'string' && /^gen_(img|vid)_[\w-]+$/i.test(value);
}

function isLegacySequentialVideoRef(value: unknown): value is string {
  return typeof value === 'string' && /^gen_vid_\d+$/i.test(value);
}

function getThumbnailMediaRef(element: ThumbnailMediaElement): string | undefined {
  if (element.type === 'image' && isGeneratedMediaRef(element.src)) {
    return element.src;
  }
  if (element.type === 'video') {
    if (isGeneratedMediaRef(element.mediaRef)) return element.mediaRef;
    if (isGeneratedMediaRef(element.src)) return element.src;
  }
  return undefined;
}

function blobWithType(blob: Blob, mimeType: string): Blob {
  return blob.type ? blob : new Blob([blob], { type: mimeType });
}

function revokeObjectUrl(url: string | undefined) {
  if (url?.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}

export function revokeThumbnailSlideMediaUrls(slides: Record<string, ThumbnailSlide>) {
  for (const slide of Object.values(slides)) {
    for (const element of slide.elements as ThumbnailMediaElement[]) {
      if (element.type === 'image' || element.type === 'video') {
        revokeObjectUrl(element.src);
      }
      if (element.type === 'video') {
        revokeObjectUrl(element.poster);
      }
    }
  }
}

/** Dexie 4's runtime iteration cursor supports stop(); the public typings omit it. */
function stopCursor(cursor: unknown) {
  (cursor as { stop: () => void }).stop();
}

/**
 * Find the first slide-type scene of a stage, in `order` sequence, reading as
 * few scene records as possible. Uses the `[stageId+order]` compound index and
 * stops the cursor at the first match instead of `sortBy()`-materializing every
 * scene (full canvas JSON) of the stage.
 */
async function findFirstSlideScene(stageId: string): Promise<SceneRecord | undefined> {
  let found: SceneRecord | undefined;
  await db.scenes
    .where('[stageId+order]')
    .between([stageId, Dexie.minKey], [stageId, Dexie.maxKey])
    .each((scene, cursor) => {
      if (scene.content?.type === 'slide') {
        found = scene;
        stopCursor(cursor);
      }
    });
  return found;
}

/**
 * Legacy `gen_vid_<n>` refs predate the compound mediaFiles key scheme and
 * cannot be point-fetched. The legacy fallback only applies when the stage has
 * exactly one usable (non-error) video record, so scan with early exit: finding
 * a second usable video means the fallback can never apply.
 */
async function findSingleUsableVideoRecord(
  stageId: string,
): Promise<MediaFileRecord | undefined> {
  const usable: MediaFileRecord[] = [];
  await db.mediaFiles
    .where('[stageId+type]')
    .equals([stageId, 'video'])
    .each((record, cursor) => {
      if (record.error) return;
      usable.push(record);
      if (usable.length > 1) stopCursor(cursor);
    });
  return usable.length === 1 ? usable[0] : undefined;
}

/**
 * Get first slide scene's canvas data for each stage (for thumbnail preview).
 * Also resolves generated image/video refs from mediaFiles so thumbnails show real media.
 * Returns a map of stageId -> Slide (canvas data with resolved media)
 *
 * Memory-conscious: only the media records actually referenced by the thumbnail
 * slide are fetched (point lookups by compound primary key), and video blobs are
 * never object-URL'd when a (much smaller) poster is available.
 */
export async function getFirstSlideByStages(
  stageIds: string[],
): Promise<Record<string, ThumbnailSlide>> {
  const result: Record<string, ThumbnailSlide> = {};
  try {
    await Promise.all(
      stageIds.map(async (stageId) => {
        const firstSlide = await findFirstSlideScene(stageId);
        if (firstSlide && firstSlide.content.type === 'slide') {
          const slide = structuredClone(firstSlide.content.canvas);

          const mediaElements = slide.elements.filter((el) =>
            getThumbnailMediaRef(el as ThumbnailMediaElement),
          );
          if (mediaElements.length > 0) {
            // Point-fetch exactly the records the slide references instead of
            // toArray()-ing every media blob of the stage into memory.
            const mediaRefs = [
              ...new Set(
                (mediaElements as ThumbnailMediaElement[])
                  .map((el) => getThumbnailMediaRef(el))
                  .filter((ref): ref is string => !!ref),
              ),
            ];
            const records = await db.mediaFiles.bulkGet(
              mediaRefs.map((ref) => mediaFileKey(stageId, ref)),
            );
            const mediaMap = new Map(
              mediaRefs
                .map((ref, i) => [ref, records[i]] as const)
                .filter((entry): entry is readonly [string, MediaFileRecord] => !!entry[1]),
            );

            // Legacy sequential video refs have no compound-key record; resolve
            // them against the stage's single usable video, as before — but only
            // scan the video records when such a ref actually occurs.
            const needsLegacyVideo = (mediaElements as ThumbnailMediaElement[]).some((el) => {
              if (el.type !== 'video') return false;
              const ref = getThumbnailMediaRef(el);
              return !!ref && !mediaMap.has(ref) && isLegacySequentialVideoRef(ref);
            });
            const legacyVideoRecord = needsLegacyVideo
              ? await findSingleUsableVideoRecord(stageId)
              : undefined;

            for (const el of mediaElements as ThumbnailMediaElement[]) {
              const mediaRef = getThumbnailMediaRef(el);
              const exactRecord = mediaRef ? mediaMap.get(mediaRef) : undefined;
              const usableExactRecord = exactRecord && !exactRecord.error ? exactRecord : undefined;
              const legacyRecord =
                !exactRecord &&
                el.type === 'video' &&
                isLegacySequentialVideoRef(mediaRef)
                  ? legacyVideoRecord
                  : undefined;
              const record = usableExactRecord ?? legacyRecord;

              if (!mediaRef || !record) {
                if (el.type === 'image') {
                  // Clear unresolved placeholder so BaseImageElement won't subscribe
                  // to the global media store (which may have stale data from another course)
                  el.src = '';
                }
                continue;
              }

              if (el.type === 'image' && record.type === 'image') {
                el.src = URL.createObjectURL(blobWithType(record.blob, record.mimeType));
              } else if (el.type === 'video' && record.type === 'video') {
                if (record.poster) {
                  // The poster alone drives the thumbnail — avoid pinning the
                  // (often hundreds of MB) video blob via createObjectURL.
                  // Empty src makes SlideThumbnail render the poster-only frame.
                  el.src = '';
                  el.poster = URL.createObjectURL(blobWithType(record.poster, 'image/jpeg'));
                } else {
                  // No poster: keep the video blob URL so the thumbnail still
                  // shows the first frame, exactly as before.
                  el.src = URL.createObjectURL(blobWithType(record.blob, record.mimeType));
                }
              } else if (el.type === 'image') {
                el.src = '';
              }
            }
          }

          result[stageId] = slide;
        }
      }),
    );
  } catch (error) {
    log.error('Failed to load thumbnails:', error);
  }
  return result;
}

/**
 * Rename a stage (updates only the name field in IndexedDB)
 */
export async function renameStage(stageId: string, newName: string): Promise<void> {
  try {
    await db.stages.update(stageId, { name: newName, updatedAt: Date.now() });
    log.info(`Renamed stage ${stageId} to "${newName}"`);
  } catch (error) {
    log.error('Failed to rename stage:', error);
    throw error;
  }
}

/**
 * Check if stage exists
 */
export async function stageExists(stageId: string): Promise<boolean> {
  try {
    const stage = await db.stages.get(stageId);
    return !!stage;
  } catch (error) {
    log.error('Failed to check stage existence:', error);
    return false;
  }
}
