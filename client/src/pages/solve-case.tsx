import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CaseStudy } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Loader2, Clock, Send, CheckCircle, AlertTriangle, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function SolveCase() {
    const [, params] = useRoute("/solve-case/:id");
    const [location, setLocation] = useLocation();
    const id = params?.id;
    const { toast } = useToast();

    const [userAnswer, setUserAnswer] = useState("");
    const [startTime] = useState(Date.now());
    const [timeSpent, setTimeSpent] = useState(0); // seconds
    const [isTimerRunning, setIsTimerRunning] = useState(true);

    // Timer effect
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isTimerRunning) {
            interval = setInterval(() => {
                setTimeSpent(Math.floor((Date.now() - startTime) / 1000));
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isTimerRunning, startTime]);

    const { data: caseStudy, isLoading } = useQuery<CaseStudy>({
        queryKey: [`/api/case-studies/${id}`],
        enabled: !!id
    });

    const submitMutation = useMutation({
        mutationFn: async () => {
            const res = await apiRequest("POST", `/api/case-studies/${id}/submit`, {
                userAnswer,
                timeSpent
            });
            return res.json();
        },
        onSuccess: (data) => {
            setIsTimerRunning(false);
            toast({
                title: "Rezolvare trimisă!",
                description: `Nota estimată: ${data.grading.grade}`,
                variant: "default",
            });
            // Invalidate cache to show new submission if we navigate back
            queryClient.invalidateQueries({ queryKey: [`/api/case-studies/${id}/submissions`] });
        },
        onError: (error) => {
            toast({
                title: "Eroare la trimitere",
                description: "Nu am putut trimite rezolvarea. Încearcă din nou.",
                variant: "destructive",
            });
        }
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!caseStudy) {
        return <div>Speța nu a fost găsită.</div>;
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getDifficultyColor = (diff: string) => {
        switch (diff.toLowerCase()) {
            case 'easy': return 'bg-green-500/10 text-green-500 border-green-500/20';
            case 'medium': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
            case 'hard': return 'bg-red-500/10 text-red-500 border-red-500/20';
            default: return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
        }
    };

    // If submission was successful, show results overlay or replace view
    if (submitMutation.isSuccess && submitMutation.data) {
        const result = submitMutation.data;
        const evaluation = JSON.parse(result.submission.aiFeedback);

        return (
            <div className="container mx-auto p-4 max-w-6xl h-screen flex flex-col">
                <Button
                    variant="outline"
                    className="w-fit mb-4"
                    onClick={() => setLocation("/spete-bank")}
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Înapoi la Bancă
                </Button>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
                    {/* Left: Your Answer & Official Answer */}
                    <ScrollArea className="h-full pr-4">
                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Răspunsul Tău</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="whitespace-pre-wrap text-sm">{userAnswer}</p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Barem / Răspuns Model</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="whitespace-pre-wrap text-sm text-green-600/90 dark:text-green-400/90">
                                        {caseStudy.sampleAnswer || "Indisponibil"}
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </ScrollArea>

                    {/* Right: AI Evaluation */}
                    <ScrollArea className="h-full">
                        <Card className="border-primary/50 bg-primary/5 h-full">
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <CardTitle className="text-2xl text-primary">Nota: {result.grading.grade}</CardTitle>
                                    <Badge variant="outline" className="text-lg px-3 py-1 bg-background">
                                        EVALUARE AI
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div>
                                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                                        <CheckCircle className="h-5 w-5 text-green-500" />
                                        Puncte Tari
                                    </h3>
                                    <ul className="list-disc pl-5 space-y-1">
                                        {evaluation.strengths?.map((s: string, i: number) => (
                                            <li key={i} className="text-sm">{s}</li>
                                        ))}
                                    </ul>
                                </div>

                                <div>
                                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                                        Puncte Slabe & Omisiuni
                                    </h3>
                                    <ul className="list-disc pl-5 space-y-1">
                                        {evaluation.weaknesses?.map((w: string, i: number) => (
                                            <li key={i} className="text-sm text-muted-foreground">{w}</li>
                                        ))}
                                        {evaluation.missingPoints?.map((m: string, i: number) => (
                                            <li key={i} className="text-sm text-red-500 dark:text-red-400">{m}</li>
                                        ))}
                                    </ul>
                                </div>

                                <div>
                                    <h3 className="font-semibold mb-2">Concluzie</h3>
                                    <p className="text-sm italic border-l-4 border-primary pl-4 py-2 bg-background/50 rounded-r">
                                        {result.grading.feedback}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </ScrollArea>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-background">
            {/* Header */}
            <div className="border-b p-4 flex justify-between items-center bg-card/50 backdrop-blur shrink-0">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => setLocation("/spete-bank")}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="font-bold text-lg leading-none">{caseStudy.title}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className={getDifficultyColor(caseStudy.difficulty)}>
                                {caseStudy.difficulty}
                            </Badge>
                            <span className="text-xs text-muted-foreground font-mono uppercase">
                                {caseStudy.subject}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 font-mono text-xl text-primary font-bold bg-primary/10 px-4 py-2 rounded-md">
                        <Clock className="h-5 w-5" />
                        {formatTime(timeSpent)}
                    </div>

                    <Button
                        size="lg"
                        onClick={() => submitMutation.mutate()}
                        disabled={!userAnswer.trim() || submitMutation.isPending}
                        className="shadow-lg shadow-primary/20"
                    >
                        {submitMutation.isPending ? (
                            <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        ) : (
                            <Send className="h-5 w-5 mr-2" />
                        )}
                        Predă Lucrarea
                    </Button>
                </div>
            </div>

            {/* Main Content - Split Screen */}
            <div className="flex-1 flex min-h-0">
                {/* Left Panel: Case Study */}
                <div className="w-1/2 border-r bg-muted/10 flex flex-col">
                    <div className="p-3 border-b bg-muted/20 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Enunț Speță
                    </div>
                    <ScrollArea className="flex-1 p-6">
                        <div className="prose dark:prose-invert max-w-none">
                            <p className="text-lg leading-relaxed whitespace-pre-wrap font-serif">
                                {caseStudy.scenario}
                            </p>

                            {caseStudy.questions && (
                                <div className="mt-8 p-4 bg-card rounded-lg border">
                                    <h3 className="font-semibold mb-3">Cerinte:</h3>
                                    {Array.isArray(caseStudy.questions) ? (
                                        <ul className="list-decimal pl-5 space-y-2">
                                            {/* @ts-ignore */}
                                            {caseStudy.questions.map((q: string, i: number) => (
                                                <li key={i}>{q}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p>{JSON.stringify(caseStudy.questions)}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>

                {/* Right Panel: Exam Sheet */}
                <div className="w-1/2 flex flex-col bg-background">
                    <div className="p-3 border-b bg-muted/5 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex justify-between">
                        <span>Foaie de Examen</span>
                        <span className="text-[10px] opacity-70">Salvare automată (simulat)</span>
                    </div>
                    <div className="flex-1 p-6 flex flex-col">
                        <Textarea
                            className="flex-1 resize-none font-mono text-base leading-relaxed p-4 border-0 shadow-none focus-visible:ring-0 rounded-none bg-transparent"
                            placeholder="Începe să scrii rezolvarea aici..."
                            value={userAnswer}
                            onChange={(e) => setUserAnswer(e.target.value)}
                            spellCheck={false}
                        />
                        <div className="mt-2 text-xs text-muted-foreground text-right border-t pt-2">
                            {userAnswer.length} caractere | {userAnswer.split(/\s+/).filter(w => w.length > 0).length} cuvinte
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
