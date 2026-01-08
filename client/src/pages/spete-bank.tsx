import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ArrowLeft,
  Search,
  Filter,
  FileText,
  ChevronDown,
  ChevronUp,
  Clock,
  BookOpen,
  PenTool
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CaseStudy } from "@shared/schema";

const subjectLabels: Record<string, string> = {
  'civil': 'Drept Civil',
  'civil-procedural': 'Drept Procesual Civil',
  'penal': 'Drept Penal',
  'penal-procedural': 'Drept Procesual Penal'
};

const examDayLabels: Record<string, string> = {
  'day1': 'Ziua 1',
  'day2': 'Ziua 2'
};

const difficultyLabels: Record<string, string> = {
  'easy': 'Ușor',
  'medium': 'Mediu',
  'hard': 'Dificil'
};

export default function SpeteBank() {
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const initialExamDay = searchParams.get('examDay') || '';

  const [subject, setSubject] = useState<string>('');
  const [examDay, setExamDay] = useState<string>(initialExamDay);
  const [difficulty, setDifficulty] = useState<string>('');
  const [keyword, setKeyword] = useState('');
  const [expandedCaseStudy, setExpandedCaseStudy] = useState<string | null>(null);

  const buildQueryKey = () => {
    const params: Record<string, string> = {};
    if (subject && subject !== 'all') params.subject = subject;
    if (examDay && examDay !== 'all') params.examDay = examDay;
    if (difficulty && difficulty !== 'all') params.difficulty = difficulty;
    if (keyword && keyword.trim() !== '') params.keyword = keyword.trim();
    params.limit = '50';
    return params;
  };

  const queryParams = buildQueryKey();
  const queryString = new URLSearchParams(queryParams).toString();

  const { data: caseStudies = [], isLoading, isError, refetch } = useQuery<CaseStudy[]>({
    queryKey: ['/api/case-studies/search', queryParams],
    queryFn: async () => {
      const response = await fetch(`/api/case-studies/search?${queryString}`);
      if (!response.ok) throw new Error('Failed to fetch case studies');
      return response.json();
    },
  });

  const handleSearch = () => {
    refetch();
  };

  const clearFilters = () => {
    setSubject('');
    setExamDay('');
    setDifficulty('');
    setKeyword('');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon" data-testid="back-home">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <PenTool className="h-8 w-8" />
            Bancă de Spețe
          </h1>
          <p className="text-muted-foreground">
            Caută și explorează spețele pentru proba scrisă
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtre de Căutare
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Materie</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger data-testid="filter-subject">
                  <SelectValue placeholder="Toate materiile" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate materiile</SelectItem>
                  {Object.entries(subjectLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Ziua Examen</Label>
              <Select value={examDay} onValueChange={setExamDay}>
                <SelectTrigger data-testid="filter-exam-day">
                  <SelectValue placeholder="Toate zilele" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate zilele</SelectItem>
                  {Object.entries(examDayLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Dificultate</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger data-testid="filter-difficulty">
                  <SelectValue placeholder="Toate nivelurile" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate nivelurile</SelectItem>
                  {Object.entries(difficultyLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Cuvânt cheie</Label>
              <Input
                placeholder="Caută în spețe..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                data-testid="filter-keyword"
              />
            </div>

            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <div className="flex gap-2">
                <Button onClick={handleSearch} className="flex-1" data-testid="button-search">
                  <Search className="h-4 w-4 mr-2" />
                  Caută
                </Button>
                <Button variant="outline" onClick={clearFilters} data-testid="button-clear">
                  Șterge
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">
            Rezultate ({caseStudies.length} spețe)
          </h2>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Se caută...</p>
        ) : caseStudies.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                Nicio speță găsită. Ajustează filtrele sau importă spețe noi.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {caseStudies.map((cs) => (
              <Card key={cs.id} data-testid={`case-study-card-${cs.id}`}>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex gap-2 mb-2 flex-wrap">
                          <Badge variant="outline">
                            {subjectLabels[cs.subject] || cs.subject}
                          </Badge>
                          {cs.examDay && (
                            <Badge variant="secondary">
                              {examDayLabels[cs.examDay]}
                            </Badge>
                          )}
                          <Badge
                            variant={
                              cs.difficulty === 'easy' ? 'default' :
                                cs.difficulty === 'hard' ? 'destructive' : 'secondary'
                            }
                          >
                            {difficultyLabels[cs.difficulty] || cs.difficulty}
                          </Badge>
                          {cs.estimatedTime && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {cs.estimatedTime} min
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-semibold text-lg">{cs.title}</h3>
                        <p className="text-muted-foreground mt-2 line-clamp-3">
                          {cs.scenario}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedCaseStudy(
                          expandedCaseStudy === cs.id ? null : cs.id
                        )}
                      >
                        {expandedCaseStudy === cs.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                      <Link href={`/solve-case/${cs.id}`}>
                        <Button size="sm" className="ml-2 gap-1 bg-primary/90 hover:bg-primary">
                          <PenTool className="h-3 w-3" />
                          Rezolvă
                        </Button>
                      </Link>
                    </div>

                    {expandedCaseStudy === cs.id && (
                      <div className="space-y-4 pt-4 border-t">
                        <div className="p-4 bg-muted/50 rounded-lg">
                          <p className="text-sm font-medium mb-2">Scenariul complet:</p>
                          <p className="text-sm whitespace-pre-wrap">{cs.scenario}</p>
                        </div>

                        {cs.questions && Array.isArray(cs.questions) && cs.questions.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Cerințe/Întrebări:</p>
                            <ul className="list-decimal pl-5 space-y-1">
                              {(cs.questions as string[]).map((q: string, i: number) => (
                                <li key={i} className="text-sm">{q}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {cs.referenceArticles && Array.isArray(cs.referenceArticles) && cs.referenceArticles.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            <span className="text-sm text-muted-foreground">Articole relevante:</span>
                            {(cs.referenceArticles as string[]).map((ref: string, i: number) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {ref}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {cs.sampleAnswer && (
                          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                            <p className="text-sm font-medium text-green-500 mb-2 flex items-center gap-2">
                              <BookOpen className="h-4 w-4" />
                              Model de Rezolvare:
                            </p>
                            <p className="text-sm whitespace-pre-wrap">{cs.sampleAnswer}</p>
                          </div>
                        )}

                        {cs.modelEvaluation && (
                          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                            <p className="text-sm font-medium text-blue-500 mb-2">Criterii de Evaluare:</p>
                            <p className="text-sm whitespace-pre-wrap">{cs.modelEvaluation}</p>
                          </div>
                        )}

                        {cs.aiFeedback && (
                          <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                            <p className="text-sm font-medium text-purple-500 mb-2">Feedback AI:</p>
                            <p className="text-sm whitespace-pre-wrap">{cs.aiFeedback}</p>
                          </div>
                        )}
                      </div>
                    )}
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
