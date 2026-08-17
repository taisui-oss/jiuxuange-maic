ALTER TABLE "jiuxuange_case_only"."player_ai_runs" ADD COLUMN "prompt_version" text DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "jiuxuange_case_only"."player_ai_runs" ADD COLUMN "input_chars" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "jiuxuange_case_only"."player_ai_runs" ADD COLUMN "max_output_tokens" integer DEFAULT 1200 NOT NULL;--> statement-breakpoint
ALTER TABLE "jiuxuange_case_only"."player_ai_runs" ADD CONSTRAINT "player_ai_runs_input_chars_check" CHECK ("jiuxuange_case_only"."player_ai_runs"."input_chars" >= 0);--> statement-breakpoint
ALTER TABLE "jiuxuange_case_only"."player_ai_runs" ADD CONSTRAINT "player_ai_runs_output_tokens_check" CHECK ("jiuxuange_case_only"."player_ai_runs"."max_output_tokens" > 0);