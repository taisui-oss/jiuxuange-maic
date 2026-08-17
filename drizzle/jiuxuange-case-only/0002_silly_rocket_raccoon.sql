CREATE TABLE "jiuxuange_case_only"."player_launch_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"user_id" uuid NOT NULL,
	"package_id" text NOT NULL,
	"return_to" text,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jiuxuange_case_only"."player_preview_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"package_id" text NOT NULL,
	"created_by" text NOT NULL,
	"max_uses" integer DEFAULT 10 NOT NULL,
	"use_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "player_preview_links_max_uses_check" CHECK ("jiuxuange_case_only"."player_preview_links"."max_uses" > 0),
	CONSTRAINT "player_preview_links_use_count_check" CHECK ("jiuxuange_case_only"."player_preview_links"."use_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "jiuxuange_case_only"."player_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"user_id" uuid NOT NULL,
	"package_id" text,
	"preview" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "player_sessions_preview_check" CHECK ("jiuxuange_case_only"."player_sessions"."preview" in (0, 1))
);
--> statement-breakpoint
ALTER TABLE "jiuxuange_case_only"."player_launch_tickets" ADD CONSTRAINT "player_launch_tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "jiuxuange_case_only"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jiuxuange_case_only"."player_sessions" ADD CONSTRAINT "player_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "jiuxuange_case_only"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "player_launch_tickets_token_hash_idx" ON "jiuxuange_case_only"."player_launch_tickets" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "player_launch_tickets_expiry_idx" ON "jiuxuange_case_only"."player_launch_tickets" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "player_preview_links_token_hash_idx" ON "jiuxuange_case_only"."player_preview_links" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "player_preview_links_expiry_idx" ON "jiuxuange_case_only"."player_preview_links" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "player_sessions_token_hash_idx" ON "jiuxuange_case_only"."player_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "player_sessions_user_idx" ON "jiuxuange_case_only"."player_sessions" USING btree ("user_id","expires_at");