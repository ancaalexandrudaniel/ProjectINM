import { CheckCircle, XCircle, Lightbulb, BookOpen } from "lucide-react";
import type { QuizQuestion } from "@/types/quiz";

interface AnswerFeedbackProps {
  question: QuizQuestion;
  userAnswer: number | null;
  isCorrect: boolean;
}

export default function AnswerFeedback({ question, userAnswer, isCorrect }: AnswerFeedbackProps) {
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg">
      <div className="p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
            isCorrect ? 'bg-success/10' : 'bg-destructive/10'
          }`}>
            {isCorrect ? (
              <CheckCircle className="text-success h-6 w-6" />
            ) : (
              <XCircle className="text-destructive h-6 w-6" />
            )}
          </div>
          <div>
            <h4 className={`text-xl font-semibold mb-2 ${
              isCorrect ? 'text-success' : 'text-destructive'
            }`} data-testid="feedback-title">
              {isCorrect ? 'Răspuns Corect!' : 'Răspuns Greșit'}
            </h4>
            <p className="text-muted-foreground">
              {isCorrect 
                ? `Varianta ${String.fromCharCode(65 + question.correctAnswer)} este corectă.`
                : `Răspunsul corect este varianta ${String.fromCharCode(65 + question.correctAnswer)}.`
              }
            </p>
          </div>
        </div>
        
        <div className="bg-secondary/50 rounded-lg p-6 mb-4">
          <h5 className="font-semibold mb-3 flex items-center gap-2">
            <Lightbulb className="text-primary h-5 w-5" />
            Explicație Juridică Detaliată
          </h5>
          <p className="text-sm leading-relaxed text-foreground/90" data-testid="explanation-text">
            {question.explanation}
          </p>
        </div>
        
        {question.legalReferences && question.legalReferences.length > 0 && (
          <div className="bg-accent/5 border border-accent/20 rounded-lg p-4">
            <h6 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <BookOpen className="text-accent h-4 w-4" />
              Legislație Relevantă
            </h6>
            <ul className="text-sm space-y-1 text-muted-foreground">
              {question.legalReferences.map((reference, index) => (
                <li key={index} data-testid={`legal-ref-${index}`}>• {reference}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
