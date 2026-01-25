import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
    Clock,
    Timer,
    CalendarDays,
    Rocket,
    ChevronRight,
    FileText,
    Scale,
    Shield,
    CheckCircle2,
    Sparkles,
    Zap,
    Upload
} from "lucide-react";

interface ExamYear {
    year: number;
    grileCount: number;
    speteCount: number;
    available: boolean;
    isNew?: boolean;
}

// Simulated exam data - later will come from API
const EXAM_YEARS: ExamYear[] = [
    { year: 2024, grileCount: 100, speteCount: 14, available: true, isNew: true },
    { year: 2023, grileCount: 100, speteCount: 14, available: false },
    { year: 2022, grileCount: 100, speteCount: 14, available: false },
    { year: 2021, grileCount: 100, speteCount: 14, available: false },
    { year: 2020, grileCount: 100, speteCount: 14, available: false },
];

export default function TimeMachine() {
    const [, setLocation] = useLocation();
    const [selectedYear, setSelectedYear] = useState<number | null>(null);
    const [isPortalOpen, setIsPortalOpen] = useState(false);
    const [isLaunching, setIsLaunching] = useState(false);

    // Open portal for year confirmation
    const openPortal = (year: number) => {
        setSelectedYear(year);
        setIsPortalOpen(true);
    };

    // Launch exam
    const launchExam = () => {
        setIsLaunching(true);

        // Simulate temporal jump animation
        setTimeout(() => {
            setLocation(`/time-machine/${selectedYear}/proba-1`);
        }, 1500);
    };

    const selectedExam = EXAM_YEARS.find(e => e.year === selectedYear);

    return (
        <div className="min-h-screen bg-gradient-to-b from-background via-background to-purple-950/20">
            <div className="container mx-auto p-6 space-y-8">
                {/* Header */}
                <div className="text-center space-y-4 py-8">
                    <div className="flex justify-center items-center gap-3">
                        <Clock className="h-12 w-12 text-purple-500 animate-pulse" />
                        <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
                            Exam Time Machine
                        </h1>
                    </div>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        Călătorește în timp și dă examenul exact cum a fost el.
                        <br />
                        <span className="text-sm italic">Tu, subiectele reale, și 8 ore de adrenalină pură.</span>
                    </p>

                    {/* Import button */}
                    <Button
                        variant="outline"
                        onClick={() => setLocation("/exam-papers-import")}
                        className="mt-4 border-purple-500/50 hover:border-purple-500 hover:bg-purple-500/10"
                    >
                        <Upload className="h-4 w-4 mr-2" />
                        Importă Subiecte Concurs
                    </Button>
                </div>

                {/* Year Selection Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 max-w-5xl mx-auto">
                    {EXAM_YEARS.map((exam) => (
                        <Card
                            key={exam.year}
                            className={`relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 ${exam.available
                                ? 'border-purple-500/50 hover:border-purple-500 hover:shadow-lg hover:shadow-purple-500/20'
                                : 'opacity-50 cursor-not-allowed'
                                } ${exam.isNew ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-background' : ''}`}
                            onClick={() => exam.available && openPortal(exam.year)}
                        >
                            {/* Decorative background effect */}
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />

                            {exam.isNew && (
                                <Badge className="absolute top-2 right-2 bg-gradient-to-r from-purple-500 to-blue-500">
                                    <Sparkles className="h-3 w-3 mr-1" /> NOU
                                </Badge>
                            )}

                            {!exam.available && (
                                <Badge variant="outline" className="absolute top-2 right-2">
                                    🔒 În curând
                                </Badge>
                            )}

                            <CardHeader className="text-center pb-2">
                                <div className="mx-auto mb-2 h-16 w-16 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
                                    <CalendarDays className="h-8 w-8 text-purple-400" />
                                </div>
                                <CardTitle className="text-3xl font-bold">{exam.year}</CardTitle>
                            </CardHeader>

                            <CardContent className="text-center space-y-2">
                                <div className="flex justify-center gap-4 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        <FileText className="h-4 w-4" /> {exam.grileCount} grile
                                    </span>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    <span className="flex justify-center items-center gap-1">
                                        <Scale className="h-4 w-4" /> {exam.speteCount} cerințe
                                    </span>
                                </div>

                                {exam.available && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="mt-2 text-purple-400 hover:text-purple-300"
                                    >
                                        <Zap className="h-4 w-4 mr-1" />
                                        Călătorește
                                        <ChevronRight className="h-4 w-4 ml-1" />
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Info Section */}
                <div className="max-w-3xl mx-auto">
                    <Card className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/30">
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                                <div>
                                    <Timer className="h-8 w-8 mx-auto mb-2 text-purple-400" />
                                    <p className="font-semibold">Proba I - 4 ore</p>
                                    <p className="text-sm text-muted-foreground">100 întrebări grilă</p>
                                </div>
                                <div>
                                    <FileText className="h-8 w-8 mx-auto mb-2 text-blue-400" />
                                    <p className="font-semibold">Proba II - 4 ore</p>
                                    <p className="text-sm text-muted-foreground">Spețe complexe</p>
                                </div>
                                <div>
                                    <Sparkles className="h-8 w-8 mx-auto mb-2 text-green-400" />
                                    <p className="font-semibold">Feedback AI</p>
                                    <p className="text-sm text-muted-foreground">Evaluare personalizată</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Portal Confirmation Dialog */}
            <Dialog open={isPortalOpen} onOpenChange={(open) => !isLaunching && setIsPortalOpen(open)}>
                <DialogContent className="max-w-lg overflow-hidden">
                    {!isLaunching && (
                        <DialogHeader>
                            <DialogTitle className="text-center text-2xl flex items-center justify-center gap-2">
                                <Clock className="h-6 w-6 text-purple-500" />
                                Portal Temporal Deschis
                            </DialogTitle>
                            <DialogDescription className="text-center">
                                Confirmă destinația călătoriei tale în timp
                            </DialogDescription>
                        </DialogHeader>
                    )}

                    {!isLaunching && selectedExam && (
                        <div className="space-y-4 py-4">
                            <div className="text-center p-4 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-lg">
                                <p className="text-sm text-muted-foreground">Destinație</p>
                                <p className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent">
                                    Concurs Admitere INM {selectedYear}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">București, România</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 border rounded-lg">
                                    <div className="flex items-center gap-2 mb-2">
                                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                                        <p className="font-semibold">Proba I - Grile</p>
                                    </div>
                                    <p className="text-sm text-muted-foreground">100 întrebări • 4 ore</p>
                                    <div className="flex gap-2 mt-2">
                                        <Badge variant="outline" className="text-xs">Civil</Badge>
                                        <Badge variant="outline" className="text-xs">Penal</Badge>
                                    </div>
                                </div>

                                <div className="p-4 border rounded-lg">
                                    <div className="flex items-center gap-2 mb-2">
                                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                                        <p className="font-semibold">Proba II - Spețe</p>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{selectedExam.speteCount} cerințe • 4 ore</p>
                                    <div className="flex gap-2 mt-2">
                                        <Badge variant="outline" className="text-xs">Civil</Badge>
                                        <Badge variant="outline" className="text-xs">Penal</Badge>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                                <p className="text-sm text-amber-600 dark:text-amber-400">
                                    ⚠️ Odată pornit, examenul simulează condiții reale.
                                    Progresul va fi salvat automat.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Wormhole Launch Animation */}
                    {isLaunching && (
                        <div className="py-8 text-center relative">
                            <div className="relative mx-auto w-40 h-40 flex items-center justify-center">
                                {/* Spinning outer rings */}
                                <div className="absolute inset-0 rounded-full border-4 border-purple-500/30 animate-[spin_3s_linear_infinite]" />
                                <div className="absolute inset-2 rounded-full border-4 border-blue-500/40 animate-[spin_2.5s_linear_infinite_reverse]" />
                                <div className="absolute inset-4 rounded-full border-4 border-purple-400/50 animate-[spin_2s_linear_infinite]" />

                                {/* Center portal */}
                                <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-purple-600 via-blue-500 to-purple-700 flex items-center justify-center shadow-lg shadow-purple-500/50">
                                    <div className="absolute inset-2 rounded-full bg-background flex items-center justify-center">
                                        <div className="text-center">
                                            <span className="text-2xl font-bold text-purple-400">{selectedYear}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 space-y-2">
                                <p className="text-lg font-medium text-purple-300">
                                    <Rocket className="inline h-5 w-5 mr-2 animate-bounce" />
                                    Inițiez salt temporal...
                                </p>
                                <p className="text-sm text-muted-foreground">Destinație: INM {selectedYear}</p>
                            </div>
                        </div>
                    )}

                    {!isLaunching && (
                        <DialogFooter className="flex-col sm:flex-row gap-2">
                            <Button variant="outline" onClick={() => setIsPortalOpen(false)}>
                                ← Anulează
                            </Button>
                            <Button
                                onClick={launchExam}
                                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                            >
                                <Rocket className="h-4 w-4 mr-2" />
                                Pornește Călătoria
                            </Button>
                        </DialogFooter>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
