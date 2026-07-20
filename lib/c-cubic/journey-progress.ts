import type { PBLProjectV2 } from '@/lib/pbl/v2/types';
import type {
  JiuxuangeCourseJourneyLevel,
  JiuxuangeCoursePackage,
  JiuxuangeVisibleLevelId,
} from './course-package/types';

export type JiuxuangeJourneyLevelStatus = 'completed' | 'current' | 'locked';

export interface JiuxuangeJourneyLevelProgress {
  id: JiuxuangeVisibleLevelId;
  title: string;
  order: number;
  status: JiuxuangeJourneyLevelStatus;
  completedTasks: number;
  totalTasks: number;
}

export interface JiuxuangeJourneyProgress {
  phase: 'prelude' | 'levels' | 'postlude' | 'completed';
  levels: JiuxuangeJourneyLevelProgress[];
  currentLevel?: JiuxuangeJourneyLevelProgress;
}

function milestoneId(moduleId: string): string {
  return `jgx-milestone-${moduleId}`;
}

function milestonesForLevel(project: PBLProjectV2, level: JiuxuangeCourseJourneyLevel) {
  const ids = new Set(level.moduleIds.map(milestoneId));
  return project.milestones.filter((milestone) => ids.has(milestone.id));
}

export function deriveJiuxuangeJourneyProgress(
  project: PBLProjectV2,
  coursePackage: JiuxuangeCoursePackage,
): JiuxuangeJourneyProgress {
  const journey = coursePackage.journey;
  if (!journey) throw new Error(`Course package ${coursePackage.version} has no six-level journey`);

  const preludeIds = new Set(journey.preludeModuleIds.map(milestoneId));
  const preludeComplete = project.milestones
    .filter((milestone) => preludeIds.has(milestone.id))
    .every((milestone) => milestone.status === 'completed');

  const levels = journey.levels.map<JiuxuangeJourneyLevelProgress>((level) => {
    const milestones = milestonesForLevel(project, level);
    const tasks = milestones.flatMap((milestone) => milestone.microtasks);
    const completed = milestones.length > 0 && milestones.every((item) => item.status === 'completed');
    const current = milestones.some((item) => item.status === 'active');
    return {
      id: level.id,
      title: level.title,
      order: level.order,
      status: completed ? 'completed' : current ? 'current' : 'locked',
      completedTasks: tasks.filter((task) => task.status === 'completed').length,
      totalTasks: tasks.length,
    };
  });

  const currentLevel = levels.find((level) => level.status === 'current');
  const allLevelsComplete = levels.every((level) => level.status === 'completed');
  const postludeIds = new Set(journey.postludeModuleIds.map(milestoneId));
  const postludeMilestones = project.milestones.filter((milestone) => postludeIds.has(milestone.id));
  const allPostludeComplete =
    postludeMilestones.length > 0 &&
    postludeMilestones.every((milestone) => milestone.status === 'completed');

  return {
    phase: !preludeComplete
      ? 'prelude'
      : !allLevelsComplete
        ? 'levels'
        : allPostludeComplete || project.status === 'completed'
          ? 'completed'
          : 'postlude',
    levels,
    ...(currentLevel ? { currentLevel } : {}),
  };
}
