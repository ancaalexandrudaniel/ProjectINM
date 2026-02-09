/**
 * Types for Essay/Probe Scrise features.
 */

export interface RubricItem {
  id: string;
  category: string;
  description: string;
  points: number;
  criteria: string[];
}

export interface EssayPrompt {
  id: string;
  subject: string;
  examDay: string;
  title: string;
  prompt: string;
  gradingRubric: RubricItem[];
  sampleAnswer?: string;
  commonMistakes?: string[];
  difficulty: string;
  estimatedTime: number;
  sourceType: string;
}
