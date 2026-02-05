DROP TABLE IF EXISTS "roadmap_nodes", "roadmap_progress", "user_gamification", "essay_subjects" CASCADE;
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "essay_submissions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"essay_subject_id" varchar,
	"user_answer" text NOT NULL,
	"section_answers" jsonb,
	"time_spent" integer,
	"time_limit" integer,
	"is_strict_mode" boolean DEFAULT false,
	"completed_within_time" boolean,
	"self_evaluation" jsonb,
	"self_score" integer,
	"ai_score" text,
	"ai_grade" text,
	"ai_feedback" text,
	"ai_evaluation" jsonb,
	"submitted_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "exam_essays" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"year" integer NOT NULL,
	"variant" integer DEFAULT 1,
	"discipline" text NOT NULL,
	"subject_id" text NOT NULL,
	"subject_title" text NOT NULL,
	"subject_area" text NOT NULL,
	"scenario" text,
	"requirement_id" text NOT NULL,
	"requirement_text" text NOT NULL,
	"points" text NOT NULL,
	"recommended_time" integer,
	"solution" text NOT NULL,
	"legal_refs" jsonb,
	"rubric" jsonb NOT NULL,
	"source_type" text DEFAULT 'official',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "exam_results" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"exam_year" integer NOT NULL,
	"exam_type" text NOT NULL,
	"total_score" integer NOT NULL,
	"is_passed" boolean NOT NULL,
	"breakdown" jsonb NOT NULL,
	"time_spent" integer,
	"completed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "syllabus_topic_mappings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"syllabus_id" text NOT NULL,
	"subject" text NOT NULL,
	"topic_title" text NOT NULL,
	"parent_id" text,
	"depth" integer DEFAULT 0,
	"sort_order" integer DEFAULT 0,
	"article_refs" jsonb,
	"article_range_start" integer,
	"article_range_end" integer,
	"chapter_patterns" jsonb,
	"law_sources" jsonb,
	"total_questions" integer DEFAULT 0,
	"total_articles" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "syllabus_topic_mappings_syllabus_id_unique" UNIQUE("syllabus_id")
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_node_progress" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"node_id" varchar NOT NULL,
	"status" text DEFAULT 'LOCKED' NOT NULL,
	"score" integer DEFAULT 0,
	"completed_at" timestamp,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_syllabus_progress" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"syllabus_topic_id" varchar NOT NULL,
	"questions_answered" integer DEFAULT 0,
	"questions_correct" integer DEFAULT 0,
	"articles_read" integer DEFAULT 0,
	"progress_percent" integer DEFAULT 0,
	"last_activity_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='case_studies' AND column_name='needs_legal_review') THEN
        ALTER TABLE "case_studies" ADD COLUMN "needs_legal_review" boolean DEFAULT false;
    END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='case_studies' AND column_name='affected_by_change') THEN
        ALTER TABLE "case_studies" ADD COLUMN "affected_by_change" varchar;
    END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='questions' AND column_name='needs_legal_review') THEN
        ALTER TABLE "questions" ADD COLUMN "needs_legal_review" boolean DEFAULT false;
    END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='questions' AND column_name='affected_by_change') THEN
        ALTER TABLE "questions" ADD COLUMN "affected_by_change" varchar;
    END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "essay_submissions" ADD CONSTRAINT "essay_submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "essay_submissions" ADD CONSTRAINT "essay_submissions_essay_subject_id_essay_subjects_id_fk" FOREIGN KEY ("essay_subject_id") REFERENCES "public"."essay_subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_results" ADD CONSTRAINT "exam_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_gamification" ADD CONSTRAINT "user_gamification_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_node_progress" ADD CONSTRAINT "user_node_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_node_progress" ADD CONSTRAINT "user_node_progress_node_id_roadmap_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."roadmap_nodes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_syllabus_progress" ADD CONSTRAINT "user_syllabus_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_syllabus_progress" ADD CONSTRAINT "user_syllabus_progress_syllabus_topic_id_syllabus_topic_mappings_id_fk" FOREIGN KEY ("syllabus_topic_id") REFERENCES "public"."syllabus_topic_mappings"("id") ON DELETE no action ON UPDATE no action;