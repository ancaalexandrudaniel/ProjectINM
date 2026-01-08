import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    Brain,
    RotateCcw,
    ChevronRight,
    CheckCircle,
    XCircle,
    Clock,
    Flame,
    Target,
    AlertCircle
} from "lucide-react";

interface SrsCard {
    id: string;
    questionId: string;
    interval: number;
    easeFactor: number;
    repetitionCount: number;
    consecutiveCorrect: number;
    nextReviewAt: string;
    question: {
        id: string;
        subject: string;
        chapter: string;
        questionText: string;
        options: { text: string; correct: boolean }[];
        correctAnswer: number;
        explanation: string;
        legalReferences: string[];
    };
}

interface SrsStats {
    totalCards: number;
    dueToday: number;
    reviewedToday: number;
    averageEaseFactor: number;
    retentionRate: number;
}

type ReviewState = "question" | "answer" | "complete";

export default function SrsReview() {
    const queryClient = useQueryClient();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [reviewState, setReviewState] = useState<ReviewState>("question");
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [sessionReviewed, setSessionReviewed] = useState(0);

    // Fetch due cards
    const { data: dueCardsData, isLoading: cardsLoading } = useQuery<{ cards: SrsCard[]; count: number }>({
        queryKey: ["/api/srs/due"],
    });

    // Fetch stats
    const { data: stats } = useQuery<SrsStats>({
        queryKey: ["/api/srs/stats"],
    });

    // Review mutation
    const reviewMutation = useMutation({
        mutationFn: async ({ cardId, grade }: { cardId: string; grade: number }) => {
            const res = await fetch("/api/srs/review", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ cardId, grade }),
            });
            if (!res.ok) throw new Error("Failed to submit review");
            return res.json();
        },
        onSuccess: () => {
            setSessionReviewed((prev) => prev + 1);
            queryClient.invalidateQueries({ queryKey: ["/api/srs/stats"] });
        },
    });

    const cards = dueCardsData?.cards || [];
    const currentCard = cards[currentIndex];

    const handleShowAnswer = () => {
        setReviewState("answer");
    };

    const handleGrade = async (grade: number) => {
        if (!currentCard) return;

        await reviewMutation.mutateAsync({ cardId: currentCard.id, grade });

        // Move to next card
        if (currentIndex + 1 < cards.length) {
            setCurrentIndex(currentIndex + 1);
            setReviewState("question");
            setSelectedAnswer(null);
        } else {
            setReviewState("complete");
        }
    };

    const handleRestart = () => {
        queryClient.invalidateQueries({ queryKey: ["/api/srs/due"] });
        setCurrentIndex(0);
        setReviewState("question");
        setSelectedAnswer(null);
        setSessionReviewed(0);
    };

    const getSubjectColor = (subject: string) => {
        switch (subject) {
            case "civil": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
            case "civil-procedural": return "bg-cyan-500/20 text-cyan-400 border-cyan-500/30";
            case "penal": return "bg-red-500/20 text-red-400 border-red-500/30";
            case "penal-procedural": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
            default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
        }
    };

    const getSubjectName = (subject: string) => {
        switch (subject) {
            case "civil": return "Drept Civil";
            case "civil-procedural": return "Drept Procesual Civil";
            case "penal": return "Drept Penal";
            case "penal-procedural": return "Drept Procesual Penal";
            default: return subject;
        }
    };

    // Loading state
    if (cardsLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Brain className="h-16 w-16 text-primary animate-pulse mx-auto mb-4" />
                    <p className="text-muted-foreground">Se încarcă cardurile pentru revizuire...</p>
                </div>
            </div>
        );
    }

    // No cards due
    if (cards.length === 0 && reviewState !== "complete") {
        return (
            <div className="container mx-auto max-w-4xl py-8 px-4">
                <Card className="text-center py-12">
                    <CardContent>
                        <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-6" />
                        <h2 className="text-2xl font-bold mb-2">Felicitări! 🎉</h2>
                        <p className="text-muted-foreground mb-6">
                            Nu ai niciun card de revizuit pentru moment.
                        </p>

                        {stats && (
                            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-6">
                                <div className="bg-secondary/50 rounded-lg p-4">
                                    <p className="text-2xl font-bold text-primary">{stats.totalCards}</p>
                                    <p className="text-xs text-muted-foreground">Total carduri</p>
                                </div>
                                <div className="bg-secondary/50 rounded-lg p-4">
                                    <p className="text-2xl font-bold text-green-500">{stats.retentionRate}%</p>
                                    <p className="text-xs text-muted-foreground">Retenție</p>
                                </div>
                                <div className="bg-secondary/50 rounded-lg p-4">
                                    <p className="text-2xl font-bold text-amber-500">{stats.reviewedToday}</p>
                                    <p className="text-xs text-muted-foreground">Revizuite azi</p>
                                </div>
                            </div>
                        )}

                        <p className="text-sm text-muted-foreground">
                            Răspunde la câteva întrebări noi pentru a crea carduri de învățare!
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Session complete
    if (reviewState === "complete") {
        return (
            <div className="container mx-auto max-w-4xl py-8 px-4">
                <Card className="text-center py-12">
                    <CardContent>
                        <Flame className="h-20 w-20 text-amber-500 mx-auto mb-6" />
                        <h2 className="text-2xl font-bold mb-2">Sesiune completă! 🔥</h2>
                        <p className="text-muted-foreground mb-6">
                            Ai revizuit {sessionReviewed} carduri în această sesiune.
                        </p>
                        <Button onClick={handleRestart} size="lg">
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Verifică din nou
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-4xl py-8 px-4">
            {/* Header Stats */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Brain className="h-8 w-8 text-primary" />
                    <div>
                        <h1 className="text-2xl font-bold">Revizuire SRS</h1>
                        <p className="text-sm text-muted-foreground">Spaced Repetition System</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-sm text-muted-foreground">Progres sesiune</p>
                        <p className="font-semibold">{currentIndex + 1} / {cards.length}</p>
                    </div>
                    <div className="w-32">
                        <Progress value={((currentIndex + 1) / cards.length) * 100} />
                    </div>
                </div>
            </div>

            {/* Main Card */}
            {currentCard && (
                <Card className="relative overflow-hidden">
                    {/* Card metadata header */}
                    <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className={getSubjectColor(currentCard.question.subject)}>
                                    {getSubjectName(currentCard.question.subject)}
                                </Badge>
                                <Badge variant="outline" className="bg-secondary/50">
                                    {currentCard.question.chapter}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Target className="h-4 w-4" />
                                <span>Interval: {currentCard.interval} zile</span>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        {/* Question */}
                        <div className="bg-secondary/30 rounded-lg p-6">
                            <p className="text-lg leading-relaxed">{currentCard.question.questionText}</p>
                        </div>

                        {/* Options */}
                        <div className="space-y-3">
                            {currentCard.question.options.map((option, index) => {
                                const isCorrect = index === currentCard.question.correctAnswer;
                                const showResult = reviewState === "answer";

                                return (
                                    <button
                                        key={index}
                                        onClick={() => {
                                            if (reviewState === "question") {
                                                setSelectedAnswer(index);
                                            }
                                        }}
                                        disabled={reviewState === "answer"}
                                        className={`w-full text-left p-4 rounded-lg border transition-all ${showResult
                                                ? isCorrect
                                                    ? "bg-green-500/20 border-green-500/50 text-green-100"
                                                    : selectedAnswer === index
                                                        ? "bg-red-500/20 border-red-500/50 text-red-100"
                                                        : "bg-secondary/30 border-border"
                                                : selectedAnswer === index
                                                    ? "bg-primary/20 border-primary/50"
                                                    : "bg-secondary/30 border-border hover:bg-secondary/50"
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center font-semibold text-sm">
                                                {String.fromCharCode(65 + index)}
                                            </span>
                                            <span className="flex-1">{option.text}</span>
                                            {showResult && isCorrect && (
                                                <CheckCircle className="h-5 w-5 text-green-500" />
                                            )}
                                            {showResult && !isCorrect && selectedAnswer === index && (
                                                <XCircle className="h-5 w-5 text-red-500" />
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Show Answer / Grade buttons */}
                        {reviewState === "question" && (
                            <div className="flex justify-center pt-4">
                                <Button
                                    onClick={handleShowAnswer}
                                    size="lg"
                                    disabled={selectedAnswer === null}
                                >
                                    Arată răspunsul
                                    <ChevronRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        )}

                        {reviewState === "answer" && (
                            <>
                                {/* Explanation */}
                                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                                    <h4 className="font-semibold text-blue-400 mb-2 flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4" />
                                        Explicație
                                    </h4>
                                    <p className="text-sm text-blue-100">{currentCard.question.explanation}</p>

                                    {currentCard.question.legalReferences && currentCard.question.legalReferences.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-blue-500/30">
                                            <p className="text-xs text-blue-300 font-medium mb-1">Referințe legale:</p>
                                            <div className="flex flex-wrap gap-1">
                                                {currentCard.question.legalReferences.map((ref, i) => (
                                                    <Badge key={i} variant="outline" className="text-xs bg-blue-500/10 border-blue-500/30">
                                                        {ref}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Grade buttons */}
                                <div className="pt-4">
                                    <p className="text-center text-sm text-muted-foreground mb-4">
                                        Cât de bine ai știut răspunsul?
                                    </p>
                                    <div className="grid grid-cols-3 gap-3">
                                        <Button
                                            variant="outline"
                                            className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                                            onClick={() => handleGrade(1)}
                                            disabled={reviewMutation.isPending}
                                        >
                                            <XCircle className="mr-2 h-4 w-4" />
                                            Greșit
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/20"
                                            onClick={() => handleGrade(3)}
                                            disabled={reviewMutation.isPending}
                                        >
                                            <Clock className="mr-2 h-4 w-4" />
                                            Greu
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="border-green-500/50 text-green-400 hover:bg-green-500/20"
                                            onClick={() => handleGrade(5)}
                                            disabled={reviewMutation.isPending}
                                        >
                                            <CheckCircle className="mr-2 h-4 w-4" />
                                            Ușor
                                        </Button>
                                    </div>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Stats footer */}
            {stats && (
                <div className="mt-6 grid grid-cols-4 gap-4">
                    <Card className="p-4 text-center">
                        <p className="text-2xl font-bold text-primary">{stats.totalCards}</p>
                        <p className="text-xs text-muted-foreground">Total carduri</p>
                    </Card>
                    <Card className="p-4 text-center">
                        <p className="text-2xl font-bold text-amber-500">{stats.dueToday}</p>
                        <p className="text-xs text-muted-foreground">Pentru azi</p>
                    </Card>
                    <Card className="p-4 text-center">
                        <p className="text-2xl font-bold text-green-500">{stats.reviewedToday}</p>
                        <p className="text-xs text-muted-foreground">Revizuite</p>
                    </Card>
                    <Card className="p-4 text-center">
                        <p className="text-2xl font-bold text-blue-500">{stats.retentionRate}%</p>
                        <p className="text-xs text-muted-foreground">Retenție</p>
                    </Card>
                </div>
            )}
        </div>
    );
}
