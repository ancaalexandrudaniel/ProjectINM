import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  TrendingUp, 
  Calendar, 
  Award, 
  Target,
  BarChart3,
  Clock,
  CheckCircle,
  XCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { UserProgress, QuizSession, UserAnswer } from "@/types/quiz";

export default function Performance() {
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '3m'>('7d');

  const { data: progress = [] } = useQuery<UserProgress[]>({
    queryKey: ['/api/progress'],
  });

  const { data: sessions = [] } = useQuery<QuizSession[]>({
    queryKey: ['/api/sessions'],
  });

  const { data: answers = [] } = useQuery<UserAnswer[]>({
    queryKey: ['/api/answers'],
  });

  // Calculate overall statistics
  const getOverallStats = () => {
    const completedSessions = sessions.filter(s => s.completedAt);
    const totalQuestions = progress.reduce((sum, p) => sum + p.totalQuestions, 0);
    const correctAnswers = progress.reduce((sum, p) => sum + p.correctAnswers, 0);
    const totalTime = completedSessions.reduce((sum, s) => sum + (s.timeSpent || 0), 0);

    return {
      totalSessions: completedSessions.length,
      totalQuestions,
      correctAnswers,
      accuracy: totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0,
      totalHours: Math.round(totalTime / 3600),
      averageSessionTime: completedSessions.length > 0 ? Math.round(totalTime / completedSessions.length / 60) : 0
    };
  };

  // Get performance trend data for chart
  const getPerformanceTrend = () => {
    const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
    const chartData = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayKey = date.toISOString().split('T')[0];
      
      // Get sessions for this day
      const daySessions = sessions.filter(s => {
        if (!s.completedAt) return false;
        const sessionDate = new Date(s.completedAt).toISOString().split('T')[0];
        return sessionDate === dayKey;
      });

      const dayAnswers = answers.filter(a => {
        const answerDate = new Date(a.answeredAt).toISOString().split('T')[0];
        return answerDate === dayKey;
      });

      const correctCount = dayAnswers.filter(a => a.isCorrect).length;
      const accuracy = dayAnswers.length > 0 ? Math.round((correctCount / dayAnswers.length) * 100) : 0;

      chartData.push({
        date: date.toLocaleDateString('ro-RO', { weekday: 'short' }),
        accuracy,
        sessions: daySessions.length,
        questions: dayAnswers.length
      });
    }
    
    return chartData;
  };

  // Get subject performance breakdown
  const getSubjectPerformance = () => {
    const subjects = ['civil', 'civil-procedural', 'penal', 'penal-procedural'];
    const subjectNames = {
      civil: 'Drept Civil',
      'civil-procedural': 'Drept Procesual Civil',
      penal: 'Drept Penal',
      'penal-procedural': 'Drept Procesual Penal'
    };

    return subjects.map(subject => {
      const subjectProgress = progress.filter(p => p.subject === subject);
      const totalQuestions = subjectProgress.reduce((sum, p) => sum + p.totalQuestions, 0);
      const correctAnswers = subjectProgress.reduce((sum, p) => sum + p.correctAnswers, 0);
      const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

      return {
        subject,
        name: subjectNames[subject as keyof typeof subjectNames],
        totalQuestions,
        correctAnswers,
        incorrectAnswers: totalQuestions - correctAnswers,
        accuracy
      };
    });
  };

  // Get recent activity
  const getRecentActivity = () => {
    return sessions
      .filter(s => s.completedAt)
      .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
      .slice(0, 10)
      .map(session => {
        const accuracy = session.totalQuestions > 0 
          ? Math.round((session.correctAnswers / session.totalQuestions) * 100) 
          : 0;
        
        return {
          id: session.id,
          date: new Date(session.completedAt!),
          type: session.sessionType,
          subject: session.subject,
          questions: session.totalQuestions,
          correct: session.correctAnswers,
          accuracy,
          timeSpent: session.timeSpent || 0
        };
      });
  };

  const stats = getOverallStats();
  const chartData = getPerformanceTrend();
  const subjectPerformance = getSubjectPerformance();
  const recentActivity = getRecentActivity();

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-foreground">Istoric Performanță</h2>
        <p className="text-muted-foreground mt-1">
          Analiză detaliată a progresului și performanțelor tale
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold" data-testid="total-sessions">{stats.totalSessions}</p>
                <p className="text-sm text-muted-foreground">Sesiuni Completate</p>
              </div>
              <BarChart3 className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold" data-testid="overall-accuracy">{stats.accuracy}%</p>
                <p className="text-sm text-muted-foreground">Acuratețe Generală</p>
              </div>
              <Target className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold" data-testid="total-hours">{stats.totalHours}h</p>
                <p className="text-sm text-muted-foreground">Ore de Studiu</p>
              </div>
              <Clock className="h-8 w-8 text-accent" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold" data-testid="avg-session-time">{stats.averageSessionTime}min</p>
                <p className="text-sm text-muted-foreground">Timp Mediu/Sesiune</p>
              </div>
              <Award className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Chart and Subject Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Chart */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Evoluție Performanță</CardTitle>
                <div className="flex gap-2">
                  {[
                    { key: '7d', label: '7 zile' },
                    { key: '30d', label: '30 zile' },
                    { key: '3m', label: '3 luni' }
                  ].map(period => (
                    <Button
                      key={period.key}
                      variant={timeframe === period.key ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTimeframe(period.key as any)}
                      data-testid={`timeframe-${period.key}`}
                    >
                      {period.label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-end justify-around p-4 gap-2">
                {chartData.map((day, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div
                      className="bg-primary rounded-t min-h-[20px] w-full transition-all duration-300"
                      style={{ height: `${Math.max((day.accuracy / 100) * 200, 20)}px` }}
                      title={`${day.date}: ${day.accuracy}% acuratețe`}
                    />
                    <span className="text-xs text-muted-foreground mt-2">{day.date}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Subject Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Performanță pe Materii</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {subjectPerformance.map((subject) => (
              <div key={subject.subject}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium">{subject.name}</span>
                  <span className="font-semibold">{subject.accuracy}%</span>
                </div>
                <Progress value={subject.accuracy} className="h-2 mb-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span data-testid={`${subject.subject}-correct`}>
                    ✓ {subject.correctAnswers} corecte
                  </span>
                  <span data-testid={`${subject.subject}-incorrect`}>
                    ✗ {subject.incorrectAnswers} greșite
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Subject Distribution Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuție Răspunsuri pe Materii</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {subjectPerformance.map((subject) => (
              <div key={subject.subject}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium">{subject.name}</span>
                  <span className="font-medium">{subject.totalQuestions} întrebări</span>
                </div>
                <div className="h-8 bg-secondary rounded-lg overflow-hidden flex">
                  <div
                    className="bg-success transition-all duration-300"
                    style={{ width: `${subject.totalQuestions > 0 ? (subject.correctAnswers / subject.totalQuestions) * 100 : 0}%` }}
                    title={`Corecte: ${subject.accuracy}%`}
                  />
                  <div
                    className="bg-destructive transition-all duration-300"
                    style={{ width: `${subject.totalQuestions > 0 ? (subject.incorrectAnswers / subject.totalQuestions) * 100 : 0}%` }}
                    title={`Greșite: ${100 - subject.accuracy}%`}
                  />
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex justify-center gap-6 mt-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-success rounded"></div>
              <span>Corecte</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-destructive rounded"></div>
              <span>Greșite</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Activitate Recentă</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nu există activitate recentă</p>
              <p className="text-sm text-muted-foreground mt-2">
                Începe un test pentru a vedea progresul aici
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      activity.accuracy >= 80 ? 'bg-success/10' :
                      activity.accuracy >= 60 ? 'bg-primary/10' : 'bg-destructive/10'
                    }`}>
                      {activity.accuracy >= 80 ? (
                        <CheckCircle className="h-5 w-5 text-success" />
                      ) : activity.accuracy >= 60 ? (
                        <Target className="h-5 w-5 text-primary" />
                      ) : (
                        <XCircle className="h-5 w-5 text-destructive" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {activity.type === 'practice' ? 'Sesiune Practică' : 
                         activity.type === 'simulation' ? 'Simulare Examen' : 'Puncte Slabe'}
                        {activity.subject && ` - ${activity.subject}`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {activity.date.toLocaleDateString('ro-RO', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-lg font-bold">{activity.accuracy}%</p>
                    <p className="text-sm text-muted-foreground">
                      {activity.correct}/{activity.questions} corecte
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
