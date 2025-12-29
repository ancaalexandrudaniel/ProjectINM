import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  ArrowLeft, 
  Upload, 
  FileJson,
  CheckCircle,
  AlertCircle,
  Copy,
  Eye,
  Lightbulb,
  BookOpen,
  Scale,
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { LegalArticleBatch } from "@shared/schema";

const subjectLabels: Record<string, string> = {
  'civil': 'Drept Civil',
  'civil-procedural': 'Drept Procesual Civil',
  'penal': 'Drept Penal',
  'penal-procedural': 'Drept Procesual Penal'
};

const lawSourceLabels: Record<string, string> = {
  'Codul civil': 'Codul Civil',
  'Codul de procedură civilă': 'Codul de Procedură Civilă',
  'Codul penal': 'Codul Penal',
  'Codul de procedură penală': 'Codul de Procedură Penală'
};

const segmentLabels: Record<string, { label: string; color: string }> = {
  'official': { label: 'Text Oficial', color: 'bg-blue-500/20 text-blue-400' },
  'trad': { label: 'Traducere', color: 'bg-green-500/20 text-green-400' },
  'puncte': { label: 'Puncte-Cheie', color: 'bg-yellow-500/20 text-yellow-400' },
  'juris': { label: 'Jurisprudență', color: 'bg-purple-500/20 text-purple-400' },
  'radar': { label: 'Radar Examen', color: 'bg-red-500/20 text-red-400' },
  'logica': { label: 'Logică', color: 'bg-cyan-500/20 text-cyan-400' },
  'conex': { label: 'Conexiuni', color: 'bg-orange-500/20 text-orange-400' }
};

const llmPromptTemplate = `Transformă articolele de lege în format JSON structurat pentru studiu.

Pentru FIECARE articol, creează segmente detaliate:
1. official - Textul oficial al articolului din Cod
2. trad - "Traducere" pe înțelesul studentului
3. puncte - Puncte-cheie și capcane de grilă
4. juris - Jurisprudență relevantă
5. radar - Ce trebuie să știi pentru examen
6. logica - Explicația de bază/raționament
7. conex - Conexiuni cu alte articole

Returnează JSON cu structura:
{
  "meta": {
    "jurisdiction": "Romania",
    "source": "Codul civil (Legea nr. 287/2009) – segment 1166-1170"
  },
  "articles": [
    {
      "article": 1166,
      "title": "Noțiune",
      "segments": {
        "official": "Textul oficial al articolului...",
        "trad": "Explicație pe înțelesul studentului...",
        "puncte": "Capcane de grilă și puncte esențiale...",
        "juris": "Decizii relevante ale instanțelor...",
        "radar": "Ce apare frecvent la examen...",
        "logica": "De ce există această normă...",
        "conex": "Articole înrudite și conexiuni..."
      },
      "raw": "Tot conținutul concatenat (opțional)"
    }
  ]
}`;

const exampleJSON = `{
  "meta": {
    "jurisdiction": "Romania",
    "source": "Codul civil – Art. 1166-1170"
  },
  "articles": [
    {
      "article": 1166,
      "title": "Noțiune",
      "segments": {
        "official": "Contractul este acordul de voinţe dintre două sau mai multe persoane...",
        "trad": "Acest articol definește contractul pe înțelesul legii...",
        "puncte": "Acord de voințe = minim două părți. Intenția juridică este esențială...",
        "juris": "Instanțele au subliniat constant elementele esențiale ale contractului...",
        "radar": "Art. 1166 este o piatră de temelie - memorează definiția mot-à-mot...",
        "logica": "Contractul este expresia juridică a libertății de voință...",
        "conex": "Art. 1165 (izvoare obligații), Art. 1167-1168 (reguli), Art. 1169 (libertate)..."
      }
    }
  ]
}`;

interface ParsedArticle {
  article: number;
  title: string;
  segments: Record<string, string>;
  raw?: string;
  segmentCount: number;
}

interface ValidationResult {
  isValid: boolean;
  articles: ParsedArticle[];
  errors: string[];
  meta?: { jurisdiction?: string; source?: string };
}

function validateJSON(jsonString: string): ValidationResult {
  const errors: string[] = [];
  const articles: ParsedArticle[] = [];

  if (!jsonString.trim()) {
    return { isValid: false, articles: [], errors: [] };
  }

  let parsed: any;
  try {
    parsed = JSON.parse(jsonString);
  } catch (e: any) {
    errors.push(`JSON invalid: ${e.message}`);
    return { isValid: false, articles: [], errors };
  }

  const articlesArray = parsed.articles || (Array.isArray(parsed) ? parsed : [parsed]);

  if (!Array.isArray(articlesArray) || articlesArray.length === 0) {
    errors.push("JSON-ul trebuie să conțină un array 'articles' sau să fie un array de articole");
    return { isValid: false, articles: [], errors };
  }

  for (let i = 0; i < articlesArray.length; i++) {
    const art = articlesArray[i];
    
    if (!art.article || typeof art.article !== 'number') {
      errors.push(`Articolul ${i + 1}: Lipsește câmpul 'article' (numărul articolului)`);
      continue;
    }
    
    if (!art.title || typeof art.title !== 'string') {
      errors.push(`Articolul ${art.article}: Lipsește câmpul 'title'`);
      continue;
    }
    
    if (!art.segments || typeof art.segments !== 'object') {
      errors.push(`Articolul ${art.article}: Lipsește câmpul 'segments'`);
      continue;
    }

    const segmentCount = Object.keys(art.segments).filter(k => 
      typeof art.segments[k] === 'string' && art.segments[k].trim().length > 0
    ).length;

    if (segmentCount === 0) {
      errors.push(`Articolul ${art.article}: Segmentele nu conțin text valid`);
      continue;
    }

    articles.push({
      article: art.article,
      title: art.title,
      segments: art.segments,
      raw: art.raw,
      segmentCount
    });
  }

  return {
    isValid: articles.length > 0 && errors.length === 0,
    articles,
    errors,
    meta: parsed.meta
  };
}

export default function LegalArticlesImport() {
  const [jsonInput, setJsonInput] = useState("");
  const [subject, setSubject] = useState<string>("");
  const [lawSource, setLawSource] = useState<string>("");
  const [sourceLLM, setSourceLLM] = useState<string>("");
  const [batchName, setBatchName] = useState<string>("");
  const [expandedPreview, setExpandedPreview] = useState<number | null>(null);
  const { toast } = useToast();

  const validation = validateJSON(jsonInput);

  const { data: batches = [], isLoading: batchesLoading } = useQuery<LegalArticleBatch[]>({
    queryKey: ['/api/legal-article-batches']
  });

  const importMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/legal-articles/bulk-import', data);
      return await response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Import reușit!",
        description: `${data.importedCount} articole importate (Art. ${data.articleRange})`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/legal-article-batches'] });
      queryClient.invalidateQueries({ queryKey: ['/api/legal-articles'] });
      setJsonInput("");
      setBatchName("");
    },
    onError: (error: any) => {
      toast({
        title: "Eroare la import",
        description: error.message || "A apărut o eroare la importul articolelor",
        variant: "destructive"
      });
    }
  });

  const deleteBatchMutation = useMutation({
    mutationFn: async (batchId: string) => {
      await apiRequest('DELETE', `/api/legal-article-batches/${batchId}`);
    },
    onSuccess: () => {
      toast({ title: "Batch șters cu succes" });
      queryClient.invalidateQueries({ queryKey: ['/api/legal-article-batches'] });
      queryClient.invalidateQueries({ queryKey: ['/api/legal-articles'] });
    }
  });

  const handleImport = () => {
    if (!validation.isValid || !subject) {
      toast({
        title: "Date invalide",
        description: "Verifică JSON-ul și selectează materia",
        variant: "destructive"
      });
      return;
    }

    const parsed = JSON.parse(jsonInput);
    const articlesArray = parsed.articles || (Array.isArray(parsed) ? parsed : [parsed]);

    importMutation.mutate({
      batchName,
      subject,
      lawSource,
      sourceLLM,
      articles: articlesArray,
      meta: parsed.meta
    });
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(llmPromptTemplate);
    toast({ title: "Prompt copiat!", description: "Lipește-l în ChatGPT sau Claude" });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/library">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Scale className="w-6 h-6 text-primary" />
            Import Articole Juridice
          </h1>
          <p className="text-muted-foreground">
            Importă articole de lege cu segmente structurate pentru studiu și RAG
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
                Prompt pentru LLM
              </CardTitle>
              <CardDescription>
                Copiază acest prompt și dă-l lui ChatGPT/Claude după ce discuți articolele
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg text-sm font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                {llmPromptTemplate.substring(0, 400)}...
              </div>
              <Button onClick={copyPrompt} variant="outline" className="w-full" data-testid="button-copy-prompt">
                <Copy className="w-4 h-4 mr-2" />
                Copiază Prompt-ul Complet
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileJson className="w-5 h-5 text-blue-500" />
                Configurare Import
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Materie *</Label>
                  <Select value={subject} onValueChange={setSubject}>
                    <SelectTrigger data-testid="select-subject">
                      <SelectValue placeholder="Selectează..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(subjectLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Sursă Lege</Label>
                  <Select value={lawSource} onValueChange={setLawSource}>
                    <SelectTrigger data-testid="select-law-source">
                      <SelectValue placeholder="Selectează..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(lawSourceLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nume Batch (opțional)</Label>
                  <Input
                    value={batchName}
                    onChange={(e) => setBatchName(e.target.value)}
                    placeholder="Ex: Contracte Art. 1166-1200"
                    data-testid="input-batch-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sursă LLM</Label>
                  <Select value={sourceLLM} onValueChange={setSourceLLM}>
                    <SelectTrigger data-testid="select-source-llm">
                      <SelectValue placeholder="Selectează..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="chatgpt">ChatGPT</SelectItem>
                      <SelectItem value="claude">Claude</SelectItem>
                      <SelectItem value="gemini">Gemini</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>JSON Articole</Label>
                <Textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder="Lipește aici JSON-ul exportat din LLM..."
                  className="font-mono text-sm min-h-[200px]"
                  data-testid="input-json"
                />
              </div>

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Eye className="w-4 h-4 mr-2" />
                    Vezi Exemplu JSON
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Exemplu Format JSON</DialogTitle>
                    <DialogDescription>Structura așteptată pentru articole juridice</DialogDescription>
                  </DialogHeader>
                  <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                    {exampleJSON}
                  </pre>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-cyan-500" />
                  Preview Articole
                </span>
                {validation.articles.length > 0 && (
                  <Badge variant="secondary">
                    {validation.articles.length} articole detectate
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {validation.errors.length > 0 && (
                <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <div className="flex items-center gap-2 text-red-400 font-medium mb-2">
                    <AlertCircle className="w-4 h-4" />
                    Erori de validare
                  </div>
                  <ul className="text-sm text-red-300 space-y-1">
                    {validation.errors.map((err, i) => (
                      <li key={i}>• {err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {validation.articles.length > 0 ? (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {validation.articles.map((art, i) => (
                    <div 
                      key={i} 
                      className="border border-border/50 rounded-lg p-3 hover:bg-muted/30 transition-colors"
                    >
                      <div 
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => setExpandedPreview(expandedPreview === i ? null : i)}
                      >
                        <div className="flex items-center gap-3">
                          <Badge className="bg-primary/20 text-primary">
                            Art. {art.article}
                          </Badge>
                          <span className="font-medium">{art.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {art.segmentCount} segmente
                          </Badge>
                          {expandedPreview === i ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </div>
                      
                      {expandedPreview === i && (
                        <div className="mt-3 pt-3 border-t border-border/30 space-y-2">
                          <div className="flex flex-wrap gap-1">
                            {Object.keys(art.segments).map(seg => {
                              const info = segmentLabels[seg] || { label: seg, color: 'bg-gray-500/20 text-gray-400' };
                              return (
                                <Badge key={seg} className={info.color}>
                                  {info.label}
                                </Badge>
                              );
                            })}
                          </div>
                          {art.segments.official && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {art.segments.official.substring(0, 150)}...
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Lipește JSON-ul pentru a vedea preview-ul articolelor</p>
                </div>
              )}

              {validation.isValid && subject && (
                <Button 
                  className="w-full mt-4" 
                  onClick={handleImport}
                  disabled={importMutation.isPending}
                  data-testid="button-import"
                >
                  {importMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Se importă...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Importă {validation.articles.length} Articole
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-green-500" />
                Batch-uri Importate
              </CardTitle>
            </CardHeader>
            <CardContent>
              {batchesLoading ? (
                <div className="text-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                </div>
              ) : batches.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Niciun batch importat încă
                </p>
              ) : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {batches.map((batch) => (
                    <div 
                      key={batch.id}
                      className="flex items-center justify-between p-3 border border-border/30 rounded-lg hover:bg-muted/20"
                    >
                      <div>
                        <p className="font-medium">{batch.batchName}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="outline">{subjectLabels[batch.subject] || batch.subject}</Badge>
                          <span>•</span>
                          <span>{batch.articlesCount} articole</span>
                          {batch.articleRange && (
                            <>
                              <span>•</span>
                              <span>Art. {batch.articleRange}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-400 hover:text-red-300"
                        onClick={() => deleteBatchMutation.mutate(batch.id)}
                        disabled={deleteBatchMutation.isPending}
                        data-testid={`button-delete-batch-${batch.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
