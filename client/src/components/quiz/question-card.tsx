import type { QuizQuestion } from "@/types/quiz";

interface QuestionCardProps {
  question: QuizQuestion;
  questionNumber: number;
  selectedAnswer: number | null;
  onAnswerSelect: (index: number) => void;
  showCorrectAnswer?: boolean;
}

export default function QuestionCard({
  question,
  questionNumber,
  selectedAnswer,
  onAnswerSelect,
  showCorrectAnswer = false
}: QuestionCardProps) {
  const getOptionClass = (index: number) => {
    let baseClass = "quiz-option w-full text-left p-4 border-2 border-border rounded-lg transition-all cursor-pointer";
    
    if (showCorrectAnswer) {
      if (index === question.correctAnswer) {
        baseClass += " correct border-success bg-success/5";
      } else if (index === selectedAnswer && index !== question.correctAnswer) {
        baseClass += " incorrect border-destructive bg-destructive/5";
      }
    } else if (selectedAnswer === index) {
      baseClass += " selected border-primary bg-primary/5";
    } else {
      baseClass += " hover:border-primary";
    }
    
    return baseClass;
  };

  const getOptionLetter = (index: number) => {
    return String.fromCharCode(65 + index); // A, B, C, D
  };

  const subjectNames = {
    civil: 'Drept Civil',
    'civil-procedural': 'Drept Procesual Civil',
    penal: 'Drept Penal',
    'penal-procedural': 'Drept Procesual Penal'
  };

  return (
    <div className="space-y-6">
      {/* Question Card */}
      <div className="bg-secondary/50 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
            {questionNumber}
          </div>
          <div className="flex-1">
            <p className="text-lg font-medium leading-relaxed mb-4" data-testid="question-text">
              {question.questionText}
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs bg-accent/10 text-accent px-3 py-1 rounded-full font-medium">
                {subjectNames[question.subject as keyof typeof subjectNames] || question.subject}
              </span>
              <span className="text-xs bg-muted text-muted-foreground px-3 py-1 rounded-full">
                {question.chapter}
              </span>
              <span className="text-xs bg-muted text-muted-foreground px-3 py-1 rounded-full">
                Dificultate {question.difficulty === 'easy' ? 'Ușoară' : 
                question.difficulty === 'medium' ? 'Medie' : 'Grea'}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Answer Options */}
      <div className="space-y-3">
        {question.options.map((option, index) => (
          <button
            key={index}
            className={getOptionClass(index)}
            onClick={() => !showCorrectAnswer && onAnswerSelect(index)}
            disabled={showCorrectAnswer}
            data-testid={`option-${getOptionLetter(index).toLowerCase()}`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                showCorrectAnswer && index === question.correctAnswer
                  ? 'bg-success text-success-foreground border-success'
                  : selectedAnswer === index
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border'
              }`}>
                <span className="text-sm font-semibold">{getOptionLetter(index)}</span>
              </div>
              <p className="flex-1">{option.text}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
