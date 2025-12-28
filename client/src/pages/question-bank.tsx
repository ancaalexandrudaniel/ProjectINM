import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  ArrowLeft, 
  Search,
  Filter,
  FileText,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import type { Question } from "@shared/schema";

const subjectLabels: Record<string, string> = {
  'civil': 'Drept Civil',
  'civil-procedural': 'Drept Procesual Civil',
  'penal': 'Drept Penal',
  'penal-procedural': 'Drept Procesual Penal'
};

const difficultyLabels: Record<string, string> = {
  'easy': 'Ușor',
  'medium': 'Mediu',
  'hard': 'Dificil'
};

const sourceLabels: Record<string, string> = {
  'llm-session': 'LLM',
  'manual': 'Manual',
  'exam-past': 'Examen'
};

export default function QuestionBank() {
  const [subject, setSubject] = useState<string>('');
  const [difficulty, setDifficulty] = useState<string>('');
  const [keyword, setKeyword] = useState('');
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (subject) params.append('subject', subject);
    if (difficulty) params.append('difficulty', difficulty);
    if (keyword) params.append('keyword', keyword);
    params.append('limit', '100');
    return params.toString();
  };

  const { data: questions = [], isLoading, refetch } = useQuery<Question[]>({
    queryKey: ['/api/questions/search', subject, difficulty, keyword],
    queryFn: async () => {
      const response = await fetch(`/api/questions/search?${buildQueryString()}`);
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    },
  });

  const handleSearch = () => {
    refetch();
  };

  const clearFilters = () => {
    setSubject('');
    setDifficulty('');
    setKeyword('');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon" data-testid="back-home">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Search className="h-8 w-8" />
            Bancă de Întrebări
          </h1>
          <p className="text-muted-foreground">
            Caută și explorează toate întrebările din baza de date
          </p>
        </div>
      </div>

      {/* Search Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtre de Căutare
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                placeholder="Caută în text..."
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

      {/* Results */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">
            Rezultate ({questions.length} întrebări)
          </h2>
        </div>
        
        {isLoading ? (
          <p className="text-muted-foreground">Se caută...</p>
        ) : questions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                Nicio întrebare găsită. Ajustează filtrele sau importă întrebări noi.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {questions.map((question, index) => (
              <Card key={question.id} data-testid={`question-card-${question.id}`}>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex gap-2 mb-2">
                          <Badge variant="outline">
                            {subjectLabels[question.subject] || question.subject}
                          </Badge>
                          <Badge variant="secondary">
                            {question.chapter}
                          </Badge>
                          <Badge 
                            variant={
                              question.difficulty === 'easy' ? 'default' :
                              question.difficulty === 'hard' ? 'destructive' : 'secondary'
                            }
                          >
                            {difficultyLabels[question.difficulty] || question.difficulty}
                          </Badge>
                          {question.sourceType && (
                            <Badge variant="outline" className="text-xs">
                              {sourceLabels[question.sourceType] || question.sourceType}
                            </Badge>
                          )}
                        </div>
                        <p className="font-medium text-lg">{question.questionText}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedQuestion(
                          expandedQuestion === question.id ? null : question.id
                        )}
                      >
                        {expandedQuestion === question.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    {expandedQuestion === question.id && (
                      <div className="space-y-4 pt-4 border-t">
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">Variante:</p>
                          {(question.options as any[])?.map((opt, i) => (
                            <div 
                              key={i} 
                              className={`flex items-center gap-2 p-2 rounded ${
                                i === question.correctAnswer 
                                  ? 'bg-green-500/10 border border-green-500/30' 
                                  : 'bg-muted/50'
                              }`}
                            >
                              {i === question.correctAnswer ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span className={i === question.correctAnswer ? 'font-medium' : ''}>
                                {opt.text}
                              </span>
                            </div>
                          ))}
                        </div>

                        {question.explanation && (
                          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                            <p className="text-sm font-medium text-blue-500 mb-1">Explicație:</p>
                            <p className="text-sm">{question.explanation}</p>
                          </div>
                        )}

                        {question.aiFeedback && (
                          <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                            <p className="text-sm font-medium text-purple-500 mb-1">Feedback AI:</p>
                            <p className="text-sm whitespace-pre-wrap">{question.aiFeedback}</p>
                          </div>
                        )}

                        {question.legalReferences && (question.legalReferences as string[]).length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            <span className="text-sm text-muted-foreground">Referințe:</span>
                            {(question.legalReferences as string[]).map((ref, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {ref}
                              </Badge>
                            ))}
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
