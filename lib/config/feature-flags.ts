/**
 * Feature flags. Public flags come from `NEXT_PUBLIC_*` env vars, which
 * Next.js inlines at build time so they are safe to read from client
 * components. Server-only flags must not use the `NEXT_PUBLIC_` prefix.
 *
 * Truthy values: `'true'` or `'1'`. Anything else (including unset) is
 * treated as disabled.
 */

function readBoolean(envValue: string | undefined): boolean {
  return envValue === 'true' || envValue === '1';
}

/**
 * MAIC Editor (Pro mode) gate. Default OFF — gates only the Pro toggle
 * affordance in `Header`. The `StageMode` type union is unaffected so
 * existing code paths typecheck identically with the flag in either
 * state.
 */
export function isMaicEditorEnabled(): boolean {
  return readBoolean(process.env.NEXT_PUBLIC_MAIC_EDITOR_ENABLED);
}

/**
 * Server-authoritative gate for the vocational task-engine generation path.
 * Default OFF. When disabled, requests that include taskEngineMode must
 * silently fall back to the ordinary standard / interactive generation paths.
 */
export function isVocationalTaskEngineEnabled(): boolean {
  return readBoolean(process.env.OPENMAIC_ENABLE_VOCATIONAL);
}

export function resolveVocationalActive(
  requirements?: { taskEngineMode?: boolean } | null,
): boolean {
  return Boolean(requirements?.taskEngineMode) && isVocationalTaskEngineEnabled();
}

/**
 * Optional client-only affordance for exposing the experimental vocational
 * test toggle. This is not a security or routing gate.
 */
export function shouldShowVocationalTestUi(): boolean {
  return readBoolean(process.env.NEXT_PUBLIC_SHOW_VOCATIONAL_TEST_UI);
}

/**
 * Master gate for all C Cubic business-model-course surfaces. Default OFF so
 * the Jiuxuange-branded product can use OpenMAIC's native classroom generator
 * without also rendering either generation of the hard-coded course path.
 * Existing course data is untouched and remains reachable from recent rooms.
 */
export function shouldUseCubicBusinessModelMode(): boolean {
  return process.env.NEXT_PUBLIC_C_CUBIC_BUSINESS_MODEL_MODE === 'true';
}

/**
 * Gates the Jiuxuange course-first experience. Unlike general feature flags,
 * this boundary deliberately accepts only the literal `true` value so a
 * rollback cannot be enabled by a loosely interpreted environment value.
 */
export function shouldUseCubicUnifiedLearning(): boolean {
  return process.env.NEXT_PUBLIC_C_CUBIC_UNIFIED_LEARNING === 'true';
}

/**
 * Gates the complete guided-course chain while preserving the current
 * unified B-module experience as an immediate rollback target.
 */
export function shouldUseCubicGuidedCourseV2(): boolean {
  return process.env.NEXT_PUBLIC_C_CUBIC_GUIDED_COURSE_V2 === 'true';
}

/**
 * Gates the versioned six-level PBL journey. Default OFF so disabling this
 * flag restores the guided-course V2 package without touching V3 sessions.
 */
export function shouldUseCubicSixLevelJourney(): boolean {
  return process.env.NEXT_PUBLIC_C_CUBIC_SIX_LEVEL_JOURNEY === 'true';
}

/**
 * Gates the learning-first single-course orientation. Disabling it restores
 * V3 for new sessions without mutating any V4 session already persisted.
 */
export function shouldUseCubicSingleCourseOrientationV4(): boolean {
  return process.env.NEXT_PUBLIC_C_CUBIC_SINGLE_COURSE_ORIENTATION_V4 === 'true';
}

/**
 * Gates the evidence-backed V5 teaching loop. Disabling it restores the
 * previously selected course package without mutating any V5 session data.
 */
export function shouldUseCubicLearningLoopV5(): boolean {
  return process.env.NEXT_PUBLIC_C_CUBIC_LEARNING_LOOP_V5 === 'true';
}

/**
 * Separates the home experience into an assigned-course portal, a personal
 * project assessment, and private free learning. Disabling it restores the
 * V5.1 home entry without deleting portal or assessment data.
 */
export function shouldUseJiuxuangeDualEntryV1(): boolean {
  return process.env.NEXT_PUBLIC_JIUXUANGE_DUAL_ENTRY_V1 === 'true';
}

/**
 * Inserts a course hub between the assigned-course portal and the existing
 * business-model learning session. Default ON for the dual-entry experience;
 * setting the value to the literal `false` restores the direct classroom
 * entry without deleting any course or project-card data.
 */
export function shouldUseJiuxuangeCourseHubV1(): boolean {
  return process.env.NEXT_PUBLIC_JIUXUANGE_COURSE_HUB_V1 !== 'false';
}
