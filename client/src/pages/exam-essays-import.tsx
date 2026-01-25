import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
    CheckCircle2,
    AlertCircle,
    Loader2,
    Scale,
    Shield,
    FileText,
    Trash2,
    Download,
    FileJson,
    BookOpen,
    Clock,
    Award
} from "lucide-react";

interface Requirement {
    id: string;
    text: string;
    points: number | string;
    time?: number;
    solution: string;
    legalRefs?: string[];
    rubric: { criterion: string; points: number | string }[];
}

interface Subject {
    id: string;
    area: string;
    title: string;
    scenario?: string | null;
    requirements: Requirement[];
}

interface ImportPayload {
    year: number;
    variant: number;
    discipline: string;
    subjects: Subject[];
    totalPoints?: number;
    totalTime?: number;
}

const DISCIPLINES = [
    { value: "civil-combined", label: "Drept Civil + Procesual Civil", icon: Scale, color: "text-blue-600" },
    { value: "penal-combined", label: "Drept Penal + Procesual Penal", icon: Shield, color: "text-red-600" },
];

const examYears = Array.from({ length: 15 }, (_, i) => 2024 - i);

export default function ExamEssaysImport() {
    const { toast } = useToast();

    // Form State
    const [selectedYear, setSelectedYear] = useState<string>("2024");
    const [selectedVariant, setSelectedVariant] = useState<string>("1");
    const [selectedDiscipline, setSelectedDiscipline] = useState<string>("civil-combined");

    // JSON Input State
    const [jsonInput, setJsonInput] = useState<string>("");
    const [parsedData, setParsedData] = useState<ImportPayload | null>(null);
    const [parseError, setParseError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Calculate totals from parsed data
    const stats = useMemo(() => {
        if (!parsedData) return null;
        const totalRequirements = parsedData.subjects.reduce(
            (sum, s) => sum + s.requirements.length, 0
        );
        const totalPoints = parsedData.subjects.reduce(
            (sum, s) => sum + s.requirements.reduce(
                (rSum, r) => rSum + (typeof r.points === 'number' ? r.points : parseFloat(r.points) || 0), 0
            ), 0
        );
        const totalTime = parsedData.subjects.reduce(
            (sum, s) => sum + s.requirements.reduce(
                (rSum, r) => rSum + (r.time || 0), 0
            ), 0
        );
        return { totalRequirements, totalPoints: totalPoints.toFixed(2), totalTime };
    }, [parsedData]);

    // Parse JSON input
    const handleParseJSON = () => {
        setParseError(null);
        setParsedData(null);

        if (!jsonInput.trim()) {
            setParseError("Introduceți un JSON valid.");
            return;
        }

        try {
            const data = JSON.parse(jsonInput) as ImportPayload;

            // Basic validation
            if (!data.subjects || !Array.isArray(data.subjects)) {
                throw new Error("JSON-ul trebuie să conțină câmpul 'subjects' ca array");
            }

            for (let i = 0; i < data.subjects.length; i++) {
                const s = data.subjects[i];
                if (!s.id || !s.area || !s.title || !s.requirements) {
                    throw new Error(`Subiectul ${i + 1}: Lipsesc câmpuri obligatorii (id, area, title, requirements)`);
                }
                for (let j = 0; j < s.requirements.length; j++) {
                    const r = s.requirements[j];
                    if (!r.id || !r.text || r.points === undefined || !r.solution || !r.rubric) {
                        throw new Error(`Cerința ${s.id}.${r.id || j + 1}: Lipsesc câmpuri (id, text, points, solution, rubric)`);
                    }
                }
            }

            // Apply selected metadata
            data.year = parseInt(selectedYear);
            data.variant = parseInt(selectedVariant);
            data.discipline = selectedDiscipline;

            setParsedData(data);
            toast({
                title: "JSON valid ✅",
                description: `${data.subjects.length} subiecte detectate.`,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : "JSON invalid";
            setParseError(message);
            toast({
                title: "Eroare parsare JSON",
                description: message,
                variant: "destructive",
            });
        }
    };

    // Import to database
    const handleImport = async () => {
        if (!parsedData) {
            toast({
                title: "Nimic de importat",
                description: "Parsează mai întâi un JSON valid.",
                variant: "destructive",
            });
            return;
        }

        setIsProcessing(true);

        try {
            const response = await fetch("/api/exam-essays/import-json", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(parsedData),
            });

            const result = await response.json();

            if (response.ok) {
                toast({
                    title: "Import reușit! 🎉",
                    description: result.message || `${result.imported} cerințe importate.`,
                });
                // Reset form
                setJsonInput("");
                setParsedData(null);
            } else {
                throw new Error(result.error || "Import failed");
            }
        } catch (error) {
            toast({
                title: "Eroare la import",
                description: error instanceof Error ? error.message : "Nu s-a putut importa.",
                variant: "destructive",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <BookOpen className="h-8 w-8 text-primary" />
                    Import Spețe Examen (Proba II)
                </h1>
                <p className="text-muted-foreground">
                    Importă subiecte de probe scrise cu soluții și bareme din format JSON.
                </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* Left: Configuration & Input */}
                <div className="space-y-4">
                    {/* Metadata Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Configurare Import</CardTitle>
                            <CardDescription>Selectează anul, varianta și disciplina.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Year & Variant */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Anul</Label>
                                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {examYears.map(y => (
                                                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Varianta</Label>
                                    <Select value={selectedVariant} onValueChange={setSelectedVariant}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {[1, 2, 3, 4].map(v => (
                                                <SelectItem key={v} value={v.toString()}>Varianta {v}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Discipline Selection */}
                            <div className="space-y-3">
                                <Label>Disciplina</Label>
                                <RadioGroup
                                    value={selectedDiscipline}
                                    onValueChange={setSelectedDiscipline}
                                    className="grid grid-cols-1 gap-2"
                                >
                                    {DISCIPLINES.map(({ value, label, icon: Icon, color }) => (
                                        <div
                                            key={value}
                                            className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors
                                                ${selectedDiscipline === value ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/50'}`}
                                            onClick={() => setSelectedDiscipline(value)}
                                        >
                                            <RadioGroupItem value={value} id={value} />
                                            <Icon className={`h-5 w-5 ${color}`} />
                                            <Label htmlFor={value} className="font-normal cursor-pointer flex-1">
                                                {label}
                                            </Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                            </div>
                        </CardContent>
                    </Card>

                    {/* JSON Input Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Input JSON</CardTitle>
                            <CardDescription>
                                Lipește JSON-ul generat de LLM cu subiecte și barem.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Textarea
                                value={jsonInput}
                                onChange={(e) => setJsonInput(e.target.value)}
                                placeholder={`{
  "subjects": [
    {
      "id": "civil-1",
      "area": "Drept Civil",
      "title": "Subiectul 1",
      "requirements": [...]
    }
  ]
}`}
                                className="min-h-[250px] font-mono text-sm"
                            />
                            {parseError && (
                                <div className="mt-2 p-2 rounded bg-destructive/10 text-destructive text-sm flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4" />
                                    {parseError}
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="flex justify-between">
                            <Button
                                variant="ghost"
                                onClick={() => { setJsonInput(""); setParsedData(null); setParseError(null); }}
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Reset
                            </Button>
                            <Button onClick={handleParseJSON} disabled={!jsonInput.trim()}>
                                <FileText className="h-4 w-4 mr-2" />
                                Validează JSON
                            </Button>
                        </CardFooter>
                    </Card>
                </div>

                {/* Right: Preview & Import */}
                <div className="space-y-4">
                    {parsedData && stats ? (
                        <>
                            {/* Summary Card */}
                            <Card className="border-green-200 bg-green-50">
                                <CardContent className="pt-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <CheckCircle2 className="h-6 w-6 text-green-600" />
                                            <div>
                                                <p className="font-semibold text-green-900">
                                                    {parsedData.subjects.length} subiecte • {stats.totalRequirements} cerințe
                                                </p>
                                                <p className="text-sm text-green-700 flex items-center gap-4">
                                                    <span className="flex items-center gap-1">
                                                        <Award className="h-3 w-3" /> {stats.totalPoints} puncte
                                                    </span>
                                                    {stats.totalTime > 0 && (
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="h-3 w-3" /> {stats.totalTime} min
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                        <Button onClick={handleImport} disabled={isProcessing}>
                                            {isProcessing ? (
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            ) : (
                                                <Download className="h-4 w-4 mr-2" />
                                            )}
                                            Importă
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Subjects Preview */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm">Preview Subiecte</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-[500px] pr-4">
                                        <div className="space-y-6">
                                            {parsedData.subjects.map((subject) => (
                                                <div key={subject.id} className="border rounded-lg p-4 space-y-3">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline">{subject.area}</Badge>
                                                        <span className="font-medium">{subject.title}</span>
                                                    </div>

                                                    {subject.scenario && (
                                                        <p className="text-xs text-muted-foreground line-clamp-2 italic">
                                                            {subject.scenario.substring(0, 200)}...
                                                        </p>
                                                    )}

                                                    <div className="space-y-2 pl-4 border-l-2 border-muted">
                                                        {subject.requirements.map((req) => (
                                                            <div key={req.id} className="text-sm">
                                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                                    <Badge variant="secondary" className="font-mono text-xs">
                                                                        {req.id}
                                                                    </Badge>
                                                                    <span>{req.points}p</span>
                                                                    {req.time && <span>• {req.time}min</span>}
                                                                </div>
                                                                <p className="line-clamp-1">{req.text}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </>
                    ) : (
                        /* Empty State */
                        <Card className="h-full flex items-center justify-center min-h-[400px]">
                            <CardContent className="text-center py-12">
                                <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                                <p className="text-muted-foreground mb-2">
                                    Niciun JSON validat încă.
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Lipește JSON-ul generat de LLM și apasă "Validează JSON".
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
