import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import type { CaseOnlySubmitBody } from '@/lib/jiuxuange/case-only/types';

export const caseOnlySchema = pgSchema('jiuxuange_case_only');

export const caseOnlyUsers = caseOnlySchema.table(
  'users',
  {
    id: uuid('id').primaryKey(),
    status: text('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check('users_status_check', sql`${table.status} in ('active', 'disabled')`)],
);

export const caseProgress = caseOnlySchema.table(
  'case_progress',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => caseOnlyUsers.id, { onDelete: 'restrict' }),
    courseId: text('course_id').notNull(),
    caseId: text('case_id').notNull(),
    contentVersion: text('content_version').notNull(),
    nextSceneIndex: integer('next_scene_index').notNull().default(0),
    totalScenes: integer('total_scenes').notNull(),
    progressVersion: integer('progress_version').notNull().default(0),
    status: text('status').notNull().default('not_started'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({
      name: 'case_progress_pk',
      columns: [table.userId, table.courseId, table.caseId, table.contentVersion],
    }),
    index('case_progress_user_course_idx').on(table.userId, table.courseId),
    check('case_progress_scene_index_check', sql`${table.nextSceneIndex} >= 0`),
    check('case_progress_total_scenes_check', sql`${table.totalScenes} > 0`),
    check('case_progress_version_check', sql`${table.progressVersion} >= 0`),
    check('case_progress_index_bounds_check', sql`${table.nextSceneIndex} <= ${table.totalScenes}`),
    check(
      'case_progress_status_check',
      sql`${table.status} in ('not_started', 'in_progress', 'completed')`,
    ),
  ],
);

export const progressSubmissions = caseOnlySchema.table(
  'progress_submissions',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => caseOnlyUsers.id, { onDelete: 'restrict' }),
    courseId: text('course_id').notNull(),
    caseId: text('case_id').notNull(),
    contentVersion: text('content_version').notNull(),
    idempotencyKey: text('idempotency_key').notNull(),
    requestHash: text('request_hash').notNull(),
    expectedProgressVersion: integer('expected_progress_version').notNull(),
    sceneId: text('scene_id').notNull(),
    responseStatus: integer('response_status'),
    responseBody: jsonb('response_body').$type<CaseOnlySubmitBody>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [
    primaryKey({
      name: 'progress_submissions_pk',
      columns: [
        table.userId,
        table.courseId,
        table.caseId,
        table.contentVersion,
        table.idempotencyKey,
      ],
    }),
    uniqueIndex('progress_submissions_scope_key_idx').on(
      table.userId,
      table.courseId,
      table.idempotencyKey,
    ),
    index('progress_submissions_lookup_idx').on(
      table.userId,
      table.courseId,
      table.caseId,
      table.createdAt,
    ),
    check('progress_submissions_version_check', sql`${table.expectedProgressVersion} >= 0`),
    foreignKey({
      name: 'progress_submissions_progress_fk',
      columns: [table.userId, table.courseId, table.caseId, table.contentVersion],
      foreignColumns: [
        caseProgress.userId,
        caseProgress.courseId,
        caseProgress.caseId,
        caseProgress.contentVersion,
      ],
    }).onDelete('restrict'),
    check(
      'progress_submissions_response_check',
      sql`(${table.responseStatus} is null and ${table.responseBody} is null and ${table.completedAt} is null)
      or (${table.responseStatus} is not null and ${table.responseBody} is not null and ${table.completedAt} is not null)`,
    ),
  ],
);

export const playerLaunchTickets = caseOnlySchema.table(
  'player_launch_tickets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tokenHash: text('token_hash').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => caseOnlyUsers.id, { onDelete: 'restrict' }),
    packageId: text('package_id').notNull(),
    returnTo: text('return_to'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('player_launch_tickets_token_hash_idx').on(table.tokenHash),
    index('player_launch_tickets_expiry_idx').on(table.expiresAt),
  ],
);

export const playerSessions = caseOnlySchema.table(
  'player_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tokenHash: text('token_hash').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => caseOnlyUsers.id, { onDelete: 'restrict' }),
    packageId: text('package_id'),
    preview: integer('preview').notNull().default(0),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('player_sessions_token_hash_idx').on(table.tokenHash),
    index('player_sessions_user_idx').on(table.userId, table.expiresAt),
    check('player_sessions_preview_check', sql`${table.preview} in (0, 1)`),
  ],
);

export const playerPreviewLinks = caseOnlySchema.table(
  'player_preview_links',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tokenHash: text('token_hash').notNull(),
    packageId: text('package_id').notNull(),
    createdBy: text('created_by').notNull(),
    maxUses: integer('max_uses').notNull().default(10),
    useCount: integer('use_count').notNull().default(0),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('player_preview_links_token_hash_idx').on(table.tokenHash),
    index('player_preview_links_expiry_idx').on(table.expiresAt),
    check('player_preview_links_max_uses_check', sql`${table.maxUses} > 0`),
    check('player_preview_links_use_count_check', sql`${table.useCount} >= 0`),
  ],
);
