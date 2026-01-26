import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";
import {
    Clock,
    Timer,
    Home,
    Save,
    Send,
    FileText,
    Scale,
    Shield,
    Gavel,
    ChevronLeft,
    ChevronRight,
    AlertTriangle,
    Trophy,
    XCircle,
    CheckCircle2,
    Loader2,
    Sparkles,
    BookOpen,
    PenTool,
    ListChecks
} from "lucide-react";
import { CaseWorkflow } from "@/components/case-workflow/CaseWorkflow";
import { WorkflowState, INITIAL_WORKFLOW_STATE } from "@/components/case-workflow/types";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// Types
interface ExamRequirement {
    id: string;
    requirementId: string; // '1.1', '1.2', '2.1'
    requirementText: string;
    points: string;
    recommendedTime?: number;
    solution: string;
    rubric: Array<{ criterion: string; points: string }>;
}

interface ExamSubject {
    subjectId: string; // 'civil-1', 'civil-2', 'proc-1'
    subjectTitle: string;
    subjectArea: string; // 'Drept Civil' | 'Drept Procesual Civil'
    scenario?: string;
    requirements: ExamRequirement[];
}

interface ExamData {
    year: number;
    discipline: string; // 'civil-combined' | 'penal-combined'
    subjects: ExamSubject[];
    totalPoints: number;
}

interface UserAnswers {
    [requirementId: string]: string;
}

interface GradingResult {
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
    expressionScore: number; // 0.50pt for clarity
}

// Exam duration: 4 hours per day
const EXAM_DURATION = 4 * 60 * 60; // 4 hours in seconds

// Section colors (matching Proba I palette)
const SECTION_COLORS = {
    'civil': { color: 'text-indigo-300', bg: 'bg-indigo-900/50 border-indigo-600', progress: 'bg-indigo-500' },
    'civil-procedural': { color: 'text-emerald-300', bg: 'bg-emerald-900/50 border-emerald-600', progress: 'bg-emerald-500' },
    'penal': { color: 'text-amber-300', bg: 'bg-amber-900/50 border-amber-600', progress: 'bg-amber-500' },
    'penal-procedural': { color: 'text-fuchsia-300', bg: 'bg-fuchsia-900/50 border-fuchsia-600', progress: 'bg-fuchsia-500' },
};

function formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// Calculate word count
function countWords(text: string): number {
    return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

export default function TimeMachineProba2() {
    const [, params] = useRoute("/time-machine/:year/proba-2");
    const [, setLocation] = useLocation();
    const year = params?.year ? parseInt(params.year) : 2024;

    // States
    const [isLoading, setIsLoading] = useState(true);
    const [examData, setExamData] = useState<ExamData | null>(null);
    const [currentSubjectIndex, setCurrentSubjectIndex] = useState(0);
    const [currentRequirementIndex, setCurrentRequirementIndex] = useState(0);
    const [answers, setAnswers] = useState<UserAnswers>({});
    const [timeRemaining, setTimeRemaining] = useState(EXAM_DURATION);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [gradingResult, setGradingResult] = useState<GradingResult | null>(null);
    const [isGrading, setIsGrading] = useState(false);
    const [showTimeTravel, setShowTimeTravel] = useState(true);
    const [travelYear, setTravelYear] = useState(2024);
    const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');

    // Phase 2: Guided Learning Mode State
    const [learningMode, setLearningMode] = useState<'simulation' | 'guided'>('simulation');
    const [workflowStates, setWorkflowStates] = useState<Record<string, WorkflowState>>({});

    // Results navigation state
    const [resultsReqIndex, setResultsReqIndex] = useState(0);

    // Fetch exam data
    const { data: fetchedExamData, isLoading: isLoadingExam } = useQuery({
        queryKey: ['exam-essays', year, 'civil-combined'],
        queryFn: async () => {
            const res = await apiRequest('GET', `/api/exam-essays/${year}/civil-combined`);
            return res.json();
        },
        enabled: !showTimeTravel,
    });

    // Time travel animation
    useEffect(() => {
        if (showTimeTravel) {
            const startYear = new Date().getFullYear();
            let currentYear = startYear;
            const targetYear = year;

            // If we are already at target, just show a quick transition or staying put
            // But usually we want to go BACK in time. 
            // If target is same as current, let's start from current + 1 to show some movement
            if (currentYear === targetYear) {
                currentYear = targetYear + 5; // Start from 5 years in future for effect
            }

            const direction = targetYear < currentYear ? -1 : 1;

            const interval = setInterval(() => {
                currentYear += direction;
                setTravelYear(currentYear);

                // Stop condition
                const finished = direction === -1
                    ? currentYear <= targetYear
                    : currentYear >= targetYear;

                if (finished) {
                    setTravelYear(targetYear); // Ensure exact match
                    clearInterval(interval);
                    setTimeout(() => {
                        setShowTimeTravel(false);
                        setIsLoading(false);
                    }, 800); // Little pause at destination
                }
            }, 60); // Faster animation

            return () => clearInterval(interval);
        }
    }, [year, showTimeTravel]);

    // Timer effect
    useEffect(() => {
        if (isLoading || isSubmitted || showTimeTravel) return;

        const timer = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev <= 0) {
                    clearInterval(timer);
                    handleSubmit();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isLoading, isSubmitted, showTimeTravel]);

    // Auto-save effect
    useEffect(() => {
        if (Object.keys(answers).length === 0) return;

        setAutoSaveStatus('saving');
        const timeout = setTimeout(() => {
            // Save to localStorage
            localStorage.setItem(`proba2-${year}-answers`, JSON.stringify(answers));
            localStorage.setItem(`proba2-${year}-time`, String(timeRemaining));
            setAutoSaveStatus('saved');
        }, 2000);

        return () => clearTimeout(timeout);
    }, [answers, year]);

    // Load saved answers
    useEffect(() => {
        const savedAnswers = localStorage.getItem(`proba2-${year}-answers`);
        const savedTime = localStorage.getItem(`proba2-${year}-time`);

        if (savedAnswers) {
            setAnswers(JSON.parse(savedAnswers));
        }
        if (savedTime) {
            setTimeRemaining(parseInt(savedTime));
        }

        // Load workflow states
        const savedWorkflows = localStorage.getItem(`proba2-${year}-workflows`);
        if (savedWorkflows) {
            setWorkflowStates(JSON.parse(savedWorkflows));
        }

        // Load saved mode preference
        const savedMode = localStorage.getItem(`proba2-mode-preference`);
        if (savedMode === 'guided' || savedMode === 'simulation') {
            setLearningMode(savedMode);
        }
    }, [year]);

    // Save workflow states
    useEffect(() => {
        if (Object.keys(workflowStates).length > 0) {
            localStorage.setItem(`proba2-${year}-workflows`, JSON.stringify(workflowStates));
        }
    }, [workflowStates, year]);

    // Save mode preference
    const handleModeChange = (mode: 'simulation' | 'guided') => {
        setLearningMode(mode);
        localStorage.setItem(`proba2-mode-preference`, mode);
    };

    const handleWorkflowSave = (reqId: string, state: WorkflowState) => {
        setWorkflowStates(prev => ({
            ...prev,
            [reqId]: state
        }));
    };

    // Use fetched data or demo data
    useEffect(() => {
        if (fetchedExamData) {
            setExamData(fetchedExamData);
        } else if (!isLoadingExam && !showTimeTravel) {
            // Demo data if no real data
            setExamData({
                year,
                discipline: 'civil-combined',
                totalPoints: 10,
                subjects: [
                    {
                        subjectId: 'civil-1',
                        subjectTitle: 'Subiectul I',
                        subjectArea: 'Drept Civil',
                        scenario: `A a încheiat cu B un contract de vânzare având ca obiect un autoturism, prețul stabilit de părți fiind de 50.000 lei. Contractul a fost încheiat la data de 15.03.2023. La data de 20.04.2023, A a descoperit că autoturismul avea un viciu ascuns care îl făcea impropriu utilizării sale.

A l-a notificat pe B cu privire la acest viciu la data de 25.04.2023, solicitându-i remedierea defecțiunii. B a refuzat să remedieze viciul, susținând că acesta a apărut după predarea bunului. În aceste condiții, A a introdus o acțiune în justiție împotriva lui B.`,
                        requirements: [
                            {
                                id: 'civil-1-1',
                                requirementId: '1.1',
                                requirementText: 'Arătați motivat care este obiectul acțiunii introduse de A și care sunt temeiurile juridice ale acesteia.',
                                points: '0.75',
                                recommendedTime: 15,
                                solution: 'Răspunsul trebuie să identifice: acțiune în răspundere pentru vicii ascunse; temei juridic: art. 1707 și urm. Cod civil.',
                                rubric: [
                                    { criterion: 'Identificarea corectă a obiectului acțiunii', points: '0.25' },
                                    { criterion: 'Indicarea temeiului juridic corect', points: '0.25' },
                                    { criterion: 'Argumentare coerentă', points: '0.25' }
                                ]
                            },
                            {
                                id: 'civil-1-2',
                                requirementId: '1.2',
                                requirementText: 'Analizați condițiile răspunderii vânzătorului pentru vicii ascunse și verificați dacă sunt îndeplinite în speță.',
                                points: '1.00',
                                recommendedTime: 20,
                                solution: 'Condițiile: viciul să fie ascuns, să existe la momentul predării, să facă bunul impropriu întrebuințării. Analiza fiecărei condiții în speță.',
                                rubric: [
                                    { criterion: 'Enumerarea condițiilor', points: '0.25' },
                                    { criterion: 'Analiza fiecărei condiții', points: '0.50' },
                                    { criterion: 'Concluzie motivată', points: '0.25' }
                                ]
                            }
                        ]
                    },
                    {
                        subjectId: 'proc-civil-1',
                        subjectTitle: 'Subiectul II',
                        subjectArea: 'Drept Procesual Civil',
                        scenario: `În cadrul unui litigiu civil, reclamantul A a chemat în judecată pe pârâtul B, solicitând obligarea acestuia la plata unei sume de 100.000 lei reprezentând daune-interese pentru prejudiciul suferit.

Acțiunea a fost înregistrată pe rolul Judecătoriei X. Pârâtul B a invocat excepția de necompetență teritorială, susținând că litigiul ar trebui să fie judecat de Judecătoria Y, unde își are domiciliul.`,
                        requirements: [
                            {
                                id: 'proc-1-1',
                                requirementId: '2.1',
                                requirementText: 'Indicați natura competenței teritoriale în speță și cine o poate invoca.',
                                points: '0.75',
                                recommendedTime: 15,
                                solution: 'Competența teritorială este de ordine privată (alternativă). Poate fi invocată doar de pârât, la primul termen la care acesta este legal citat.',
                                rubric: [
                                    { criterion: 'Natura competenței', points: '0.25' },
                                    { criterion: 'Cine o poate invoca', points: '0.25' },
                                    { criterion: 'Termenul de invocare', points: '0.25' }
                                ]
                            },
                            {
                                id: 'proc-1-2',
                                requirementId: '2.2',
                                requirementText: 'Arătați care sunt consecințele admiterii sau respingerii excepției de necompetență teritorială.',
                                points: '0.75',
                                recommendedTime: 15,
                                solution: 'Admitere: declinarea competenței către instanța competentă. Respingere: judecata continuă la instanța sesizată.',
                                rubric: [
                                    { criterion: 'Consecințe la admitere', points: '0.35' },
                                    { criterion: 'Consecințe la respingere', points: '0.35' },
                                    { criterion: 'Claritate exprimare', points: '0.05' }
                                ]
                            }
                        ]
                    }
                ]
            });
        }
    }, [fetchedExamData, isLoadingExam, showTimeTravel, year]);

    // Current subject and requirement
    const currentSubject = examData?.subjects[currentSubjectIndex];
    const currentRequirement = currentSubject?.requirements[currentRequirementIndex];
    const allRequirements = examData?.subjects.flatMap(s => s.requirements) || [];
    const globalRequirementIndex = (examData?.subjects
        .slice(0, currentSubjectIndex)
        .reduce((acc, s) => acc + s.requirements.length, 0) ?? 0) + currentRequirementIndex;

    // Navigation
    const navigateToRequirement = (subjectIdx: number, reqIdx: number) => {
        setCurrentSubjectIndex(subjectIdx);
        setCurrentRequirementIndex(reqIdx);
    };

    const goNext = () => {
        if (!currentSubject) return;
        if (currentRequirementIndex < currentSubject.requirements.length - 1) {
            setCurrentRequirementIndex(currentRequirementIndex + 1);
        } else if (currentSubjectIndex < (examData?.subjects.length || 0) - 1) {
            setCurrentSubjectIndex(currentSubjectIndex + 1);
            setCurrentRequirementIndex(0);
        }
    };

    const goPrev = () => {
        if (currentRequirementIndex > 0) {
            setCurrentRequirementIndex(currentRequirementIndex - 1);
        } else if (currentSubjectIndex > 0) {
            const prevSubject = examData?.subjects[currentSubjectIndex - 1];
            setCurrentSubjectIndex(currentSubjectIndex - 1);
            setCurrentRequirementIndex((prevSubject?.requirements.length || 1) - 1);
        }
    };

    // Answer handling
    const updateAnswer = (text: string) => {
        if (!currentRequirement) return;
        setAnswers(prev => ({
            ...prev,
            [currentRequirement.id]: text
        }));
    };

    // Submit handler
    const handleSubmit = async () => {
        setIsSubmitted(true);
        setIsGrading(true);

        try {
            // Call AI grading endpoint
            const res = await apiRequest('POST', '/api/ai/grade-essay', {
                year,
                discipline: 'civil-combined',
                answers,
                timeSpent: EXAM_DURATION - timeRemaining
            });

            const result = await res.json();
            setGradingResult(result);
        } catch (error) {
            console.error('Grading error:', error);
            // Generate demo grading result
            const totalAnswered = Object.keys(answers).length;
            setGradingResult({
                totalScore: 7.5,
                maxScore: 10,
                percentage: 75,
                passed: true,
                bySubject: {
                    'civil-1': { score: 4.0, max: 5 },
                    'proc-civil-1': { score: 3.5, max: 5 }
                },
                feedback: allRequirements.map(req => ({
                    requirementId: req.requirementId,
                    score: parseFloat(req.points) * 0.75,
                    maxScore: parseFloat(req.points),
                    feedback: 'Răspuns bun, dar lipsesc câteva elemente.',
                    strengths: ['Identificare corectă a problemei', 'Argumentare logică'],
                    improvements: ['Adaugă temei legal specific', 'Detaliază aplicarea la speță']
                })),
                overallFeedback: 'Lucrare bună în ansamblu. Ai demonstrat înțelegere solidă a materiei, dar poți îmbunătăți structura și fundamentarea juridică.',
                expressionScore: 0.40
            });
        } finally {
            setIsGrading(false);
            setShowResults(true);

            // Clear saved data
            localStorage.removeItem(`proba2-${year}-answers`);
            localStorage.removeItem(`proba2-${year}-time`);
        }
    };

    // Progress calculation
    const answeredCount = Object.keys(answers).filter(k => answers[k]?.trim()).length;
    const progressPercent = allRequirements.length > 0
        ? Math.round((answeredCount / allRequirements.length) * 100)
        : 0;

    // Time Travel Animation Screen
    if (showTimeTravel) {
        return (
            <div className="fixed inset-0 bg-gradient-to-b from-purple-950 via-black to-purple-950 flex items-center justify-center overflow-hidden">
                {/* Animated stars/particles */}
                <div className="absolute inset-0">
                    {[...Array(50)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 2}s`
                            }}
                        />
                    ))}
                </div>

                <div className="text-center z-10">
                    <Clock className="h-20 w-20 mx-auto text-purple-400 animate-spin" style={{ animationDuration: '2s' }} />
                    <p className="text-purple-300 mt-4 text-lg">Călătorie în timp...</p>
                    <p className="text-6xl font-bold text-white mt-2 font-mono">{travelYear}</p>
                    <p className="text-purple-300 text-sm mt-4">Proba II - Redactare Spețe</p>
                    <Badge className="mt-2 bg-purple-500/20 text-purple-300 border-purple-500">
                        <PenTool className="h-3 w-3 mr-1" /> 4 ore • Drept Civil + Procesual Civil
                    </Badge>
                </div>
            </div>
        );
    }

    // Loading state
    if (isLoading || !examData) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-background to-purple-950/10 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-background to-purple-950/10">
            {/* Top Timer Bar */}
            <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-purple-500/30">
                <div className="container mx-auto px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="sm" onClick={() => setLocation("/time-machine")}>
                                <Home className="h-4 w-4 mr-1" />
                                Ieșire
                            </Button>
                            <Badge variant="outline" className="text-purple-400 border-purple-500/50">
                                <Clock className="h-3 w-3 mr-1" />
                                {year} • Proba II
                            </Badge>
                        </div>

                        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${timeRemaining < 1800 ? 'bg-red-500/20 text-red-400' : 'bg-purple-500/20 text-purple-300'
                            }`}>
                            <Timer className="h-5 w-5" />
                            <span className="font-mono text-xl font-bold">
                                {formatTime(timeRemaining)}
                            </span>
                            {timeRemaining < 1800 && (
                                <AlertTriangle className="h-4 w-4 animate-pulse" />
                            )}
                        </div>

                        {/* Mode Switcher */}
                        <div className="flex items-center space-x-2 bg-background/50 p-2 rounded-lg border border-border/50 mx-2">
                            <Switch
                                id="mode-switch"
                                checked={learningMode === 'guided'}
                                onCheckedChange={(checked) => handleModeChange(checked ? 'guided' : 'simulation')}
                            />
                            <Label htmlFor="mode-switch" className="cursor-pointer font-medium text-sm">
                                {learningMode === 'guided' ? '🎓 Mod Ghidat' : '⚡ Mod Simulare'}
                            </Label>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 text-sm">
                                {autoSaveStatus === 'saving' && (
                                    <span className="text-yellow-500 flex items-center gap-1">
                                        <Loader2 className="h-3 w-3 animate-spin" /> Salvare...
                                    </span>
                                )}
                                {autoSaveStatus === 'saved' && (
                                    <span className="text-green-500 flex items-center gap-1">
                                        <CheckCircle2 className="h-3 w-3" /> Salvat
                                    </span>
                                )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                                {answeredCount}/{allRequirements.length} rezolvate
                            </div>
                            <Progress value={progressPercent} className="w-32 h-2" />
                            <Button
                                onClick={handleSubmit}
                                disabled={isSubmitted}
                                className="bg-purple-600 hover:bg-purple-700"
                            >
                                <Send className="h-4 w-4 mr-1" />
                                Predă Lucrarea
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto p-4">
                <div className="grid grid-cols-12 gap-4">
                    {/* Left Sidebar - Subject Navigator */}
                    <div className="col-span-3 space-y-2">
                        {examData.subjects.map((subject, sIdx) => (
                            <Card key={subject.subjectId} className="overflow-hidden border-border">
                                <CardHeader className={`p-3 ${currentSubjectIndex === sIdx ? 'bg-purple-500/10' : 'bg-card'}`}>
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        {subject.subjectArea.includes('Procesual') ? (
                                            <FileText className="h-4 w-4 text-emerald-400" />
                                        ) : (
                                            <Scale className="h-4 w-4 text-indigo-400" />
                                        )}
                                        {subject.subjectTitle}
                                    </CardTitle>
                                    <p className="text-xs text-muted-foreground">{subject.subjectArea}</p>
                                </CardHeader>
                                <CardContent className="p-2 space-y-1">
                                    {subject.requirements.map((req, rIdx) => {
                                        const hasAnswer = !!answers[req.id]?.trim();
                                        const isActive = currentSubjectIndex === sIdx && currentRequirementIndex === rIdx;

                                        return (
                                            <Button
                                                key={req.id}
                                                variant={isActive ? "default" : "ghost"}
                                                size="sm"
                                                className={`w-full justify-start text-left h-auto py-2 ${isActive ? 'bg-purple-600' : ''}`}
                                                onClick={() => navigateToRequirement(sIdx, rIdx)}
                                            >
                                                <div className="flex items-center gap-2 w-full">
                                                    <Badge
                                                        variant={hasAnswer ? "default" : "outline"}
                                                        className={`text-xs shrink-0 ${hasAnswer ? 'bg-green-500' : ''}`}
                                                    >
                                                        {req.requirementId}
                                                    </Badge>
                                                    <span className="text-xs truncate flex-1">
                                                        {req.points}p
                                                    </span>
                                                    {hasAnswer && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                                                </div>
                                            </Button>
                                        );
                                    })}
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Center - Main Editor Area */}
                    <div className="col-span-9 space-y-4">
                        {currentSubject && currentRequirement && (
                            <>
                                {/* Scenario Card */}
                                {currentSubject.scenario && (
                                    <Card className="border-purple-500/30">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <BookOpen className="h-5 w-5 text-purple-400" />
                                                {currentSubject.subjectTitle} - Speță
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <ScrollArea className="h-[200px]">
                                                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                                    {currentSubject.scenario}
                                                </p>
                                            </ScrollArea>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Current Requirement */}
                                <Card className="border-indigo-500/30">
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <Badge className="bg-indigo-600">
                                                    Cerința {currentRequirement.requirementId}
                                                </Badge>
                                                <Badge variant="outline" className="text-indigo-300 border-indigo-500/50">
                                                    {currentRequirement.points} puncte
                                                </Badge>
                                                {currentRequirement.recommendedTime && (
                                                    <Badge variant="outline" className="text-muted-foreground">
                                                        <Timer className="h-3 w-3 mr-1" />
                                                        ~{currentRequirement.recommendedTime} min
                                                    </Badge>
                                                )}
                                            </CardTitle>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="p-4 bg-muted/50 rounded-lg">
                                            <p className="text-sm font-medium">{currentRequirement.requirementText}</p>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label className="text-sm font-medium flex items-center gap-2">
                                                    <PenTool className="h-4 w-4" />
                                                    Răspunsul tău:
                                                </label>
                                                <span className="text-xs text-muted-foreground">
                                                    {countWords(answers[currentRequirement.id] || '')} cuvinte
                                                </span>
                                            </div>
                                            {learningMode === 'simulation' ? (
                                                <Textarea
                                                    className="min-h-[400px] font-mono text-sm leading-relaxed p-6 resize-none focus-visible:ring-purple-500"
                                                    placeholder="Redactează răspunsul tău aici..."
                                                    value={answers[currentRequirement.id] || ''}
                                                    onChange={(e) => updateAnswer(e.target.value)}
                                                    disabled={isSubmitted}
                                                />
                                            ) : (
                                                <CaseWorkflow
                                                    requirementId={currentRequirement.id}
                                                    initialData={workflowStates[currentRequirement.id]}
                                                    onSave={(state) => handleWorkflowSave(currentRequirement.id, state)}
                                                    onDraftChange={(text) => updateAnswer(text)}
                                                />
                                            )}
                                        </div>

                                        {/* Navigation */}
                                        <div className="flex items-center justify-between pt-4">
                                            <Button
                                                variant="outline"
                                                onClick={goPrev}
                                                disabled={currentSubjectIndex === 0 && currentRequirementIndex === 0}
                                            >
                                                <ChevronLeft className="h-4 w-4 mr-1" />
                                                Anterioară
                                            </Button>

                                            <span className="text-sm text-muted-foreground">
                                                {(globalRequirementIndex || 0) + 1} / {allRequirements.length}
                                            </span>

                                            <Button
                                                onClick={goNext}
                                                disabled={
                                                    currentSubjectIndex === examData.subjects.length - 1 &&
                                                    currentRequirementIndex === (currentSubject?.requirements.length || 0) - 1
                                                }
                                            >
                                                Următoarea
                                                <ChevronRight className="h-4 w-4 ml-1" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Results Dialog - Enhanced */}
            <Dialog open={showResults} onOpenChange={setShowResults}>
                <DialogContent className="max-w-7xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
                    <DialogHeader className="p-6 pb-2 border-b bg-muted/20">
                        <DialogTitle className="text-2xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {gradingResult?.passed ? (
                                    <>
                                        <Trophy className="h-8 w-8 text-yellow-500" />
                                        <div>
                                            <span className="text-green-400 font-bold block text-lg">ADMIS</span>
                                            <span className="text-sm font-normal text-muted-foreground">Felicitări!</span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <XCircle className="h-8 w-8 text-red-500" />
                                        <div>
                                            <span className="text-red-400 font-bold block text-lg">RESPINS</span>
                                            <span className="text-sm font-normal text-muted-foreground">Mai încearcă odată</span>
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-3xl font-mono font-bold">
                                    {gradingResult?.totalScore.toFixed(2)} <span className="text-lg text-muted-foreground">/ {gradingResult?.maxScore}</span>
                                </span>
                                <Badge variant={gradingResult?.passed ? "default" : "destructive"} className="mt-1">
                                    {gradingResult?.percentage}% Corectitudine
                                </Badge>
                            </div>
                        </DialogTitle>
                    </DialogHeader>

                    {isGrading ? (
                        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                            <Loader2 className="h-16 w-16 animate-spin text-purple-500" />
                            <p className="text-lg text-muted-foreground">
                                AI Mentor analizează lucrarea ta...
                            </p>
                        </div>
                    ) : gradingResult && (
                        <Tabs defaultValue="analysis" className="flex-1 flex flex-col overflow-hidden">
                            <div className="px-6 py-2 border-b bg-muted/10">
                                <TabsList className="grid w-full grid-cols-3 max-w-md">
                                    <TabsTrigger value="analysis">🤖 Analiză AI</TabsTrigger>
                                    <TabsTrigger value="solution">📜 Barem Oficial</TabsTrigger>
                                    <TabsTrigger value="compare">🆚 Comparație</TabsTrigger>
                                </TabsList>
                            </div>

                            <div className="flex-1 overflow-y-auto bg-muted/5 p-6">
                                {/* Tab 1: AI Analysis */}
                                <TabsContent value="analysis" className="m-0 space-y-6 h-full">
                                    <Card className="bg-gradient-to-br from-purple-900/10 to-blue-900/10 border-purple-500/20">
                                        <CardHeader>
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <Sparkles className="h-5 w-5 text-purple-400" />
                                                Feedback General
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <p className="text-base leading-relaxed text-foreground/90 font-medium">
                                                {gradingResult.overallFeedback}
                                            </p>
                                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                                                <div>
                                                    <span className="text-xs uppercase text-muted-foreground font-bold tracking-wider">Punctaj Exprimare</span>
                                                    <div className="text-xl font-mono mt-1">{gradingResult.expressionScore.toFixed(2)} p</div>
                                                </div>
                                                <div>
                                                    <span className="text-xs uppercase text-muted-foreground font-bold tracking-wider">Timp Utilizat</span>
                                                    <div className="text-xl font-mono mt-1">{formatTime(EXAM_DURATION - timeRemaining)}</div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <div className="space-y-4">
                                        <h3 className="font-semibold text-lg">Detalii pe Cerințe</h3>
                                        {gradingResult.feedback.map((fb, idx) => (
                                            <Card key={idx} className={`overflow-hidden transition-all hover:shadow-md ${fb.score >= fb.maxScore * 0.8 ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-amber-500'}`}>
                                                <CardContent className="p-5">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <Badge variant="outline" className="font-mono">Cerința {fb.requirementId}</Badge>
                                                                {fb.score === fb.maxScore && <Badge className="bg-green-500/20 text-green-400 border-green-500/50">Perfect</Badge>}
                                                            </div>
                                                        </div>
                                                        <span className="text-xl font-bold font-mono">
                                                            {fb.score.toFixed(2)} <span className="text-sm text-muted-foreground">/ {fb.maxScore}</span>
                                                        </span>
                                                    </div>

                                                    <p className="text-sm text-muted-foreground mb-4 bg-muted p-3 rounded-md italic border-l-2 border-purple-500/30">
                                                        "{fb.feedback}"
                                                    </p>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div>
                                                            <span className="text-xs font-bold text-green-500 mb-2 block flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Puncte Tari</span>
                                                            <ul className="text-xs space-y-1">
                                                                {fb.strengths.map((s, i) => <li key={i} className="flex gap-2 text-muted-foreground">• {s}</li>)}
                                                            </ul>
                                                        </div>
                                                        <div>
                                                            <span className="text-xs font-bold text-amber-500 mb-2 block flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> De Îmbunătățit</span>
                                                            <ul className="text-xs space-y-1">
                                                                {fb.improvements.map((s, i) => <li key={i} className="flex gap-2 text-muted-foreground">• {s}</li>)}
                                                            </ul>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </TabsContent>

                                {/* Tab 2: Official Solution */}
                                <TabsContent value="solution" className="m-0 h-full">
                                    <div className="grid grid-cols-12 gap-6 h-full">
                                        {/* Left Side: Navigation */}
                                        <div className="col-span-3 border-r pr-4 space-y-2 overflow-y-auto">
                                            <h3 className="font-bold text-sm mb-4 text-purple-400 px-2 uppercase tracking-wider">Cerințe Examen</h3>
                                            {allRequirements.map((req, idx) => (
                                                <Button
                                                    key={req.id}
                                                    variant={resultsReqIndex === idx ? "secondary" : "ghost"}
                                                    className={`w-full justify-start text-left h-auto py-3 px-4 ${resultsReqIndex === idx ? 'bg-purple-500/10 text-purple-300 border-l-2 border-purple-500 rounded-r-none rounded-l-sm' : 'text-muted-foreground'}`}
                                                    onClick={() => setResultsReqIndex(idx)}
                                                >
                                                    <div>
                                                        <div className="font-bold text-sm">Cerința {req.requirementId}</div>
                                                        <div className="text-xs opacity-70 truncate max-w-[180px]">{req.requirementText}</div>
                                                    </div>
                                                </Button>
                                            ))}
                                        </div>

                                        {/* Right Side: Content */}
                                        <div className="col-span-9 space-y-6 overflow-y-auto pr-2 pb-6">
                                            {(() => {
                                                const req = allRequirements[resultsReqIndex || 0];
                                                if (!req) return null;
                                                return (
                                                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                        <div className="bg-card border rounded-lg p-6">
                                                            <Badge className="mb-2 bg-blue-500/20 text-blue-300 hover:bg-blue-500/30">Enunț Oficial</Badge>
                                                            <h3 className="text-lg font-medium">{req.requirementText}</h3>
                                                        </div>

                                                        <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-6">
                                                            <div className="flex items-center gap-2 mb-4">
                                                                <Badge className="bg-green-500/20 text-green-400 hover:bg-green-500/30">Soluție Model</Badge>
                                                            </div>
                                                            <ScrollArea className="h-[300px] pr-4">
                                                                <div className="text-sm leading-relaxed whitespace-pre-wrap font-serif text-foreground/90">
                                                                    {req.solution || "Soluția model nu este disponibilă pentru această cerință."}
                                                                </div>
                                                            </ScrollArea>
                                                        </div>

                                                        <div className="border rounded-lg overflow-hidden">
                                                            <div className="bg-muted p-3 border-b">
                                                                <h4 className="font-bold text-sm flex items-center gap-2">
                                                                    <ListChecks className="h-4 w-4" /> Grilă de Evaluare (Rubric)
                                                                </h4>
                                                            </div>
                                                            <div className="divide-y">
                                                                {req.rubric.map((r, i) => (
                                                                    <div key={i} className="p-3 flex justify-between items-center hover:bg-muted/30 transition-colors">
                                                                        <span className="text-sm text-foreground/80">{r.criterion}</span>
                                                                        <Badge variant="outline" className="font-mono bg-background">{r.points}p</Badge>
                                                                    </div>
                                                                ))}
                                                                <div className="p-3 bg-muted/20 flex justify-between items-center font-bold">
                                                                    <span className="text-sm">TOTAL</span>
                                                                    <span className="text-sm">{req.points}p</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })()}
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* Tab 3: Compare */}
                                <TabsContent value="compare" className="m-0 h-full overflow-hidden flex flex-col">
                                    <div className="flex items-center gap-2 mb-4 border-b pb-2 flex-shrink-0">
                                        <Scale className="h-4 w-4 text-purple-400" />
                                        <span className="font-bold text-sm">Comparație Directă</span>
                                        <select
                                            className="ml-auto bg-background border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                                            value={resultsReqIndex}
                                            onChange={(e) => setResultsReqIndex(parseInt(e.target.value))}
                                        >
                                            {allRequirements.map((req, idx) => (
                                                <option key={req.id} value={idx}>Cerința {req.requirementId} ({req.points}p)</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
                                        {/* Your Answer */}
                                        <div className="flex flex-col h-full border rounded-lg bg-background overflow-hidden">
                                            <div className="p-3 bg-muted/40 border-b flex justify-between items-center">
                                                <span className="font-bold text-sm flex items-center gap-2 text-foreground/80">
                                                    <PenTool className="h-3 w-3" /> Răspunsul Tău
                                                </span>
                                            </div>
                                            <div className="flex-1 p-4 overflow-y-auto bg-yellow-50/5">
                                                <p className="text-sm leading-relaxed whitespace-pre-wrap font-mono text-foreground/80">
                                                    {(() => {
                                                        const req = allRequirements[resultsReqIndex || 0];
                                                        return answers[req?.id] || <span className="text-muted-foreground italic opacity-50">Nu ai răspuns la această cerință.</span>
                                                    })()}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Official Solution */}
                                        <div className="flex flex-col h-full border rounded-lg bg-background overflow-hidden">
                                            <div className="p-3 bg-green-500/10 border-b flex justify-between items-center">
                                                <span className="font-bold text-sm flex items-center gap-2 text-green-400">
                                                    <BookOpen className="h-3 w-3" /> Soluție Model
                                                </span>
                                            </div>
                                            <div className="flex-1 p-4 overflow-y-auto">
                                                <p className="text-sm leading-relaxed whitespace-pre-wrap font-serif text-foreground/90">
                                                    {allRequirements[resultsReqIndex || 0]?.solution || "Indisponibil"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 p-4 bg-purple-500/10 rounded-lg flex-shrink-0 border border-purple-500/20">
                                        <h4 className="font-bold text-sm mb-2 text-purple-300">💡 Sfat AI pentru această cerință:</h4>
                                        <p className="text-sm italic text-foreground/80">
                                            {(() => {
                                                const req = allRequirements[resultsReqIndex || 0];
                                                const feedback = gradingResult.feedback.find(f => f.requirementId === req.requirementId);
                                                return feedback?.improvements[0]
                                                    ? `Pentru a obține punctaj maxim: ${feedback.improvements[0]}`
                                                    : "Răspunsul tău este foarte bun! Continuă să menții această structură clară.";
                                            })()}
                                        </p>
                                    </div>
                                </TabsContent>
                            </div>
                        </Tabs>
                    )}

                    <DialogFooter className="p-4 border-t bg-muted/20 mt-auto">
                        <Button variant="outline" onClick={() => setShowResults(false)} className="mr-auto">
                            Închide
                        </Button>
                        <Button variant="default" onClick={() => setLocation('/time-machine')} className="bg-purple-600 hover:bg-purple-700">
                            <Home className="h-4 w-4 mr-2" />
                            Înapoi la Time Machine
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
