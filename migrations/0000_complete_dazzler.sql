CREATE TABLE "active_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"device_fingerprint" text NOT NULL,
	"user_agent" text,
	"ip_address" text,
	"session_token" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"last_activity_at" timestamp DEFAULT now(),
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "active_sessions_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
CREATE TABLE "ai_explanations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"question_id" varchar NOT NULL,
	"user_answer_id" varchar,
	"explanation" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "analytics_snapshots" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"snapshot_date" timestamp NOT NULL,
	"subject" text,
	"total_questions_solved" integer DEFAULT 0,
	"accuracy" integer DEFAULT 0,
	"avg_time_per_question" integer,
	"streak_days" integer DEFAULT 0,
	"cards_reviewed_today" integer DEFAULT 0,
	"cards_due_today" integer DEFAULT 0,
	"retention_rate" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "case_studies" (
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
--> statement-breakpoint
CREATE TABLE "case_study_batches" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"batch_name" text NOT NULL,
	"subject" text NOT NULL,
	"exam_day" text,
	"source_type" text NOT NULL,
	"source_llm" text,
	"case_studies_count" integer DEFAULT 0,
	"uploaded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "clean_room_audit_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"generation_type" text NOT NULL,
	"input_query" text NOT NULL,
	"model_used" text NOT NULL,
	"system_prompt_used" text NOT NULL,
	"context_provided" text NOT NULL,
	"output_generated" text NOT NULL,
	"context_sources" jsonb,
	"similarity_score" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "content_reports" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" varchar NOT NULL,
	"content_type" text NOT NULL,
	"content_id" varchar NOT NULL,
	"report_type" text NOT NULL,
	"description" text NOT NULL,
	"suggested_correction" text,
	"status" text DEFAULT 'pending',
	"reviewed_by" varchar,
	"reviewed_at" timestamp,
	"review_notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "document_chunks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" varchar NOT NULL,
	"chunk_text" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"embedding" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "essay_prompts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by" varchar NOT NULL,
	"subject" text NOT NULL,
	"exam_day" text,
	"title" text NOT NULL,
	"prompt" text NOT NULL,
	"grading_rubric" jsonb NOT NULL,
	"sample_answer" text,
	"common_mistakes" jsonb,
	"difficulty" text NOT NULL,
	"estimated_time" integer,
	"source_type" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "essay_subjects" (
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
CREATE TABLE "essay_submissions" (
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
CREATE TABLE "exam_essays" (
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
CREATE TABLE "exam_results" (
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
CREATE TABLE "legal_article_batches" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"batch_name" text NOT NULL,
	"subject" text NOT NULL,
	"law_source" text,
	"article_range" text,
	"source_llm" text,
	"articles_count" integer DEFAULT 0,
	"uploaded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "legal_article_chunks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" varchar NOT NULL,
	"segment_type" text NOT NULL,
	"chunk_text" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"embedding" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "legal_articles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"article_number" integer NOT NULL,
	"title" text NOT NULL,
	"subject" text NOT NULL,
	"law_source" text,
	"segments" jsonb NOT NULL,
	"raw_content" text,
	"batch_id" varchar,
	"is_processed_for_rag" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "legal_resources" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"resource_type" text NOT NULL,
	"subject" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"article_ref" text,
	"source_llm" text,
	"tags" jsonb,
	"linked_articles" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "legislative_acts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"act_type" text NOT NULL,
	"act_number" text NOT NULL,
	"act_title" text NOT NULL,
	"full_text" text NOT NULL,
	"html_text" text,
	"published_in_mo" text,
	"effective_date" timestamp,
	"last_modified_date" timestamp,
	"source_url" text NOT NULL,
	"api_source_id" text,
	"fetched_at" timestamp DEFAULT now(),
	"content_hash" text NOT NULL,
	"is_current_version" boolean DEFAULT true,
	"needs_review" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "legislative_change_log" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"act_id" varchar NOT NULL,
	"change_type" text NOT NULL,
	"change_description" text,
	"old_content_hash" text,
	"new_content_hash" text,
	"affected_articles" jsonb,
	"detected_at" timestamp DEFAULT now(),
	"verified_by_user" boolean DEFAULT false,
	"verified_at" timestamp,
	"verification_notes" text
);
--> statement-breakpoint
CREATE TABLE "question_batches" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"batch_name" text NOT NULL,
	"subject" text NOT NULL,
	"topic_id" varchar,
	"source_type" text NOT NULL,
	"source_llm" text,
	"questions_count" integer DEFAULT 0,
	"uploaded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "question_topics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject" text NOT NULL,
	"topic_name" text NOT NULL,
	"description" text,
	"article_references" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject" text NOT NULL,
	"chapter" text NOT NULL,
	"topic" text,
	"difficulty" text NOT NULL,
	"set_type" text NOT NULL,
	"question_text" text NOT NULL,
	"options" jsonb NOT NULL,
	"correct_answer" integer,
	"correct_answers_multiple" jsonb,
	"explanation" text NOT NULL,
	"legal_references" jsonb,
	"ai_feedback" text,
	"feedback_detailed" jsonb,
	"key_concepts" text[],
	"tags" text[],
	"has_exceptions" boolean DEFAULT false,
	"source_type" text,
	"source_llm" text,
	"batch_id" varchar,
	"needs_legal_review" boolean DEFAULT false,
	"affected_by_change" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "quiz_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"subject" text,
	"session_type" text NOT NULL,
	"questions" jsonb NOT NULL,
	"started_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"total_questions" integer NOT NULL,
	"correct_answers" integer DEFAULT 0,
	"time_spent" integer
);
--> statement-breakpoint
CREATE TABLE "roadmap_nodes" (
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
CREATE TABLE "study_plans" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"days_until_exam" integer NOT NULL,
	"hours_per_day" integer NOT NULL,
	"plan_data" jsonb NOT NULL,
	"generated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "syllabus_topic_mappings" (
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
CREATE TABLE "uploaded_documents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"file_name" text NOT NULL,
	"document_type" text NOT NULL,
	"subject" text,
	"object_path" text NOT NULL,
	"extracted_text" text,
	"ai_summary" text,
	"uploaded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_answers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"session_id" varchar,
	"question_id" varchar NOT NULL,
	"selected_answer" integer,
	"is_correct" boolean NOT NULL,
	"time_to_answer" integer,
	"answered_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_case_study_submissions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"case_study_id" varchar NOT NULL,
	"user_answer" text NOT NULL,
	"ai_grade" text,
	"ai_feedback" text,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	"time_spent" integer
);
--> statement-breakpoint
CREATE TABLE "user_essay_submissions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"essay_prompt_id" varchar NOT NULL,
	"user_answer" text NOT NULL,
	"self_evaluation" jsonb,
	"self_score" integer,
	"ai_score" integer,
	"ai_feedback" text,
	"ai_rubric_analysis" jsonb,
	"time_spent" integer,
	"submitted_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_gamification" (
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
CREATE TABLE "user_node_progress" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"node_id" varchar NOT NULL,
	"status" text DEFAULT 'LOCKED' NOT NULL,
	"score" integer DEFAULT 0,
	"completed_at" timestamp,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_progress" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"subject" text NOT NULL,
	"chapter" text NOT NULL,
	"total_questions" integer DEFAULT 0,
	"correct_answers" integer DEFAULT 0,
	"accuracy" integer DEFAULT 0,
	"last_practiced" timestamp,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_srs_cards" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"question_id" varchar NOT NULL,
	"interval" integer DEFAULT 1,
	"ease_factor" integer DEFAULT 250,
	"repetition_count" integer DEFAULT 0,
	"next_review_at" timestamp NOT NULL,
	"last_reviewed_at" timestamp,
	"consecutive_correct" integer DEFAULT 0,
	"total_reviews" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_syllabus_progress" (
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
CREATE TABLE "users" (
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
--> statement-breakpoint
ALTER TABLE "active_sessions" ADD CONSTRAINT "active_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_explanations" ADD CONSTRAINT "ai_explanations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_explanations" ADD CONSTRAINT "ai_explanations_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_explanations" ADD CONSTRAINT "ai_explanations_user_answer_id_user_answers_id_fk" FOREIGN KEY ("user_answer_id") REFERENCES "public"."user_answers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_snapshots" ADD CONSTRAINT "analytics_snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_studies" ADD CONSTRAINT "case_studies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_study_batches" ADD CONSTRAINT "case_study_batches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clean_room_audit_logs" ADD CONSTRAINT "clean_room_audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_document_id_uploaded_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."uploaded_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "essay_prompts" ADD CONSTRAINT "essay_prompts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "essay_submissions" ADD CONSTRAINT "essay_submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "essay_submissions" ADD CONSTRAINT "essay_submissions_essay_subject_id_essay_subjects_id_fk" FOREIGN KEY ("essay_subject_id") REFERENCES "public"."essay_subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_results" ADD CONSTRAINT "exam_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_article_batches" ADD CONSTRAINT "legal_article_batches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_article_chunks" ADD CONSTRAINT "legal_article_chunks_article_id_legal_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."legal_articles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_articles" ADD CONSTRAINT "legal_articles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_articles" ADD CONSTRAINT "legal_articles_batch_id_legal_article_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."legal_article_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_resources" ADD CONSTRAINT "legal_resources_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legislative_change_log" ADD CONSTRAINT "legislative_change_log_act_id_legislative_acts_id_fk" FOREIGN KEY ("act_id") REFERENCES "public"."legislative_acts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_batches" ADD CONSTRAINT "question_batches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_batches" ADD CONSTRAINT "question_batches_topic_id_question_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."question_topics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_sessions" ADD CONSTRAINT "quiz_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_plans" ADD CONSTRAINT "study_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploaded_documents" ADD CONSTRAINT "uploaded_documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_answers" ADD CONSTRAINT "user_answers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_answers" ADD CONSTRAINT "user_answers_session_id_quiz_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."quiz_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_answers" ADD CONSTRAINT "user_answers_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_case_study_submissions" ADD CONSTRAINT "user_case_study_submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_case_study_submissions" ADD CONSTRAINT "user_case_study_submissions_case_study_id_case_studies_id_fk" FOREIGN KEY ("case_study_id") REFERENCES "public"."case_studies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_essay_submissions" ADD CONSTRAINT "user_essay_submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_essay_submissions" ADD CONSTRAINT "user_essay_submissions_essay_prompt_id_essay_prompts_id_fk" FOREIGN KEY ("essay_prompt_id") REFERENCES "public"."essay_prompts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_gamification" ADD CONSTRAINT "user_gamification_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_node_progress" ADD CONSTRAINT "user_node_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_node_progress" ADD CONSTRAINT "user_node_progress_node_id_roadmap_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."roadmap_nodes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_srs_cards" ADD CONSTRAINT "user_srs_cards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_srs_cards" ADD CONSTRAINT "user_srs_cards_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_syllabus_progress" ADD CONSTRAINT "user_syllabus_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_syllabus_progress" ADD CONSTRAINT "user_syllabus_progress_syllabus_topic_id_syllabus_topic_mappings_id_fk" FOREIGN KEY ("syllabus_topic_id") REFERENCES "public"."syllabus_topic_mappings"("id") ON DELETE no action ON UPDATE no action;