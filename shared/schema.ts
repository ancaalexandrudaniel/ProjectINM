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
  difficulty: text("difficulty").notNull(), // 'easy', 'medium', 'hard'
  questionText: text("question_text").notNull(),
  options: jsonb("options").notNull(), // Array of option objects
  correctAnswer: integer("correct_answer").notNull(), // Index of correct option
  explanation: text("explanation").notNull(),
  legalReferences: jsonb("legal_references"), // Array of legal reference strings
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
