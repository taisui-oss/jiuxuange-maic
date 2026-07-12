import type { PBLProjectV2 } from '@/lib/pbl/v2/types';

export function shouldEnterJiuxuangeWorkspaceDirectly(project: PBLProjectV2): boolean {
  return Boolean(
    project.jiuxuange && (project.uiPhase === 'workspace' || project.uiPhase === 'completed'),
  );
}
