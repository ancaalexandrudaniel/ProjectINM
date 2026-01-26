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
    const [selectedProba, setSelectedProba] = useState<1 | 2>(1);

    // Open portal for year confirmation
    const openPortal = (year: number) => {
        setSelectedYear(year);
        setIsPortalOpen(true);
    };

    // Launch exam with selected proba
    const launchExam = (proba: 1 | 2) => {
        setSelectedProba(proba);
        setIsLaunching(true);

        // Simulate temporal jump animation
        setTimeout(() => {
            setLocation(`/time-machine/${selectedYear}/proba-${proba}`);
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
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 max-w-[1600px] w-full px-8 mx-auto">
                    {EXAM_YEARS.map((exam) => (
                        <Card
                            key={exam.year}
                            className={`group relative overflow-hidden cursor-pointer transition-all duration-500 ease-out h-full ${exam.available
                                ? 'border-purple-500/30 hover:border-purple-400 hover:scale-110 hover:-translate-y-4 hover:shadow-[0_20px_60px_-15px_rgba(168,85,247,0.5)] hover:bg-purple-500/5 z-0 hover:z-10'
                                : 'opacity-50 cursor-not-allowed grayscale hover:grayscale-0 hover:opacity-75'
                                } ${exam.isNew ? 'ring-2 ring-purple-500 ring-offset-4 ring-offset-background' : ''}`}
                            onClick={() => exam.available && openPortal(exam.year)}
                        >
                            {/* Decorative background effect */}
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                            {exam.isNew && (
                                <Badge className="absolute top-3 right-3 bg-gradient-to-r from-purple-500 to-blue-500 text-sm py-1">
                                    <Sparkles className="h-3 w-3 mr-1" /> NOU
                                </Badge>
                            )}

                            {!exam.available && (
                                <Badge variant="outline" className="absolute top-3 right-3">
                                    🔒 În curând
                                </Badge>
                            )}

                            <CardHeader className="text-center pb-4 pt-8">
                                <div className="mx-auto mb-4 h-24 w-24 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
                                    <CalendarDays className="h-12 w-12 text-purple-400" />
                                </div>
                                <CardTitle className="text-4xl font-bold">{exam.year}</CardTitle>
                            </CardHeader>

                            <CardContent className="text-center space-y-4 pb-8">
                                <div className="space-y-2">
                                    <div className="flex justify-center gap-4 text-base text-muted-foreground font-medium">
                                        <span className="flex items-center gap-2">
                                            <FileText className="h-5 w-5" /> {exam.grileCount} grile
                                        </span>
                                    </div>
                                    <div className="text-base text-muted-foreground font-medium">
                                        <span className="flex justify-center items-center gap-2">
                                            <Scale className="h-5 w-5" /> {exam.speteCount} cerințe
                                        </span>
                                    </div>
                                </div>

                                {exam.available && (
                                    <Button
                                        variant="ghost"
                                        size="lg"
                                        className="mt-4 text-purple-400 hover:text-purple-300 w-full hover:bg-purple-500/10 text-lg"
                                    >
                                        <Zap className="h-5 w-5 mr-2" />
                                        Călătorește
                                        <ChevronRight className="h-5 w-5 ml-1" />
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Info Section */}
                <div className="max-w-5xl mx-auto px-4">
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
                <DialogContent className="max-w-4xl overflow-hidden border-purple-500/20 shadow-2xl shadow-purple-900/20">
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

                            <div className="grid grid-cols-2 gap-6">
                                {/* Proba I Card */}
                                <div className="p-6 border rounded-xl bg-purple-500/5 hover:bg-purple-500/10 transition-colors">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 rounded-full bg-green-500/20 text-green-400">
                                            <CheckCircle2 className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-2xl">Proba I - Grile</p>
                                            <p className="text-base text-muted-foreground">100 întrebări • 4 ore</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2 mt-4">
                                        <Badge variant="outline" className="text-sm py-1 border-indigo-500/30 text-indigo-300">Drept Civil</Badge>
                                        <Badge variant="outline" className="text-sm py-1 border-emerald-500/30 text-emerald-300">Drept Procesual Civil</Badge>
                                        <Badge variant="outline" className="text-sm py-1 border-amber-500/30 text-amber-300">Drept Penal</Badge>
                                        <Badge variant="outline" className="text-sm py-1 border-fuchsia-500/30 text-fuchsia-300">Drept Procesual Penal</Badge>
                                    </div>
                                </div>

                                {/* Proba II Card */}
                                <div className="p-6 border rounded-xl bg-blue-500/5 hover:bg-blue-500/10 transition-colors">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 rounded-full bg-green-500/20 text-green-400">
                                            <CheckCircle2 className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-2xl">Proba II - Spețe</p>
                                            <p className="text-base text-muted-foreground">{selectedExam.speteCount} cerințe • 4 ore</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2 mt-4">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary" className="text-sm py-1 w-full justify-center bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                                                Drept Civil + Drept Procesual Civil
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary" className="text-sm py-1 w-full justify-center bg-amber-500/10 text-amber-300 border border-amber-500/20">
                                                Drept Penal + Drept Procesual Penal
                                            </Badge>
                                        </div>
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
                        <div className="mt-6 flex flex-col gap-3">
                            {/* Main option: Full Experience */}
                            <Button
                                onClick={() => launchExam(1)}
                                className="w-full bg-gradient-to-r from-purple-500 via-blue-500 to-purple-600 hover:from-purple-600 hover:via-blue-600 hover:to-purple-700 py-6 text-lg shadow-lg shadow-purple-500/20"
                            >
                                <Rocket className="h-5 w-5 mr-2" />
                                Examen Complet (Proba I → Proba II)
                            </Button>

                            {/* Secondary: Selective options */}
                            <div className="grid grid-cols-3 gap-2 w-full">
                                <Button
                                    variant="outline"
                                    onClick={() => launchExam(1)}
                                    className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                                >
                                    Doar Proba I
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => launchExam(2)}
                                    className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                                >
                                    Doar Proba II
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={() => setIsPortalOpen(false)}
                                    className="text-muted-foreground hover:bg-muted"
                                >
                                    Anulează
                                </Button>
                            </div>

                            <p className="text-xs text-center text-muted-foreground mt-2">
                                💡 Examenul complet curge automat de la Proba I la Proba II
                            </p>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
