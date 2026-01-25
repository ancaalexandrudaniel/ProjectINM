import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import {
    BookOpen,
    ChevronDown,
    ChevronRight,
    Clock,
    Award,
    Scale,
    Shield,
    FileText,
    Check,
    Eye,
    EyeOff,
    Pencil,
    BookMarked
} from "lucide-react";

interface Requirement {
    id: string;
    requirementId: string;
    requirementText: string;
    points: string;
    recommendedTime: number | null;
    solution: string;
    legalRefs: string[] | null;
    rubric: { criterion: string; points: string }[];
}

interface Subject {
    id: string;
    subjectId: string;
    subjectTitle: string;
    subjectArea: string;
    scenario: string | null;
    requirements: Requirement[];
}

interface ExamEssay {
    id: string;
    year: number;
    variant: number;
    discipline: string;
    subjectId: string;
    subjectTitle: string;
    subjectArea: string;
    scenario: string | null;
    requirementId: string;
    requirementText: string;
    points: string;
    recommendedTime: number | null;
    solution: string;
    legalRefs: string[] | null;
    rubric: { criterion: string; points: string }[];
}

const DISCIPLINES = [
    { value: "civil-combined", label: "Drept Civil + Procesual Civil", icon: Scale, color: "text-blue-600" },
    { value: "penal-combined", label: "Drept Penal + Procesual Penal", icon: Shield, color: "text-red-600" },
];

const examYears = [2024, 2023, 2022, 2021, 2020];

export default function EssayPractice() {
    const { toast } = useToast();

    // Filters
    const [selectedYear, setSelectedYear] = useState<string>("2024");
    const [selectedDiscipline, setSelectedDiscipline] = useState<string>("civil-combined");

    // UI State
    const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
    const [selectedRequirement, setSelectedRequirement] = useState<Requirement | null>(null);
    const [selectedSubject, setSelectedSubjectData] = useState<Subject | null>(null);
    const [userAnswer, setUserAnswer] = useState("");
    const [showSolution, setShowSolution] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Fetch essays from API
    const { data: essaysData, isLoading } = useQuery({
        queryKey: ["/api/exam-essays", selectedYear, selectedDiscipline],
        queryFn: async () => {
            const res = await fetch(`/api/exam-essays?year=${selectedYear}&discipline=${selectedDiscipline}`);
            if (!res.ok) throw new Error("Failed to fetch essays");
            return res.json();
        },
    });

    // Group essays by subject
    const subjects = useMemo(() => {
        if (!essaysData?.essays) return [];

        const grouped = new Map<string, Subject>();

        for (const essay of essaysData.essays as ExamEssay[]) {
            const key = essay.subjectId;

            if (!grouped.has(key)) {
                grouped.set(key, {
                    id: key,
                    subjectId: essay.subjectId,
                    subjectTitle: essay.subjectTitle,
                    subjectArea: essay.subjectArea,
                    scenario: essay.scenario,
                    requirements: [],
                });
            }

            grouped.get(key)!.requirements.push({
                id: essay.id,
                requirementId: essay.requirementId,
                requirementText: essay.requirementText,
                points: essay.points,
                recommendedTime: essay.recommendedTime,
                solution: essay.solution,
                legalRefs: essay.legalRefs,
                rubric: essay.rubric,
            });
        }

        // Sort requirements within each subject
        const subjectsArray = Array.from(grouped.values());
        for (const subject of subjectsArray) {
            subject.requirements.sort((a: Requirement, b: Requirement) => a.requirementId.localeCompare(b.requirementId));
        }

        return subjectsArray.sort((a: Subject, b: Subject) => a.subjectId.localeCompare(b.subjectId));
    }, [essaysData]);

    // Toggle subject expansion
    const toggleSubject = (subjectId: string) => {
        const newSet = new Set(expandedSubjects);
        if (newSet.has(subjectId)) {
            newSet.delete(subjectId);
        } else {
            newSet.add(subjectId);
        }
        setExpandedSubjects(newSet);
    };

    // Open requirement modal
    const openRequirement = (subject: Subject, requirement: Requirement) => {
        setSelectedSubjectData(subject);
        setSelectedRequirement(requirement);
        setUserAnswer("");
        setShowSolution(false);
        setIsModalOpen(true);
    };

    // Calculate total stats
    const stats = useMemo(() => {
        const totalRequirements = subjects.reduce((sum, s) => sum + s.requirements.length, 0);
        const totalPoints = subjects.reduce(
            (sum, s) => sum + s.requirements.reduce((rSum, r) => rSum + parseFloat(r.points), 0),
            0
        );
        return { totalRequirements, totalPoints: totalPoints.toFixed(1) };
    }, [subjects]);

    return (
        <div className="container mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <BookOpen className="h-8 w-8 text-primary" />
                    Practică Spețe
                </h1>
                <p className="text-muted-foreground">
                    Exersează cerințele de la probele scrise INM cu acces la soluții și bareme.
                </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                    <Label>An:</Label>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="w-[100px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {examYears.map(y => (
                                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center gap-2">
                    <Label>Disciplina:</Label>
                    <Select value={selectedDiscipline} onValueChange={setSelectedDiscipline}>
                        <SelectTrigger className="w-[280px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {DISCIPLINES.map(d => (
                                <SelectItem key={d.value} value={d.value}>
                                    <div className="flex items-center gap-2">
                                        <d.icon className={`h-4 w-4 ${d.color}`} />
                                        {d.label}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {stats.totalRequirements > 0 && (
                    <Badge variant="secondary" className="ml-auto">
                        {stats.totalRequirements} cerințe • {stats.totalPoints} puncte
                    </Badge>
                )}
            </div>

            {/* Subjects List */}
            {isLoading ? (
                <Card className="p-8 text-center">
                    <p className="text-muted-foreground">Se încarcă subiectele...</p>
                </Card>
            ) : subjects.length === 0 ? (
                <Card className="p-8 text-center">
                    <BookMarked className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-muted-foreground">
                        Nu există spețe pentru {selectedYear} - {DISCIPLINES.find(d => d.value === selectedDiscipline)?.label}
                    </p>
                </Card>
            ) : (
                <div className="space-y-4">
                    {subjects.map((subject) => (
                        <Card key={subject.id}>
                            <Collapsible
                                open={expandedSubjects.has(subject.id)}
                                onOpenChange={() => toggleSubject(subject.id)}
                            >
                                <CollapsibleTrigger asChild>
                                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                {expandedSubjects.has(subject.id) ? (
                                                    <ChevronDown className="h-5 w-5" />
                                                ) : (
                                                    <ChevronRight className="h-5 w-5" />
                                                )}
                                                <div>
                                                    <CardTitle className="text-lg flex items-center gap-2">
                                                        {subject.subjectTitle}
                                                        <Badge variant="outline">{subject.subjectArea}</Badge>
                                                    </CardTitle>
                                                    <CardDescription>
                                                        {subject.requirements.length} cerințe • {
                                                            subject.requirements.reduce((sum, r) => sum + parseFloat(r.points), 0).toFixed(2)
                                                        } puncte
                                                    </CardDescription>
                                                </div>
                                            </div>
                                        </div>
                                    </CardHeader>
                                </CollapsibleTrigger>

                                <CollapsibleContent>
                                    <CardContent className="pt-0">
                                        {/* Scenario if present */}
                                        {subject.scenario && (
                                            <div className="mb-4 p-4 bg-muted/50 rounded-lg border-l-4 border-primary/50">
                                                <p className="text-sm text-muted-foreground font-medium mb-2">Speța:</p>
                                                <p className="text-sm">{subject.scenario}</p>
                                            </div>
                                        )}

                                        {/* Requirements list */}
                                        <div className="space-y-2">
                                            {subject.requirements.map((req) => (
                                                <div
                                                    key={req.id}
                                                    className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors"
                                                >
                                                    <Badge variant="secondary" className="font-mono shrink-0">
                                                        {req.requirementId}
                                                    </Badge>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm line-clamp-2">{req.requirementText}</p>
                                                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                                            <span className="flex items-center gap-1">
                                                                <Award className="h-3 w-3" /> {req.points}p
                                                            </span>
                                                            {req.recommendedTime && (
                                                                <span className="flex items-center gap-1">
                                                                    <Clock className="h-3 w-3" /> {req.recommendedTime}min
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => openRequirement(subject, req)}
                                                    >
                                                        <Pencil className="h-4 w-4 mr-1" />
                                                        Rezolvă
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </CollapsibleContent>
                            </Collapsible>
                        </Card>
                    ))}
                </div>
            )}

            {/* Answer Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono">
                                {selectedRequirement?.requirementId}
                            </Badge>
                            <span className="text-green-600">{selectedRequirement?.points}p</span>
                            {selectedRequirement?.recommendedTime && (
                                <span className="text-muted-foreground text-sm flex items-center gap-1">
                                    <Clock className="h-3 w-3" /> {selectedRequirement.recommendedTime}min
                                </span>
                            )}
                        </DialogTitle>
                        <DialogDescription className="text-left text-foreground">
                            {selectedRequirement?.requirementText}
                        </DialogDescription>
                    </DialogHeader>

                    {/* Scenario context if present */}
                    {selectedSubject?.scenario && (
                        <details className="mb-4">
                            <summary className="text-sm text-primary cursor-pointer hover:underline">
                                📄 Vezi speța completă
                            </summary>
                            <div className="mt-2 p-3 bg-muted rounded text-sm">
                                {selectedSubject.scenario}
                            </div>
                        </details>
                    )}

                    {/* Answer textarea */}
                    <div className="space-y-2">
                        <Label>Răspunsul tău:</Label>
                        <Textarea
                            value={userAnswer}
                            onChange={(e) => setUserAnswer(e.target.value)}
                            placeholder="Scrie răspunsul tău aici..."
                            className="min-h-[200px]"
                        />
                        <p className="text-xs text-muted-foreground text-right">
                            {userAnswer.length} caractere
                        </p>
                    </div>

                    {/* Solution Panel */}
                    {showSolution && selectedRequirement && (
                        <div className="space-y-4 border-t pt-4">
                            <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
                                <p className="font-medium text-green-800 dark:text-green-200 mb-2">
                                    Soluție Model:
                                </p>
                                <p className="text-sm">{selectedRequirement.solution}</p>

                                {selectedRequirement.legalRefs && selectedRequirement.legalRefs.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-green-200">
                                        <p className="text-xs text-green-700 dark:text-green-300">
                                            📚 Temei legal: {selectedRequirement.legalRefs.join(", ")}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Rubric */}
                            {selectedRequirement.rubric && selectedRequirement.rubric.length > 0 && (
                                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                                    <p className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                                        Barem de corectare:
                                    </p>
                                    <div className="space-y-1">
                                        {selectedRequirement.rubric.map((item, idx) => (
                                            <div key={idx} className="flex justify-between text-sm">
                                                <span>{item.criterion}</span>
                                                <Badge variant="secondary">{item.points}p</Badge>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setShowSolution(!showSolution)}
                        >
                            {showSolution ? (
                                <><EyeOff className="h-4 w-4 mr-2" /> Ascunde Soluția</>
                            ) : (
                                <><Eye className="h-4 w-4 mr-2" /> Arată Soluția</>
                            )}
                        </Button>
                        <Button onClick={() => setIsModalOpen(false)}>
                            <Check className="h-4 w-4 mr-2" /> Gata
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
