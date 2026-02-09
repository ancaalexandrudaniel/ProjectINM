/**
 * Types for Time Machine exam simulations (Proba 1 & 2).
 */

// Proba 1 - Grid/Multiple Choice
export interface QuestionOption {
  id?: number;
  text: string;
}

export interface ExamQuestion {
  id: string;
  questionText: string;
  options: (string | QuestionOption)[];
  correctAnswer: number;
  subject: string;
}

export interface ExamSection {
  id: string;
  name: string;
  shortName: string;
  questions: ExamQuestion[];
}

export interface ExamResult {
  totalCorrect: number;
  bySection: Record<string, { correct: number; total: number }>;
  passed: boolean;
  percentage: number;
  timeUsed: number;
}

// Proba 2 - Written/Essay exam
export interface ExamRequirement {
  id: string;
  requirementId: string; // '1.1', '1.2', '2.1'
  requirementText: string;
  points: string;
  recommendedTime?: number;
  solution: string;
  rubric: Array<{ criterion: string; points: string }>;
}

export interface ExamSubject {
  subjectId: string; // 'civil-1', 'civil-2', 'proc-1'
  subjectTitle: string;
  subjectArea: string; // 'Drept Civil' | 'Drept Procesual Civil'
  scenario?: string;
  requirements: ExamRequirement[];
}

export interface ExamData {
  year: number;
  discipline: string; // 'civil-combined' | 'penal-combined'
  subjects: ExamSubject[];
  totalPoints: number;
}

export interface UserAnswers {
  [requirementId: string]: string;
}

export interface GradingResult {
  totalScore: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  bySubject: Record<string, { score: number; max: number }>;
  feedback: Array<{
    requirementId: string;
    score: number;
    maxScore: number;
    feedback: string;
    strengths: string[];
    improvements: string[];
  }>;
  overallFeedback: string;
  expressionScore: number;
}

// Exam constants
export const EXAM_DURATION = 4 * 60 * 60; // 4 hours in seconds
export const QUESTIONS_PER_SECTION = 25;
export const TOTAL_QUESTIONS = 100;
export const PASS_THRESHOLD = 60;
