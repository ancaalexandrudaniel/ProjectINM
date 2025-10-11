import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { 
  ArrowLeft, 
  Scale, 
  FileText, 
  Shield, 
  Gavel,
  AlertCircle,
  BookOpen,
  CheckCircle,
  XCircle,
  Sparkles
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Question, UserAnswer } from "@shared/schema";
import { useState } from "react";

interface WrongAnswerWithQuestion extends UserAnswer {
  question: Question;
}

const subjectIcons = {
  'civil': Scale,
  'civil-procedural': FileText,
  'penal': Shield,
  'penal-procedural': Gavel,
};

const subjectNames = {
  'civil': 'Drept Civil',
  'civil-procedural': 'Drept Procesual Civil',
  'penal': 'Drept Penal',
  'penal-procedural': 'Drept Procesual Penal',
};

export default function WrongAnswers() {
  const [location] = useLocation();
  const params = new URLSearchParams(location.split('?')[1] || '');
  const subjectFilter = params.get('subject');
  const chapterFilter = params.get('chapter');
  const { toast } = useToast();
  const [aiExplanations, setAiExplanations] = useState<Record<string, string>>({});

  const { data: wrongAnswers = [], isLoading } = useQuery<WrongAnswerWithQuestion[]>({
    queryKey: ['/api/wrong-answers', subjectFilter, chapterFilter],
    queryFn: async () => {
      const url = new URL('/api/wrong-answers', window.location.origin);
      if (subjectFilter) url.searchParams.set('subject', subjectFilter);
      if (chapterFilter) url.searchParams.set('chapter', chapterFilter);
      
      const response = await fetch(url.toString());
      if (!response.ok) throw new Error('Failed to fetch wrong answers');
      return response.json();
    }
  });

  // Get unique subjects and chapters from wrong answers
  const uniqueSubjects = Array.from(new Set(wrongAnswers.map(a => a.question.subject)));
  const uniqueChapters = Array.from(new Set(wrongAnswers.map(a => a.question.chapter)));

  // Group wrong answers by question
  const groupedByQuestion = wrongAnswers.reduce((acc, answer) => {
    const existing = acc.find(item => item.questionId === answer.questionId);
    if (existing) {
      existing.attempts++;
      const answerDate = answer.answeredAt ? new Date(answer.answeredAt) : new Date(0);
      const existingDate = existing.lastAttempt ? new Date(existing.lastAttempt) : new Date(0);
      if (answerDate > existingDate) {
        existing.lastAttempt = answer.answeredAt || new Date().toISOString();
        existing.lastSelectedAnswer = answer.selectedAnswer;
      }
    } else {
      acc.push({
        ...answer,
        attempts: 1,
        lastAttempt: answer.answeredAt || new Date().toISOString(),
        lastSelectedAnswer: answer.selectedAnswer
      });
    }
    return acc;
  }, [] as (WrongAnswerWithQuestion & { attempts: number; lastAttempt: string | Date; lastSelectedAnswer: number | null })[]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Se încarcă întrebările greșite...</p>
        </div>
      </div>
    );
  }

  const SubjectIcon = subjectFilter ? subjectIcons[subjectFilter as keyof typeof subjectIcons] : AlertCircle;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/weak-points">
          <button 
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
            data-testid="back-to-weak-points"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <SubjectIcon className="h-8 w-8 text-primary" />
            Întrebări Greșite
          </h1>
          <p className="text-muted-foreground mt-1">
            {chapterFilter ? (
              <>Capitol: {chapterFilter} • {subjectFilter && subjectNames[subjectFilter as keyof typeof subjectNames]}</>
            ) : subjectFilter ? (
              <>{subjectNames[subjectFilter as keyof typeof subjectNames]}</>
            ) : (
              'Toate materiile'
            )}
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-destructive" data-testid="total-wrong-answers">
                  {groupedByQuestion.length}
                </p>
                <p className="text-sm text-muted-foreground">Întrebări Greșite</p>
              </div>
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold" data-testid="unique-subjects">
                  {uniqueSubjects.length}
                </p>
                <p className="text-sm text-muted-foreground">
                  {uniqueSubjects.length === 1 ? 'Materie' : 'Materii'}
                </p>
              </div>
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold" data-testid="unique-chapters">
                  {uniqueChapters.length}
                </p>
                <p className="text-sm text-muted-foreground">
                  {uniqueChapters.length === 1 ? 'Capitol' : 'Capitole'}
                </p>
              </div>
              <FileText className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* No wrong answers state */}
      {groupedByQuestion.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Felicitări!</h3>
              <p className="text-muted-foreground mb-4">
                {chapterFilter 
                  ? `Nu ai greșeli înregistrate pentru capitolul "${chapterFilter}".`
                  : subjectFilter
                  ? `Nu ai greșeli înregistrate pentru ${subjectNames[subjectFilter as keyof typeof subjectNames]}.`
                  : 'Nu ai greșeli înregistrate.'}
              </p>
              <Link href="/quiz">
                <button 
                  className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                  data-testid="start-practicing"
                >
                  Începe să Exersezi
                </button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wrong Answers List */}
      {groupedByQuestion.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {groupedByQuestion.length} {groupedByQuestion.length === 1 ? 'întrebare greșită' : 'întrebări greșite'}
            </h2>
          </div>

          {groupedByQuestion.map((answer, index) => {
            const question = answer.question;
            const Icon = subjectIcons[question.subject as keyof typeof subjectIcons];
            const options = (question.options as unknown as { text: string; correct: boolean }[]) || [];
            const userAnswer = answer.lastSelectedAnswer !== null 
              ? options[answer.lastSelectedAnswer]
              : null;
            const correctOption = options[question.correctAnswer];

            return (
              <Card 
                key={answer.id} 
                className="border-destructive/30 bg-destructive/5"
                data-testid={`wrong-answer-${index}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Icon className="h-5 w-5 text-primary" />
                        <Badge variant="outline">{subjectNames[question.subject as keyof typeof subjectNames]}</Badge>
                        <Badge variant="secondary">{question.chapter}</Badge>
                        {question.difficulty && (
                          <Badge variant={
                            question.difficulty === 'hard' ? 'destructive' : 
                            question.difficulty === 'medium' ? 'default' : 'secondary'
                          }>
                            {question.difficulty === 'hard' ? 'Greu' : 
                             question.difficulty === 'medium' ? 'Mediu' : 'Ușor'}
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-lg" data-testid={`question-text-${index}`}>
                        {question.questionText}
                      </CardTitle>
                    </div>
                    {answer.attempts > 1 && (
                      <Badge variant="destructive">
                        {answer.attempts} încercări greșite
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Options */}
                  <div className="space-y-2">
                    {Array.isArray(options) && options.map((option: any, optionIndex: number) => {
                      const isCorrect = optionIndex === question.correctAnswer;
                      const isUserAnswer = optionIndex === answer.lastSelectedAnswer;

                      return (
                        <div
                          key={optionIndex}
                          className={`p-3 rounded-lg border-2 ${
                            isCorrect
                              ? 'bg-success/10 border-success'
                              : isUserAnswer
                              ? 'bg-destructive/10 border-destructive'
                              : 'bg-background border-border'
                          }`}
                          data-testid={`option-${index}-${optionIndex}`}
                        >
                          <div className="flex items-start gap-3">
                            {isCorrect ? (
                              <CheckCircle className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                            ) : isUserAnswer ? (
                              <XCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                            ) : (
                              <div className="h-5 w-5 mt-0.5 flex-shrink-0" />
                            )}
                            <div className="flex-1">
                              <p className={`${isCorrect ? 'font-semibold text-success' : isUserAnswer ? 'font-semibold text-destructive' : ''}`}>
                                {String(option.text)}
                              </p>
                              {isCorrect && (
                                <p className="text-xs text-success mt-1">✓ Răspuns corect</p>
                              )}
                              {isUserAnswer && !isCorrect && (
                                <p className="text-xs text-destructive mt-1">✗ Răspunsul tău</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation */}
                  {question.explanation && (
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="font-semibold mb-2 text-primary">Explicație</h4>
                          <p className="text-sm text-muted-foreground" data-testid={`explanation-${index}`}>
                            {String(question.explanation)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Legal References */}
                  {question.legalReferences && (question.legalReferences as string[]).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <span className="text-sm font-medium">Referințe legale:</span>
                      {(question.legalReferences as string[]).map((ref, i) => (
                        <Badge key={i} variant="outline" className="font-mono text-xs">
                          {ref}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* AI Explanation Section */}
                  <div className="border-t pt-4 space-y-3">
                    <Button
                      onClick={async () => {
                        try {
                          const response = await apiRequest(
                            'POST',
                            '/api/ai/explain-wrong-answer',
                            {
                              questionId: question.id,
                              userAnswerId: answer.id
                            }
                          );
                          
                          const data = await response.json();
                          setAiExplanations(prev => ({
                            ...prev,
                            [answer.id]: data.explanation
                          }));
                          
                          toast({
                            title: "Explicație AI generată!",
                            description: "Gemini a analizat greșeala ta și a pregătit o explicație personalizată.",
                          });
                        } catch (error) {
                          toast({
                            title: "Eroare",
                            description: "Nu am putut genera explicația AI. Încearcă din nou.",
                            variant: "destructive"
                          });
                        }
                      }}
                      variant="outline"
                      className="w-full"
                      data-testid={`ai-explain-${index}`}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      {aiExplanations[answer.id] ? "Regenerează Explicație AI" : "Explică cu AI"}
                    </Button>
                    
                    {aiExplanations[answer.id] && (
                      <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <Sparkles className="h-5 w-5 text-purple-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <h4 className="font-semibold mb-2 text-purple-500 flex items-center gap-2">
                              Explicație AI Personalizată
                              <Badge variant="secondary" className="text-xs">Gemini</Badge>
                            </h4>
                            <p className="text-sm text-foreground whitespace-pre-line" data-testid={`ai-explanation-${index}`}>
                              {aiExplanations[answer.id]}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Last Attempt Info */}
                  <div className="text-xs text-muted-foreground border-t pt-3">
                    Ultima încercare greșită: {new Date(answer.lastAttempt).toLocaleString('ro-RO')}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Action Buttons */}
      {groupedByQuestion.length > 0 && (
        <div className="flex flex-wrap gap-4">
          <Link href={subjectFilter ? `/quiz?subject=${subjectFilter}` : '/quiz'}>
            <button 
              className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
              data-testid="practice-again"
            >
              Exersează Din Nou
            </button>
          </Link>
          <Link href={subjectFilter ? `/library?subject=${subjectFilter}` : '/library'}>
            <button 
              className="bg-secondary text-foreground px-6 py-3 rounded-lg font-semibold hover:bg-secondary/80 transition-colors border border-border"
              data-testid="view-resources"
            >
              <BookOpen className="h-5 w-5 inline mr-2" />
              Vezi Resurse
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}
