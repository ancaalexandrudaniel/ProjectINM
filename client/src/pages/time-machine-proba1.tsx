import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Loader2, Sparkles } from "lucide-react";
import {
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    Flag,
    CheckCircle2,
    FileText,
    Scale,
    Shield,
    Gavel,
    Trophy,
    XCircle
} from "lucide-react";
import type { QuestionOption, ExamResult } from "@/types/exam";
import { EXAM_DURATION, PASS_THRESHOLD } from "@/types/exam";
import { useExamTimer } from "@/hooks/use-exam-timer";
import { TimeTravelAnimation } from "@/components/exam/time-travel-animation";
import { ExamTimerBar } from "@/components/exam/exam-timer-bar";
import { ExamResultsShell } from "@/components/exam/exam-results-shell";

interface Question {
    id: string;
    questionText: string;
    options: (string | QuestionOption)[];
    correctAnswer: number;
    subject: string;
}

interface ExamSection {
    id: string;
    name: string;
    shortName: string;
    icon: typeof Scale;
    color: string;
    bgColor: string;
    progressColor: string;
    questions: Question[];
}

const getOptionText = (option: string | QuestionOption): string => {
    if (typeof option === 'string') return option;
    return option.text || '';
};

/**
 * Converts DB correctAnswer to letter.
 * CRITICAL: DB stores correctAnswer as 1-INDEXED (1=A, 2=B, 3=C, 4=D)
 */
const getCorrectLetter = (correctAnswer: number | string): string => {
    let idx: number;

    if (typeof correctAnswer === 'string') {
        const trimmed = correctAnswer.trim();
        const upper = trimmed.toUpperCase();
        if (upper.length === 1 && upper >= 'A' && upper <= 'Z') {
            return upper;
        }
        idx = parseInt(trimmed, 10);
    } else {
        idx = correctAnswer;
    }

    if (isNaN(idx) || idx < 1 || idx > 26) {
        console.warn('[getCorrectLetter] Invalid correctAnswer:', correctAnswer);
        return '?';
    }

    return String.fromCharCode(64 + idx);
};

const SECTION_CONFIG = [
    { id: "civil", name: "Drept Civil", shortName: "Civil", icon: Scale, color: "text-indigo-300", bgColor: "bg-indigo-900/50 border-indigo-600", progressColor: "bg-indigo-500" },
    { id: "civil-procedural", name: "Drept Procesual Civil", shortName: "Proc.Civil", icon: FileText, color: "text-emerald-300", bgColor: "bg-emerald-900/50 border-emerald-600", progressColor: "bg-emerald-500" },
    { id: "penal", name: "Drept Penal", shortName: "Penal", icon: Shield, color: "text-amber-300", bgColor: "bg-amber-900/50 border-amber-600", progressColor: "bg-amber-500" },
    { id: "penal-procedural", name: "Drept Procesual Penal", shortName: "Proc.Penal", icon: Gavel, color: "text-fuchsia-300", bgColor: "bg-fuchsia-900/50 border-fuchsia-600", progressColor: "bg-fuchsia-500" },
];

const QUESTIONS_PER_SECTION = 25;
const TOTAL_QUESTIONS = 100;

function AIExplanation({ questionId, selectedAnswer, correctAnswer }: { questionId: string, selectedAnswer: string, correctAnswer: string }) {
    const [explanation, setExplanation] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleExplain = async () => {
        setIsLoading(true);
        try {
            const res = await apiRequest("POST", "/api/ai/explain-answer-direct", {
                questionId,
                selectedAnswer
            });
            const data = await res.json();
            setExplanation(data.explanation);
        } catch (error) {
            console.error("[AI Explication Error]:", error);
            setExplanation("Nu am putut genera explicația. E posibil ca serverul AI să fie ocupat sau cheia API să fie invalidă.");
        } finally {
            setIsLoading(false);
        }
    };

    if (explanation) {
        return (
            <div className="mt-4 p-4 bg-purple-500/10 rounded-lg border border-purple-500/30 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2 text-purple-400 font-bold mb-2">
                    <Sparkles className="h-4 w-4" />
                    Explicație AI Mentor
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{explanation}</p>
            </div>
        );
    }

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={handleExplain}
            disabled={isLoading}
            className="mt-2 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
        >
            {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            {isLoading ? "Se generează..." : "De ce am greșit?"}
        </Button>
    );
}

export default function TimeMachineProba1() {
    const [, params] = useRoute("/time-machine/:year/proba-1");
    const [, setLocation] = useLocation();
    const year = params?.year ? parseInt(params.year) : 2024;

    // Exam state
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [flagged, setFlagged] = useState<Set<string>>(new Set());
    const [currentIndex, setCurrentIndex] = useState(0);

    const [showAnimation, setShowAnimation] = useState(true);
    const [showResults, setShowResults] = useState(false);
    const [examResult, setExamResult] = useState<ExamResult | null>(null);
    const [expandedSection, setExpandedSection] = useState<string | null>("civil");

    // Timer hook
    const timer = useExamTimer({
        duration: EXAM_DURATION,
        paused: showAnimation || showResults,
    });

    // Fetch all exam questions
    const { data: allQuestions = [] } = useQuery<Question[]>({
        queryKey: ["/api/questions", year],
        queryFn: async () => {
            const res = await fetch(`/api/questions?sourceType=exam-past&limit=100`);
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();
            return data as Question[];
        },
        enabled: !showAnimation,
    });

    // Organize questions into 4 sections of 25 each
    const sections = useMemo((): ExamSection[] => {
        if (!allQuestions.length) return [];

        const bySubject: Record<string, Question[]> = {};
        for (const q of allQuestions) {
            const subj = q.subject || "civil";
            if (!bySubject[subj]) bySubject[subj] = [];
            bySubject[subj].push(q);
        }

        const result: ExamSection[] = [];

        for (const config of SECTION_CONFIG) {
            let questions: Question[] = [];

            if (config.id === "penal" && bySubject["penal"]?.length >= 50 && !bySubject["penal-procedural"]?.length) {
                questions = bySubject["penal"]?.slice(0, 25) || [];
            } else if (config.id === "penal-procedural" && bySubject["penal"]?.length >= 50 && !bySubject["penal-procedural"]?.length) {
                questions = bySubject["penal"]?.slice(25, 50) || [];
            } else {
                questions = bySubject[config.id]?.slice(0, 25) || [];
            }

            result.push({ ...config, questions });
        }

        return result;
    }, [allQuestions]);

    // Flat array of all questions for navigation
    const flatQuestions = useMemo(() => {
        return sections.flatMap(s => s.questions);
    }, [sections]);

    const currentQuestion = flatQuestions[currentIndex];

    // Calculate which section current question belongs to
    const getCurrentSection = useCallback((index: number) => {
        let count = 0;
        for (let i = 0; i < sections.length; i++) {
            count += sections[i].questions.length;
            if (index < count) return i;
        }
        return 0;
    }, [sections]);

    const currentSectionIndex = getCurrentSection(currentIndex);
    const currentSection = sections[currentSectionIndex];

    // Auto-expand section when navigating
    useEffect(() => {
        if (currentSection?.id) {
            setExpandedSection(currentSection.id);
        }
    }, [currentSection?.id]);

    // Answer handlers
    const selectAnswer = useCallback((questionId: string, answer: string) => {
        setAnswers(prev => ({ ...prev, [questionId]: answer }));
    }, []);

    const toggleFlag = useCallback((questionId: string) => {
        setFlagged(prev => {
            const newFlagged = new Set(prev);
            if (newFlagged.has(questionId)) {
                newFlagged.delete(questionId);
            } else {
                newFlagged.add(questionId);
            }
            return newFlagged;
        });
    }, []);

    // Calculate progress
    const answeredCount = Object.keys(answers).length;
    const progress = flatQuestions.length > 0 ? (answeredCount / flatQuestions.length) * 100 : 0;

    // Section progress
    const getSectionProgress = (sectionIndex: number) => {
        const section = sections[sectionIndex];
        if (!section) return { answered: 0, total: 0 };
        const answered = section.questions.filter(q => answers[q.id]).length;
        return { answered, total: section.questions.length };
    };

    // Calculate exam result
    const calculateResult = useCallback((): ExamResult => {
        let totalCorrect = 0;
        const bySection: Record<string, { correct: number; total: number }> = {};

        for (const section of sections) {
            let sectionCorrect = 0;
            for (const q of section.questions) {
                const userAnswer = answers[q.id];
                const correctLetter = getCorrectLetter(q.correctAnswer);

                if (userAnswer === correctLetter) {
                    totalCorrect++;
                    sectionCorrect++;
                }
            }
            bySection[section.id] = { correct: sectionCorrect, total: section.questions.length };
        }

        const timeUsed = timer.elapsed;
        const percentage = flatQuestions.length > 0 ? Math.round((totalCorrect / flatQuestions.length) * 100) : 0;

        return {
            totalCorrect,
            bySection,
            passed: totalCorrect >= PASS_THRESHOLD,
            percentage,
            timeUsed,
        };
    }, [sections, answers, timer.elapsed, flatQuestions.length]);

    // Finalize exam with API
    const finalizeExam = async () => {
        try {
            const timeUsed = timer.elapsed;
            const res = await apiRequest("POST", "/api/exam-sessions/submit", {
                year,
                answers,
                timeSpent: timeUsed
            });
            const data = await res.json();

            const bySectionMap: any = {};
            if (data.breakdown) {
                bySectionMap["civil"] = data.breakdown.civil;
                bySectionMap["civil-procedural"] = data.breakdown["civil-procedural"];
                bySectionMap["penal"] = data.breakdown.penal;
                bySectionMap["penal-procedural"] = data.breakdown["penal-procedural"];
            }

            const result = {
                totalCorrect: data.score,
                bySection: bySectionMap,
                passed: data.isPassed,
                percentage: Math.round((data.score / (data.totalQuestions || 100)) * 100),
                timeUsed,
            };

            setExamResult(result);
            setShowResults(true);
        } catch (error) {
            console.error("Exam submission failed:", error);
            alert("A apărut o eroare la salvarea examenului. Te rugăm să încerci din nou.");
        }
    };

    // Animation screen
    if (showAnimation) {
        return (
            <TimeTravelAnimation
                year={year}
                probaLabel="Proba I - Test Grilă • 100 întrebări • 4 ore"
                variant="wormhole"
                onComplete={() => setShowAnimation(false)}
            />
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-background to-purple-950/10">
            {/* Top Timer Bar */}
            <ExamTimerBar
                year={year}
                probaLabel="Proba I"
                timeRemaining={timer.timeRemaining}
                isLowTime={timer.isLowTime}
                onExit={() => setLocation("/time-machine")}
            >
                <div className="flex items-center gap-4">
                    <div className="text-sm text-muted-foreground">
                        {answeredCount}/{flatQuestions.length} răspunse
                    </div>
                    <Progress value={progress} className="w-32 h-2" />
                </div>
            </ExamTimerBar>

            {/* Section Progress Bar */}
            <div className="sticky top-[73px] z-30 bg-background/95 backdrop-blur border-b border-purple-500/20">
                <div className="container mx-auto px-4 py-2">
                    <div className="flex gap-2">
                        {sections.map((section, idx) => {
                            const prog = getSectionProgress(idx);
                            const isActive = idx === currentSectionIndex;
                            const isComplete = prog.answered === prog.total && prog.total > 0;
                            const Icon = section.icon;

                            return (
                                <button
                                    key={section.id}
                                    onClick={() => {
                                        let offset = 0;
                                        for (let i = 0; i < idx; i++) {
                                            offset += sections[i].questions.length;
                                        }
                                        setCurrentIndex(offset);
                                    }}
                                    className={`flex-1 p-2 rounded-lg border transition-all ${isActive
                                        ? `border-${section.bgColor.replace('bg-', '')} ${section.bgColor}/20`
                                        : 'border-border hover:border-muted-foreground'
                                        }`}
                                >
                                    <div className="flex items-center justify-center gap-1 text-xs">
                                        {isComplete ? (
                                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                                        ) : isActive ? (
                                            <div className={`h-2 w-2 rounded-full ${section.bgColor} animate-pulse`} />
                                        ) : (
                                            <div className="h-2 w-2 rounded-full bg-muted" />
                                        )}
                                        <Icon className={`h-3 w-3 ${isActive ? section.color : 'text-muted-foreground'}`} />
                                        <span className={isActive ? section.color : 'text-muted-foreground'}>
                                            {section.shortName}
                                        </span>
                                        <span className="text-muted-foreground">
                                            {prog.answered}/{prog.total}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="container mx-auto p-4">
                <div className="grid grid-cols-12 gap-4">
                    {/* Left: Accordion Navigator */}
                    <div className="col-span-3 space-y-2">
                        {sections.map((section, sIdx) => {
                            const sectionStart = sections.slice(0, sIdx).reduce((acc, s) => acc + s.questions.length, 0);
                            const Icon = section.icon;
                            const prog = getSectionProgress(sIdx);
                            const isExpanded = expandedSection === section.id;
                            const isComplete = prog.answered === prog.total && prog.total > 0;
                            const isActive = sIdx === currentSectionIndex;

                            return (
                                <div key={section.id} className="overflow-hidden rounded-lg border border-border">
                                    <button
                                        onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                                        className={`w-full flex items-center justify-between p-3 transition-all duration-300 ${isActive
                                            ? `bg-gradient-to-r from-${section.bgColor.replace('bg-', '')}/20 to-transparent border-l-4 ${section.bgColor.replace('bg-', 'border-')} shadow-[0_0_15px_-3px_rgba(0,0,0,0.3)]`
                                            : 'bg-card hover:bg-accent/50'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg shadow-sm ${isActive ? section.bgColor : 'bg-muted'} text-white transition-colors`}>
                                                <Icon className={`h-4 w-4`} />
                                            </div>
                                            <div className="text-left">
                                                <p className={`font-bold text-sm ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>{section.name}</p>
                                                <p className="text-xs text-muted-foreground font-mono">
                                                    {prog.answered}/{prog.total}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {isComplete && (
                                                <div className="bg-green-500/10 p-1 rounded-full">
                                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                </div>
                                            )}
                                            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                                        </div>
                                    </button>

                                    <div className={`overflow-hidden transition-all duration-200 ${isExpanded ? 'max-h-96 p-3 pt-0' : 'max-h-0'}`}>
                                        <div className="grid grid-cols-5 gap-1.5 pt-3 border-t border-border">
                                            {section.questions.map((q, qIdx) => {
                                                const globalIdx = sectionStart + qIdx;
                                                const isAnswered = !!answers[q.id];
                                                const isFlagged = flagged.has(q.id);
                                                const isCurrent = globalIdx === currentIndex;

                                                return (
                                                    <button
                                                        key={q.id}
                                                        onClick={() => setCurrentIndex(globalIdx)}
                                                        className={`relative w-8 h-8 text-xs font-bold rounded-lg transition-all duration-200 shadow-sm ${isCurrent
                                                            ? `ring-2 ring-offset-2 ring-offset-background ${section.bgColor} text-white shadow-lg scale-110 z-10`
                                                            : ''
                                                            } ${isAnswered
                                                                ? 'bg-gradient-to-br from-green-500/80 to-green-600 text-white border-none shadow-green-500/20'
                                                                : isCurrent ? '' : 'bg-secondary hover:bg-secondary/80 text-muted-foreground border border-transparent'
                                                            }`}
                                                    >
                                                        {qIdx + 1}
                                                        {isFlagged && (
                                                            <Flag className="absolute -top-1 -right-1 h-2.5 w-2.5 text-amber-500 fill-amber-500" />
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        <Button
                            onClick={finalizeExam}
                            className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 mt-2"
                            disabled={answeredCount === 0}
                        >
                            <Trophy className="h-4 w-4 mr-2" />
                            Finalizează Proba I
                        </Button>
                        <p className="text-xs text-center text-muted-foreground">
                            {answeredCount < flatQuestions.length
                                ? `Mai ai ${flatQuestions.length - answeredCount} întrebări fără răspuns`
                                : '✓ Toate întrebările au răspuns'
                            }
                        </p>
                    </div>

                    {/* Center: Question */}
                    <div className="col-span-9">
                        {currentQuestion && currentSection ? (
                            <Card className="border-purple-500/30">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="flex items-center gap-2">
                                            <Badge variant="outline" className={`${currentSection.color} px-3 py-1 text-sm font-semibold border-2`}>
                                                {currentSection.name}
                                            </Badge>
                                            <span className="text-sm text-muted-foreground font-mono">
                                                • Întrebarea {currentIndex + 1} / {flatQuestions.length}
                                            </span>
                                        </CardTitle>
                                        <Button
                                            variant={flagged.has(currentQuestion.id) ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => toggleFlag(currentQuestion.id)}
                                            className={flagged.has(currentQuestion.id) ? "bg-amber-500" : ""}
                                        >
                                            <Flag className="h-4 w-4 mr-1" />
                                            {flagged.has(currentQuestion.id) ? "Marcat" : "Marchează"}
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <p className="text-lg leading-relaxed">{currentQuestion.questionText}</p>

                                    <RadioGroup
                                        value={answers[currentQuestion.id] || ""}
                                        onValueChange={(val) => selectAnswer(currentQuestion.id, val)}
                                        className="space-y-3"
                                    >
                                        {currentQuestion.options.map((option, idx) => {
                                            const letter = String.fromCharCode(65 + idx);
                                            const isSelected = answers[currentQuestion.id] === letter;

                                            return (
                                                <div
                                                    key={idx}
                                                    className={`flex items-center space-x-3 p-4 rounded-lg border transition-colors cursor-pointer ${isSelected
                                                        ? 'border-purple-500 bg-purple-500/10'
                                                        : 'border-border hover:border-purple-500/50 hover:bg-muted/50'
                                                        }`}
                                                    onClick={() => selectAnswer(currentQuestion.id, letter)}
                                                >
                                                    <RadioGroupItem value={letter} id={`option-${idx}`} />
                                                    <Label htmlFor={`option-${idx}`} className="flex-1 cursor-pointer">
                                                        <span className="font-medium mr-2">{letter}.</span>
                                                        {getOptionText(option)}
                                                    </Label>
                                                </div>
                                            );
                                        })}
                                    </RadioGroup>

                                    {/* Navigation */}
                                    <div className="flex items-center justify-between pt-4 border-t">
                                        {currentIndex === flatQuestions.length - 1 && answeredCount === flatQuestions.length ? (
                                            <Button
                                                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-6 text-lg shadow-lg animate-pulse"
                                                onClick={finalizeExam}
                                            >
                                                <Trophy className="h-6 w-6 mr-2" />
                                                Finalizează Proba I
                                            </Button>
                                        ) : (
                                            <>
                                                <Button
                                                    variant="outline"
                                                    onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                                                    disabled={currentIndex === 0}
                                                >
                                                    <ChevronLeft className="h-4 w-4 mr-1" />
                                                    Anterioară
                                                </Button>
                                                <div className="text-sm text-muted-foreground">
                                                    {currentIndex + 1} / {flatQuestions.length}
                                                </div>
                                                <Button
                                                    onClick={() => setCurrentIndex(Math.min(flatQuestions.length - 1, currentIndex + 1))}
                                                    disabled={currentIndex === flatQuestions.length - 1}
                                                >
                                                    Următoarea
                                                    <ChevronRight className="h-4 w-4 ml-1" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            <Card className="p-12 text-center">
                                <p className="text-muted-foreground">
                                    Se încarcă întrebările pentru examenul {year}...
                                </p>
                            </Card>
                        )}
                    </div>
                </div>
            </div>

            {/* Results Dialog */}
            <ExamResultsShell
                open={showResults}
                onOpenChange={setShowResults}
                passed={examResult?.passed ?? false}
                scoreDisplay={`${examResult?.totalCorrect} puncte`}
                percentage={examResult?.percentage ?? 0}
                tabs={sections.map(section => {
                    const result = examResult?.bySection[section.id];
                    const total = result?.total || 0;
                    const correct = result?.correct || 0;
                    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

                    return {
                        id: section.id,
                        label: `${section.name} (${correct}/${total})`,
                        content: (
                            <div className="space-y-4 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-light flex items-center gap-2">
                                        <FileText className={`h-5 w-5 ${section.color}`} />
                                        Recapitulare: <span className="font-bold">{section.name}</span>
                                    </h3>
                                    <div className="text-sm text-muted-foreground">
                                        {correct} răspunsuri corecte din {total}
                                    </div>
                                </div>

                                {section.questions.map((q, idx) => {
                                    const userAnswerLetter = answers[q.id];
                                    const correctLetter = getCorrectLetter(q.correctAnswer);
                                    const isCorrect = userAnswerLetter === correctLetter;
                                    const isUnanswered = !userAnswerLetter;

                                    return (
                                        <div key={q.id} className={`p-6 rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow ${isCorrect ? 'border-green-500/10' : 'border-red-500/10'}`}>
                                            <div className="flex items-start gap-4">
                                                <div className={`mt-1 p-2 rounded-full ${isCorrect ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                                                    {isCorrect ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                                                </div>
                                                <div className="flex-1 space-y-3">
                                                    <div className="flex justify-between items-start">
                                                        <p className="font-medium text-lg leading-relaxed">{idx + 1}. {q.questionText}</p>
                                                        <Badge variant="outline" className="ml-2 shrink-0">ID: {q.id.slice(0, 4)}</Badge>
                                                    </div>

                                                    <div className="grid gap-2 text-sm">
                                                        {q.options.map((opt, oIdx) => {
                                                            const letter = String.fromCharCode(65 + oIdx);
                                                            const isSelected = userAnswerLetter === letter;
                                                            const isTheCorrectOne = correctLetter === letter;

                                                            let style: string;
                                                            if (isSelected && isTheCorrectOne) {
                                                                style = "p-4 rounded-lg border-2 border-emerald-500 bg-emerald-500/20 text-emerald-100 font-bold shadow-[0_0_15px_-3px_rgba(16,185,129,0.4)]";
                                                            } else if (isSelected && !isTheCorrectOne) {
                                                                style = "p-4 rounded-lg border-2 border-red-500 bg-red-500/20 text-red-100 font-bold shadow-[0_0_15px_-3px_rgba(239,68,68,0.4)]";
                                                            } else if (!isSelected && isTheCorrectOne) {
                                                                style = "p-4 rounded-lg border-2 border-emerald-500 bg-emerald-500/10 text-emerald-200 font-bold ring-2 ring-emerald-500/30";
                                                            } else {
                                                                style = "p-4 rounded-lg border-transparent bg-muted/40 text-muted-foreground opacity-60";
                                                            }

                                                            return (
                                                                <div key={oIdx} className={style}>
                                                                    <div className="flex gap-3 items-center">
                                                                        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-background/20 flex items-center justify-center font-bold">
                                                                            {letter}
                                                                        </span>
                                                                        <div className="flex-1">{getOptionText(opt)}</div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>

                                                    {!isCorrect && !isUnanswered && (
                                                        <AIExplanation
                                                            questionId={q.id}
                                                            selectedAnswer={userAnswerLetter}
                                                            correctAnswer={correctLetter}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ),
                    };
                })}
                tabListClassName="grid grid-cols-4 w-full h-16 bg-muted/50 p-1"
                footer={
                    <>
                        <Button variant="outline" onClick={() => { setShowResults(false); setLocation("/time-machine"); }}>
                            ← Înapoi la Time Machine
                        </Button>
                        <Button className="bg-purple-600 hover:bg-purple-700" onClick={() => setLocation("/time-machine")}>
                            Continuă la Proba II →
                        </Button>
                    </>
                }
            />
        </div>
    );
}
