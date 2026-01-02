import { useState, useEffect } from "react";
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
  Sparkles,
  Lightbulb,
  BookOpen,
  FileText,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import type { QuizQuestion } from "@/types/quiz";

function renderMarkdownContent(text: string) {
  const lines = text.split('\n');
  const elements: JSX.Element[] = [];
  let tableLines: string[] = [];
  let inTable = false;
  let keyIndex = 0;

  const processTable = (tableLines: string[]) => {
    if (tableLines.length < 2) return null;
    
    const rows = tableLines
      .filter(line => !line.match(/^[\s\-|]+$/))
      .map(line => 
        line.split('|')
          .map(cell => cell.trim())
          .filter(cell => cell.length > 0)
      )
      .filter(row => row.length > 0);
    
    if (rows.length === 0) return null;
    
    const headerRow = rows[0];
    const dataRows = rows.slice(1);
    
    return (
      <div key={keyIndex++} className="overflow-x-auto my-3">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-cyan-500/30">
              {headerRow.map((cell, i) => (
                <th key={i} className="text-left py-2 px-3 text-cyan-300 font-semibold whitespace-nowrap">
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row, rowIdx) => (
              <tr key={rowIdx} className="border-b border-cyan-500/10 hover:bg-cyan-500/5">
                {row.map((cell, cellIdx) => (
                  <td key={cellIdx} className="py-2 px-3 text-foreground/80">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isTableLine = line.includes('|') || line.match(/^[\s\-|]+$/);
    
    if (isTableLine) {
      if (!inTable) {
        inTable = true;
        tableLines = [];
      }
      tableLines.push(line);
    } else {
      if (inTable) {
        const table = processTable(tableLines);
        if (table) elements.push(table);
        tableLines = [];
        inTable = false;
      }
      
      if (line.trim()) {
        if (line.match(/^#+\s/)) {
          const text = line.replace(/^#+\s*/, '');
          elements.push(
            <h4 key={keyIndex++} className="font-semibold text-cyan-300 mt-3 mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {text}
            </h4>
          );
        } else {
          elements.push(
            <p key={keyIndex++} className="text-foreground/80 my-1">{line}</p>
          );
        }
      }
    }
  }
  
  if (inTable && tableLines.length > 0) {
    const table = processTable(tableLines);
    if (table) elements.push(table);
  }
  
  return <div className="space-y-1">{elements}</div>;
}

interface GodModeQuestion extends QuizQuestion {
  correctAnswersSet: number[];
  hasZeroCorrect: boolean;
  shuffledOptions: { originalIndex: number; text: string; correct: boolean }[];
  shuffleMap: number[]; // shuffleMap[displayIndex] = originalIndex
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function generateGodModeAnswers(question: QuizQuestion, set: 'A' | 'B' | 'C'): GodModeQuestion {
  // Use correctAnswersMultiple from database if available, otherwise fallback to correctAnswer
  let correctAnswersSet: number[] = [];
  let hasZeroCorrect = false;

  if (question.correctAnswersMultiple !== undefined && question.correctAnswersMultiple !== null) {
    // Use data from database (imported questions)
    correctAnswersSet = [...question.correctAnswersMultiple];
    hasZeroCorrect = correctAnswersSet.length === 0;
  } else {
    // Fallback for legacy questions: use correctAnswer
    correctAnswersSet = [question.correctAnswer];
  }

  // Create shuffled options with tracking of original indices
  const optionsWithIndex = question.options.map((opt, idx) => ({
    originalIndex: idx,
    text: opt.text,
    correct: opt.correct
  }));
  
  const shuffledOptions = shuffleArray(optionsWithIndex);
  const shuffleMap = shuffledOptions.map(opt => opt.originalIndex);
  
  // Translate correctAnswersSet to shuffled indices
  const shuffledCorrectSet = correctAnswersSet.map(origIdx => 
    shuffledOptions.findIndex(opt => opt.originalIndex === origIdx)
  ).sort((a, b) => a - b);

  return {
    ...question,
    correctAnswersSet: shuffledCorrectSet,
    hasZeroCorrect,
    shuffledOptions,
    shuffleMap
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

  const [questions, setQuestions] = useState<GodModeQuestion[]>([]);
  const [questionsGenerated, setQuestionsGenerated] = useState(false);

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

  useEffect(() => {
    if (rawQuestions.length > 0 && !questionsGenerated) {
      const generatedQuestions = rawQuestions.map(q => generateGodModeAnswers(q, godModeSet));
      setQuestions(generatedQuestions);
      setQuestionsGenerated(true);
    }
  }, [rawQuestions, godModeSet, questionsGenerated]);

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
    
    // Set A: Radio behavior - only one selection allowed
    if (godModeSet === 'A') {
      setSelectedAnswers(prev => 
        prev.includes(index) ? [] : [index]
      );
      return;
    }
    
    // Set B: Maximum 3 selections
    if (godModeSet === 'B') {
      setSelectedAnswers(prev => {
        if (prev.includes(index)) {
          return prev.filter(i => i !== index);
        }
        if (prev.length >= 3) {
          // Already at max, don't add more
          return prev;
        }
        return [...prev, index];
      });
      return;
    }
    
    // Set C: All 4 selections allowed
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

  const totalCorrect = results.filter(r => r.correct).length;

  if (isLoading || (rawQuestions.length > 0 && !questionsGenerated)) {
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
              <div className="flex items-center gap-2 bg-black border border-green-500/50 px-4 py-2 rounded-lg shadow-[0_0_10px_rgba(34,197,94,0.3)]">
                <Clock className="h-5 w-5 text-green-400 drop-shadow-[0_0_4px_rgba(34,197,94,0.8)]" />
                <span className="font-mono font-bold text-lg text-green-400 drop-shadow-[0_0_6px_rgba(34,197,94,0.8)] tracking-wider">{formatTime(timeElapsed)}</span>
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

          <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg mb-4 text-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <span className="text-orange-400">
                  {godModeSet === 'A' && 'Selectează UN SINGUR răspuns corect'}
                  {godModeSet === 'B' && 'Selectează 1-3 răspunsuri corecte'}
                  {godModeSet === 'C' && 'Pot fi 0-4 răspunsuri corecte'}
                </span>
              </div>
              {!showFeedback && (
                <Badge variant="outline" className="border-orange-500/50 text-orange-400">
                  {godModeSet === 'A' && `${selectedAnswers.length}/1`}
                  {godModeSet === 'B' && `${selectedAnswers.length}/3 max`}
                  {godModeSet === 'C' && `${noCorrectSelected ? '0' : selectedAnswers.length}/4`}
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-3 mb-6">
            {question.shuffledOptions?.map((option, index) => {
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
                  <span className="flex-1">{option.text}</span>
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
                className={`flex items-center gap-4 p-4 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
                  showFeedback && question.hasZeroCorrect
                    ? 'border-green-500 bg-green-500/10'
                    : showFeedback && noCorrectSelected && !question.hasZeroCorrect
                    ? 'border-red-500 bg-red-500/10'
                    : noCorrectSelected
                    ? 'border-red-500 bg-red-500/10'
                    : 'border-red-500/30 bg-red-500/5 hover:border-red-500/60 hover:bg-red-500/10'
                }`}
                data-testid="option-none"
              >
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 font-bold text-lg ${
                  noCorrectSelected 
                    ? 'border-red-500 bg-red-500 text-white' 
                    : 'border-red-500/50 text-red-400'
                }`}>
                  0
                </div>
                <Ban className={`h-5 w-5 ${noCorrectSelected ? 'text-red-400' : 'text-red-400/70'}`} />
                <span className={`flex-1 font-semibold ${noCorrectSelected ? 'text-red-400' : 'text-red-400/70'}`}>
                  Niciunul nu este corect
                </span>
                {showFeedback && question.hasZeroCorrect && (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                )}
              </div>
            )}
          </div>

          {showFeedback && (
            <div className="space-y-4 mb-6">
              <div className={`p-4 rounded-lg ${
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
                {!results[results.length - 1]?.correct && (
                  <div className="text-sm space-y-1">
                    <p>
                      <strong>Răspunsul tău:</strong>{' '}
                      <span className="text-red-400">
                        {noCorrectSelected 
                          ? 'Niciunul' 
                          : selectedAnswers.length === 0 
                            ? 'Niciun răspuns selectat'
                            : selectedAnswers.map(i => String.fromCharCode(65 + i)).join(', ')}
                      </span>
                    </p>
                    <p>
                      <strong>Răspuns corect:</strong>{' '}
                      <span className="text-green-400">
                        {question.hasZeroCorrect 
                          ? 'Niciunul' 
                          : question.correctAnswersSet.map(i => String.fromCharCode(65 + i)).join(', ')}
                      </span>
                    </p>
                  </div>
                )}
              </div>

              {(question.feedbackDetailed?.explicatie_generala || question.explanation) && (
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen className="h-5 w-5 text-blue-400" />
                    <span className="font-semibold text-blue-400">Explicație Completă</span>
                  </div>
                  <p className="text-sm text-foreground/90 whitespace-pre-line">
                    {question.feedbackDetailed?.explicatie_generala || question.explanation}
                  </p>
                </div>
              )}

              {question.feedbackDetailed?.analiza_variante && Object.keys(question.feedbackDetailed.analiza_variante).length > 0 && (
                <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="h-5 w-5 text-purple-400" />
                    <span className="font-semibold text-purple-400">Analiza Variantelor</span>
                  </div>
                  <div className="space-y-2">
                    {question.shuffledOptions.map((opt, displayIdx) => {
                      const lowerLetter = String.fromCharCode(97 + opt.originalIndex); // a, b, c, d
                      const upperLetter = String.fromCharCode(65 + opt.originalIndex); // A, B, C, D
                      // Check both lowercase and uppercase keys
                      const analysis = question.feedbackDetailed?.analiza_variante?.[lowerLetter] 
                        || question.feedbackDetailed?.analiza_variante?.[upperLetter];
                      if (!analysis) return null;
                      
                      const displayLetter = String.fromCharCode(65 + displayIdx); // A, B, C, D
                      return (
                        <div key={displayIdx} className={`p-2 rounded text-sm ${
                          analysis.este_corecta 
                            ? 'bg-green-500/10 border-l-2 border-green-500' 
                            : 'bg-red-500/5 border-l-2 border-red-500/50'
                        }`}>
                          <span className={`font-bold ${analysis.este_corecta ? 'text-green-400' : 'text-red-400'}`}>
                            {displayLetter})
                          </span>{' '}
                          <span className="text-foreground/80">{analysis.explicatie}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {question.feedbackDetailed?.retine && (
                <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="h-5 w-5 text-yellow-400" />
                    <span className="font-semibold text-yellow-400">Reține</span>
                  </div>
                  <div className="text-sm text-foreground/90 whitespace-pre-line">
                    {Array.isArray(question.feedbackDetailed.retine) 
                      ? question.feedbackDetailed.retine.join('\n') 
                      : question.feedbackDetailed.retine}
                  </div>
                </div>
              )}

              {question.feedbackDetailed?.schema_aplicatie_practica && (
                <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="h-5 w-5 text-cyan-400" />
                    <span className="font-semibold text-cyan-400">Aplicație Practică</span>
                  </div>
                  {renderMarkdownContent(question.feedbackDetailed.schema_aplicatie_practica)}
                </div>
              )}

              {question.feedbackDetailed?.atentie && (
                <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/30">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-5 w-5 text-orange-400" />
                    <span className="font-semibold text-orange-400">Atenție</span>
                  </div>
                  <p className="text-sm text-foreground/90 whitespace-pre-line">
                    {question.feedbackDetailed.atentie}
                  </p>
                </div>
              )}

              {question.keyConcepts && question.keyConcepts.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {question.keyConcepts.map((concept, idx) => (
                    <Badge key={idx} variant="outline" className="bg-primary/10">
                      {concept}
                    </Badge>
                  ))}
                </div>
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
