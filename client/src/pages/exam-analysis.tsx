import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, AlertCircle, BookOpen } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

type UploadedDocument = {
  id: string;
  fileName: string;
  documentType: string;
  subject: string;
  uploadedAt: string;
};

type ExamAnalysis = {
  topChapters: Array<{
    chapter: string;
    frequency: number;
    importance: "critical" | "important" | "moderate";
    articles: string[];
  }>;
  recurringTopics: string[];
  recommendations: string[];
};

export default function ExamAnalysisPage() {
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("civil");
  
  // Fetch all uploaded exam documents (subiecte anterioare)
  const { data: documents = [], isLoading: docsLoading } = useQuery<UploadedDocument[]>({
    queryKey: ["/api/documents"]
  });
  
  const examDocs = documents.filter(doc => doc.documentType === "subiecte_anterioare");
  
  // Analyze exam patterns mutation
  const analyzePatterns = useMutation({
    mutationFn: async () => {
      return await apiRequest<ExamAnalysis>("POST", "/api/documents/analyze-patterns", {
        documentIds: selectedDocs,
        subject: selectedSubject === "civil" ? "Drept Civil" : 
                 selectedSubject === "procesual_civil" ? "Drept Procesual Civil" :
                 selectedSubject === "penal" ? "Drept Penal" : "Drept Procesual Penal"
      });
    }
  });
  
  const handleToggleDoc = (docId: string) => {
    setSelectedDocs(prev => 
      prev.includes(docId) 
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };
  
  const handleAnalyze = () => {
    if (selectedDocs.length > 0) {
      analyzePatterns.mutate();
    }
  };
  
  const getImportanceBadgeColor = (importance: string) => {
    switch (importance) {
      case "critical": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "important": return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      case "moderate": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400";
    }
  };
  
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <TrendingUp className="w-8 h-8 text-purple-600" />
          <h1 className="text-3xl font-bold">Analiză Subiecte Anterioare</h1>
        </div>
        <p className="text-muted-foreground">
          AI identifică pattern-uri din subiecte 2019-2024 și prioritizează capitolele importante
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Document Selection */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Selectează Subiecte Anterioare</CardTitle>
            <CardDescription>Bifează PDF-urile pentru analiză</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Materie</label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger data-testid="select-subject">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="civil">Drept Civil</SelectItem>
                  <SelectItem value="procesual_civil">Drept Procesual Civil</SelectItem>
                  <SelectItem value="penal">Drept Penal</SelectItem>
                  <SelectItem value="procesual_penal">Drept Procesual Penal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-3">
              <p className="text-sm font-medium">Documente disponibile</p>
              {docsLoading ? (
                <p className="text-sm text-muted-foreground">Se încarcă...</p>
              ) : examDocs.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Niciun subiect anterior găsit.
                    <br />
                    Încarcă PDF-uri în secțiunea Documente.
                  </p>
                </div>
              ) : (
                examDocs.map(doc => (
                  <div key={doc.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <Checkbox
                      id={`doc-${doc.id}`}
                      checked={selectedDocs.includes(doc.id)}
                      onCheckedChange={() => handleToggleDoc(doc.id)}
                      data-testid={`checkbox-doc-${doc.id}`}
                    />
                    <label
                      htmlFor={`doc-${doc.id}`}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {doc.fileName}
                    </label>
                  </div>
                ))
              )}
            </div>
            
            <Button 
              onClick={handleAnalyze} 
              disabled={selectedDocs.length === 0 || analyzePatterns.isPending}
              className="w-full"
              data-testid="button-analyze"
            >
              {analyzePatterns.isPending ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                  AI analizează...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Analizează cu AI
                </>
              )}
            </Button>
          </CardContent>
        </Card>
        
        {/* Right: Analysis Results */}
        <div className="lg:col-span-2 space-y-6">
          {analyzePatterns.data ? (
            <>
              {/* Top Chapters */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                    Capitole Prioritare
                  </CardTitle>
                  <CardDescription>
                    Cele mai frecvente capitole în examenele anterioare
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4" data-testid="list-top-chapters">
                    {analyzePatterns.data.topChapters.length > 0 ? (
                      analyzePatterns.data.topChapters.map((chapter, index) => (
                        <div key={index} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-semibold text-lg">{chapter.chapter}</h3>
                            <Badge className={getImportanceBadgeColor(chapter.importance)}>
                              {chapter.importance === "critical" ? "Critic" :
                               chapter.importance === "important" ? "Important" : "Moderat"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            Apare de {chapter.frequency} ori
                          </p>
                          {chapter.articles.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {chapter.articles.map((article, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {article}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">Niciun capitol identificat.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {/* Recurring Topics */}
              {analyzePatterns.data.recurringTopics.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-blue-600" />
                      Teme Recurente
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2" data-testid="list-recurring-topics">
                      {analyzePatterns.data.recurringTopics.map((topic, index) => (
                        <Badge key={index} variant="secondary" className="px-3 py-1">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Recommendations */}
              {analyzePatterns.data.recommendations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-purple-600" />
                      Recomandări Studiu
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2" data-testid="list-recommendations">
                      {analyzePatterns.data.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-purple-600 mt-1">•</span>
                          <span className="text-sm">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card className="bg-muted/50">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <TrendingUp className="w-16 h-16 text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold mb-2">Nicio analiză încă</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  Selectează subiecte anterioare și apasă "Analizează cu AI" pentru a identifica
                  pattern-urile din examenele 2019-2024
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
