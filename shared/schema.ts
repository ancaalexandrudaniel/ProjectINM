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
});

export const questions = pgTable("questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  subject: text("subject").notNull(), // 'civil', 'civil-procedural', 'penal', 'penal-procedural'
  chapter: text("chapter").notNull(),
  topic: text("topic"), // specific topic within chapter
  difficulty: text("difficulty").notNull(), // 'easy', 'medium', 'hard'
  questionText: text("question_text").notNull(),
  options: jsonb("options").notNull(), // Array of option objects
  correctAnswer: integer("correct_answer"), // Index of correct option (null for multiple correct)
  correctAnswersMultiple: jsonb("correct_answers_multiple"), // Array of indices for God Mode (e.g., [0,2] or [] for "none correct")
  explanation: text("explanation").notNull(),
  legalReferences: jsonb("legal_references"), // Array of legal reference strings
  aiFeedback: text("ai_feedback"), // AI-generated feedback from LLM session
  sourceType: text("source_type"), // 'llm-session', 'manual', 'exam-past'
  sourceLLM: text("source_llm"), // 'chatgpt', 'claude', 'gemini'
  batchId: varchar("batch_id"), // reference to question batch
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
