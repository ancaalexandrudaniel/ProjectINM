export interface QuizOption {
  text: string;
  correct: boolean;
}

export interface VariantAnalysis {
  este_corecta: boolean;
  explicatie: string;
}

export interface FeedbackDetailed {
  explicatie_generala?: string;
  analiza_variante?: Record<string, VariantAnalysis>;
  retine?: string | string[];
  schema_aplicatie_practica?: string;
  atentie?: string;
  exceptii?: any;
  are_exceptii?: boolean;
}

export interface QuizQuestion {
  id: string;
  subject: string;
  chapter: string;
  difficulty: string;
  questionText: string;
  options: QuizOption[];
  correctAnswer: number;
  explanation: string;
  legalReferences?: string[];
  feedbackDetailed?: FeedbackDetailed;
  keyConcepts?: string[];
  hasExceptions?: boolean;
}

export interface QuizSession {
  id: string;
  userId: string;
  subject?: string;
  sessionType: 'practice' | 'simulation' | 'weak-points';
  questions: string[];
  startedAt: Date;
  completedAt?: Date;
  totalQuestions: number;
  correctAnswers: number;
  timeSpent?: number;
}

export interface UserAnswer {
  id: string;
  userId: string;
  sessionId?: string;
  questionId: string;
  selectedAnswer?: number;
  isCorrect: boolean;
  timeToAnswer?: number;
  answeredAt: Date;
}

export interface UserProgress {
  id: string;
  userId: string;
  subject: string;
  chapter: string;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  lastPracticed?: Date;
  updatedAt: Date;
}

export interface SubjectInfo {
  id: string;
  name: string;
  icon: string;
  progress: number;
  totalQuestions: number;
  correctAnswers: number;
  lastSession?: Date;
}

export interface WeakPoint {
  subject: string;
  chapter: string;
  accuracy: number;
  totalQuestions: number;
  incorrectAnswers: number;
  priority: 'high' | 'medium' | 'low';
}

export type QuizMode = 'practice' | 'simulation' | 'weak-points';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Subject = 'civil' | 'civil-procedural' | 'penal' | 'penal-procedural';
