CREATE TABLE "jiuxuange_case_only"."player_ai_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"package_id" text NOT NULL,
	"trace_id" text NOT NULL,
	"primary_model" text NOT NULL,
	"selected_model" text NOT NULL,
	"fallback_used" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"error_code" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "player_ai_runs_fallback_check" CHECK ("jiuxuange_case_only"."player_ai_runs"."fallback_used" in (0, 1)),
	CONSTRAINT "player_ai_runs_status_check" CHECK ("jiuxuange_case_only"."player_ai_runs"."status" in ('running', 'succeeded', 'failed'))
);
--> statement-breakpoint
ALTER TABLE "jiuxuange_case_only"."player_ai_runs" ADD CONSTRAINT "player_ai_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "jiuxuange_case_only"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "player_ai_runs_trace_idx" ON "jiuxuange_case_only"."player_ai_runs" USING btree ("trace_id");--> statement-breakpoint
CREATE INDEX "player_ai_runs_package_idx" ON "jiuxuange_case_only"."player_ai_runs" USING btree ("package_id","started_at");