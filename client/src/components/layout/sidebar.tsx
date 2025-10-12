import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Scale, 
  FileText, 
  Shield, 
  Gavel, 
  Timer, 
  BookOpen, 
  TrendingUp, 
  AlertTriangle,
  Upload,
  BarChart3,
  Calendar
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { UserProgress } from "@/types/quiz";

const subjects = [
  { id: 'civil', name: 'Drept Civil', icon: Scale, href: '/quiz/civil' },
  { id: 'civil-procedural', name: 'Drept Procesual Civil', icon: FileText, href: '/quiz/civil-procedural' },
  { id: 'penal', name: 'Drept Penal', icon: Shield, href: '/quiz/penal' },
  { id: 'penal-procedural', name: 'Drept Procesual Penal', icon: Gavel, href: '/quiz/penal-procedural' },
];

export default function Sidebar() {
  const [location] = useLocation();

  const { data: progress = [] } = useQuery<UserProgress[]>({
    queryKey: ['/api/progress'],
  });

  const getSubjectProgress = (subjectId: string) => {
    const subjectProgress = progress.filter(p => p.subject === subjectId);
    if (subjectProgress.length === 0) return 0;
    
    const totalQuestions = subjectProgress.reduce((sum, p) => sum + p.totalQuestions, 0);
    const correctAnswers = subjectProgress.reduce((sum, p) => sum + p.correctAnswers, 0);
    
    return totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
  };

  const isActive = (path: string) => {
    if (path === '/' && location === '/') return true;
    if (path !== '/' && location.startsWith(path)) return true;
    return false;
  };

  return (
    <aside className="w-72 bg-card border-r border-border h-[calc(100vh-73px)] sticky top-[73px] overflow-y-auto">
      <nav className="p-4 sidebar-nav">
        <div className="space-y-1">
          <Link href="/">
            <a className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/') ? 'active' : ''}`} data-testid="nav-dashboard">
              <LayoutDashboard className="h-5 w-5" />
              <span className="font-medium">Dashboard</span>
            </a>
          </Link>
          
          <div className="pt-4 pb-2">
            <p className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Teste Interactive
            </p>
          </div>
          
          {subjects.map((subject) => {
            const Icon = subject.icon;
            const progressPercent = getSubjectProgress(subject.id);
            
            return (
              <Link key={subject.id} href={subject.href}>
                <a className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive(subject.href) ? 'active' : ''}`} data-testid={`nav-${subject.id}`}>
                  <Icon className="h-5 w-5" />
                  <div className="flex-1">
                    <span className="font-medium">{subject.name}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all duration-300" 
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{progressPercent}%</span>
                    </div>
                  </div>
                </a>
              </Link>
            );
          })}
          
          <div className="pt-4 pb-2">
            <p className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Instrumente
            </p>
          </div>
          
          <Link href="/simulation">
            <a className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/simulation') ? 'active' : ''}`} data-testid="nav-simulation">
              <Timer className="h-5 w-5" />
              <span className="font-medium">Simulare Examen</span>
            </a>
          </Link>
          
          <Link href="/library">
            <a className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/library') ? 'active' : ''}`} data-testid="nav-library">
              <BookOpen className="h-5 w-5" />
              <span className="font-medium">Bibliotecă Digitală</span>
            </a>
          </Link>
          
          <Link href="/documents">
            <a className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/documents') ? 'active' : ''}`} data-testid="nav-documents">
              <Upload className="h-5 w-5" />
              <span className="font-medium">Documente PDF</span>
            </a>
          </Link>
          
          <Link href="/exam-analysis">
            <a className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/exam-analysis') ? 'active' : ''}`} data-testid="nav-exam-analysis">
              <BarChart3 className="h-5 w-5" />
              <span className="font-medium">Analiză Subiecte</span>
            </a>
          </Link>
          
          <Link href="/study-plan">
            <a className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/study-plan') ? 'active' : ''}`} data-testid="nav-study-plan">
              <Calendar className="h-5 w-5" />
              <span className="font-medium">Plan de Studiu</span>
            </a>
          </Link>
          
          <Link href="/performance">
            <a className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/performance') ? 'active' : ''}`} data-testid="nav-performance">
              <TrendingUp className="h-5 w-5" />
              <span className="font-medium">Istoric Performanță</span>
            </a>
          </Link>
          
          <Link href="/weak-points">
            <a className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/weak-points') ? 'active' : ''}`} data-testid="nav-weak-points">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">Puncte Slabe</span>
            </a>
          </Link>
        </div>
      </nav>
    </aside>
  );
}
