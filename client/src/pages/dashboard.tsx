import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Vote,
  CheckCircle,
  Clock,
  TrendingDown,
  Timer,
  BookOpen,
  AlertTriangle,
  Scale,
  FileText,
  Shield,
  Gavel,
  TrendingUp,
  Calendar,
  ArrowBigLeft,
  Brain
} from "lucide-react";
import StatsCards from "@/components/dashboard/stats-cards";
import ProgressChart from "@/components/dashboard/progress-chart";
import type { UserProgress, QuizSession } from "@/types/quiz";

export default function Dashboard() {
  const { data: progress = [] } = useQuery<UserProgress[]>({
    queryKey: ['/api/progress'],
  });

  const { data: sessions = [] } = useQuery<QuizSession[]>({
    queryKey: ['/api/sessions'],
  });

  const getOverallStats = () => {
    const totalQuestions = progress.reduce((sum, p) => sum + p.totalQuestions, 0);
    const correctAnswers = progress.reduce((sum, p) => sum + p.correctAnswers, 0);
    const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

    const completedSessions = sessions.filter(s => s.completedAt).length;
    const totalTime = sessions.reduce((sum, s) => sum + (s.timeSpent || 0), 0);
    const weeklyTime = Math.round(totalTime / 3600); // Convert to hours

    return {
      totalTests: completedSessions,
      accuracy,
      studyTime: weeklyTime,
      weakPoints: progress.filter(p => p.accuracy < 60).length
    };
  };

  const stats = getOverallStats();

  const subjects = [
    { id: 'civil', name: 'Drept Civil', icon: Scale },
    { id: 'civil-procedural', name: 'Drept Procesual Civil', icon: FileText },
    { id: 'penal', name: 'Drept Penal', icon: Shield },
    { id: 'penal-procedural', name: 'Drept Procesual Penal', icon: Gavel },
  ];

  const getSubjectStats = (subjectId: string) => {
    const subjectProgress = progress.filter(p => p.subject === subjectId);
    const totalQuestions = subjectProgress.reduce((sum, p) => sum + p.totalQuestions, 0);
    const correctAnswers = subjectProgress.reduce((sum, p) => sum + p.correctAnswers, 0);
    const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

    const lastSession = subjectProgress
      .filter(p => p.lastPracticed)
      .sort((a, b) => new Date(b.lastPracticed!).getTime() - new Date(a.lastPracticed!).getTime())[0];

    return {
      totalQuestions,
      correctAnswers,
      incorrectAnswers: totalQuestions - correctAnswers,
      accuracy,
      lastSession: lastSession?.lastPracticed
    };
  };

  const weakPoints = progress.filter(p => p.accuracy < 60).slice(0, 3);

  return (
    <div className="max-w-[1128px] mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-foreground">Dashboard Pregătire</h2>
        <p className="text-muted-foreground mt-1">Progresul tău pentru Admiterea INM 2025-2026</p>
      </div>

      {/* Stats Cards */}
      <StatsCards
        totalTests={stats.totalTests}
        accuracy={stats.accuracy}
        studyTime={stats.studyTime}
        weakPoints={stats.weakPoints}
      />

      {/* Progress by Subject & Overall Score */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-card border border-border rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold">Progres pe Materii</h3>
            <select className="text-sm border border-border rounded-lg px-3 py-2 bg-background" data-testid="progress-timeframe-select">
              <option>Ultima lună</option>
              <option>Ultimele 3 luni</option>
              <option>Ultimele 6 luni</option>
              <option>Tot timpul</option>
            </select>
          </div>

          <div className="space-y-6">
            {subjects.map((subject) => {
              const Icon = subject.icon;
              const subjectStats = getSubjectStats(subject.id);

              return (
                <div key={subject.id}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-primary" />
                      <span className="font-medium">{subject.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">
                        {subjectStats.totalQuestions} întrebări
                      </span>
                      <span className={`text-sm font-semibold ${subjectStats.accuracy >= 70 ? 'text-success' : 'text-primary'
                        }`}>
                        {subjectStats.accuracy}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${subjectStats.accuracy >= 70 ? 'bg-success' : 'bg-primary'
                        }`}
                      style={{ width: `${subjectStats.accuracy}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span data-testid={`correct-answers-${subject.id}`}>
                        ✓ {subjectStats.correctAnswers} corecte
                      </span>
                      <span data-testid={`incorrect-answers-${subject.id}`}>
                        ✗ {subjectStats.incorrectAnswers} greșite
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Ultima sesiune: {
                        subjectStats.lastSession
                          ? new Date(subjectStats.lastSession).toLocaleDateString('ro-RO')
                          : 'Niciodată'
                      }
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Overall Score Circle */}
        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <h3 className="text-xl font-semibold mb-6">Scor General</h3>
          <div className="flex flex-col items-center justify-center py-8">
            <div className="relative w-48 h-48">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="hsl(var(--secondary))"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="8"
                  strokeDasharray="282.7"
                  strokeDashoffset={282.7 - (282.7 * stats.accuracy / 100)}
                  className="progress-ring"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-primary" data-testid="overall-accuracy">
                  {stats.accuracy}%
                </span>
                <span className="text-sm text-muted-foreground mt-1">Acuratețe</span>
              </div>
            </div>
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground mb-4">Pregătire estimată</p>
              <div className="flex items-center gap-2 bg-secondary px-4 py-2 rounded-lg">
                <TrendingUp className="h-4 w-4 text-accent" />
                <span className="font-semibold">
                  {stats.accuracy >= 80 ? 'Nivel Avansat' : stats.accuracy >= 60 ? 'Nivel Mediu-Avansat' : 'Nivel Începător'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-gradient-to-br from-primary to-accent rounded-lg p-6 text-primary-foreground shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <Timer className="h-8 w-8" />
            <h3 className="text-xl font-semibold">Simulare Examen</h3>
          </div>
          <p className="mb-6 text-primary-foreground/90">
            Testează-te în condiții reale de examen cu cronometru și notare automată
          </p>
          <Link href="/simulation">
            <button className="bg-white text-primary px-6 py-2.5 rounded-lg font-medium hover:bg-white/90 transition-colors w-full" data-testid="start-simulation-button">
              Începe Simulare
            </button>
          </Link>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="h-8 w-8 text-success" />
            <h3 className="text-xl font-semibold">Bibliotecă</h3>
          </div>
          <p className="mb-6 text-muted-foreground">
            Accesează tematica și resursele bibliografice oficiale INM 2025
          </p>
          <Link href="/library">
            <button className="bg-secondary text-foreground px-6 py-2.5 rounded-lg font-medium hover:bg-secondary/80 transition-colors w-full" data-testid="open-library-button">
              Deschide Biblioteca
            </button>
          </Link>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <h3 className="text-xl font-semibold">Puncte Slabe</h3>
          </div>
          <p className="mb-6 text-muted-foreground">
            Identifică și exersează capitolele unde ai cele mai multe greșeli
          </p>
          <Link href="/weak-points">
            <button className="bg-secondary text-foreground px-6 py-2.5 rounded-lg font-medium hover:bg-secondary/80 transition-colors w-full" data-testid="analyze-weak-points-button">
              Analizează Puncte Slabe
            </button>
          </Link>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <Brain className="h-8 w-8 text-purple-500" />
            <h3 className="text-xl font-semibold">Revizuire SRS</h3>
          </div>
          <p className="mb-6 text-muted-foreground">
            Consolidează cunoștințele cu repetarea spațiată a întrebărilor dificile
          </p>
          <Link href="/srs-review">
            <button className="bg-purple-500 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-purple-600 transition-colors w-full" data-testid="start-srs-review-button">
              Începe Revizuirea
            </button>
          </Link>
        </div>
      </div>

      {/* Weak Points Preview */}
      {weakPoints.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold">Puncte Slabe Recente</h3>
            <Link href="/weak-points">
              <button className="text-sm text-primary hover:underline" data-testid="view-all-weak-points">
                Vezi toate →
              </button>
            </Link>
          </div>

          <div className="space-y-4">
            {weakPoints.map((point) => (
              <div key={`${point.subject}-${point.chapter}`} className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <h4 className="font-medium">{point.chapter}</h4>
                      <span className="text-xs bg-destructive/10 text-destructive px-2 py-1 rounded-full font-medium">
                        Acuratețe {point.accuracy}%
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {point.subject === 'civil' && 'Drept Civil'} •{' '}
                      {point.totalQuestions - point.correctAnswers} întrebări greșite din {point.totalQuestions}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-destructive">{point.accuracy}%</div>
                    <div className="text-xs text-muted-foreground">Rata succes</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Call to Action Banner */}
      <div className="bg-gradient-to-r from-primary to-accent rounded-lg p-8 text-primary-foreground">
        <div className="max-w-3xl">
          <h3 className="text-2xl font-bold mb-3">Pregătește-te Eficient pentru INM 2025!</h3>
          <p className="text-primary-foreground/90 mb-6">
            Folosește platforma noastră AI pentru a identifica punctele slabe, exersa cu teste interactive și a urmări progresul în timp real. Peste 250 de locuri disponibile pentru auditori de justiție.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/quiz">
              <button className="bg-white text-primary px-6 py-3 rounded-lg font-semibold hover:bg-white/90 transition-colors flex items-center gap-2" data-testid="start-quiz-cta">
                <ArrowBigLeft className="h-5 w-5" />
                <span>Începe Test Grilă</span>
              </button>
            </Link>
            <button className="bg-primary-foreground/20 text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:bg-primary-foreground/30 transition-colors flex items-center gap-2" data-testid="view-calendar-cta">
              <Calendar className="h-5 w-5" />
              <span>Vezi Calendar Examen</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
