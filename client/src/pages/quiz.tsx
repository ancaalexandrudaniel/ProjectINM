import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Bookmark, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import QuestionCard from "@/components/quiz/question-card";
import AnswerFeedback from "@/components/quiz/answer-feedback";
import type { QuizQuestion, QuizSession, UserAnswer } from "@/types/quiz";
import { toast } from "@/hooks/use-toast";

export default function Quiz() {
  const [, params] = useRoute("/quiz/:subject?");
  const subject = params?.subject;
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [quizSession, setQuizSession] = useState<QuizSession | null>(null);
  const [isQuizComplete, setIsQuizComplete] = useState(false);

  const queryClient = useQueryClient();

  // Fetch random questions for quiz
  const { data: questions = [], isLoading } = useQuery<QuizQuestion[]>({
    queryKey: ['/api/quiz/random', subject],
    queryFn: async () => {
      const url = subject 
        ? `/api/quiz/random?subject=${subject}&count=20`
        : '/api/quiz/random?count=20';
      const response = await fetch(url);
      return response.json();
    },
  });

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Create quiz session when questions load
  useEffect(() => {
    if (questions.length > 0 && !quizSession) {
      createSession.mutate({
        subject: subject || undefined,
        sessionType: 'practice',
        questions: questions.map(q => q.id),
        totalQuestions: questions.length,
        correctAnswers: 0
      });
    }
  }, [questions, quizSession]);

  const createSession = useMutation({
    mutationFn: async (sessionData: any) => {
      const response = await fetch('/api/quiz/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData)
      });
      return response.json();
    },
    onSuccess: (session) => {
      setQuizSession(session);
    }
  });

  const submitAnswer = useMutation({
    mutationFn: async (answerData: any) => {
      const response = await fetch('/api/quiz/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(answerData)
      });
      return response.json();
    },
    onSuccess: (answer) => {
      setUserAnswers(prev => [...prev, answer]);
      setShowFeedback(true);
      
      // Invalidate progress data to refresh
      queryClient.invalidateQueries({ queryKey: ['/api/progress'] });
    }
  });

  const completeSession = useMutation({
    mutationFn: async () => {
      if (!quizSession) return;
      
      const correctCount = userAnswers.filter(a => a.isCorrect).length;
      const response = await fetch(`/api/quiz/session/${quizSession.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          correctAnswers: correctCount,
          timeSpent: timeElapsed
        })
      });
      return response.json();
    },
    onSuccess: () => {
      setIsQuizComplete(true);
      
      // Invalidate queries to refresh dashboard stats
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/progress'] });
      
      toast({
        title: "Test completat!",
        description: `Ai răspuns corect la ${userAnswers.filter(a => a.isCorrect).length} din ${questions.length} întrebări.`
      });
    }
  });

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleAnswerSelect = (answerIndex: number) => {
    if (showFeedback) return;
    setSelectedAnswer(answerIndex);
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null || !questions[currentQuestionIndex] || !quizSession) return;

    const question = questions[currentQuestionIndex];
    const isCorrect = selectedAnswer === question.correctAnswer;

    submitAnswer.mutate({
      sessionId: quizSession.id,
      questionId: question.id,
      selectedAnswer,
      isCorrect,
      timeToAnswer: 30 // Mock time for now
    });
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
    } else {
      // Quiz complete
      completeSession.mutate();
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Se încarcă întrebările...</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-xl font-semibold mb-2">Nu s-au găsit întrebări</p>
          <p className="text-muted-foreground">Te rugăm să încerci din nou.</p>
        </div>
      </div>
    );
  }

  if (isQuizComplete) {
    const correctAnswers = userAnswers.filter(a => a.isCorrect).length;
    const accuracy = Math.round((correctAnswers / questions.length) * 100);

    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Test Completat!</h2>
          <div className="text-6xl font-bold text-primary mb-4">{accuracy}%</div>
          <p className="text-xl mb-6">
            Ai răspuns corect la {correctAnswers} din {questions.length} întrebări
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-secondary rounded-lg p-4">
              <div className="text-2xl font-bold text-success">{correctAnswers}</div>
              <div className="text-sm text-muted-foreground">Răspunsuri Corecte</div>
            </div>
            <div className="bg-secondary rounded-lg p-4">
              <div className="text-2xl font-bold text-destructive">
                {questions.length - correctAnswers}
              </div>
              <div className="text-sm text-muted-foreground">Răspunsuri Greșite</div>
            </div>
            <div className="bg-secondary rounded-lg p-4">
              <div className="text-2xl font-bold text-primary">{formatTime(timeElapsed)}</div>
              <div className="text-sm text-muted-foreground">Timp Total</div>
            </div>
          </div>
          <div className="flex justify-center gap-4">
            <Button onClick={() => window.location.reload()} data-testid="restart-quiz">
              Încearcă Din Nou
            </Button>
            <Button variant="outline" onClick={() => window.history.back()}>
              Înapoi la Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = Math.round(((currentQuestionIndex + 1) / questions.length) * 100);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-card border border-border rounded-lg shadow-sm">
        {/* Header */}
        <div className="border-b border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-semibold">Test Interactiv</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {subject && subject.charAt(0).toUpperCase() + subject.slice(1)} - Dificultate Medie
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-secondary px-4 py-2 rounded-lg">
                <Clock className="h-5 w-5 text-accent" />
                <span className="font-mono font-semibold text-lg" data-testid="quiz-timer">
                  {formatTime(timeElapsed)}
                </span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => window.history.back()} data-testid="close-quiz">
                <X className="h-5 w-5 text-destructive" />
              </Button>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {/* Progress */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground" data-testid="question-counter">
                Întrebarea {currentQuestionIndex + 1} din {questions.length}
              </span>
              <span className="text-sm font-medium text-primary" data-testid="progress-percentage">
                {progress}% completat
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
          
          {/* Question */}
          <QuestionCard
            question={currentQuestion}
            questionNumber={currentQuestionIndex + 1}
            selectedAnswer={selectedAnswer}
            onAnswerSelect={handleAnswerSelect}
            showCorrectAnswer={showFeedback}
          />
          
          {/* Feedback */}
          {showFeedback && (
            <div className="mt-6">
              <AnswerFeedback
                question={currentQuestion}
                userAnswer={selectedAnswer}
                isCorrect={selectedAnswer === currentQuestion.correctAnswer}
              />
            </div>
          )}
          
          {/* Actions */}
          <div className="flex items-center justify-between pt-6 border-t border-border">
            <Button
              variant="ghost"
              onClick={handlePreviousQuestion}
              disabled={currentQuestionIndex === 0}
              data-testid="previous-question"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Înapoi
            </Button>
            
            <div className="flex gap-3">
              <Button variant="outline" data-testid="bookmark-question">
                <Bookmark className="h-4 w-4 mr-2" />
                Marchează
              </Button>
              
              {!showFeedback ? (
                <Button
                  onClick={handleSubmitAnswer}
                  disabled={selectedAnswer === null || submitAnswer.isPending}
                  data-testid="submit-answer"
                >
                  {submitAnswer.isPending ? 'Se trimite...' : 'Trimite Răspuns'}
                </Button>
              ) : (
                <Button onClick={handleNextQuestion} data-testid="next-question">
                  {currentQuestionIndex === questions.length - 1 ? 'Finalizează' : 'Următoarea'}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
