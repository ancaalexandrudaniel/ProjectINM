import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  ArrowLeft, 
  ArrowRight, 
  Flame, 
  Clock, 
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Ban,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import type { QuizQuestion } from "@/types/quiz";

interface GodModeQuestion extends QuizQuestion {
  correctAnswersSet: number[];
  hasZeroCorrect: boolean;
}

function generateGodModeAnswers(question: QuizQuestion, set: 'A' | 'B' | 'C'): GodModeQuestion {
  const realCorrect = question.correctAnswer;
  const optionsCount = question.options?.length || 4;
  
  let correctAnswersSet: number[] = [];
  let hasZeroCorrect = false;

  if (set === 'A') {
    correctAnswersSet = [realCorrect];
  } else if (set === 'B') {
    const count = Math.floor(Math.random() * 3) + 1;
    correctAnswersSet = [realCorrect];
    const otherIndices = Array.from({ length: optionsCount }, (_, i) => i).filter(i => i !== realCorrect);
    const shuffled = otherIndices.sort(() => Math.random() - 0.5);
    for (let i = 0; i < count - 1 && i < shuffled.length; i++) {
      correctAnswersSet.push(shuffled[i]);
    }
    correctAnswersSet.sort((a, b) => a - b);
  } else {
    const rand = Math.random();
    if (rand < 0.15) {
      correctAnswersSet = [];
      hasZeroCorrect = true;
    } else {
      const count = Math.floor(Math.random() * 4) + 1;
      correctAnswersSet = [realCorrect];
      const otherIndices = Array.from({ length: optionsCount }, (_, i) => i).filter(i => i !== realCorrect);
      const shuffled = otherIndices.sort(() => Math.random() - 0.5);
      for (let i = 0; i < count - 1 && i < shuffled.length; i++) {
        correctAnswersSet.push(shuffled[i]);
      }
      correctAnswersSet.sort((a, b) => a - b);
    }
  }

  return {
    ...question,
    correctAnswersSet,
    hasZeroCorrect
  };
}

export default function QuizGodMode() {
  const searchParams = new URLSearchParams(window.location.search);
  const godModeSet = (searchParams.get('godModeSet') || 'A') as 'A' | 'B' | 'C';
  const subjects = searchParams.get('subjects') || 'all';
  const questionCount = parseInt(searchParams.get('questionCount') || '20');

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [noCorrectSelected, setNoCorrectSelected] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [results, setResults] = useState<{ correct: boolean }[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  const queryClient = useQueryClient();

  const { data: rawQuestions = [], isLoading } = useQuery<QuizQuestion[]>({
    queryKey: ['/api/quiz/random', subjects, questionCount, 'god-mode'],
    queryFn: async () => {
      const url = subjects !== 'all' 
        ? `/api/quiz/random?subject=${subjects}&count=${questionCount}`
        : `/api/quiz/random?count=${questionCount}`;
      const response = await fetch(url);
      return response.json();
    },
  });

  const questions = useMemo(() => {
    return rawQuestions.map(q => generateGodModeAnswers(q, godModeSet));
  }, [rawQuestions, godModeSet]);

  useEffect(() => {
    if (isComplete) return;
    const timer = setInterval(() => setTimeElapsed(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [isComplete]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleAnswer = (index: number) => {
    if (showFeedback) return;
    setNoCorrectSelected(false);
    setSelectedAnswers(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const selectNoCorrect = () => {
    if (showFeedback) return;
    setSelectedAnswers([]);
    setNoCorrectSelected(true);
  };

  const checkAnswer = () => {
    const question = questions[currentIndex];
    if (!question) return;

    let isCorrect = false;

    if (question.hasZeroCorrect) {
      isCorrect = noCorrectSelected;
    } else {
      const sortedSelected = [...selectedAnswers].sort((a, b) => a - b);
      const sortedCorrect = [...question.correctAnswersSet].sort((a, b) => a - b);
      isCorrect = sortedSelected.length === sortedCorrect.length &&
                  sortedSelected.every((v, i) => v === sortedCorrect[i]);
    }

    setResults(prev => [...prev, { correct: isCorrect }]);
    setShowFeedback(true);
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswers([]);
      setNoCorrectSelected(false);
      setShowFeedback(false);
    } else {
      setIsComplete(true);
      const correctCount = results.filter(r => r.correct).length;
      toast({
        title: "God Mode Completat!",
        description: `Ai răspuns corect la ${correctCount} din ${questions.length} întrebări.`
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Se pregătește God Mode...</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-xl font-semibold mb-2">Nu s-au găsit întrebări</p>
          <Link href="/quiz-select">
            <Button>Înapoi la Selecție</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isComplete) {
    const correctCount = results.filter(r => r.correct).length;
    const accuracy = Math.round((correctCount / questions.length) * 100);

    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Flame className="h-10 w-10 text-orange-500" />
            <h2 className="text-3xl font-bold">God Mode Completat!</h2>
          </div>
          <Badge variant="outline" className="mb-4">Set {godModeSet}</Badge>
          <div className="text-6xl font-bold text-primary mb-4">{accuracy}%</div>
          <p className="text-xl mb-6">
            {correctCount} corecte din {questions.length} întrebări
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-500">{correctCount}</div>
              <div className="text-sm text-muted-foreground">Corecte</div>
            </div>
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <div className="text-2xl font-bold text-red-500">{questions.length - correctCount}</div>
              <div className="text-sm text-muted-foreground">Greșite</div>
            </div>
            <div className="bg-secondary rounded-lg p-4">
              <div className="text-2xl font-bold text-primary">{formatTime(timeElapsed)}</div>
              <div className="text-sm text-muted-foreground">Timp</div>
            </div>
          </div>

          <div className="flex justify-center gap-4">
            <Button onClick={() => window.location.reload()} data-testid="restart-quiz">
              <Flame className="h-4 w-4 mr-2" />
              Încearcă Din Nou
            </Button>
            <Link href="/quiz-select">
              <Button variant="outline">Schimbă Modul</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const question = questions[currentIndex];
  const progress = Math.round(((currentIndex + 1) / questions.length) * 100);

  const setColors = {
    'A': 'text-green-500 border-green-500',
    'B': 'text-yellow-500 border-yellow-500', 
    'C': 'text-red-500 border-red-500'
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-card border border-orange-500/30 rounded-lg shadow-lg">
        <div className="border-b border-border p-6 bg-gradient-to-r from-orange-500/10 to-red-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Flame className="h-8 w-8 text-orange-500" />
              <div>
                <h3 className="text-2xl font-semibold">God Mode</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className={setColors[godModeSet]}>
                    Set {godModeSet}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {godModeSet === 'A' && 'Exact 1 corectă'}
                    {godModeSet === 'B' && '1-3 corecte'}
                    {godModeSet === 'C' && '0-4 corecte'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-secondary px-4 py-2 rounded-lg">
                <Clock className="h-5 w-5 text-orange-500" />
                <span className="font-mono font-semibold text-lg">{formatTime(timeElapsed)}</span>
              </div>
              <Link href="/quiz-select">
                <Button variant="ghost" size="icon">
                  <X className="h-5 w-5 text-destructive" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                Întrebarea {currentIndex + 1} din {questions.length}
              </span>
              <span className="text-sm font-medium text-primary">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="secondary">{question.chapter}</Badge>
              {question.difficulty && (
                <Badge variant="outline">{question.difficulty}</Badge>
              )}
            </div>
            <h4 className="text-xl font-medium leading-relaxed">{question.questionText}</h4>
          </div>

          {godModeSet !== 'A' && (
            <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg mb-4 text-sm">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <span className="text-orange-400">
                  {godModeSet === 'B' 
                    ? 'Selectează TOATE răspunsurile corecte (1-3)'
                    : 'Pot fi 0-4 răspunsuri corecte. Dacă niciunul nu e corect, apasă "Niciunul corect".'}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-3 mb-6">
            {question.options?.map((option: any, index: number) => {
              const isSelected = selectedAnswers.includes(index);
              const isCorrect = question.correctAnswersSet.includes(index);
              
              let optionClass = 'border-border hover:border-primary/50';
              if (showFeedback) {
                if (isCorrect) {
                  optionClass = 'border-green-500 bg-green-500/10';
                } else if (isSelected && !isCorrect) {
                  optionClass = 'border-red-500 bg-red-500/10';
                }
              } else if (isSelected) {
                optionClass = 'border-primary bg-primary/10';
              }

              return (
                <div
                  key={index}
                  onClick={() => toggleAnswer(index)}
                  className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-all ${optionClass}`}
                  data-testid={`option-${index}`}
                >
                  <Checkbox
                    checked={isSelected}
                    disabled={showFeedback}
                    className="h-5 w-5"
                  />
                  <span className="font-semibold text-muted-foreground w-6">
                    {String.fromCharCode(65 + index)})
                  </span>
                  <span className="flex-1">{option.text || option}</span>
                  {showFeedback && isCorrect && (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  )}
                  {showFeedback && isSelected && !isCorrect && (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
              );
            })}

            {godModeSet === 'C' && (
              <div
                onClick={selectNoCorrect}
                className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-all ${
                  showFeedback && question.hasZeroCorrect
                    ? 'border-green-500 bg-green-500/10'
                    : showFeedback && noCorrectSelected && !question.hasZeroCorrect
                    ? 'border-red-500 bg-red-500/10'
                    : noCorrectSelected
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
                data-testid="option-none"
              >
                <Checkbox
                  checked={noCorrectSelected}
                  disabled={showFeedback}
                  className="h-5 w-5"
                />
                <Ban className="h-5 w-5 text-muted-foreground" />
                <span className="flex-1 font-medium">Niciunul corect</span>
                {showFeedback && question.hasZeroCorrect && (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                )}
              </div>
            )}
          </div>

          {showFeedback && (
            <div className={`p-4 rounded-lg mb-6 ${
              results[results.length - 1]?.correct 
                ? 'bg-green-500/10 border border-green-500/30' 
                : 'bg-red-500/10 border border-red-500/30'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {results[results.length - 1]?.correct ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="font-semibold text-green-500">Corect!</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-500" />
                    <span className="font-semibold text-red-500">Greșit</span>
                  </>
                )}
              </div>
              {question.explanation && (
                <p className="text-sm text-muted-foreground">{question.explanation}</p>
              )}
              {!results[results.length - 1]?.correct && (
                <p className="text-sm mt-2">
                  <strong>Răspunsuri corecte:</strong>{' '}
                  {question.hasZeroCorrect 
                    ? 'Niciunul' 
                    : question.correctAnswersSet.map(i => String.fromCharCode(65 + i)).join(', ')}
                </p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-6 border-t border-border">
            <div className="text-sm text-muted-foreground">
              Scor: {results.filter(r => r.correct).length} / {results.length}
            </div>
            
            {!showFeedback ? (
              <Button
                onClick={checkAnswer}
                disabled={selectedAnswers.length === 0 && !noCorrectSelected}
                data-testid="submit-answer"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Verifică
              </Button>
            ) : (
              <Button onClick={nextQuestion} data-testid="next-question">
                {currentIndex === questions.length - 1 ? 'Finalizează' : 'Următoarea'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
