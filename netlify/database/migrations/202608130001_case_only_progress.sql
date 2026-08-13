CREATE SCHEMA "jiuxuange_case_only";

CREATE TABLE "jiuxuange_case_only"."users" (
  "id" uuid PRIMARY KEY NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "users_status_check" CHECK ("jiuxuange_case_only"."users"."status" in ('active', 'disabled'))
);

CREATE TABLE "jiuxuange_case_only"."case_progress" (
  "user_id" uuid NOT NULL,
  "course_id" text NOT NULL,
  "case_id" text NOT NULL,
  "content_version" text NOT NULL,
  "next_scene_index" integer DEFAULT 0 NOT NULL,
  "total_scenes" integer NOT NULL,
  "progress_version" integer DEFAULT 0 NOT NULL,
  "status" text DEFAULT 'not_started' NOT NULL,
  "started_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "case_progress_pk" PRIMARY KEY("user_id", "course_id", "case_id", "content_version"),
  CONSTRAINT "case_progress_scene_index_check" CHECK ("jiuxuange_case_only"."case_progress"."next_scene_index" >= 0),
  CONSTRAINT "case_progress_total_scenes_check" CHECK ("jiuxuange_case_only"."case_progress"."total_scenes" > 0),
  CONSTRAINT "case_progress_version_check" CHECK ("jiuxuange_case_only"."case_progress"."progress_version" >= 0),
  CONSTRAINT "case_progress_index_bounds_check" CHECK ("jiuxuange_case_only"."case_progress"."next_scene_index" <= "jiuxuange_case_only"."case_progress"."total_scenes"),
  CONSTRAINT "case_progress_status_check" CHECK ("jiuxuange_case_only"."case_progress"."status" in ('not_started', 'in_progress', 'completed'))
);

CREATE TABLE "jiuxuange_case_only"."progress_submissions" (
  "user_id" uuid NOT NULL,
  "course_id" text NOT NULL,
  "case_id" text NOT NULL,
  "content_version" text NOT NULL,
  "idempotency_key" text NOT NULL,
  "request_hash" text NOT NULL,
  "expected_progress_version" integer NOT NULL,
  "scene_id" text NOT NULL,
  "response_status" integer,
  "response_body" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "completed_at" timestamp with time zone,
  CONSTRAINT "progress_submissions_pk" PRIMARY KEY("user_id", "course_id", "case_id", "content_version", "idempotency_key"),
  CONSTRAINT "progress_submissions_version_check" CHECK ("jiuxuange_case_only"."progress_submissions"."expected_progress_version" >= 0),
  CONSTRAINT "progress_submissions_response_check" CHECK (("jiuxuange_case_only"."progress_submissions"."response_status" is null and "jiuxuange_case_only"."progress_submissions"."response_body" is null and "jiuxuange_case_only"."progress_submissions"."completed_at" is null)
    or ("jiuxuange_case_only"."progress_submissions"."response_status" is not null and "jiuxuange_case_only"."progress_submissions"."response_body" is not null and "jiuxuange_case_only"."progress_submissions"."completed_at" is not null))
);

ALTER TABLE "jiuxuange_case_only"."case_progress"
  ADD CONSTRAINT "case_progress_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "jiuxuange_case_only"."users"("id")
  ON DELETE restrict ON UPDATE no action;

ALTER TABLE "jiuxuange_case_only"."progress_submissions"
  ADD CONSTRAINT "progress_submissions_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "jiuxuange_case_only"."users"("id")
  ON DELETE restrict ON UPDATE no action;

ALTER TABLE "jiuxuange_case_only"."progress_submissions"
  ADD CONSTRAINT "progress_submissions_progress_fk"
  FOREIGN KEY ("user_id", "course_id", "case_id", "content_version")
  REFERENCES "jiuxuange_case_only"."case_progress"("user_id", "course_id", "case_id", "content_version")
  ON DELETE restrict ON UPDATE no action;

CREATE INDEX "case_progress_user_course_idx"
  ON "jiuxuange_case_only"."case_progress" USING btree ("user_id", "course_id");

CREATE UNIQUE INDEX "progress_submissions_scope_key_idx"
  ON "jiuxuange_case_only"."progress_submissions" USING btree ("user_id", "course_id", "idempotency_key");

CREATE INDEX "progress_submissions_lookup_idx"
  ON "jiuxuange_case_only"."progress_submissions" USING btree ("user_id", "course_id", "case_id", "created_at");
