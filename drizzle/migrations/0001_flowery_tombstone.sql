-- Drop all tables (early development, no production data to preserve)
DROP TABLE IF EXISTS "event_log" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "timer_state" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "matches" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "rounds" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "teams" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "events" CASCADE;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"date" text,
	"location" text,
	"mode" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"table_count" integer DEFAULT 1 NOT NULL,
	"group_count" integer,
	"teams_advance_per_group" integer,
	"knockout_mode" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "teams" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"name" text NOT NULL,
	"members" json,
	"seed" integer,
	"status" text DEFAULT 'active' NOT NULL,
	"group_id" text,
	CONSTRAINT "teams_event_name_unique" UNIQUE("event_id","name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rounds" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"round_number" integer NOT NULL,
	"phase" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "matches" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"round_id" text NOT NULL,
	"match_number" integer NOT NULL,
	"team1_id" text,
	"team2_id" text,
	"team1_score" integer,
	"team2_score" integer,
	"winner_id" text,
	"is_bye" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"table_number" integer,
	"scheduled_round" integer,
	"bracket_position" text,
	"next_match_id" text,
	"loser_next_match_id" text,
	"group_id" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "timer_state" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"round_id" text,
	"duration_seconds" integer DEFAULT 600 NOT NULL,
	"remaining_seconds" integer DEFAULT 600 NOT NULL,
	"status" text DEFAULT 'stopped' NOT NULL,
	"started_at" timestamp,
	CONSTRAINT "timer_state_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "event_log" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"action" text NOT NULL,
	"payload" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "teams" ADD CONSTRAINT "teams_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "rounds" ADD CONSTRAINT "rounds_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "matches" ADD CONSTRAINT "matches_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "matches" ADD CONSTRAINT "matches_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "matches" ADD CONSTRAINT "matches_team1_id_teams_id_fk" FOREIGN KEY ("team1_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "matches" ADD CONSTRAINT "matches_team2_id_teams_id_fk" FOREIGN KEY ("team2_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "matches" ADD CONSTRAINT "matches_winner_id_teams_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "timer_state" ADD CONSTRAINT "timer_state_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "timer_state" ADD CONSTRAINT "timer_state_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "event_log" ADD CONSTRAINT "event_log_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
