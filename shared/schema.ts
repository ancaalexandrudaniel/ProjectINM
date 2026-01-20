import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),

  // [PILON 1] Monetizare
  subscriptionTier: text("subscription_tier").default("free"), // 'free', 'pro', 'premium'
  subscriptionValidUntil: timestamp("subscription_valid_until"),
  stripeCustomerId: text("stripe_customer_id"),

  // [PILON 1] Securitate
  isVerified: boolean("is_verified").default(false),
  lastLoginAt: timestamp("last_login_at"),
});

export const questions = pgTable("questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  subject: text("subject").notNull(), // 'civil', 'civil-procedural', 'penal', 'penal-procedural'
  chapter: text("chapter").notNull(),
  topic: text("topic"), // specific topic within chapter
  difficulty: text("difficulty").notNull(), // 'easy', 'medium', 'hard'
  setType: text("set_type").notNull(), // 'A' (1 correct), 'B' (1-3 correct), 'C' (0-4 correct) - required, no default
  questionText: text("question_text").notNull(),
  options: jsonb("options").notNull(), // Array of option objects
  correctAnswer: integer("correct_answer"), // Index of correct option (null for multiple correct)
  correctAnswersMultiple: jsonb("correct_answers_multiple"), // Array of indices for God Mode (e.g., [0,2] or [] for "none correct")
  explanation: text("explanation").notNull(),
  legalReferences: jsonb("legal_references"), // Array of legal reference strings
  aiFeedback: text("ai_feedback"), // AI-generated feedback from LLM session
  feedbackDetailed: jsonb("feedback_detailed"), // Rich feedback: analiza_variante, exceptii, retine
  keyConcepts: text("key_concepts").array(), // concepte_cheie for filtering
  tags: text("tags").array(), // tags for categorization
  hasExceptions: boolean("has_exceptions").default(false), // flag for questions with legal exceptions
  sourceType: text("source_type"), // 'llm-session', 'manual', 'exam-past'
  sourceLLM: text("source_llm"), // 'chatgpt', 'claude', 'gemini'
  batchId: varchar("batch_id"), // reference to question batch
  needsLegalReview: boolean("needs_legal_review").default(false), // flagged when referenced law changes
  affectedByChange: varchar("affected_by_change"), // FK to legislative_change_log.id
  createdAt: timestamp("created_at").defaultNow(),
});

export const quizSessions = pgTable("quiz_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  subject: text("subject"),
  sessionType: text("session_type").notNull(), // 'practice', 'simulation', 'weak-points'
  questions: jsonb("questions").notNull(), // Array of question IDs
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  totalQuestions: integer("total_questions").notNull(),
  correctAnswers: integer("correct_answers").default(0),
  timeSpent: integer("time_spent"), // seconds
});

export const userAnswers = pgTable("user_answers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  sessionId: varchar("session_id").references(() => quizSessions.id),
  questionId: varchar("question_id").references(() => questions.id).notNull(),
  selectedAnswer: integer("selected_answer"),
  isCorrect: boolean("is_correct").notNull(),
  timeToAnswer: integer("time_to_answer"), // seconds
  answeredAt: timestamp("answered_at").defaultNow(),
});

export const userProgress = pgTable("user_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  subject: text("subject").notNull(),
  chapter: text("chapter").notNull(),
  totalQuestions: integer("total_questions").default(0),
  correctAnswers: integer("correct_answers").default(0),
  accuracy: integer("accuracy").default(0), // percentage
  lastPracticed: timestamp("last_practiced"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const uploadedDocuments = pgTable("uploaded_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  fileName: text("file_name").notNull(),
  documentType: text("document_type").notNull(), // 'tematica', 'bibliografie', 'subiecte', 'cod', 'curs'
  subject: text("subject"), // optional, for categorization
  objectPath: text("object_path").notNull(), // path in object storage
  extractedText: text("extracted_text"), // extracted PDF text
  aiSummary: text("ai_summary"), // AI-generated summary
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

export const aiExplanations = pgTable("ai_explanations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  questionId: varchar("question_id").references(() => questions.id).notNull(),
  userAnswerId: varchar("user_answer_id").references(() => userAnswers.id),
  explanation: text("explanation").notNull(), // AI-generated explanation
  createdAt: timestamp("created_at").defaultNow(),
});

export const studyPlans = pgTable("study_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  daysUntilExam: integer("days_until_exam").notNull(),
  hoursPerDay: integer("hours_per_day").notNull(),
  planData: jsonb("plan_data").notNull(), // AI-generated study plan structure
  generatedAt: timestamp("generated_at").defaultNow(),
});

export const documentChunks = pgTable("document_chunks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").references(() => uploadedDocuments.id).notNull(),
  chunkText: text("chunk_text").notNull(),
  chunkIndex: integer("chunk_index").notNull(),
  embedding: jsonb("embedding"), // array of 768 floats
  metadata: jsonb("metadata"), // {documentType, subject, fileName}
  createdAt: timestamp("created_at").defaultNow(),
});

export const questionTopics = pgTable("question_topics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  subject: text("subject").notNull(), // 'civil', 'civil-procedural', 'penal', 'penal-procedural'
  topicName: text("topic_name").notNull(),
  description: text("description"),
  articleReferences: jsonb("article_references"), // array of article numbers/ranges
  createdAt: timestamp("created_at").defaultNow(),
});

export const questionBatches = pgTable("question_batches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  batchName: text("batch_name").notNull(),
  subject: text("subject").notNull(),
  topicId: varchar("topic_id").references(() => questionTopics.id),
  sourceType: text("source_type").notNull(), // 'llm-session', 'manual', 'exam-past'
  sourceLLM: text("source_llm"), // 'chatgpt', 'claude', 'gemini', etc.
  questionsCount: integer("questions_count").default(0),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

export const legalResources = pgTable("legal_resources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  resourceType: text("resource_type").notNull(), // 'article', 'doctrine', 'jurisprudence', 'summary'
  subject: text("subject").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  articleRef: text("article_ref"), // e.g., "Art. 1234 Cod Civil"
  sourceLLM: text("source_llm"),
  tags: jsonb("tags"), // array of tags
  linkedArticles: jsonb("linked_articles"), // array of related article refs
  createdAt: timestamp("created_at").defaultNow(),
});

export const caseStudies = pgTable("case_studies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  subject: text("subject").notNull(), // 'civil', 'civil-procedural', 'penal', 'penal-procedural'
  examDay: text("exam_day"), // 'day1' (Civil + PPC), 'day2' (Penal + PPP)
  title: text("title").notNull(),
  scenario: text("scenario").notNull(),
  questions: jsonb("questions"),
  referenceArticles: jsonb("reference_articles"),
  sampleAnswer: text("sample_answer"),
  modelEvaluation: text("model_evaluation"), // grading criteria and evaluation guide
  aiFeedback: text("ai_feedback"), // AI-generated feedback from LLM session
  sourceType: text("source_type"), // 'llm-session', 'manual', 'exam-past'
  sourceLLM: text("source_llm"), // 'chatgpt', 'claude', 'gemini'
  batchId: varchar("batch_id"), // reference to case study batch
  difficulty: text("difficulty").notNull(),
  estimatedTime: integer("estimated_time"), // minutes to solve
  needsLegalReview: boolean("needs_legal_review").default(false), // flagged when referenced law changes
  affectedByChange: varchar("affected_by_change"), // FK to legislative_change_log.id
  createdAt: timestamp("created_at").defaultNow(),
});

export const caseStudyBatches = pgTable("case_study_batches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  batchName: text("batch_name").notNull(),
  subject: text("subject").notNull(),
  examDay: text("exam_day"), // 'day1', 'day2'
  sourceType: text("source_type").notNull(),
  sourceLLM: text("source_llm"),
  caseStudiesCount: integer("case_studies_count").default(0),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

export const legalArticles = pgTable("legal_articles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  articleNumber: integer("article_number").notNull(),
  title: text("title").notNull(),
  subject: text("subject").notNull(), // 'civil', 'civil-procedural', 'penal', 'penal-procedural'
  lawSource: text("law_source"), // 'Codul civil', 'Codul penal', etc.
  segments: jsonb("segments").notNull(), // {official, trad, puncte, juris, radar, logica, conex}
  rawContent: text("raw_content"), // concatenated full text for search
  batchId: varchar("batch_id").references(() => legalArticleBatches.id),
  isProcessedForRag: boolean("is_processed_for_rag").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const legalArticleBatches = pgTable("legal_article_batches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  batchName: text("batch_name").notNull(),
  subject: text("subject").notNull(),
  lawSource: text("law_source"), // 'Codul civil', 'Codul penal', etc.
  articleRange: text("article_range"), // '1166-1170'
  sourceLLM: text("source_llm"), // 'chatgpt', 'claude', 'gemini'
  articlesCount: integer("articles_count").default(0),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

export const legalArticleChunks = pgTable("legal_article_chunks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  articleId: varchar("article_id").references(() => legalArticles.id).notNull(),
  segmentType: text("segment_type").notNull(), // 'official', 'trad', 'puncte', 'juris', 'radar', 'logica', 'conex'
  chunkText: text("chunk_text").notNull(),
  chunkIndex: integer("chunk_index").notNull(),
  embedding: jsonb("embedding"), // array of 768 floats
  metadata: jsonb("metadata"), // {articleNumber, title, subject, segmentType}
  createdAt: timestamp("created_at").defaultNow(),
});

export const userCaseStudySubmissions = pgTable("user_case_study_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  caseStudyId: varchar("case_study_id").references(() => caseStudies.id).notNull(),
  userAnswer: text("user_answer").notNull(),
  aiGrade: text("ai_grade"), // stored as string "8.50"
  aiFeedback: text("ai_feedback"),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  timeSpent: integer("time_spent"), // seconds
});

// ============================================================================
// [NEW] SYLLABUS TOPIC MAPPINGS - Links tematica to legal content
// ============================================================================
export const syllabusTopicMappings = pgTable("syllabus_topic_mappings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  // Referință la syllabus.json
  syllabusId: text("syllabus_id").notNull().unique(), // ID din syllabus.json, ex: "disc-0-II-1"
  subject: text("subject").notNull(), // 'civil', 'civil-procedural', 'penal', 'penal-procedural'

  // Metadate
  topicTitle: text("topic_title").notNull(), // Titlul exact din syllabus
  parentId: text("parent_id"), // Pentru ierarhie (syllabus_id al părintelui)
  depth: integer("depth").default(0), // Nivel în ierarhie (0=disciplină, 1=capitol, etc.)
  sortOrder: integer("sort_order").default(0), // Pentru menținerea ordinii originale

  // Mapping spre conținut juridic
  articleRefs: jsonb("article_refs"), // Array: ["Art. 1166", "Art. 1167-1170"]
  articleRangeStart: integer("article_range_start"), // Pentru query, ex: 1166
  articleRangeEnd: integer("article_range_end"), // Pentru query, ex: 1170
  chapterPatterns: jsonb("chapter_patterns"), // Array pattern-uri pentru matching questions.chapter
  lawSources: jsonb("law_sources"), // Array: ["Codul civil", "Legea 287/2009"]

  // Stats cachate (actualizate pe baza userProgress)
  totalQuestions: integer("total_questions").default(0),
  totalArticles: integer("total_articles").default(0),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================================
// [NEW] USER SYLLABUS PROGRESS - Track progress per topic per user
// ============================================================================
export const userSyllabusProgress = pgTable("user_syllabus_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  syllabusTopicId: varchar("syllabus_topic_id").references(() => syllabusTopicMappings.id).notNull(),

  // Progress stats
  questionsAnswered: integer("questions_answered").default(0),
  questionsCorrect: integer("questions_correct").default(0),
  articlesRead: integer("articles_read").default(0), // Tracking ce a citit

  // Calculated
  progressPercent: integer("progress_percent").default(0), // 0-100

  lastActivityAt: timestamp("last_activity_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================================
// [NEW] LEGISLATIVE DATA INGESTION - Official Acts & Change Tracking
// ============================================================================

export const legislativeActs = pgTable("legislative_acts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  // Identificare oficială
  actType: text("act_type").notNull(), // 'cod_civil', 'cod_penal', 'lege_speciala'
  actNumber: text("act_number").notNull(), // '287/2009', '71/2011' 
  actTitle: text("act_title").notNull(),

  // Conținut
  fullText: text("full_text").notNull(), // Text consolidat oficial
  htmlText: text("html_text"), // Versiune formatată HTML

  // Metadate oficiale
  publishedInMO: text("published_in_mo"), // 'MO nr. 511/2011'
  effectiveDate: timestamp("effective_date"),
  lastModifiedDate: timestamp("last_modified_date"),

  // Sursa oficială
  sourceUrl: text("source_url").notNull(), // Link către legislatie.just.ro
  apiSourceId: text("api_source_id"), // ID-ul din API-ul legislativ
  fetchedAt: timestamp("fetched_at").defaultNow(),

  // Versioning pentru detectare modificări
  contentHash: text("content_hash").notNull(), // SHA-256 hash of fullText

  // Status
  isCurrentVersion: boolean("is_current_version").default(true),
  needsReview: boolean("needs_review").default(false), // Set when change detected

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const legislativeChangeLog = pgTable("legislative_change_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  actId: varchar("act_id").references(() => legislativeActs.id).notNull(),

  changeType: text("change_type").notNull(), // 'amendment', 'new_version', 'abrogation'
  changeDescription: text("change_description"),

  oldContentHash: text("old_content_hash"),
  newContentHash: text("new_content_hash"),

  affectedArticles: jsonb("affected_articles"), // Array de articole modificate

  detectedAt: timestamp("detected_at").defaultNow(),
  verifiedByUser: boolean("verified_by_user").default(false),
  verifiedAt: timestamp("verified_at"),
  verificationNotes: text("verification_notes"),
});

// ============================================================================
// [CLEAN ROOM] AI Compliance Audit Logs
// ============================================================================
export const cleanRoomAuditLogs = pgTable("clean_room_audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),

  // Generation metadata
  generationType: text("generation_type").notNull(), // 'legal_concept_explanation', 'question_explanation', etc.
  inputQuery: text("input_query").notNull(),
  modelUsed: text("model_used").notNull(),

  // The 3 required audit trail elements (Section 5.2 of Clean Room Protocol)
  systemPromptUsed: text("system_prompt_used").notNull(),
  contextProvided: text("context_provided").notNull(),  // Sanitized legal sources only
  outputGenerated: text("output_generated").notNull(),

  // Context source tracking
  contextSources: jsonb("context_sources"), // Array of {actName, articleNumber}

  // Optional plagiarism check result
  similarityScore: integer("similarity_score"), // 0-100 percentage

  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================================================
// [PILON 1] SECURITATE & MONETIZARE - Active Sessions

// ============================================================================
export const activeSessions = pgTable("active_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),

  // Device Fingerprint
  deviceFingerprint: text("device_fingerprint").notNull(),
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),

  // Session Management
  sessionToken: text("session_token").notNull().unique(),
  isActive: boolean("is_active").default(true),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  lastActivityAt: timestamp("last_activity_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

// ============================================================================
// [PILON 2] LEARNING ENGINE SRS - Spaced Repetition Cards
// ============================================================================
export const userSrsCards = pgTable("user_srs_cards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  questionId: varchar("question_id").references(() => questions.id).notNull(),

  // SuperMemo-2 Parameters
  interval: integer("interval").default(1), // days until next review
  easeFactor: integer("ease_factor").default(250), // 250 = 2.5 (stored *100)
  repetitionCount: integer("repetition_count").default(0),

  // Scheduling
  nextReviewAt: timestamp("next_review_at").notNull(),
  lastReviewedAt: timestamp("last_reviewed_at"),

  // Performance
  consecutiveCorrect: integer("consecutive_correct").default(0),
  totalReviews: integer("total_reviews").default(0),

  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================================================
// [PILON 2] LEARNING ENGINE SRS - Analytics Snapshots
// ============================================================================
export const analyticsSnapshots = pgTable("analytics_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),

  // Snapshot Data
  snapshotDate: timestamp("snapshot_date").notNull(),
  subject: text("subject"), // null = all subjects

  // Metrics
  totalQuestionsSolved: integer("total_questions_solved").default(0),
  accuracy: integer("accuracy").default(0), // percent 0-100
  averageTimePerQuestion: integer("avg_time_per_question"), // seconds
  streakDays: integer("streak_days").default(0),

  // SRS Metrics
  cardsReviewedToday: integer("cards_reviewed_today").default(0),
  cardsDueToday: integer("cards_due_today").default(0),
  retentionRate: integer("retention_rate"), // percent 0-100

  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================================================
// [PILON 3] INTEGRITATE CONȚINUT - Content Reports
// ============================================================================
export const contentReports = pgTable("content_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reporterId: varchar("reporter_id").references(() => users.id).notNull(),

  // Content Reference
  contentType: text("content_type").notNull(), // 'question', 'case_study', 'legal_article'
  contentId: varchar("content_id").notNull(),

  // Report Details
  reportType: text("report_type").notNull(), // 'error', 'outdated', 'unclear', 'duplicate'
  description: text("description").notNull(),
  suggestedCorrection: text("suggested_correction"),

  // Status
  status: text("status").default("pending"), // 'pending', 'reviewed', 'fixed', 'rejected'
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),

  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================================================
// [PILON 4] MODULE COMPLEXE - Essay Prompts with JSONB Rubric
// ============================================================================
export const essayPrompts = pgTable("essay_prompts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  createdBy: varchar("created_by").references(() => users.id).notNull(),

  // Content
  subject: text("subject").notNull(),
  examDay: text("exam_day"), // 'day1', 'day2'
  title: text("title").notNull(),
  prompt: text("prompt").notNull(),

  // Grading Rubric (JSONB)
  gradingRubric: jsonb("grading_rubric").notNull(),

  // Sample Answer
  sampleAnswer: text("sample_answer"),
  commonMistakes: jsonb("common_mistakes"),

  // Metadata
  difficulty: text("difficulty").notNull(),
  estimatedTime: integer("estimated_time"), // minutes
  sourceType: text("source_type"), // 'past_exam', 'ai_generated', 'manual'

  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================================================
// [PILON 4] MODULE COMPLEXE - User Essay Submissions
// ============================================================================
export const userEssaySubmissions = pgTable("user_essay_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  essayPromptId: varchar("essay_prompt_id").references(() => essayPrompts.id).notNull(),

  // User Response
  userAnswer: text("user_answer").notNull(),
  selfEvaluation: jsonb("self_evaluation"), // checklist completed by user
  selfScore: integer("self_score"),

  // AI Evaluation (optional)
  aiScore: integer("ai_score"),
  aiFeedback: text("ai_feedback"),
  aiRubricAnalysis: jsonb("ai_rubric_analysis"),

  timeSpent: integer("time_spent"), // seconds
  submittedAt: timestamp("submitted_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertQuestionSchema = createInsertSchema(questions).omit({
  id: true,
  createdAt: true,
});

export const insertQuizSessionSchema = createInsertSchema(quizSessions).omit({
  id: true,
  startedAt: true,
});

export const insertUserAnswerSchema = createInsertSchema(userAnswers).omit({
  id: true,
  answeredAt: true,
});

export const insertUserProgressSchema = createInsertSchema(userProgress).omit({
  id: true,
  updatedAt: true,
});

export const insertUploadedDocumentSchema = createInsertSchema(uploadedDocuments).omit({
  id: true,
  uploadedAt: true,
});

export const insertAiExplanationSchema = createInsertSchema(aiExplanations).omit({
  id: true,
  createdAt: true,
});

export const insertStudyPlanSchema = createInsertSchema(studyPlans).omit({
  id: true,
  generatedAt: true,
});

export const insertDocumentChunkSchema = createInsertSchema(documentChunks).omit({
  id: true,
  createdAt: true,
});

export const insertQuestionTopicSchema = createInsertSchema(questionTopics).omit({
  id: true,
  createdAt: true,
});

export const insertQuestionBatchSchema = createInsertSchema(questionBatches).omit({
  id: true,
  uploadedAt: true,
});

export const insertLegalResourceSchema = createInsertSchema(legalResources).omit({
  id: true,
  createdAt: true,
});

export const insertCaseStudySchema = createInsertSchema(caseStudies).omit({
  id: true,
  createdAt: true,
});

export const insertCaseStudyBatchSchema = createInsertSchema(caseStudyBatches).omit({
  id: true,
  uploadedAt: true,
});

export const insertLegalArticleSchema = createInsertSchema(legalArticles).omit({
  id: true,
  createdAt: true,
});

export const insertLegalArticleBatchSchema = createInsertSchema(legalArticleBatches).omit({
  id: true,
  uploadedAt: true,
});

export const insertLegalArticleChunkSchema = createInsertSchema(legalArticleChunks).omit({
  id: true,
  createdAt: true,
});

export const insertUserCaseStudySubmissionSchema = createInsertSchema(userCaseStudySubmissions).omit({
  id: true,
  submittedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Question = typeof questions.$inferSelect;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;

export type QuizSession = typeof quizSessions.$inferSelect;
export type InsertQuizSession = z.infer<typeof insertQuizSessionSchema>;

export type UserAnswer = typeof userAnswers.$inferSelect;
export type InsertUserAnswer = z.infer<typeof insertUserAnswerSchema>;

export type UserProgress = typeof userProgress.$inferSelect;
export type InsertUserProgress = z.infer<typeof insertUserProgressSchema>;

export type UploadedDocument = typeof uploadedDocuments.$inferSelect;
export type InsertUploadedDocument = z.infer<typeof insertUploadedDocumentSchema>;

export type AiExplanation = typeof aiExplanations.$inferSelect;
export type InsertAiExplanation = z.infer<typeof insertAiExplanationSchema>;

export type StudyPlan = typeof studyPlans.$inferSelect;
export type InsertStudyPlan = z.infer<typeof insertStudyPlanSchema>;

export type DocumentChunk = typeof documentChunks.$inferSelect;
export type InsertDocumentChunk = z.infer<typeof insertDocumentChunkSchema>;

export type QuestionTopic = typeof questionTopics.$inferSelect;
export type InsertQuestionTopic = z.infer<typeof insertQuestionTopicSchema>;

export type QuestionBatch = typeof questionBatches.$inferSelect;
export type InsertQuestionBatch = z.infer<typeof insertQuestionBatchSchema>;

export type LegalResource = typeof legalResources.$inferSelect;
export type InsertLegalResource = z.infer<typeof insertLegalResourceSchema>;

export type CaseStudy = typeof caseStudies.$inferSelect;
export type InsertCaseStudy = z.infer<typeof insertCaseStudySchema>;

export type CaseStudyBatch = typeof caseStudyBatches.$inferSelect;
export type InsertCaseStudyBatch = z.infer<typeof insertCaseStudyBatchSchema>;

export type LegalArticle = typeof legalArticles.$inferSelect;
export type InsertLegalArticle = z.infer<typeof insertLegalArticleSchema>;

export type LegalArticleBatch = typeof legalArticleBatches.$inferSelect;
export type InsertLegalArticleBatch = z.infer<typeof insertLegalArticleBatchSchema>;

export type LegalArticleChunk = typeof legalArticleChunks.$inferSelect;
export type InsertLegalArticleChunk = z.infer<typeof insertLegalArticleChunkSchema>;

export type UserCaseStudySubmission = typeof userCaseStudySubmissions.$inferSelect;
export type InsertUserCaseStudySubmission = z.infer<typeof insertUserCaseStudySubmissionSchema>;

// ============================================================================
// [NEW] Insert Schemas for SaaS Upgrade Tables
// ============================================================================
export const insertActiveSessionSchema = createInsertSchema(activeSessions).omit({
  id: true,
  createdAt: true,
});

export const insertUserSrsCardSchema = createInsertSchema(userSrsCards).omit({
  id: true,
  createdAt: true,
});

export const insertAnalyticsSnapshotSchema = createInsertSchema(analyticsSnapshots).omit({
  id: true,
  createdAt: true,
});

export const insertContentReportSchema = createInsertSchema(contentReports).omit({
  id: true,
  createdAt: true,
});

export const insertEssayPromptSchema = createInsertSchema(essayPrompts).omit({
  id: true,
  createdAt: true,
});

export const insertUserEssaySubmissionSchema = createInsertSchema(userEssaySubmissions).omit({
  id: true,
  submittedAt: true,
});

// ============================================================================
// [NEW] Types for SaaS Upgrade Tables
// ============================================================================
export type ActiveSession = typeof activeSessions.$inferSelect;
export type InsertActiveSession = z.infer<typeof insertActiveSessionSchema>;

export type UserSrsCard = typeof userSrsCards.$inferSelect;
export type InsertUserSrsCard = z.infer<typeof insertUserSrsCardSchema>;

export type AnalyticsSnapshot = typeof analyticsSnapshots.$inferSelect;
export type InsertAnalyticsSnapshot = z.infer<typeof insertAnalyticsSnapshotSchema>;

export type ContentReport = typeof contentReports.$inferSelect;
export type InsertContentReport = z.infer<typeof insertContentReportSchema>;

export type EssayPrompt = typeof essayPrompts.$inferSelect;
export type InsertEssayPrompt = z.infer<typeof insertEssayPromptSchema>;

export type UserEssaySubmission = typeof userEssaySubmissions.$inferSelect;
export type InsertUserEssaySubmission = z.infer<typeof insertUserEssaySubmissionSchema>;

// ============================================================================
// [NEW] Legislative Acts Insert Schemas & Types
// ============================================================================
export const insertLegislativeActSchema = createInsertSchema(legislativeActs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLegislativeChangeLogSchema = createInsertSchema(legislativeChangeLog).omit({
  id: true,
  detectedAt: true,
});

export type LegislativeAct = typeof legislativeActs.$inferSelect;
export type InsertLegislativeAct = z.infer<typeof insertLegislativeActSchema>;

export type LegislativeChangeLog = typeof legislativeChangeLog.$inferSelect;
export type InsertLegislativeChangeLog = z.infer<typeof insertLegislativeChangeLogSchema>;

// ============================================================================
// [CLEAN ROOM] Audit Logs Insert Schema & Types
// ============================================================================
export const insertCleanRoomAuditLogSchema = createInsertSchema(cleanRoomAuditLogs).omit({
  id: true,
  createdAt: true,
});

export type CleanRoomAuditLog = typeof cleanRoomAuditLogs.$inferSelect;
export type InsertCleanRoomAuditLog = z.infer<typeof insertCleanRoomAuditLogSchema>;

// ============================================================================
// [NEW] Syllabus Topic Mappings Insert Schemas & Types
// ============================================================================
export const insertSyllabusTopicMappingSchema = createInsertSchema(syllabusTopicMappings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSyllabusProgressSchema = createInsertSchema(userSyllabusProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type SyllabusTopicMapping = typeof syllabusTopicMappings.$inferSelect;
export type InsertSyllabusTopicMapping = z.infer<typeof insertSyllabusTopicMappingSchema>;

export type UserSyllabusProgress = typeof userSyllabusProgress.$inferSelect;
export type InsertUserSyllabusProgress = z.infer<typeof insertUserSyllabusProgressSchema>;
