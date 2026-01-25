import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
    Gavel,
    FileQuestion,
    Trash2,
    Download,
    FileJson,
    AlertTriangle,
    FileText
} from "lucide-react";

interface ParsedQuestion {
    number?: number;
    text: string;
    options: string[];
    correctAnswer: string | number;
}

interface ImportPayload {
    year: number;
    examType: 'grile' | 'spete';
    subject: string;
    questions: ParsedQuestion[];
}

// Subject configurations
const GRILE_SUBJECTS = [
    { value: "civil", label: "Drept Civil", icon: Scale, color: "text-blue-600" },
    { value: "civil-procedural", label: "Drept Procesual Civil", icon: FileText, color: "text-cyan-600" },
    { value: "penal", label: "Drept Penal", icon: Shield, color: "text-red-600" },
    { value: "penal-procedural", label: "Drept Procesual Penal", icon: Gavel, color: "text-purple-600" },
];

const SPETE_SUBJECTS = [
    { value: "civil-combined", label: "Drept Civil + Procesual Civil", icon: Scale, color: "text-blue-600" },
    { value: "penal-combined", label: "Drept Penal + Procesual Penal", icon: Shield, color: "text-red-600" },
];

const examYears = Array.from({ length: 15 }, (_, i) => 2024 - i);

export default function ExamPapersImport() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Form State
    const [selectedYear, setSelectedYear] = useState<string>("2024");
    const [examType, setExamType] = useState<'grile' | 'spete'>('grile');
    const [selectedSubject, setSelectedSubject] = useState<string>("civil");

    // JSON Input State
    const [jsonInput, setJsonInput] = useState<string>("");
    const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
    const [parseError, setParseError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Get current subject options based on exam type
    const subjectOptions = examType === 'grile' ? GRILE_SUBJECTS : SPETE_SUBJECTS;

    // Reset subject when exam type changes
    const handleExamTypeChange = (value: 'grile' | 'spete') => {
        setExamType(value);
        // Set default subject for new type
        setSelectedSubject(value === 'grile' ? 'civil' : 'civil-combined');
    };

    // Parse JSON input - supports multiple formats
    const handleParseJSON = () => {
        setParseError(null);
        setParsedQuestions([]);

        if (!jsonInput.trim()) {
            setParseError("Introduceți un JSON valid.");
            return;
        }

        try {
            const data = JSON.parse(jsonInput);

            // SPETE MODE: Different structure with subjects and requirements
            if (examType === 'spete') {
                // Validate spete structure
                if (!data.subjects || !Array.isArray(data.subjects)) {
                    throw new Error("Pentru spețe, JSON-ul trebuie să conțină câmpul 'subjects' (array de subiecte)");
                }

                // Count total requirements
                let totalReqs = 0;
                for (const subject of data.subjects) {
                    if (!subject.requirements || !Array.isArray(subject.requirements)) {
                        throw new Error(`Subiectul '${subject.id}' nu are câmpul 'requirements'`);
                    }
                    totalReqs += subject.requirements.length;
                }

                // Store the spete data for import (use special marker)
                setParsedQuestions([{
                    text: `__SPETE_DATA__`,
                    options: [],
                    correctAnswer: 'A',
                    number: totalReqs,
                    // Store entire spete data as JSON string in a hacky way
                } as ParsedQuestion]);

                // Store the full spete data in localStorage for import
                localStorage.setItem('spete_import_data', jsonInput);

                toast({
                    title: "JSON Spețe valid ✅",
                    description: `${data.subjects.length} subiecte cu ${totalReqs} cerințe detectate.`,
                });
                return;
            }

            // GRILE MODE: Traditional question format
            // Detect format and extract questions array
            let rawQuestions: any[];

            if (Array.isArray(data)) {
                // Format: direct array [...]
                rawQuestions = data;
            } else if (data.questions && Array.isArray(data.questions)) {
                // Format: { questions: [...] }
                rawQuestions = data.questions;
            } else {
                // Format: { "Drept civil": [...] } - discipline name as key
                const keys = Object.keys(data);
                const disciplineKey = keys.find(k =>
                    k.toLowerCase().includes('drept') ||
                    k.toLowerCase().includes('civil') ||
                    k.toLowerCase().includes('penal')
                );

                if (disciplineKey && Array.isArray(data[disciplineKey])) {
                    rawQuestions = data[disciplineKey];
                } else if (keys.length === 1 && Array.isArray(data[keys[0]])) {
                    // Single key with array value
                    rawQuestions = data[keys[0]];
                } else {
                    throw new Error("JSON-ul trebuie să conțină un array de întrebări sau un obiect cu câmpul 'questions'");
                }
            }

            // Helper: remove [cite: X] patterns from text
            const cleanCitations = (text: string): string => {
                return text
                    .replace(/\s*\[cite:\s*[\d,\s]+\]/gi, '')  // [cite: 156] or [cite: 156, 157]
                    .replace(/\s*\[cite:\s*\d+\]/gi, '')        // backup pattern
                    .trim();
            };

            // Normalize questions to standard format
            const questions: ParsedQuestion[] = rawQuestions.map((q: any, idx: number) => {
                // Get question text (support both 'text' and 'cerinta')
                let text = q.text || q.cerinta;
                if (!text || typeof text !== 'string') {
                    throw new Error(`Întrebarea ${idx + 1}: Lipsește câmpul 'text' sau 'cerinta'`);
                }
                text = cleanCitations(text);  // Clean citations from question text

                // Get options (support both array and object format)
                let options: string[];
                if (Array.isArray(q.options)) {
                    options = q.options.map((o: string) => cleanCitations(o));
                } else if (q.optiuni && typeof q.optiuni === 'object') {
                    // Convert { A: "...", B: "...", C: "..." } to array
                    options = ['A', 'B', 'C', 'D']
                        .filter(letter => q.optiuni[letter])
                        .map(letter => cleanCitations(q.optiuni[letter]));
                } else {
                    throw new Error(`Întrebarea ${idx + 1}: Lipsește câmpul 'options' sau 'optiuni'`);
                }

                if (options.length < 2) {
                    throw new Error(`Întrebarea ${idx + 1}: Trebuie să existe minim 2 opțiuni`);
                }

                // Get correct answer (support both 'correctAnswer' and 'raspuns_corect')
                let correctAnswer = q.correctAnswer ?? q.raspuns_corect;
                if (correctAnswer === undefined) {
                    throw new Error(`Întrebarea ${idx + 1}: Lipsește câmpul 'correctAnswer' sau 'raspuns_corect'`);
                }

                // Clean correctAnswer - extract just the letter if it contains citations
                // e.g., "B [cite: 156]" -> "B"
                if (typeof correctAnswer === 'string') {
                    const letterMatch = correctAnswer.match(/^([A-Da-d])/);
                    if (letterMatch) {
                        correctAnswer = letterMatch[1].toUpperCase();
                    }
                }

                return {
                    number: q.number || q.id || idx + 1,
                    text,
                    options,
                    correctAnswer
                };
            });

            setParsedQuestions(questions);
            toast({
                title: "JSON valid ✅",
                description: `${questions.length} întrebări detectate și normalizate.`,
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
        if (parsedQuestions.length === 0) {
            toast({
                title: "Nimic de importat",
                description: "Parsează mai întâi un JSON valid.",
                variant: "destructive",
            });
            return;
        }

        setIsProcessing(true);

        try {
            // SPETE MODE: Use different endpoint
            if (examType === 'spete' && parsedQuestions[0]?.text === '__SPETE_DATA__') {
                const speteDataStr = localStorage.getItem('spete_import_data');
                if (!speteDataStr) {
                    throw new Error("Date spețe lipsă. Validați din nou JSON-ul.");
                }

                const speteData = JSON.parse(speteDataStr);
                // Ensure year/variant/discipline match UI selection
                speteData.year = parseInt(selectedYear);
                speteData.variant = 1;
                speteData.discipline = selectedSubject;

                const response = await fetch("/api/exam-essays/import-json", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(speteData),
                });

                const result = await response.json();

                if (response.ok) {
                    toast({
                        title: "Import Spețe reușit! 🎉",
                        description: result.message || `${result.imported} cerințe importate.`,
                    });
                    setJsonInput("");
                    setParsedQuestions([]);
                    localStorage.removeItem('spete_import_data');
                } else {
                    throw new Error(result.error || result.details ? JSON.stringify(result.details) : "Import failed");
                }
                return;
            }

            // GRILE MODE: Original logic
            const payload: ImportPayload = {
                year: parseInt(selectedYear),
                examType,
                subject: selectedSubject,
                questions: parsedQuestions,
            };

            const response = await fetch("/api/exam-papers/import-json", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (response.ok) {
                toast({
                    title: "Import reușit! 🎉",
                    description: result.message || `${result.imported} întrebări importate.`,
                });
                // Reset form
                setJsonInput("");
                setParsedQuestions([]);
                queryClient.invalidateQueries({ queryKey: ["/api/questions"] });
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

    // Get correct answer display
    const getCorrectAnswerLabel = (answer: string | number): string => {
        if (typeof answer === 'string') return answer;
        return String.fromCharCode(64 + answer); // 1 -> A, 2 -> B, etc.
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <FileJson className="h-8 w-8 text-primary" />
                    Import Întrebări Examen (JSON)
                </h1>
                <p className="text-muted-foreground">
                    Importă direct întrebările din format JSON pregătit extern.
                </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* Left: Configuration & Input */}
                <div className="space-y-4">
                    {/* Metadata Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Configurare Import</CardTitle>
                            <CardDescription>Selectează anul, tipul probei și disciplina.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Year Selection */}
                            <div className="space-y-2">
                                <Label>Anul Examenului</Label>
                                <Select value={selectedYear} onValueChange={setSelectedYear}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {examYears.map(y => (
                                            <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Exam Type Selection */}
                            <div className="space-y-3">
                                <Label>Tip Probă</Label>
                                <RadioGroup
                                    value={examType}
                                    onValueChange={(v) => handleExamTypeChange(v as 'grile' | 'spete')}
                                    className="flex gap-4"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="grile" id="grile" />
                                        <Label htmlFor="grile" className="font-normal cursor-pointer">
                                            Proba I - Grile (100 întrebări)
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="spete" id="spete" />
                                        <Label htmlFor="spete" className="font-normal cursor-pointer">
                                            Proba II - Spețe (Redacțional)
                                        </Label>
                                    </div>
                                </RadioGroup>
                            </div>

                            {/* Subject Selection - Conditional */}
                            <div className="space-y-3">
                                <Label>
                                    Disciplina
                                    <span className="text-muted-foreground ml-2 text-xs">
                                        ({examType === 'grile' ? '4 opțiuni' : '2 opțiuni combinate'})
                                    </span>
                                </Label>
                                <RadioGroup
                                    value={selectedSubject}
                                    onValueChange={setSelectedSubject}
                                    className="grid grid-cols-1 gap-2"
                                >
                                    {subjectOptions.map(({ value, label, icon: Icon, color }) => (
                                        <div
                                            key={value}
                                            className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors
                                                ${selectedSubject === value ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/50'}`}
                                            onClick={() => setSelectedSubject(value)}
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
                                Lipește JSON-ul cu întrebările. Format acceptat:
                                <code className="ml-2 text-xs bg-muted px-1 py-0.5 rounded">
                                    {`{"questions": [...]}`}
                                </code>
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Textarea
                                value={jsonInput}
                                onChange={(e) => setJsonInput(e.target.value)}
                                placeholder={`{
  "questions": [
    {
      "number": 1,
      "text": "Textul întrebării...",
      "options": ["A. Prima opțiune", "B. A doua opțiune", "C. A treia opțiune"],
      "correctAnswer": "B"
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
                                onClick={() => { setJsonInput(""); setParsedQuestions([]); setParseError(null); }}
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Reset
                            </Button>
                            <Button onClick={handleParseJSON} disabled={!jsonInput.trim()}>
                                <FileQuestion className="h-4 w-4 mr-2" />
                                Validează JSON
                            </Button>
                        </CardFooter>
                    </Card>
                </div>

                {/* Right: Preview & Import */}
                <div className="space-y-4">
                    {parsedQuestions.length > 0 ? (
                        <>
                            {/* Summary Card */}
                            <Card className="border-green-200 bg-green-50">
                                <CardContent className="pt-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <CheckCircle2 className="h-6 w-6 text-green-600" />
                                            <div>
                                                <p className="font-semibold text-green-900">
                                                    {examType === 'spete' && parsedQuestions[0]?.text === '__SPETE_DATA__'
                                                        ? `${parsedQuestions[0]?.number || 0} cerințe valide`
                                                        : `${parsedQuestions.length} întrebări valide`}
                                                </p>
                                                <p className="text-sm text-green-700">
                                                    {selectedYear} • {examType === 'grile' ? 'Grilă' : 'Speță'} • {
                                                        subjectOptions.find(s => s.value === selectedSubject)?.label
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                        <Button onClick={handleImport} disabled={isProcessing}>
                                            {isProcessing ? (
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            ) : (
                                                <Download className="h-4 w-4 mr-2" />
                                            )}
                                            Importă în Bază
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Questions/Spete Preview */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm">
                                        {examType === 'spete' ? 'Preview Subiecte & Cerințe' : 'Preview Întrebări'}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-[500px] pr-4">
                                        {examType === 'spete' && parsedQuestions[0]?.text === '__SPETE_DATA__' ? (
                                            // SPETE PREVIEW
                                            (() => {
                                                const speteDataStr = localStorage.getItem('spete_import_data');
                                                if (!speteDataStr) return <p className="text-muted-foreground">Nu s-au găsit date spețe.</p>;
                                                const speteData = JSON.parse(speteDataStr);
                                                return (
                                                    <div className="space-y-6">
                                                        {speteData.subjects?.map((subject: any) => (
                                                            <div key={subject.id} className="border rounded-lg p-4 space-y-3">
                                                                <div className="flex items-center gap-2">
                                                                    <Badge variant="outline" className="bg-blue-50">{subject.area}</Badge>
                                                                    <span className="font-medium">{subject.title}</span>
                                                                </div>

                                                                {subject.scenario && (
                                                                    <p className="text-xs text-muted-foreground italic border-l-2 pl-3 line-clamp-3">
                                                                        {subject.scenario.substring(0, 300)}...
                                                                    </p>
                                                                )}

                                                                <div className="space-y-2 pl-4 border-l-2 border-green-200">
                                                                    {subject.requirements?.map((req: any) => (
                                                                        <div key={req.id} className="bg-muted/30 rounded p-2">
                                                                            <div className="flex items-center gap-2 mb-1">
                                                                                <Badge variant="secondary" className="font-mono text-xs">
                                                                                    {req.id}
                                                                                </Badge>
                                                                                <span className="text-xs text-green-600 font-medium">{req.points}p</span>
                                                                                {req.time && <span className="text-xs text-muted-foreground">• {req.time}min</span>}
                                                                            </div>
                                                                            <p className="text-sm line-clamp-2">{req.text}</p>
                                                                            <details className="mt-2">
                                                                                <summary className="text-xs text-primary cursor-pointer hover:underline">
                                                                                    Vezi soluția ({req.rubric?.length || 0} criterii)
                                                                                </summary>
                                                                                <div className="mt-2 p-2 bg-green-50 rounded text-xs">
                                                                                    <p className="text-green-800 mb-2">{req.solution}</p>
                                                                                    {req.legalRefs?.length > 0 && (
                                                                                        <p className="text-green-600">📚 {req.legalRefs.join(', ')}</p>
                                                                                    )}
                                                                                </div>
                                                                            </details>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            })()
                                        ) : (
                                            // GRILE PREVIEW
                                            <div className="space-y-4">
                                                {parsedQuestions.map((q, idx) => (
                                                    <div key={idx} className="border rounded-lg p-4 space-y-2">
                                                        <div className="flex items-start gap-2">
                                                            <Badge variant="outline" className="shrink-0">
                                                                {q.number || idx + 1}
                                                            </Badge>
                                                            <p className="text-sm font-medium">{q.text}</p>
                                                        </div>
                                                        <div className="pl-8 space-y-1">
                                                            {q.options.map((opt, i) => {
                                                                const isCorrect =
                                                                    (typeof q.correctAnswer === 'string' && q.correctAnswer === String.fromCharCode(65 + i)) ||
                                                                    (typeof q.correctAnswer === 'number' && q.correctAnswer === i + 1);
                                                                return (
                                                                    <div
                                                                        key={i}
                                                                        className={`text-sm flex items-center gap-2 ${isCorrect ? 'text-green-600 font-medium' : 'text-muted-foreground'}`}
                                                                    >
                                                                        <span className="w-5">{String.fromCharCode(65 + i)}.</span>
                                                                        <span>{opt}</span>
                                                                        {isCorrect && <CheckCircle2 className="h-3 w-3" />}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </>
                    ) : (
                        /* Empty State */
                        <Card className="h-full flex items-center justify-center min-h-[400px]">
                            <CardContent className="text-center py-12">
                                <FileJson className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                                <p className="text-muted-foreground mb-2">
                                    Niciun JSON validat încă.
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Lipește JSON-ul în stânga și apasă "Validează JSON".
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
