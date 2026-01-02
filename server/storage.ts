import { 
  users,
  questions,
  quizSessions,
  userAnswers,
  userProgress,
  type User, 
  type InsertUser,
  type Question,
  type InsertQuestion,
  type QuizSession,
  type InsertQuizSession,
  type UserAnswer,
  type InsertUserAnswer,
  type UserProgress,
  type InsertUserProgress
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql as drizzleSql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Questions
  getAllQuestions(): Promise<Question[]>;
  getQuestionsBySubject(subject: string): Promise<Question[]>;
  getQuestionsByChapter(subject: string, chapter: string): Promise<Question[]>;
  getQuestionsByDifficulty(difficulty: string): Promise<Question[]>;
  getRandomQuestions(subject?: string, count?: number, setType?: string): Promise<Question[]>;
  createQuestion(question: InsertQuestion): Promise<Question>;

  // Quiz Sessions
  createQuizSession(session: InsertQuizSession): Promise<QuizSession>;
  getQuizSession(id: string): Promise<QuizSession | undefined>;
  updateQuizSession(id: string, updates: Partial<QuizSession>): Promise<QuizSession | undefined>;
  getUserQuizSessions(userId: string): Promise<QuizSession[]>;

  // User Answers
  createUserAnswer(answer: InsertUserAnswer): Promise<UserAnswer>;
  getUserAnswers(userId: string): Promise<UserAnswer[]>;
  getSessionAnswers(sessionId: string): Promise<UserAnswer[]>;

  // User Progress
  getUserProgress(userId: string): Promise<UserProgress[]>;
  getSubjectProgress(userId: string, subject: string): Promise<UserProgress[]>;
  updateUserProgress(userId: string, subject: string, chapter: string, updates: Partial<UserProgress>): Promise<UserProgress>;
}

// Reference: blueprint:javascript_database
export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Questions
  async getAllQuestions(): Promise<Question[]> {
    return await db.select().from(questions);
  }

  async getQuestionsBySubject(subject: string): Promise<Question[]> {
    return await db.select().from(questions).where(eq(questions.subject, subject));
  }

  async getQuestionsByChapter(subject: string, chapter: string): Promise<Question[]> {
    return await db.select().from(questions)
      .where(and(
        eq(questions.subject, subject),
        eq(questions.chapter, chapter)
      ));
  }

  async getQuestionsByDifficulty(difficulty: string): Promise<Question[]> {
    return await db.select().from(questions).where(eq(questions.difficulty, difficulty));
  }

  async getRandomQuestions(subject?: string, count = 20, setType?: string): Promise<Question[]> {
    let conditions = [];
    
    if (subject) {
      conditions.push(eq(questions.subject, subject));
    }
    
    if (setType) {
      conditions.push(eq(questions.setType, setType));
    }
    
    const query = conditions.length > 0
      ? db.select().from(questions).where(and(...conditions)).orderBy(drizzleSql`RANDOM()`).limit(count)
      : db.select().from(questions).orderBy(drizzleSql`RANDOM()`).limit(count);
    
    return await query;
  }

  async createQuestion(insertQuestion: InsertQuestion): Promise<Question> {
    const [question] = await db
      .insert(questions)
      .values(insertQuestion)
      .returning();
    return question;
  }

  // Quiz Sessions
  async createQuizSession(insertSession: InsertQuizSession): Promise<QuizSession> {
    const [session] = await db
      .insert(quizSessions)
      .values(insertSession)
      .returning();
    return session;
  }

  async getQuizSession(id: string): Promise<QuizSession | undefined> {
    const [session] = await db.select().from(quizSessions).where(eq(quizSessions.id, id));
    return session || undefined;
  }

  async updateQuizSession(id: string, updates: Partial<QuizSession>): Promise<QuizSession | undefined> {
    // Only update fields that are actually provided in updates
    const allowedUpdates: Partial<QuizSession> = {};
    
    if (updates.completedAt !== undefined) allowedUpdates.completedAt = updates.completedAt;
    if (updates.correctAnswers !== undefined) allowedUpdates.correctAnswers = updates.correctAnswers;
    if (updates.timeSpent !== undefined) allowedUpdates.timeSpent = updates.timeSpent;
    if (updates.subject !== undefined) allowedUpdates.subject = updates.subject;
    
    // Guard against empty update payloads
    if (Object.keys(allowedUpdates).length === 0) {
      return await this.getQuizSession(id);
    }
    
    const [session] = await db
      .update(quizSessions)
      .set(allowedUpdates)
      .where(eq(quizSessions.id, id))
      .returning();
    return session || undefined;
  }

  async getUserQuizSessions(userId: string): Promise<QuizSession[]> {
    return await db.select().from(quizSessions).where(eq(quizSessions.userId, userId));
  }

  // User Answers
  async createUserAnswer(insertAnswer: InsertUserAnswer): Promise<UserAnswer> {
    const [answer] = await db
      .insert(userAnswers)
      .values(insertAnswer)
      .returning();
    return answer;
  }

  async getUserAnswers(userId: string): Promise<UserAnswer[]> {
    return await db.select().from(userAnswers).where(eq(userAnswers.userId, userId));
  }

  async getSessionAnswers(sessionId: string): Promise<UserAnswer[]> {
    return await db.select().from(userAnswers).where(eq(userAnswers.sessionId, sessionId));
  }

  // User Progress
  async getUserProgress(userId: string): Promise<UserProgress[]> {
    return await db.select().from(userProgress).where(eq(userProgress.userId, userId));
  }

  async getSubjectProgress(userId: string, subject: string): Promise<UserProgress[]> {
    return await db.select().from(userProgress)
      .where(and(
        eq(userProgress.userId, userId),
        eq(userProgress.subject, subject)
      ));
  }

  async updateUserProgress(
    userId: string, 
    subject: string, 
    chapter: string, 
    updates: Partial<UserProgress>
  ): Promise<UserProgress> {
    // Check if progress record exists
    const [existing] = await db.select().from(userProgress)
      .where(and(
        eq(userProgress.userId, userId),
        eq(userProgress.subject, subject),
        eq(userProgress.chapter, chapter)
      ));

    if (existing) {
      // Update existing record
      const [updated] = await db
        .update(userProgress)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(and(
          eq(userProgress.userId, userId),
          eq(userProgress.subject, subject),
          eq(userProgress.chapter, chapter)
        ))
        .returning();
      return updated;
    } else {
      // Create new record
      const [created] = await db
        .insert(userProgress)
        .values({
          userId,
          subject,
          chapter,
          totalQuestions: 0,
          correctAnswers: 0,
          accuracy: 0,
          ...updates
        })
        .returning();
      return created;
    }
  }
}

export const storage = new DatabaseStorage();
