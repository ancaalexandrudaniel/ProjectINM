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
  ArrowRight,
  Brain,
  Flame,
  Target,
  Zap,
  Play,
  BarChart3,
  Sparkles,
  Trophy,
  Rocket,
  GraduationCap
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import StatsCards from "@/components/dashboard/stats-cards";
import type { UserProgress, QuizSession } from "@/types/quiz";

// Level thresholds (mirrors server)
const LEVEL_THRESHOLDS = [0, 0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500, 7500, 10000];
function getNextLevelXp(level: number): number {
  return level < LEVEL_THRESHOLDS.length - 1 ? LEVEL_THRESHOLDS[level + 1] : LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
}
function getCurrentLevelXp(level: number): number {
  return level > 0 && level < LEVEL_THRESHOLDS.length ? LEVEL_THRESHOLDS[level] : 0;
}

// Exam date constant - INM 2025
const EXAM_DATE = new Date('2025-09-20');

export default function Dashboard() {
  const { data: progress = [] } = useQuery<UserProgress[]>({
    queryKey: ['/api/progress'],
  });

  const { data: sessions = [] } = useQuery<QuizSession[]>({
    queryKey: ['/api/sessions'],
  });

  const { data: dueCards = { dueCount: 0 } } = useQuery<{ dueCount: number }>({
    queryKey: ['/api/srs/due-count'],
  });

  const { data: roadmapData } = useQuery<{
    nodes: Array<{ status: string }>;
    stats: {
      currentXp: number;
      currentLevel: number;
      currentStreak: number;
      longestStreak: number;
      unlockedBadges: string[] | null;
    } | null;
  }>({
    queryKey: ['/api/roadmap'],
  });

  // Calculate days until exam
  const getDaysUntilExam = () => {
    const today = new Date();
    const diffTime = EXAM_DATE.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  // Get overall stats
  const getOverallStats = () => {
    const totalQuestions = progress.reduce((sum, p) => sum + p.totalQuestions, 0);
    const correctAnswers = progress.reduce((sum, p) => sum + p.correctAnswers, 0);
    const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    const completedSessions = sessions.filter(s => s.completedAt).length;
    const totalTime = sessions.reduce((sum, s) => sum + (s.timeSpent || 0), 0);

    return {
      totalTests: completedSessions,
      accuracy,
      studyTime: Math.round(totalTime / 3600),
      weakPoints: progress.filter(p => p.accuracy < 60).length,
      totalQuestions
    };
  };

  // Get last incomplete session for "pick up where you left off"
  const getLastSession = () => {
    const sortedSessions = [...sessions]
      .filter(s => s.completedAt)
      .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());

    return sortedSessions[0] || null;
  };

  // Calculate study streak (consecutive days)
  const getStudyStreak = () => {
    if (sessions.length === 0) return 0;

    const sortedDates = Array.from(new Set(
      sessions
        .filter(s => s.completedAt)
        .map(s => new Date(s.completedAt!).toDateString())
    )).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    if (sortedDates.length === 0) return 0;

    let streak = 0;
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    // Check if studied today or yesterday
    if (sortedDates[0] !== today && sortedDates[0] !== yesterday) {
      return 0;
    }

    for (let i = 0; i < sortedDates.length - 1; i++) {
      const current = new Date(sortedDates[i]);
      const next = new Date(sortedDates[i + 1]);
      const diffDays = Math.round((current.getTime() - next.getTime()) / 86400000);

      if (diffDays === 1) {
        streak++;
      } else {
        break;
      }
    }

    return streak + 1;
  };

  const stats = getOverallStats();
  const lastSession = getLastSession();
  const daysLeft = getDaysUntilExam();
  const studyStreak = getStudyStreak();

  const subjects = [
    { id: 'civil', name: 'Drept Civil', icon: Scale, color: 'bg-blue-500' },
    { id: 'civil-procedural', name: 'Drept Procesual Civil', icon: FileText, color: 'bg-green-500' },
    { id: 'penal', name: 'Drept Penal', icon: Shield, color: 'bg-red-500' },
    { id: 'penal-procedural', name: 'Drept Procesual Penal', icon: Gavel, color: 'bg-purple-500' },
  ];

  const getSubjectStats = (subjectId: string) => {
    const subjectProgress = progress.filter(p => p.subject === subjectId);
    const totalQuestions = subjectProgress.reduce((sum, p) => sum + p.totalQuestions, 0);
    const correctAnswers = subjectProgress.reduce((sum, p) => sum + p.correctAnswers, 0);
    const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    return { totalQuestions, accuracy };
  };

  const weakPoints = progress.filter(p => p.accuracy < 60).slice(0, 3);

  return (
    <div className="max-w-[1200px] mx-auto p-6 space-y-6">
      {/* Hero Section: Welcome + Countdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Welcome Card with Pick Up Where You Left Off */}
        <div className="lg:col-span-2">
          <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-0 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent" />
            <CardContent className="pt-6 relative z-10">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-5 w-5 text-yellow-400" />
                    <span className="text-sm text-slate-300">Bun venit înapoi!</span>
                  </div>
                  <h1 className="text-2xl font-bold mb-2">
                    Pregătirea ta pentru INM 2025
                  </h1>
                  <p className="text-slate-300 mb-6">
                    {stats.totalQuestions > 0
                      ? `Ai răspuns la ${stats.totalQuestions} întrebări cu o acuratețe de ${stats.accuracy}%.`
                      : 'Începe-ți călătoria către magistratură astăzi!'}
                  </p>

                  {/* Pick Up Where You Left Off */}
                  {lastSession ? (
                    <div className="bg-white/10 backdrop-blur rounded-lg p-4 mb-4">
                      <div className="flex items-center gap-3 mb-2">
                        <Play className="h-5 w-5 text-green-400" />
                        <span className="font-medium">Continuă de unde ai rămas</span>
                      </div>
                      <p className="text-sm text-slate-300 mb-3">
                        Ultima sesiune: {lastSession.subject === 'civil' ? 'Drept Civil' :
                          lastSession.subject === 'penal' ? 'Drept Penal' :
                            lastSession.subject === 'civil-procedural' ? 'Drept Procesual Civil' :
                              lastSession.subject === 'penal-procedural' ? 'Drept Procesual Penal' :
                                'Test mixt'}
                        {' • '}
                        {new Date(lastSession.completedAt!).toLocaleDateString('ro-RO')}
                      </p>
                      <div className="flex gap-3">
                        <Link href={lastSession.subject ? `/quiz/${lastSession.subject}` : '/quiz-select'}>
                          <Button size="sm" className="bg-white text-slate-900 hover:bg-slate-100">
                            <Play className="h-4 w-4 mr-2" />
                            Continuă
                          </Button>
                        </Link>
                        <Link href="/quiz-select">
                          <Button size="sm" variant="outline" className="border-white/30 text-white hover:bg-white/10">
                            Alege altceva
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <Link href="/quiz-select">
                      <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100">
                        <Rocket className="h-5 w-5 mr-2" />
                        Începe Primul Test
                      </Button>
                    </Link>
                  )}
                </div>

                {/* Study Streak Badge */}
                <div className="hidden md:flex flex-col items-center gap-2 bg-white/10 backdrop-blur rounded-xl p-4">
                  <Flame className={`h-10 w-10 ${studyStreak > 0 ? 'text-orange-400' : 'text-slate-500'}`} />
                  <span className="text-3xl font-bold">{studyStreak}</span>
                  <span className="text-xs text-slate-300">zile streak</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Exam Countdown */}
        <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-0">
          <CardContent className="pt-6 flex flex-col items-center justify-center h-full">
            <GraduationCap className="h-12 w-12 mb-4 opacity-80" />
            <div className="text-6xl font-bold mb-2">{daysLeft}</div>
            <div className="text-lg opacity-90">zile până la examen</div>
            <div className="text-sm opacity-75 mt-2">20 Septembrie 2025</div>

            <div className="mt-6 w-full">
              <div className="flex justify-between text-sm mb-2">
                <span>Progres general</span>
                <span>{stats.accuracy}%</span>
              </div>
              <Progress value={stats.accuracy} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
              <BarChart3 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalTests}</p>
              <p className="text-sm text-muted-foreground">Teste completate</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
              <Target className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.accuracy}%</p>
              <p className="text-sm text-muted-foreground">Acuratețe medie</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30">
              <Brain className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{dueCards.dueCount}</p>
              <p className="text-sm text-muted-foreground">Carduri SRS due</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-orange-100 dark:bg-orange-900/30">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.weakPoints}</p>
              <p className="text-sm text-muted-foreground">Puncte slabe</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Roadmap Gamification Widget */}
      {roadmapData?.stats && (() => {
        const gs = roadmapData.stats!;
        const level = gs.currentLevel || 1;
        const xp = gs.currentXp || 0;
        const currentLevelStart = getCurrentLevelXp(level);
        const nextLevel = getNextLevelXp(level);
        const xpInLevel = xp - currentLevelStart;
        const xpNeeded = nextLevel - currentLevelStart;
        const xpPercent = xpNeeded > 0 ? Math.min(100, Math.round((xpInLevel / xpNeeded) * 100)) : 100;
        const totalNodes = roadmapData.nodes?.length || 0;
        const completedNodes = roadmapData.nodes?.filter(n => n.status === "COMPLETED" || n.status === "MASTERED").length || 0;
        const masteredNodes = roadmapData.nodes?.filter(n => n.status === "MASTERED").length || 0;
        const badges = gs.unlockedBadges || [];

        return (
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Progres Roadmap
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Level + XP */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="bg-primary text-primary-foreground rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg">
                      {level}
                    </div>
                    <div>
                      <p className="text-sm font-medium">Nivel {level}</p>
                      <p className="text-xs text-muted-foreground">{xp.toLocaleString()} XP</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{xpInLevel} / {xpNeeded} XP</span>
                      <span>{xpPercent}%</span>
                    </div>
                    <Progress value={xpPercent} className="h-2" />
                  </div>
                </div>

                {/* Streak */}
                <div className="flex flex-col items-center justify-center">
                  <Flame className={`h-8 w-8 ${(gs.currentStreak || 0) > 0 ? 'text-orange-500' : 'text-slate-300'}`} />
                  <span className="text-2xl font-bold">{gs.currentStreak || 0}</span>
                  <span className="text-xs text-muted-foreground">zile streak</span>
                  {(gs.longestStreak || 0) > 0 && (
                    <span className="text-xs text-muted-foreground">record: {gs.longestStreak}</span>
                  )}
                </div>

                {/* Nodes Completed */}
                <div className="flex flex-col items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                  <span className="text-2xl font-bold">{completedNodes}</span>
                  <span className="text-xs text-muted-foreground">din {totalNodes} noduri</span>
                  {masteredNodes > 0 && (
                    <span className="text-xs text-yellow-600">{masteredNodes} mastered</span>
                  )}
                </div>

                {/* Badges */}
                <div className="flex flex-col items-center justify-center">
                  <Sparkles className="h-8 w-8 text-purple-500" />
                  <span className="text-2xl font-bold">{badges.length}</span>
                  <span className="text-xs text-muted-foreground">badge-uri</span>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <Link href="/roadmap">
                  <Button variant="outline" size="sm">
                    Deschide Roadmap
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Progress by Subject */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Progres pe Materii
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {subjects.map((subject) => {
              const subjectStats = getSubjectStats(subject.id);
              const Icon = subject.icon;

              return (
                <div key={subject.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded ${subject.color}`}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      <span className="font-medium text-sm">{subject.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {subjectStats.totalQuestions} întrebări
                      </Badge>
                      <span className={`font-semibold ${subjectStats.accuracy >= 70 ? 'text-green-600' : subjectStats.accuracy >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {subjectStats.accuracy}%
                      </span>
                    </div>
                  </div>
                  <Progress
                    value={subjectStats.accuracy}
                    className="h-2"
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Acțiuni Rapide
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Link href="/simulation">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2 hover:bg-primary hover:text-primary-foreground transition-all">
                <Timer className="h-6 w-6" />
                <span className="font-medium">Simulare Examen</span>
                <span className="text-xs text-muted-foreground">100 întrebări • 4h</span>
              </Button>
            </Link>

            <Link href="/srs-review">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2 hover:bg-purple-500 hover:text-white transition-all">
                <Brain className="h-6 w-6" />
                <span className="font-medium">Revizuire SRS</span>
                <span className="text-xs text-muted-foreground">{dueCards.dueCount} carduri due</span>
              </Button>
            </Link>

            <Link href="/syllabus">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2 hover:bg-blue-500 hover:text-white transition-all">
                <BookOpen className="h-6 w-6" />
                <span className="font-medium">Tematică</span>
                <span className="text-xs text-muted-foreground">Syllabus 2025</span>
              </Button>
            </Link>

            <Link href="/essay">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2 hover:bg-green-500 hover:text-white transition-all">
                <FileText className="h-6 w-6" />
                <span className="font-medium">Probe Scrise</span>
                <span className="text-xs text-muted-foreground">Spețe AI</span>
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Weak Points Alert */}
      {weakPoints.length > 0 && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
              <AlertTriangle className="h-5 w-5" />
              Puncte Slabe Identificate
            </CardTitle>
            <CardDescription>
              Aceste capitole necesită mai multă atenție
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {weakPoints.map((point) => (
                <div
                  key={`${point.subject}-${point.chapter}`}
                  className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-orange-200 dark:border-orange-800"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="destructive" className="text-xs">
                      {point.accuracy}% acuratețe
                    </Badge>
                  </div>
                  <h4 className="font-medium text-sm line-clamp-2">{point.chapter}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {point.totalQuestions - point.correctAnswers} greșite din {point.totalQuestions}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <Link href="/weak-points">
                <Button variant="outline" size="sm" className="text-orange-700 border-orange-300 hover:bg-orange-100">
                  Vezi toate punctele slabe
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Motivational Banner */}
      <Card className="bg-gradient-to-r from-slate-900 to-slate-800 text-white border-0">
        <CardContent className="py-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="h-6 w-6 text-yellow-400" />
                <span className="text-yellow-400 font-medium">Obiectiv INM 2025</span>
              </div>
              <h3 className="text-xl font-bold mb-2">
                {daysLeft > 200
                  ? 'Ai timp să construiești o fundație solidă!'
                  : daysLeft > 100
                    ? 'E momentul să intensifici pregătirea!'
                    : 'Concentrează-te pe simulări și revizuiri!'}
              </h3>
              <p className="text-slate-300">
                Consistența bate intensitatea. Studiază puțin în fiecare zi.
              </p>
            </div>
            <div className="hidden md:block">
              <Link href="/quiz-select">
                <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100">
                  Începe Sesiunea de Azi
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
