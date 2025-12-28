import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  ArrowLeft, 
  Upload, 
  FileJson,
  Sparkles,
  CheckCircle,
  HelpCircle,
  PenTool
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { CaseStudyBatch } from "@shared/schema";

const subjectLabels: Record<string, string> = {
  'civil': 'Drept Civil',
  'civil-procedural': 'Drept Procesual Civil',
  'penal': 'Drept Penal',
  'penal-procedural': 'Drept Procesual Penal'
};

const examDayLabels: Record<string, string> = {
  'day1': 'Ziua 1 - Civil + Procesual Civil',
  'day2': 'Ziua 2 - Penal + Procesual Penal'
};

const exampleJSON = `[
  {
    "title": "Speța 1 - Răspunderea contractuală",
    "scenario": "Ion a încheiat un contract de vânzare cu Maria...",
    "questions": [
      "Care sunt efectele neexecutării obligației?",
      "Ce remedii are partea vătămată?"
    ],
    "referenceArticles": ["Art. 1350 Cod Civil", "Art. 1516 Cod Civil"],
    "sampleAnswer": "Răspunsul model complet aici...",
    "modelEvaluation": "Criterii de evaluare: identificare instituții (2p), aplicare (3p)...",
    "aiFeedback": "Feedback detaliat de la LLM...",
    "difficulty": "medium",
    "estimatedTime": 45
  }
]`;

export default function SpeteImport() {
  const { toast } = useToast();
  const [batchName, setBatchName] = useState('');
  const [subject, setSubject] = useState('');
  const [examDay, setExamDay] = useState('');
  const [sourceType, setSourceType] = useState('llm-session');
  const [sourceLLM, setSourceLLM] = useState('');
  const [jsonData, setJsonData] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  const { data: batches = [], isLoading } = useQuery<CaseStudyBatch[]>({
    queryKey: ['/api/case-study-batches'],
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      let caseStudiesData;
      try {
        caseStudiesData = JSON.parse(jsonData);
      } catch (e) {
        throw new Error("JSON invalid. Verifică formatul.");
      }

      if (!Array.isArray(caseStudiesData)) {
        throw new Error("JSON-ul trebuie să fie un array de spețe.");
      }

      const response = await apiRequest('POST', '/api/case-studies/bulk-import', {
        batchName,
        subject,
        examDay: examDay || null,
        sourceType,
        sourceLLM: sourceLLM || null,
        caseStudiesData
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Import reușit!",
        description: `${data.importedCount} din ${data.totalProvided} spețe au fost importate.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/case-study-batches'] });
      queryClient.invalidateQueries({ queryKey: ['/api/case-studies'] });
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
              <PenTool className="h-8 w-8" />
              Import Bulk Spețe
            </h1>
            <p className="text-muted-foreground">
              Importă spețe rezolvate din sesiunile tale cu LLM-uri
            </p>
          </div>
        </div>
        
        <Dialog open={showHelp} onOpenChange={setShowHelp}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <HelpCircle className="h-4 w-4 mr-2" />
              Format JSON
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Format JSON pentru Import Spețe</DialogTitle>
              <DialogDescription>
                Structura necesară pentru importul spețelor:
              </DialogDescription>
            </DialogHeader>
            <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
              {exampleJSON}
            </pre>
            <div className="space-y-2 text-sm">
              <p><strong>Câmpuri obligatorii:</strong></p>
              <ul className="list-disc pl-5 space-y-1">
                <li><code>title</code> - titlul speței</li>
                <li><code>scenario</code> - descrierea cazului/problemei</li>
              </ul>
              <p><strong>Câmpuri opționale (recomandate):</strong></p>
              <ul className="list-disc pl-5 space-y-1">
                <li><code>questions</code> - array de întrebări/cerințe</li>
                <li><code>referenceArticles</code> - articole de lege relevante</li>
                <li><code>sampleAnswer</code> - răspunsul model</li>
                <li><code>modelEvaluation</code> - criterii de evaluare/punctaj</li>
                <li><code>aiFeedback</code> - feedback complet de la LLM</li>
                <li><code>difficulty</code> - easy/medium/hard</li>
                <li><code>estimatedTime</code> - timp estimat (minute)</li>
              </ul>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5" />
            Import Nou
          </CardTitle>
          <CardDescription>
            Paste-uiește JSON-ul cu spețele din sesiunea ta LLM
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="batch-name">Nume Batch</Label>
              <Input
                id="batch-name"
                placeholder="ex: Obligații - Spețe Claude Dec 2024"
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                data-testid="input-batch-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Materie</Label>
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
              <Label htmlFor="exam-day">Ziua Examen (opțional)</Label>
              <Select value={examDay} onValueChange={setExamDay}>
                <SelectTrigger id="exam-day" data-testid="select-exam-day">
                  <SelectValue placeholder="Selectează ziua..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(examDayLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="source-llm">LLM Folosit (opțional)</Label>
              <Input
                id="source-llm"
                placeholder="ex: ChatGPT-4, Claude, Gemini"
                value={sourceLLM}
                onChange={(e) => setSourceLLM(e.target.value)}
                data-testid="input-source-llm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="json-data">Date JSON</Label>
            <Textarea
              id="json-data"
              placeholder="Paste-uiește array-ul JSON cu spețele aici..."
              value={jsonData}
              onChange={(e) => setJsonData(e.target.value)}
              className="min-h-[300px] font-mono text-sm"
              data-testid="textarea-json"
            />
          </div>

          <Button
            onClick={() => importMutation.mutate()}
            disabled={!batchName || !subject || !jsonData || importMutation.isPending}
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
                Importă Spețele
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-2xl font-semibold mb-4">Import-uri Anterioare</h2>
        
        {isLoading ? (
          <p className="text-muted-foreground">Se încarcă...</p>
        ) : batches.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <PenTool className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                Niciun import de spețe efectuat. Începe prin a adăuga spețe din sesiunile tale LLM.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {batches.map((batch) => (
              <Card key={batch.id} data-testid={`batch-card-${batch.id}`}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-lg">{batch.batchName}</h3>
                      <div className="flex gap-2 text-sm text-muted-foreground">
                        <span>{subjectLabels[batch.subject] || batch.subject}</span>
                        <span>•</span>
                        <span>{batch.caseStudiesCount} spețe</span>
                        {batch.examDay && (
                          <>
                            <span>•</span>
                            <span>{examDayLabels[batch.examDay]}</span>
                          </>
                        )}
                        {batch.sourceLLM && (
                          <>
                            <span>•</span>
                            <span>{batch.sourceLLM}</span>
                          </>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Importat: {new Date(batch.uploadedAt!).toLocaleString('ro-RO')}
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
