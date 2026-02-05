DROP TABLE IF EXISTS "roadmap_nodes", "roadmap_progress", "user_node_progress", "user_gamification", "essay_subjects", "case_studies", "users" CASCADE;

CREATE TABLE IF NOT EXISTS "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"subscription_tier" text DEFAULT 'free',
	"subscription_valid_until" timestamp,
	"stripe_customer_id" text,
	"is_verified" boolean DEFAULT false,
	"last_login_at" timestamp,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);

CREATE TABLE IF NOT EXISTS "essay_subjects" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"year" integer NOT NULL,
	"exam_day" text NOT NULL,
	"subject" text NOT NULL,
	"title" text NOT NULL,
	"prompt" text NOT NULL,
	"sections" jsonb,
	"rubric" jsonb NOT NULL,
	"sample_answer" text,
	"common_mistakes" jsonb,
	"difficulty" text DEFAULT 'hard',
	"estimated_time" integer DEFAULT 240,
	"max_score" integer DEFAULT 10,
	"source_type" text DEFAULT 'official',
	"source_url" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "roadmap_nodes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"syllabus_id" text,
	"title" text NOT NULL,
	"description" text,
	"xp_reward" integer DEFAULT 100,
	"order_index" integer NOT NULL,
	"parent_node_id" varchar,
	"milestone_type" text DEFAULT 'topic',
	"created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "case_studies" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"subject" text NOT NULL,
	"exam_day" text,
	"title" text NOT NULL,
	"scenario" text NOT NULL,
	"questions" jsonb,
	"reference_articles" jsonb,
	"sample_answer" text,
	"model_evaluation" text,
	"ai_feedback" text,
	"source_type" text,
	"source_llm" text,
	"batch_id" varchar,
	"difficulty" text NOT NULL,
	"estimated_time" integer,
	"needs_legal_review" boolean DEFAULT false,
	"affected_by_change" varchar,
	"created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "user_gamification" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"current_xp" integer DEFAULT 0,
	"current_level" integer DEFAULT 1,
	"current_streak" integer DEFAULT 0,
	"longest_streak" integer DEFAULT 0,
	"last_activity_date" timestamp DEFAULT now(),
	"coins" integer DEFAULT 0,
	"unlocked_badges" jsonb,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_gamification_user_id_unique" UNIQUE("user_id")
);

CREATE TABLE IF NOT EXISTS "user_node_progress" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"node_id" varchar NOT NULL,
	"status" text DEFAULT 'LOCKED' NOT NULL,
	"score" integer DEFAULT 0,
	"completed_at" timestamp,
	"updated_at" timestamp DEFAULT now()
);

DO $$ BEGIN
 ALTER TABLE "case_studies" ADD CONSTRAINT "case_studies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "user_gamification" ADD CONSTRAINT "user_gamification_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "user_node_progress" ADD CONSTRAINT "user_node_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "user_node_progress" ADD CONSTRAINT "user_node_progress_node_id_roadmap_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."roadmap_nodes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
