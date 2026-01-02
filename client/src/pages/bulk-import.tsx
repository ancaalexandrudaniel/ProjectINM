import { useState, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  ArrowLeft, 
  Upload, 
  FileJson,
  Sparkles,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Copy,
  Eye,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { QuestionBatch } from "@shared/schema";

const subjectLabels: Record<string, string> = {
  'civil': 'Drept Civil',
  'civil-procedural': 'Drept Procesual Civil',
  'penal': 'Drept Penal',
  'penal-procedural': 'Drept Procesual Penal'
};

const sourceLabels: Record<string, string> = {
  'llm-session': 'Sesiune LLM (ChatGPT, Claude, Gemini)',
  'manual': 'Adăugate Manual',
  'exam-past': 'Subiecte Anterioare'
};

const llmPromptTemplate = `Transformă toate grilele din conversația noastră în format JSON structurat.

Pentru FIECARE întrebare, extrage SEPARAT:
1. Textul întrebării (fără opțiuni, fără numerotare)
2. Cele 4 opțiuni de răspuns (doar text, array de 4 stringuri)
3. Răspunsul corect
4. Explicația detaliată
5. Articolele de lege relevante

Returnează un array JSON cu structura:
[
  {
    "questionText": "Textul exact al întrebării, curat, fără A) B) C) D)",
    "options": ["Prima opțiune", "A doua opțiune", "A treia opțiune", "A patra opțiune"],
    "correctAnswer": 1,
    "correctAnswers": [],
    "explanation": "Explicația completă de ce opțiunea este corectă...",
    "legalReferences": ["Art. 2517 Cod Civil", "Art. 1350 Cod Civil"],
    "chapter": "Obligații",
    "topic": "Prescripție",
    "difficulty": "medium"
  }
]

REGULI PENTRU RĂSPUNSURI:
- Dacă există UN SINGUR răspuns corect: correctAnswer = index (0-3), correctAnswers = []
- Dacă există MAI MULTE răspunsuri corecte: correctAnswer = null, correctAnswers = [0, 2] (exemplu)
- Dacă NICIUNUL nu e corect (God Mode Set C): correctAnswer = null, correctAnswers = []

IMPORTANT:
- options este un array de 4 stringuri simple, NU obiecte
- correctAnswer este INDEX-ul (0, 1, 2 sau 3) sau null
- Fiecare câmp trebuie să conțină DOAR informația sa, fără contaminare
- Păstrează explicațiile complete, nu le prescurta`;

const exampleJSON = `[
  {
    "questionText": "Care este termenul general de prescripție pentru acțiunile personale?",
    "options": ["1 an", "3 ani", "5 ani", "10 ani"],
    "correctAnswer": 1,
    "correctAnswers": [],
    "explanation": "Conform art. 2517 din Codul Civil, termenul general de prescripție extinctivă este de 3 ani.",
    "legalReferences": ["Art. 2517 Cod Civil"],
    "chapter": "Prescripția extinctivă",
    "difficulty": "medium"
  },
  {
    "questionText": "Care dintre următoarele constituie cauze de suspendare a prescripției extinctive?",
    "options": ["Forța majoră", "Recunoașterea dreptului", "Introducerea cererii de chemare în judecată", "Executarea voluntară parțială"],
    "correctAnswer": null,
    "correctAnswers": [0, 2],
    "explanation": "Forța majoră și introducerea cererii de chemare în judecată sunt cauze de suspendare.",
    "legalReferences": ["Art. 2532 Cod Civil", "Art. 2537 Cod Civil"],
    "chapter": "Prescripția extinctivă",
    "difficulty": "hard"
  }
]`;

interface ValidationResult {
  isValid: boolean;
  questions: ParsedQuestion[];
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ParsedQuestion {
  index: number;
  questionText: string;
  options: string[];
  correctAnswer: number | null;
  correctAnswers: number[];
  explanation?: string;
  hasExplanation: boolean;
  hasLegalReferences: boolean;
  chapter?: string;
  isMultipleCorrect: boolean;
  isNoneCorrect: boolean;
}

interface ValidationError {
  index: number;
  field: string;
  message: string;
}

interface ValidationWarning {
  index: number;
  field: string;
  message: string;
}

function autoFixJSON(jsonString: string): { fixed: string; fixes: string[] } {
  const fixes: string[] = [];
  let result = jsonString;
  
  // 1. Elimină trailing commas înainte de ] sau }
  const beforeTrailing = result;
  result = result.replace(/,(\s*[\]}])/g, '$1');
  if (result !== beforeTrailing) {
    fixes.push('Virgule în exces eliminate (trailing commas)');
  }
  
  // 2. Înlocuiește ghilimelele drepte din interiorul stringurilor cu versiuni escapate
  // Problema: LLM-urile generează uneori " în loc de „" sau \"
  // Strategia: Găsim perechile de ghilimele care delimitează stringuri JSON
  // și escapăm cele din interior
  
  // Pattern pentru a găsi string-uri JSON: "key": "value" sau elemente de array
  // Folosim o abordare mai robustă: detectăm contextul
  
  let fixedChars: string[] = [];
  let inString = false;
  let stringStart = -1;
  let escaped = false;
  let hadQuoteFix = false;
  let hadNewlineFix = false;
  
  for (let i = 0; i < result.length; i++) {
    const char = result[i];
    const prevChar = i > 0 ? result[i - 1] : '';
    const nextChar = i < result.length - 1 ? result[i + 1] : '';
    
    if (escaped) {
      fixedChars.push(char);
      escaped = false;
      continue;
    }
    
    if (char === '\\') {
      escaped = true;
      fixedChars.push(char);
      continue;
    }
    
    if (char === '"') {
      if (!inString) {
        // Începutul unui string
        inString = true;
        stringStart = i;
        fixedChars.push(char);
      } else {
        // Suntem în string - verificăm dacă e sfârșitul sau un " în interior
        // E sfârșitul doar dacă urmează un context JSON valid:
        // - "," urmat de " (next property/array element)
        // - "," urmat de { sau [ (nested object/array)
        // - "]" sau "}" (end of array/object)
        // - ":" (after property name)
        const afterQuote = result.substring(i + 1);
        const afterQuoteTrimmed = afterQuote.trimStart();
        
        // Verifică dacă imediat după ghilimele urmează escape sequence (\n, \t, etc.)
        const startsWithEscape = afterQuote.length > 0 && afterQuote[0] === '\\';
        
        let isEndOfString = false;
        
        if (!startsWithEscape && afterQuoteTrimmed.length > 0) {
          const nextNonWs = afterQuoteTrimmed[0];
          
          if (nextNonWs === ']' || nextNonWs === '}') {
            // End of array or object
            isEndOfString = true;
          } else if (nextNonWs === ':') {
            // After property name - but only if current string looks like a property name
            // Property names are typically short and don't contain newlines or special chars
            const currentStringContent = result.substring(stringStart + 1, i);
            // Property name: no newlines, no escape sequences, reasonable length
            const looksLikePropertyName = currentStringContent.length < 50 && 
                                          !currentStringContent.includes('\\n') &&
                                          !currentStringContent.includes('\n') &&
                                          !/[„""«»]/.test(currentStringContent);
            if (looksLikePropertyName) {
              isEndOfString = true;
            }
          } else if (nextNonWs === ',') {
            // After comma, check what follows
            // Valid JSON: "value", "nextValue" OR "value", { OR "value", [
            const afterComma = afterQuoteTrimmed.substring(1).trimStart();
            if (afterComma.length > 0) {
              const afterCommaCh = afterComma[0];
              // Valid: next is " (string), { (object), [ (array), or JSON literals
              // Be careful: "t" could be start of text in content, not "true"
              // So only check for structural chars, not literal starts
              isEndOfString = afterCommaCh === '"' || 
                              afterCommaCh === '{' || 
                              afterCommaCh === '[' ||
                              afterCommaCh === ']' ||
                              afterCommaCh === '}' ||
                              /^-?\d/.test(afterComma) ||
                              afterComma.startsWith('true') ||
                              afterComma.startsWith('false') ||
                              afterComma.startsWith('null');
            }
          }
        } else if (!startsWithEscape && afterQuoteTrimmed.length === 0) {
          isEndOfString = true;
        }
        
        if (isEndOfString) {
          // E sfârșitul stringului
          inString = false;
          fixedChars.push(char);
        } else {
          // E un " în interiorul stringului - escapează-l
          fixedChars.push('\\');
          fixedChars.push(char);
          hadQuoteFix = true;
        }
      }
      continue;
    }
    
    // Escapează newlines reale din interiorul stringurilor
    if (inString && (char === '\n' || char === '\r')) {
      fixedChars.push('\\');
      fixedChars.push('n');
      hadNewlineFix = true;
      if (char === '\r' && nextChar === '\n') {
        i++; // Skip \n after \r
      }
      continue;
    }
    
    fixedChars.push(char);
  }
  
  if (hadQuoteFix) {
    fixes.push('Ghilimele " din interior escapate cu \\"');
  }
  if (hadNewlineFix) {
    fixes.push('Newlines neescapate din stringuri convertite în \\n');
  }
  
  result = fixedChars.join('');
  
  // 3. Încearcă să detecteze și să repare JSON trunchiat
  const openBrackets = (result.match(/\[/g) || []).length;
  const closeBrackets = (result.match(/\]/g) || []).length;
  const openBraces = (result.match(/\{/g) || []).length;
  const closeBraces = (result.match(/\}/g) || []).length;
  
  if (openBrackets > closeBrackets) {
    result = result + ']'.repeat(openBrackets - closeBrackets);
    fixes.push(`Adăugate ${openBrackets - closeBrackets} paranteze pătrate lipsă ]`);
  }
  if (openBraces > closeBraces) {
    result = result + '}'.repeat(openBraces - closeBraces);
    fixes.push(`Adăugate ${openBraces - closeBraces} acolade lipsă }`);
  }
  
  return { fixed: result, fixes };
}

function validateJSON(jsonString: string, applyAutoFix: boolean = true): ValidationResult & { autoFixes?: string[] } {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const questions: ParsedQuestion[] = [];

  if (!jsonString.trim()) {
    return { isValid: false, questions: [], errors: [], warnings: [] };
  }

  let textToParse = jsonString;
  let autoFixes: string[] = [];
  
  if (applyAutoFix) {
    const fixResult = autoFixJSON(jsonString);
    textToParse = fixResult.fixed;
    autoFixes = fixResult.fixes;
  }

  let parsed: any;
  try {
    parsed = JSON.parse(textToParse);
  } catch (e: any) {
    errors.push({ index: -1, field: 'JSON', message: `JSON invalid: ${e.message}` });
    return { isValid: false, questions: [], errors, warnings, autoFixes };
  }

  // Accept both array format [...] and object format { "intrebari": [...] }
  let questionsArray: any[];
  if (Array.isArray(parsed)) {
    questionsArray = parsed;
  } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.intrebari)) {
    questionsArray = parsed.intrebari;
  } else {
    errors.push({ index: -1, field: 'format', message: 'JSON-ul trebuie să fie un array [] sau un obiect { "intrebari": [...] }' });
    return { isValid: false, questions: [], errors, warnings };
  }

  if (questionsArray.length === 0) {
    errors.push({ index: -1, field: 'format', message: 'Array-ul este gol' });
    return { isValid: false, questions: [], errors, warnings };
  }

  questionsArray.forEach((q, i) => {
    if (!q.questionText || typeof q.questionText !== 'string') {
      errors.push({ index: i, field: 'questionText', message: 'Lipsește textul întrebării' });
    } else if (q.questionText.length < 10) {
      warnings.push({ index: i, field: 'questionText', message: 'Text prea scurt' });
    }

    if (!Array.isArray(q.options)) {
      errors.push({ index: i, field: 'options', message: 'Lipsesc opțiunile (array)' });
    } else if (q.options.length < 2) {
      errors.push({ index: i, field: 'options', message: 'Minim 2 opțiuni necesare' });
    } else if (q.options.length !== 4) {
      warnings.push({ index: i, field: 'options', message: `${q.options.length} opțiuni (recomandat: 4)` });
    }

    const correctAnswers: number[] = Array.isArray(q.correctAnswers) ? q.correctAnswers : [];
    const correctAnswer: number | null = typeof q.correctAnswer === 'number' ? q.correctAnswer : null;
    
    const hasMultipleCorrect = correctAnswers.length > 1;
    const hasSingleCorrect = correctAnswer !== null || correctAnswers.length === 1;
    const hasNoneCorrect = correctAnswer === null && correctAnswers.length === 0 && Array.isArray(q.correctAnswers);

    // Valid scenarios:
    // 1. correctAnswer is a number (single correct)
    // 2. correctAnswers has 1+ elements (single or multiple correct)
    // 3. correctAnswers is explicitly [] (none correct - God Mode)
    const hasValidAnswer = hasSingleCorrect || hasMultipleCorrect || hasNoneCorrect;

    if (!hasValidAnswer && q.correctAnswer === undefined && !Array.isArray(q.correctAnswers)) {
      errors.push({ index: i, field: 'correctAnswer', message: 'Lipsește răspunsul corect (correctAnswer sau correctAnswers)' });
    }

    if (correctAnswer !== null && (correctAnswer < 0 || correctAnswer >= (q.options?.length || 4))) {
      errors.push({ index: i, field: 'correctAnswer', message: `Index invalid: ${correctAnswer}` });
    }

    correctAnswers.forEach((idx: number) => {
      if (idx < 0 || idx >= (q.options?.length || 4)) {
        errors.push({ index: i, field: 'correctAnswers', message: `Index invalid în correctAnswers: ${idx}` });
      }
    });

    const hasExplanation = !!q.explanation && q.explanation.length > 10;
    const hasLegalReferences = Array.isArray(q.legalReferences) && q.legalReferences.length > 0;

    if (!hasExplanation) {
      warnings.push({ index: i, field: 'explanation', message: 'Lipsește explicația detaliată' });
    }

    // Normalize options for display (extract text from objects)
    const displayOptions = (q.options || []).map((opt: any) => 
      typeof opt === 'string' ? opt : (opt.text || '')
    );

    questions.push({
      index: i,
      questionText: q.questionText || '',
      options: displayOptions,
      correctAnswer: correctAnswer,
      correctAnswers: correctAnswers,
      explanation: q.explanation,
      hasExplanation,
      hasLegalReferences,
      chapter: q.chapter,
      isMultipleCorrect: hasMultipleCorrect,
      isNoneCorrect: hasNoneCorrect
    });
  });

  return {
    isValid: errors.length === 0,
    questions,
    errors,
    warnings
  };
}

// Session format validation
interface SessionValidationResult {
  isValid: boolean;
  questions: SessionParsedQuestion[];
  errors: string[];
  metadata?: any;
}

interface SessionParsedQuestion {
  id: number;
  tulpina: string;
  variante: { litera: string; text: string; este_corecta: boolean }[];
  hasExceptii: boolean;
  hasFeedback: boolean;
  concepte: string[];
  articole: string[];
}

function validateSessionJSON(jsonString: string): SessionValidationResult & { autoFixes?: string[] } {
  const errors: string[] = [];
  const questions: SessionParsedQuestion[] = [];

  if (!jsonString.trim()) {
    return { isValid: false, questions: [], errors: [] };
  }

  // Apply auto-fix first
  const { fixed: textToParse, fixes: autoFixes } = autoFixJSON(jsonString);

  let parsed: any;
  try {
    parsed = JSON.parse(textToParse);
  } catch (e: any) {
    errors.push(`JSON invalid: ${e.message}`);
    return { isValid: false, questions: [], errors, autoFixes };
  }

  const intrebari = parsed.intrebari || (Array.isArray(parsed) ? parsed : null);
  
  if (!intrebari || !Array.isArray(intrebari) || intrebari.length === 0) {
    errors.push("JSON-ul trebuie să conțină un array 'intrebari' cu cel puțin o întrebare");
    return { isValid: false, questions: [], errors };
  }

  for (let i = 0; i < intrebari.length; i++) {
    const q = intrebari[i];
    
    if (!q.tulpina || typeof q.tulpina !== 'string') {
      errors.push(`Întrebarea ${i + 1}: Lipsește câmpul 'tulpina' (textul întrebării)`);
      continue;
    }
    
    if (!Array.isArray(q.variante) || q.variante.length < 2) {
      errors.push(`Întrebarea ${i + 1}: Lipsesc 'variante' (minim 2)`);
      continue;
    }

    const invalidVariant = q.variante.find((v: any, idx: number) => 
      typeof v.litera !== 'string' || typeof v.text !== 'string' || typeof v.este_corecta !== 'boolean'
    );
    if (invalidVariant) {
      errors.push(`Întrebarea ${i + 1}: Fiecare variantă trebuie să aibă litera, text și este_corecta`);
      continue;
    }

    questions.push({
      id: q.id || i + 1,
      tulpina: q.tulpina,
      variante: q.variante,
      hasExceptii: q.feedback?.are_exceptii || false,
      hasFeedback: !!q.feedback?.explicatie_generala,
      concepte: q.concepte_cheie || [],
      articole: q.articole_relevante || []
    });
  }

  return {
    isValid: questions.length > 0 && errors.length === 0,
    questions,
    errors,
    metadata: parsed.session_metadata
  };
}

export default function BulkImport() {
  const { toast } = useToast();
  const [importMode, setImportMode] = useState<'simple' | 'session'>('simple');
  const [batchName, setBatchName] = useState('');
  const [subject, setSubject] = useState('');
  const [sourceType, setSourceType] = useState('llm-session');
  const [sourceLLM, setSourceLLM] = useState('');
  const [jsonData, setJsonData] = useState('');
  const [sessionJsonData, setSessionJsonData] = useState('');
  const [sessionChapter, setSessionChapter] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const validation = useMemo(() => validateJSON(jsonData), [jsonData]);
  const sessionValidation = useMemo(() => validateSessionJSON(sessionJsonData), [sessionJsonData]);

  const { data: batches = [], isLoading } = useQuery<QuestionBatch[]>({
    queryKey: ['/api/question-batches'],
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      const questionsData = JSON.parse(jsonData);
      const response = await apiRequest('POST', '/api/questions/bulk-import', {
        batchName,
        subject,
        sourceType,
        sourceLLM: sourceLLM || null,
        questionsData
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Import reușit!",
        description: `${data.importedCount} din ${data.totalProvided} întrebări au fost importate.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/question-batches'] });
      queryClient.invalidateQueries({ queryKey: ['/api/questions'] });
      setBatchName('');
      setJsonData('');
    },
    onError: (error: Error) => {
      toast({
        title: "Eroare la import",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const sessionImportMutation = useMutation({
    mutationFn: async () => {
      // Apply auto-fix before parsing
      const { fixed: fixedJson } = autoFixJSON(sessionJsonData);
      const sessionData = JSON.parse(fixedJson);
      const response = await apiRequest('POST', '/api/questions/bulk-import-session', {
        sessionData,
        subject,
        chapter: sessionChapter || undefined,
        sourceLLM: sourceLLM || undefined
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Import Sesiune Reușit!",
        description: `${data.importedCount} din ${data.totalProvided} întrebări importate cu feedback detaliat.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/question-batches'] });
      queryClient.invalidateQueries({ queryKey: ['/api/questions'] });
      setSessionJsonData('');
      setSessionChapter('');
    },
    onError: (error: Error) => {
      toast({
        title: "Eroare la import sesiune",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const copyPrompt = () => {
    navigator.clipboard.writeText(llmPromptTemplate);
    toast({ title: "Prompt copiat!", description: "Lipește-l în ChatGPT/Claude/Gemini" });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="back-home">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Upload className="h-8 w-8" />
              Import Întrebări din LLM
            </h1>
            <p className="text-muted-foreground">
              Transformă conversațiile cu AI în întrebări structurate
            </p>
          </div>
        </div>
        
        <Button variant="outline" onClick={() => setShowGuide(true)}>
          <Lightbulb className="h-4 w-4 mr-2" />
          Ghid Pas cu Pas
        </Button>
      </div>

      {/* Mode Selection Tabs */}
      <Tabs value={importMode} onValueChange={(v) => setImportMode(v as 'simple' | 'session')} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="simple" data-testid="tab-simple-import">
            Format Simplu
          </TabsTrigger>
          <TabsTrigger value="session" data-testid="tab-session-import">
            <Sparkles className="h-4 w-4 mr-1" />
            Format Sesiune
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="simple" className="mt-4">
          <p className="text-sm text-muted-foreground mb-4">
            Format de bază: array de întrebări cu questionText, options, correctAnswer
          </p>
        </TabsContent>
        
        <TabsContent value="session" className="mt-4">
          <div className="p-3 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/30 rounded-lg mb-4">
            <p className="text-sm">
              <strong className="text-purple-400">Format Îmbogățit:</strong> Include feedback detaliat per variantă, excepții juridice, 
              concepte cheie, analiză erori și glosar incremental.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showGuide} onOpenChange={setShowGuide}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Cum Importezi Întrebări din ChatGPT/Claude/Gemini
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
              <h3 className="font-semibold text-cyan-400 mb-2">De Ce Avem Nevoie de Format Structurat?</h3>
              <p className="text-sm text-muted-foreground">
                Când discuți cu un LLM, primești răspunsuri narative mixte. Pentru ca aplicația să poată afișa 
                <strong> doar întrebarea</strong> când testezi, <strong>doar feedback-ul</strong> când revizuiești, 
                și <strong>răspunsul corect</strong> când verifici - avem nevoie ca fiecare element să fie separat clar în JSON.
              </p>
            </div>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="step1">
                <AccordionTrigger>
                  <span className="flex items-center gap-2">
                    <Badge variant="outline">Pasul 1</Badge>
                    Generează întrebări cu LLM-ul
                  </span>
                </AccordionTrigger>
                <AccordionContent className="space-y-2 text-sm">
                  <p>Lucrează normal cu ChatGPT/Claude/Gemini:</p>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>"Generează 10 grile despre prescripția extinctivă"</li>
                    <li>"Dă-mi feedback la răspunsurile mele"</li>
                    <li>"Explică de ce răspunsul B este corect"</li>
                  </ul>
                  <p className="text-muted-foreground">
                    Nu te preocupa de format acum - concentrează-te pe învățare.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="step2">
                <AccordionTrigger>
                  <span className="flex items-center gap-2">
                    <Badge variant="outline">Pasul 2</Badge>
                    Cere LLM-ului să structureze în JSON
                  </span>
                </AccordionTrigger>
                <AccordionContent className="space-y-4">
                  <p className="text-sm">La sfârșitul sesiunii, copiază acest prompt:</p>
                  <div className="relative">
                    <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto max-h-64">
                      {llmPromptTemplate}
                    </pre>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="absolute top-2 right-2"
                      onClick={copyPrompt}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copiază
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    LLM-ul va transforma automat toate grilele într-un format curat, separând:
                  </p>
                  <ul className="text-sm text-muted-foreground list-disc pl-5">
                    <li><strong>questionText</strong> - doar textul întrebării</li>
                    <li><strong>options</strong> - cele 4 variante, separate</li>
                    <li><strong>correctAnswer</strong> - indexul răspunsului corect (0, 1, 2 sau 3)</li>
                    <li><strong>explanation</strong> - explicația completă</li>
                    <li><strong>legalReferences</strong> - articolele de lege</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="step3">
                <AccordionTrigger>
                  <span className="flex items-center gap-2">
                    <Badge variant="outline">Pasul 3</Badge>
                    Copiază JSON-ul și importă
                  </span>
                </AccordionTrigger>
                <AccordionContent className="space-y-2 text-sm">
                  <p>Copiază array-ul JSON generat de LLM și lipește-l în câmpul de mai jos.</p>
                  <p className="text-muted-foreground">
                    Sistemul va valida automat și îți va arăta dacă sunt probleme.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="example">
                <AccordionTrigger>
                  <span className="flex items-center gap-2">
                    <Badge>Exemplu</Badge>
                    Format JSON corect
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                    {exampleJSON}
                  </pre>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <h3 className="font-semibold text-green-500 mb-2">Ce Se Întâmplă După Import?</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>În Quiz:</strong> Vezi doar întrebarea și opțiunile, fără răspunsul corect</li>
                <li>• <strong>După Răspuns:</strong> Afișăm dacă e corect + explicația completă</li>
                <li>• <strong>În Bancă:</strong> Poți căuta după capitol, dificultate, articol de lege</li>
                <li>• <strong>În Analiză:</strong> Sistemul identifică întrebările greșite frecvent</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Session Import Card */}
        {importMode === 'session' && (
          <Card className="border-purple-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-400" />
                Import Sesiune cu Feedback Detaliat
              </CardTitle>
              <CardDescription>
                Format îmbogățit cu analiză per variantă și excepții juridice
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="session-subject">Materie *</Label>
                  <Select value={subject} onValueChange={setSubject}>
                    <SelectTrigger id="session-subject" data-testid="select-session-subject">
                      <SelectValue placeholder="Alege materia..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(subjectLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="session-chapter">Capitol (opțional)</Label>
                  <Input
                    id="session-chapter"
                    placeholder="ex: Contracte art. 1166-1203"
                    value={sessionChapter}
                    onChange={(e) => setSessionChapter(e.target.value)}
                    data-testid="input-session-chapter"
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="session-llm">LLM Folosit</Label>
                  <Input
                    id="session-llm"
                    placeholder="ex: Claude-3.5-Sonnet"
                    value={sourceLLM}
                    onChange={(e) => setSourceLLM(e.target.value)}
                    data-testid="input-session-llm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="session-json">JSON Sesiune *</Label>
                <Textarea
                  id="session-json"
                  placeholder={`Paste-uiește JSON-ul cu structura:\n{\n  "session_metadata": {...},\n  "intrebari": [\n    {\n      "tulpina": "...",\n      "variante": [...],\n      "feedback": {...}\n    }\n  ]\n}`}
                  value={sessionJsonData}
                  onChange={(e) => setSessionJsonData(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                  data-testid="textarea-session-json"
                />
              </div>

              {sessionJsonData && (
                <div className="space-y-2">
                  {sessionValidation.autoFixes && sessionValidation.autoFixes.length > 0 && (
                    <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <p className="font-medium text-blue-400 flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4" />
                        Auto-corecții aplicate:
                      </p>
                      <ul className="text-sm text-blue-300 space-y-1">
                        {sessionValidation.autoFixes.map((fix, i) => (
                          <li key={i}>✓ {fix}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {sessionValidation.errors.length > 0 && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <p className="font-medium text-red-500 flex items-center gap-2 mb-2">
                        <XCircle className="h-4 w-4" />
                        {sessionValidation.errors.length} erori
                      </p>
                      <ul className="text-sm text-red-400 space-y-1">
                        {sessionValidation.errors.map((err, i) => (
                          <li key={i}>• {err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {sessionValidation.isValid && (
                    <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <p className="font-medium text-green-500 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        {sessionValidation.questions.length} întrebări valide
                      </p>
                      {sessionValidation.metadata && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Segment: {sessionValidation.metadata.segment_articole || 'N/A'} | 
                          Set: {sessionValidation.metadata.set_type || 'N/A'}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-1">
                        {sessionValidation.questions.slice(0, 3).map((q) => (
                          <Badge key={q.id} variant="outline" className="text-xs">
                            #{q.id} {q.hasExceptii && '⚠️'} {q.hasFeedback && '💬'}
                          </Badge>
                        ))}
                        {sessionValidation.questions.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{sessionValidation.questions.length - 3} altele
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <Button
                className="w-full"
                disabled={!sessionValidation.isValid || !subject || sessionImportMutation.isPending}
                onClick={() => sessionImportMutation.mutate()}
                data-testid="btn-import-session"
              >
                {sessionImportMutation.isPending ? (
                  <>Importare...</>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Importă Sesiune ({sessionValidation.questions.length} întrebări)
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Simple Import Card */}
        {importMode === 'simple' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5" />
              Import Nou
            </CardTitle>
            <CardDescription>
              Completează detaliile și paste-uiește JSON-ul
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="batch-name">Nume Batch *</Label>
                <Input
                  id="batch-name"
                  placeholder="ex: Obligații - Dec 2024"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  data-testid="input-batch-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Materie *</Label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger id="subject" data-testid="select-subject">
                    <SelectValue placeholder="Alege materia..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(subjectLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="source-type">Sursă</Label>
                <Select value={sourceType} onValueChange={setSourceType}>
                  <SelectTrigger id="source-type" data-testid="select-source-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(sourceLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="source-llm">LLM Folosit</Label>
                <Input
                  id="source-llm"
                  placeholder="ex: ChatGPT-4o"
                  value={sourceLLM}
                  onChange={(e) => setSourceLLM(e.target.value)}
                  data-testid="input-source-llm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="json-data">Date JSON *</Label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowPreview(!showPreview)}
                  disabled={!jsonData}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  {showPreview ? 'Ascunde' : 'Preview'}
                </Button>
              </div>
              <Textarea
                id="json-data"
                placeholder="Paste-uiește array-ul JSON aici..."
                value={jsonData}
                onChange={(e) => setJsonData(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
                data-testid="textarea-json"
              />
            </div>

            {jsonData && (
              <div className="space-y-2">
                {validation.errors.length > 0 && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="font-medium text-red-500 flex items-center gap-2 mb-2">
                      <XCircle className="h-4 w-4" />
                      {validation.errors.length} erori găsite
                    </p>
                    <ul className="text-sm text-red-400 space-y-1">
                      {validation.errors.slice(0, 5).map((err, i) => (
                        <li key={i}>
                          {err.index >= 0 ? `Întrebarea ${err.index + 1}: ` : ''}
                          {err.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {validation.warnings.length > 0 && validation.errors.length === 0 && (
                  <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <p className="font-medium text-yellow-500 flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4" />
                      {validation.warnings.length} avertismente
                    </p>
                    <ul className="text-sm text-yellow-400 space-y-1">
                      {validation.warnings.slice(0, 3).map((warn, i) => (
                        <li key={i}>
                          Întrebarea {warn.index + 1}: {warn.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {validation.isValid && (
                  <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <p className="font-medium text-green-500 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      {validation.questions.length} întrebări valide, gata de import!
                    </p>
                    <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                      <span>{validation.questions.filter(q => q.hasExplanation).length} cu explicație</span>
                      <span>{validation.questions.filter(q => q.hasLegalReferences).length} cu referințe legale</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <Button
              onClick={() => importMutation.mutate()}
              disabled={!batchName || !subject || !validation.isValid || importMutation.isPending}
              className="w-full"
              size="lg"
              data-testid="button-import"
            >
              {importMutation.isPending ? (
                <>
                  <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                  Se importă...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Importă {validation.questions.length || 0} Întrebări
                </>
              )}
            </Button>
          </CardContent>
        </Card>
        )}

        {showPreview && validation.questions.length > 0 && importMode === 'simple' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Preview ({validation.questions.length} întrebări)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 max-h-[500px] overflow-y-auto">
              {validation.questions.slice(0, 5).map((q, i) => {
                const isCorrect = (idx: number) => {
                  if (q.correctAnswer !== null && q.correctAnswer === idx) return true;
                  if (q.correctAnswers.includes(idx)) return true;
                  return false;
                };
                
                return (
                  <div key={i} className="p-3 bg-muted/50 rounded-lg space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">#{q.index + 1}</Badge>
                        {q.isMultipleCorrect && (
                          <Badge className="bg-orange-500/20 text-orange-400 text-xs">Multiple</Badge>
                        )}
                        {q.isNoneCorrect && (
                          <Badge className="bg-red-500/20 text-red-400 text-xs">God Mode</Badge>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {q.hasExplanation && <Badge variant="secondary" className="text-xs">Explicație</Badge>}
                        {q.hasLegalReferences && <Badge variant="secondary" className="text-xs">Art. Lege</Badge>}
                        {q.chapter && <Badge variant="outline" className="text-xs">{q.chapter}</Badge>}
                      </div>
                    </div>
                    <p className="text-sm font-medium">{q.questionText.slice(0, 150)}...</p>
                    <div className="grid grid-cols-2 gap-1">
                      {q.options.map((opt: string, oi: number) => (
                        <div 
                          key={oi} 
                          className={`text-xs p-1 rounded ${isCorrect(oi) ? 'bg-green-500/20 text-green-400' : 'bg-background'}`}
                        >
                          {String.fromCharCode(65 + oi)}) {opt.slice(0, 30)}...
                        </div>
                      ))}
                    </div>
                    {q.isNoneCorrect && (
                      <div className="text-xs text-red-400 italic">⚠ Niciun răspuns corect</div>
                    )}
                  </div>
                );
              })}
              {validation.questions.length > 5 && (
                <p className="text-center text-muted-foreground text-sm">
                  + {validation.questions.length - 5} întrebări...
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">Import-uri Anterioare</h2>
        
        {isLoading ? (
          <p className="text-muted-foreground">Se încarcă...</p>
        ) : batches.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileJson className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                Niciun import efectuat încă.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {batches.map((batch) => (
              <Card key={batch.id} data-testid={`batch-card-${batch.id}`}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold">{batch.batchName}</h3>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline">{subjectLabels[batch.subject] || batch.subject}</Badge>
                        <Badge variant="secondary">{batch.questionsCount} grile</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(batch.uploadedAt!).toLocaleDateString('ro-RO')}
                        {batch.sourceLLM && ` • ${batch.sourceLLM}`}
                      </p>
                    </div>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
