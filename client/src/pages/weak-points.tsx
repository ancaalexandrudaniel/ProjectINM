import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  AlertTriangle, 
  TrendingDown, 
  Target, 
  ArrowRight, 
  RefreshCw,
  BookOpen,
  Play
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import type { UserProgress } from "@/types/quiz";

interface WeakPoint {
  subject: string;
  subjectName: string;
  chapter: string;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  accuracy: number;
  priority: 'critical' | 'high' | 'medium';
  lastPracticed?: Date;
}

export default function WeakPoints() {
  const [sortBy, setSortBy] = useState<'accuracy' | 'questions' | 'recent'>('accuracy');

  const { data: progress = [], isLoading } = useQuery<UserProgress[]>({
    queryKey: ['/api/progress'],
  });

  const subjectNames = {
    civil: 'Drept Civil',
    'civil-procedural': 'Drept Procesual Civil',
    penal: 'Drept Penal',
    'penal-procedural': 'Drept Procesual Penal'
  };

  // Identify weak points (accuracy < 70%)
  const getWeakPoints = (): WeakPoint[] => {
    return progress
      .filter(p => p.totalQuestions > 0 && p.accuracy < 70)
      .map(p => {
        const incorrectAnswers = p.totalQuestions - p.correctAnswers;
        let priority: 'critical' | 'high' | 'medium' = 'medium';
        
        if (p.accuracy < 40) priority = 'critical';
        else if (p.accuracy < 60) priority = 'high';
        
        return {
          subject: p.subject,
          subjectName: subjectNames[p.subject as keyof typeof subjectNames] || p.subject,
          chapter: p.chapter,
          totalQuestions: p.totalQuestions,
          correctAnswers: p.correctAnswers,
          incorrectAnswers,
          accuracy: p.accuracy,
          priority,
          lastPracticed: p.lastPracticed ? new Date(p.lastPracticed) : undefined
        };
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'accuracy':
            return a.accuracy - b.accuracy;
          case 'questions':
            return b.incorrectAnswers - a.incorrectAnswers;
          case 'recent':
            if (!a.lastPracticed && !b.lastPracticed) return 0;
            if (!a.lastPracticed) return 1;
            if (!b.lastPracticed) return -1;
            return b.lastPracticed.getTime() - a.lastPracticed.getTime();
          default:
            return a.accuracy - b.accuracy;
        }
      });
  };

  // Get overall weak points stats
  const getWeakPointsStats = () => {
    const weakPoints = getWeakPoints();
    const critical = weakPoints.filter(w => w.priority === 'critical').length;
    const high = weakPoints.filter(w => w.priority === 'high').length;
    const medium = weakPoints.filter(w => w.priority === 'medium').length;
    const totalIncorrect = weakPoints.reduce((sum, w) => sum + w.incorrectAnswers, 0);
    
    return {
      total: weakPoints.length,
      critical,
      high,
      medium,
      totalIncorrect
    };
  };

  // Get subject breakdown
  const getSubjectBreakdown = () => {
    const weakPoints = getWeakPoints();
    const subjects = ['civil', 'civil-procedural', 'penal', 'penal-procedural'];
    
    return subjects.map(subject => {
      const subjectWeakPoints = weakPoints.filter(w => w.subject === subject);
      const totalIncorrect = subjectWeakPoints.reduce((sum, w) => sum + w.incorrectAnswers, 0);
      const averageAccuracy = subjectWeakPoints.length > 0 
        ? Math.round(subjectWeakPoints.reduce((sum, w) => sum + w.accuracy, 0) / subjectWeakPoints.length)
        : 100;
      
      return {
        subject,
        name: subjectNames[subject as keyof typeof subjectNames],
        weakChapters: subjectWeakPoints.length,
        totalIncorrect,
        averageAccuracy,
        mostProblematic: subjectWeakPoints.sort((a, b) => a.accuracy - b.accuracy)[0]
      };
    }).filter(s => s.weakChapters > 0);
  };

  const weakPoints = getWeakPoints();
  const stats = getWeakPointsStats();
  const subjectBreakdown = getSubjectBreakdown();

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'orange';
      case 'medium': return 'yellow';
      default: return 'secondary';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'critical': return 'Critic';
      case 'high': return 'Ridicat';
      case 'medium': return 'Mediu';
      default: return 'Scăzut';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Se analizează punctele slabe...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Analiză Puncte Slabe</h2>
          <p className="text-muted-foreground mt-1">
            Capitole și materii care necesită mai multă atenție
          </p>
        </div>
        <Button variant="outline" onClick={() => window.location.reload()} data-testid="refresh-analysis">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizează
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold" data-testid="total-weak-points">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Puncte Slabe</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-destructive" data-testid="critical-points">{stats.critical}</p>
                <p className="text-sm text-muted-foreground">Critice</p>
              </div>
              <TrendingDown className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-orange-500" data-testid="high-priority-points">{stats.high}</p>
                <p className="text-sm text-muted-foreground">Prioritate Ridicată</p>
              </div>
              <Target className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold" data-testid="total-incorrect">{stats.totalIncorrect}</p>
                <p className="text-sm text-muted-foreground">Răspunsuri Greșite</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                <span className="text-sm font-bold">✗</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* No weak points state */}
      {weakPoints.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Target className="h-16 w-16 text-success mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Felicitări!</h3>
              <p className="text-muted-foreground mb-4">
                Nu ai puncte slabe identificate. Performanța ta este excelentă!
              </p>
              <p className="text-sm text-muted-foreground">
                Continuă să exersezi pentru a menține nivelul ridicat de pregătire.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subject Breakdown */}
      {subjectBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Distribuție pe Materii</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {subjectBreakdown.map((subject) => (
                <div key={subject.subject} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold">{subject.name}</h4>
                    <Badge variant="destructive">
                      {subject.weakChapters} capitol{subject.weakChapters !== 1 ? 'e' : ''}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Acuratețe medie:</span>
                      <span className="font-medium">{subject.averageAccuracy}%</span>
                    </div>
                    <Progress value={subject.averageAccuracy} className="h-2" />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Răspunsuri greșite: {subject.totalIncorrect}</span>
                      {subject.mostProblematic && (
                        <span>Cel mai slab: {subject.mostProblematic.chapter}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sort Controls */}
      {weakPoints.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Sortează după:</span>
          {[
            { key: 'accuracy', label: 'Acuratețe' },
            { key: 'questions', label: 'Număr greșeli' },
            { key: 'recent', label: 'Ultima practică' }
          ].map(sort => (
            <Button
              key={sort.key}
              variant={sortBy === sort.key ? "default" : "outline"}
              size="sm"
              onClick={() => setSortBy(sort.key as any)}
              data-testid={`sort-${sort.key}`}
            >
              {sort.label}
            </Button>
          ))}
        </div>
      )}

      {/* Weak Points List */}
      {weakPoints.length > 0 && (
        <div className="space-y-4">
          {weakPoints.map((point, index) => (
            <Card 
              key={`${point.subject}-${point.chapter}`}
              className={`${
                point.priority === 'critical' ? 'border-destructive/50 bg-destructive/5' :
                point.priority === 'high' ? 'border-orange-500/50 bg-orange-50 dark:bg-orange-950/20' :
                'border-border'
              }`}
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <AlertTriangle className={`h-5 w-5 ${
                        point.priority === 'critical' ? 'text-destructive' :
                        point.priority === 'high' ? 'text-orange-500' :
                        'text-yellow-500'
                      }`} />
                      <h4 className="font-semibold text-lg" data-testid={`weak-point-title-${index}`}>
                        {point.chapter}
                      </h4>
                      <Badge variant={getPriorityColor(point.priority) as any}>
                        {getPriorityLabel(point.priority)}
                      </Badge>
                      <Badge variant="secondary">
                        Acuratețe {point.accuracy}%
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      {point.subjectName} • {point.incorrectAnswers} întrebări greșite din {point.totalQuestions}
                      {point.lastPracticed && (
                        <span> • Ultima practică: {point.lastPracticed.toLocaleDateString('ro-RO')}</span>
                      )}
                    </p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <Link href={`/quiz/${point.subject}?chapter=${encodeURIComponent(point.chapter)}`}>
                        <Button size="sm" data-testid={`practice-chapter-${index}`}>
                          <Play className="h-4 w-4 mr-2" />
                          Exersează Capitol
                        </Button>
                      </Link>
                      <Button variant="outline" size="sm" data-testid={`view-errors-${index}`}>
                        Vezi Greșeli
                      </Button>
                      <Button variant="ghost" size="sm" className="text-primary hover:text-primary" data-testid={`resources-${index}`}>
                        <BookOpen className="h-4 w-4 mr-2" />
                        Resurse bibliografice
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-3xl font-bold ${
                      point.priority === 'critical' ? 'text-destructive' :
                      point.priority === 'high' ? 'text-orange-500' :
                      'text-yellow-500'
                    }`}>
                      {point.accuracy}%
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Rata succes</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Recommendations */}
      {weakPoints.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recomandări pentru Îmbunătățire</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Plan de Studiu Recomandat
                </h4>
                <ul className="text-sm space-y-2 text-muted-foreground">
                  <li>• Dedică 60% din timp punctelor critice</li>
                  <li>• Exersează zilnic capitolele cu sub 50% acuratețe</li>
                  <li>• Revizuiește teoria înainte de teste</li>
                  <li>• Utilizează simulări pentru evaluare</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-success" />
                  Resurse Recomandate
                </h4>
                <ul className="text-sm space-y-2 text-muted-foreground">
                  <li>• Consultă bibliografia oficială INM</li>
                  <li>• Studiază jurisprudența relevantă</li>
                  <li>• Participă la cursuri specializate</li>
                  <li>• Folosește grile din anii anteriori</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
