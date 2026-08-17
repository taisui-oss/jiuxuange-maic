import 'server-only';

import type {
  LoadedPlayerPackage,
  MaicCoursePackageManifestV2,
} from '@/lib/jiuxuange/player/types';

export function toPublicPlayerManifest(
  manifest: MaicCoursePackageManifestV2,
): MaicCoursePackageManifestV2 {
  return {
    ...manifest,
    agents: manifest.agents.map((agent) => ({ ...agent, persona: '' })),
  };
}

export function toPublicPlayerPackage(loaded: LoadedPlayerPackage): LoadedPlayerPackage {
  return {
    ...loaded,
    manifest: toPublicPlayerManifest(loaded.manifest),
  };
}
