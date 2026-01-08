import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
    PenTool,
    Clock,
    Scale,
    Shield,
    ChevronRight,
    ChevronLeft,
    CheckCircle,
    Send,
    Pause,
    Play,
    AlertTriangle,
    FileText,
    BookOpen,
    ArrowRight,
    Sparkles,
    Loader2,
    ThumbsUp,
    ThumbsDown,
    AlertCircle
} from "lucide-react";

interface EssayPrompt {
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

interface RubricItem {
    id: string;
    category: string;
    description: string;
    points: number;
    criteria: string[];
}

type PageState = "list" | "writing" | "evaluation" | "result";

export default function Essay() {
    const queryClient = useQueryClient();
    const [pageState, setPageState] = useState<PageState>("list");
    const [selectedPrompt, setSelectedPrompt] = useState<EssayPrompt | null>(null);
    const [userAnswer, setUserAnswer] = useState("");
    const [selfEvaluation, setSelfEvaluation] = useState<Record<string, boolean>>({});
    const [timeSpent, setTimeSpent] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [submissionId, setSubmissionId] = useState<string | null>(null);
    const [aiGrading, setAiGrading] = useState<{
        aiScore: number;
        aiGrade: string;
        aiFeedback: string;
        evaluation: {
            strengths: string[];
            weaknesses: string[];
            missingPoints: string[];
        };
    } | null>(null);

    // Fetch essay prompts list
    const { data: promptsData, isLoading } = useQuery<{ prompts: any[]; count: number }>({
        queryKey: ["/api/essays"],
        enabled: pageState === "list",
    });

    // Timer effect
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isTimerRunning) {
            interval = setInterval(() => {
                setTimeSpent(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isTimerRunning]);

    // Submit mutation
    const submitMutation = useMutation({
        mutationFn: async (data: { userAnswer: string; selfEvaluation: Record<string, boolean>; selfScore: number; timeSpent: number }) => {
            const res = await fetch(`/api/essays/${selectedPrompt?.id}/submit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to submit essay");
            return res.json();
        },
        onSuccess: (data) => {
            setSubmissionId(data.submissionId);
            setPageState("result");
            setIsTimerRunning(false);
        },
    });

    // AI Grading mutation
    const aiGradingMutation = useMutation({
        mutationFn: async (submissionId: string) => {
            const res = await fetch(`/api/essays/submissions/${submissionId}/ai-grade`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });
            if (!res.ok) throw new Error("Failed to get AI grading");
            return res.json();
        },
        onSuccess: (data) => {
            setAiGrading(data);
        },
    });

    const formatTime = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getSubjectColor = (subject: string) => {
        if (subject.includes("civil")) return "bg-blue-500/20 text-blue-400 border-blue-500/30";
        if (subject.includes("penal")) return "bg-red-500/20 text-red-400 border-red-500/30";
        return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    };

    const getSubjectName = (subject: string) => {
        if (subject.includes("civil-procedural")) return "Drept Procesual Civil";
        if (subject.includes("civil")) return "Drept Civil";
        if (subject.includes("penal-procedural")) return "Drept Procesual Penal";
        if (subject.includes("penal")) return "Drept Penal";
        return subject;
    };

    const calculateSelfScore = () => {
        if (!selectedPrompt?.gradingRubric) return 0;
        let score = 0;
        selectedPrompt.gradingRubric.forEach((item) => {
            const checkedCriteria = item.criteria.filter((_, idx) =>
                selfEvaluation[`${item.id}-${idx}`]
            ).length;
            const ratio = checkedCriteria / item.criteria.length;
            score += Math.round(item.points * ratio);
        });
        return score;
    };

    const handleStartWriting = (prompt: EssayPrompt) => {
        setSelectedPrompt(prompt);
        setUserAnswer("");
        setSelfEvaluation({});
        setTimeSpent(0);
        setPageState("writing");
        setIsTimerRunning(true);
    };

    const handleFinishWriting = () => {
        setIsTimerRunning(false);
        setPageState("evaluation");
    };

    const handleSubmit = () => {
        const selfScore = calculateSelfScore();
        submitMutation.mutate({
            userAnswer,
            selfEvaluation,
            selfScore,
            timeSpent,
        });
    };

    const handleRestart = () => {
        setPageState("list");
        setSelectedPrompt(null);
        setUserAnswer("");
        setSelfEvaluation({});
        setTimeSpent(0);
        setSubmissionId(null);
        setAiGrading(null);
    };

    // Demo rubric for when no data exists
    const demoRubric: RubricItem[] = [
        {
            id: "1",
            category: "Identificarea problemelor juridice",
            description: "Identificarea corectă a problemelor de drept",
            points: 30,
            criteria: [
                "Identifică toate problemele juridice principale (15 pct)",
                "Identifică problemele juridice secundare (10 pct)",
                "Structurează logic problemele (5 pct)",
            ],
        },
        {
            id: "2",
            category: "Aplicarea legii",
            description: "Aplicarea corectă a normelor juridice",
            points: 40,
            criteria: [
                "Citează corect articolele relevante (10 pct)",
                "Interpretează corect normele (15 pct)",
                "Aplică norma la speță (15 pct)",
            ],
        },
        {
            id: "3",
            category: "Argumentație",
            description: "Calitatea argumentației juridice",
            points: 20,
            criteria: [
                "Argumentație logică și coerentă (10 pct)",
                "Referire la jurisprudență/doctrină (10 pct)",
            ],
        },
        {
            id: "4",
            category: "Formă și stil",
            description: "Claritate și corectitudine",
            points: 10,
            criteria: [
                "Corectitudine gramaticală (5 pct)",
                "Stil juridic adecvat (5 pct)",
            ],
        },
    ];

    // =========================================================================
    // PAGE STATE: LIST
    // =========================================================================
    if (pageState === "list") {
        return (
            <div className="container mx-auto max-w-5xl py-8 px-4">
                <div className="flex items-center gap-3 mb-8">
                    <PenTool className="h-8 w-8 text-primary" />
                    <div>
                        <h1 className="text-2xl font-bold">Probe Scrise (Spețe)</h1>
                        <p className="text-sm text-muted-foreground">Pregătire pentru probele scrise - Etapa I</p>
                    </div>
                </div>

                {/* Info Banner */}
                <Card className="mb-6 bg-blue-500/10 border-blue-500/30">
                    <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                            <BookOpen className="h-6 w-6 text-blue-400 mt-1" />
                            <div>
                                <h3 className="font-semibold text-blue-400 mb-1">Despre probele scrise</h3>
                                <p className="text-sm text-blue-200">
                                    Fiecare probă durează 4 ore. Veți primi o speță și va trebui să identificați
                                    problemele juridice, să aplicați normele relevante și să formulați soluții.
                                    Folosiți Baremul Interactiv pentru auto-evaluare obiectivă.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Exam Days */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <Card className="border-blue-500/30 hover:border-blue-500/50 transition-colors cursor-pointer">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <Scale className="h-8 w-8 text-blue-500" />
                                <div>
                                    <CardTitle>Ziua 1: Civil + Procesual Civil</CardTitle>
                                    <CardDescription>4 ore • Drept Civil și Drept Procesual Civil</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">
                                Spețe care combină probleme de drept civil și procedură civilă.
                            </p>
                            <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                                6 spețe disponibile
                            </Badge>
                        </CardContent>
                    </Card>

                    <Card className="border-red-500/30 hover:border-red-500/50 transition-colors cursor-pointer">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <Shield className="h-8 w-8 text-red-500" />
                                <div>
                                    <CardTitle>Ziua 2: Penal + Procesual Penal</CardTitle>
                                    <CardDescription>4 ore • Drept Penal și Drept Procesual Penal</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">
                                Spețe care combină probleme de drept penal și procedură penală.
                            </p>
                            <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30">
                                4 spețe disponibile
                            </Badge>
                        </CardContent>
                    </Card>
                </div>

                {/* Demo Essay Prompt */}
                <h3 className="text-lg font-semibold mb-4">Spețe disponibile</h3>
                <Card className="mb-4 hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-3">
                                    <Badge variant="outline" className={getSubjectColor("civil")}>
                                        Drept Civil
                                    </Badge>
                                    <Badge variant="outline" className="bg-secondary">
                                        Ziua 1
                                    </Badge>
                                    <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                                        Dificil
                                    </Badge>
                                </div>
                                <h4 className="font-semibold text-lg mb-2">
                                    Speță - Rezoluțiunea contractului de vânzare
                                </h4>
                                <p className="text-sm text-muted-foreground mb-3">
                                    Analizați condițiile rezoluțiunii unui contract de vânzare în contextul
                                    neîndeplinirii obligațiilor contractuale și identificați remediile disponibile.
                                </p>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        <Clock className="h-4 w-4" />
                                        ~120 min
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <FileText className="h-4 w-4" />
                                        100 puncte
                                    </span>
                                </div>
                            </div>
                            <Button
                                onClick={() => handleStartWriting({
                                    id: "demo-1",
                                    subject: "civil",
                                    examDay: "day1",
                                    title: "Rezoluțiunea contractului de vânzare",
                                    prompt: `A.B. a încheiat un contract de vânzare cu C.D. pentru un apartament în valoare de 150.000 EUR, cu plata prețului în rate lunare. După plata a 3 rate, C.D. a întârziat plata a 5 rate consecutive. A.B. dorește să obțină rezoluțiunea contractului.

Întrebări:
1. Care sunt condițiile legale pentru rezoluțiunea contractului?
2. Ce remedii are disponibile A.B. conform Codului Civil?
3. În ce condiții poate C.D. să se opună rezoluțiunii?
4. Care ar fi efectele rezoluțiunii asupra ratelor deja plătite?
5. Dacă A.B. optează pentru executarea silită în loc de rezoluțiune, care ar fi procedura aplicabilă?`,
                                    gradingRubric: demoRubric,
                                    difficulty: "hard",
                                    estimatedTime: 120,
                                    sourceType: "manual",
                                })}
                                className="bg-primary"
                            >
                                Începe
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Loading or empty state */}
                {isLoading && (
                    <div className="text-center py-8">
                        <PenTool className="h-12 w-12 text-muted-foreground animate-pulse mx-auto mb-4" />
                        <p className="text-muted-foreground">Se încarcă spețele...</p>
                    </div>
                )}
            </div>
        );
    }

    // =========================================================================
    // PAGE STATE: WRITING
    // =========================================================================
    if (pageState === "writing" && selectedPrompt) {
        return (
            <div className="container mx-auto max-w-6xl py-6 px-4">
                {/* Header with timer */}
                <div className="flex items-center justify-between mb-6 bg-card border rounded-lg p-4">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="sm" onClick={() => setPageState("list")}>
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Înapoi
                        </Button>
                        <div>
                            <h2 className="font-semibold">{selectedPrompt.title}</h2>
                            <Badge variant="outline" className={getSubjectColor(selectedPrompt.subject)}>
                                {getSubjectName(selectedPrompt.subject)}
                            </Badge>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-xs text-muted-foreground">Timp scurs</p>
                            <p className="text-2xl font-mono font-bold">{formatTime(timeSpent)}</p>
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setIsTimerRunning(!isTimerRunning)}
                        >
                            {isTimerRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Prompt */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Speța</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="prose prose-sm prose-invert max-w-none">
                                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                                    {selectedPrompt.prompt}
                                </pre>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Right: Answer */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Răspunsul tău</CardTitle>
                            <CardDescription>
                                Scrie răspunsul complet, structurat pe probleme juridice
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Textarea
                                value={userAnswer}
                                onChange={(e) => setUserAnswer(e.target.value)}
                                placeholder="Analizând speța prezentată, identificăm următoarele probleme juridice..."
                                className="min-h-[400px] font-mono text-sm"
                            />
                            <div className="flex items-center justify-between mt-4">
                                <p className="text-sm text-muted-foreground">
                                    {userAnswer.split(/\s+/).filter(w => w).length} cuvinte
                                </p>
                                <Button onClick={handleFinishWriting} disabled={!userAnswer.trim()}>
                                    Finalizează și Evaluează
                                    <ChevronRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    // =========================================================================
    // PAGE STATE: EVALUATION (Barem Interactiv)
    // =========================================================================
    if (pageState === "evaluation" && selectedPrompt) {
        const selfScore = calculateSelfScore();
        const maxScore = selectedPrompt.gradingRubric.reduce((sum, item) => sum + item.points, 0);

        return (
            <div className="container mx-auto max-w-5xl py-6 px-4">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold mb-1">Barem Interactiv</h1>
                        <p className="text-muted-foreground">
                            Auto-evaluează răspunsul tău conform criteriilor oficiale
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-muted-foreground">Scor estimat</p>
                        <p className="text-3xl font-bold text-primary">{selfScore} / {maxScore}</p>
                    </div>
                </div>

                {/* Progress bar */}
                <Card className="mb-6">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Progresul evaluării</span>
                            <span className="text-sm text-muted-foreground">
                                {Object.keys(selfEvaluation).length} criterii bifate
                            </span>
                        </div>
                        <Progress value={(selfScore / maxScore) * 100} className="h-3" />
                    </CardContent>
                </Card>

                {/* Rubric Items */}
                <div className="space-y-4 mb-6">
                    {selectedPrompt.gradingRubric.map((item) => (
                        <Card key={item.id} className="overflow-hidden">
                            <CardHeader className="bg-secondary/30 py-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-lg">{item.category}</CardTitle>
                                        <CardDescription>{item.description}</CardDescription>
                                    </div>
                                    <Badge variant="outline" className="text-lg px-3 py-1">
                                        {item.points} pct
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="space-y-3">
                                    {item.criteria.map((criterion, idx) => {
                                        const key = `${item.id}-${idx}`;
                                        const isChecked = !!selfEvaluation[key];

                                        return (
                                            <label
                                                key={key}
                                                className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${isChecked
                                                    ? "bg-green-500/20 border border-green-500/50"
                                                    : "bg-secondary/30 hover:bg-secondary/50"
                                                    }`}
                                            >
                                                <Checkbox
                                                    checked={isChecked}
                                                    onCheckedChange={(checked) => {
                                                        setSelfEvaluation(prev => ({
                                                            ...prev,
                                                            [key]: !!checked,
                                                        }));
                                                    }}
                                                />
                                                <span className={`text-sm ${isChecked ? "text-green-300" : ""}`}>
                                                    {criterion}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Submit */}
                <div className="flex items-center justify-between">
                    <Button variant="outline" onClick={() => setPageState("writing")}>
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Modifică răspunsul
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={submitMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        <Send className="mr-2 h-4 w-4" />
                        Trimite evaluarea ({selfScore} pct)
                    </Button>
                </div>
            </div>
        );
    }

    // =========================================================================
    // PAGE STATE: RESULT
    // =========================================================================
    if (pageState === "result" && selectedPrompt) {
        const selfScore = calculateSelfScore();
        const maxScore = selectedPrompt.gradingRubric.reduce((sum, item) => sum + item.points, 0);
        const percentage = Math.round((selfScore / maxScore) * 100);

        return (
            <div className="container mx-auto max-w-3xl py-8 px-4">
                <Card className="text-center py-12">
                    <CardContent>
                        <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-6" />
                        <h2 className="text-2xl font-bold mb-2">Evaluare completă! ✅</h2>
                        <p className="text-muted-foreground mb-8">
                            Răspunsul tău pentru "{selectedPrompt.title}" a fost salvat.
                        </p>

                        {/* Score display */}
                        <div className="bg-secondary/30 rounded-lg p-6 mb-8 max-w-sm mx-auto">
                            <p className="text-sm text-muted-foreground mb-2">Scorul tău</p>
                            <p className="text-5xl font-bold text-primary mb-2">{selfScore}</p>
                            <p className="text-sm text-muted-foreground">din {maxScore} puncte ({percentage}%)</p>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-8">
                            <div className="bg-secondary/20 rounded-lg p-4">
                                <Clock className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
                                <p className="text-lg font-semibold">{formatTime(timeSpent)}</p>
                                <p className="text-xs text-muted-foreground">Timp total</p>
                            </div>
                            <div className="bg-secondary/20 rounded-lg p-4">
                                <FileText className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
                                <p className="text-lg font-semibold">{userAnswer.split(/\s+/).filter(w => w).length}</p>
                                <p className="text-xs text-muted-foreground">Cuvinte scrise</p>
                            </div>
                        </div>

                        {/* Feedback based on score */}
                        {percentage >= 80 ? (
                            <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 mb-6">
                                <p className="text-green-300">
                                    🎉 Excelent! Ai demonstrat o înțelegere foarte bună a problemelor juridice.
                                </p>
                            </div>
                        ) : percentage >= 60 ? (
                            <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4 mb-6">
                                <p className="text-yellow-300">
                                    📚 Rezultat bun! Continuă să exersezi pentru a îmbunătăți argumentația.
                                </p>
                            </div>
                        ) : (
                            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
                                <p className="text-red-300">
                                    ⚠️ Mai ai de lucrat. Revizuiește materialele și încearcă din nou.
                                </p>
                            </div>
                        )}

                        {/* AI Grading Section */}
                        <div className="border-t border-border pt-6 mt-6">
                            {!aiGrading && (
                                <div className="text-center">
                                    <h3 className="font-semibold mb-2">Evaluare AI</h3>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Obține o evaluare automată de la AI pentru feedback detaliat
                                    </p>
                                    <Button
                                        onClick={() => submissionId && aiGradingMutation.mutate(submissionId)}
                                        disabled={aiGradingMutation.isPending || !submissionId}
                                        className="bg-purple-600 hover:bg-purple-700"
                                    >
                                        {aiGradingMutation.isPending ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Se evaluează...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="mr-2 h-4 w-4" />
                                                Obține notă AI
                                            </>
                                        )}
                                    </Button>
                                    {aiGradingMutation.isError && (
                                        <p className="text-red-400 text-sm mt-2">Eroare la evaluare. Încearcă din nou.</p>
                                    )}
                                </div>
                            )}

                            {aiGrading && (
                                <div className="space-y-4">
                                    {/* AI Score */}
                                    <div className="bg-purple-500/20 border border-purple-500/50 rounded-lg p-6 text-center">
                                        <Sparkles className="h-8 w-8 text-purple-400 mx-auto mb-2" />
                                        <p className="text-sm text-purple-300 mb-1">Nota AI (stil INM)</p>
                                        <p className="text-4xl font-bold text-purple-300">{aiGrading.aiGrade}</p>
                                        <p className="text-sm text-purple-300/70">din 10.00</p>
                                    </div>

                                    {/* Feedback */}
                                    <div className="bg-secondary/30 rounded-lg p-4">
                                        <h4 className="font-semibold mb-2">Feedback general</h4>
                                        <p className="text-sm text-muted-foreground">{aiGrading.aiFeedback}</p>
                                    </div>

                                    {/* Strengths */}
                                    {aiGrading.evaluation.strengths.length > 0 && (
                                        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                                            <h4 className="font-semibold text-green-400 mb-2 flex items-center gap-2">
                                                <ThumbsUp className="h-4 w-4" />
                                                Puncte tari
                                            </h4>
                                            <ul className="space-y-1">
                                                {aiGrading.evaluation.strengths.map((s, i) => (
                                                    <li key={i} className="text-sm text-green-300 flex items-start gap-2">
                                                        <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                                        {s}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Weaknesses */}
                                    {aiGrading.evaluation.weaknesses.length > 0 && (
                                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                                            <h4 className="font-semibold text-yellow-400 mb-2 flex items-center gap-2">
                                                <ThumbsDown className="h-4 w-4" />
                                                De îmbunătățit
                                            </h4>
                                            <ul className="space-y-1">
                                                {aiGrading.evaluation.weaknesses.map((w, i) => (
                                                    <li key={i} className="text-sm text-yellow-300 flex items-start gap-2">
                                                        <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                                        {w}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Missing Points */}
                                    {aiGrading.evaluation.missingPoints.length > 0 && (
                                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                                            <h4 className="font-semibold text-red-400 mb-2 flex items-center gap-2">
                                                <AlertCircle className="h-4 w-4" />
                                                Elemente lipsă din barem
                                            </h4>
                                            <ul className="space-y-1">
                                                {aiGrading.evaluation.missingPoints.map((m, i) => (
                                                    <li key={i} className="text-sm text-red-300 flex items-start gap-2">
                                                        <span className="text-red-400">•</span>
                                                        {m}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <Button onClick={handleRestart} size="lg" className="mt-6">
                            Alege altă speță
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return null;
}
