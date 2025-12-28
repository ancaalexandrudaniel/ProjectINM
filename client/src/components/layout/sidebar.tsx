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
  Calendar,
  Brain,
  Database,
  History,
  ClipboardList,
  PenTool,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Search,
  Plus
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { UserProgress } from "@/types/quiz";

const subjects = [
  { id: 'civil', name: 'Drept Civil', icon: Scale, href: '/quiz/civil' },
  { id: 'civil-procedural', name: 'Drept Procesual Civil', icon: FileText, href: '/quiz/civil-procedural' },
  { id: 'penal', name: 'Drept Penal', icon: Shield, href: '/quiz/penal' },
  { id: 'penal-procedural', name: 'Drept Procesual Penal', icon: Gavel, href: '/quiz/penal-procedural' },
];

export default function Sidebar() {
  const [location] = useLocation();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'part1': true,
    'raw': false,
    'historical': false,
    'part2': false
  });

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

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <aside className="w-72 bg-card border-r border-border h-[calc(100vh-73px)] sticky top-[73px] overflow-y-auto">
      <nav className="p-4 sidebar-nav">
        <div className="space-y-1">
          <Link href="/" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/') ? 'active' : ''}`} data-testid="nav-dashboard">
            <LayoutDashboard className="h-5 w-5" />
            <span className="font-medium">Dashboard</span>
          </Link>
          
          {/* SECTION 1: Raw Data */}
          <div className="pt-4">
            <button 
              onClick={() => toggleSection('raw')}
              className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
            >
              <span className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                1. Bază de Date Juridică
              </span>
              {expandedSections['raw'] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
          
          {expandedSections['raw'] && (
            <div className="pl-2 space-y-1">
              <Link href="/raw-data" className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm ${isActive('/raw-data') ? 'active' : ''}`} data-testid="nav-raw-data">
                <FolderOpen className="h-4 w-4" />
                <span>Resurse Juridice</span>
              </Link>
              <Link href="/legal-assistant" className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm ${isActive('/legal-assistant') ? 'active' : ''}`} data-testid="nav-legal-assistant">
                <Brain className="h-4 w-4" />
                <span>Asistent AI (RAG)</span>
              </Link>
            </div>
          )}

          {/* SECTION 2: Historical Data */}
          <div className="pt-4">
            <button 
              onClick={() => toggleSection('historical')}
              className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
            >
              <span className="flex items-center gap-2">
                <History className="h-4 w-4" />
                2. Concursuri 2019-2024
              </span>
              {expandedSections['historical'] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
          
          {expandedSections['historical'] && (
            <div className="pl-2 space-y-1">
              <Link href="/documents" className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm ${isActive('/documents') ? 'active' : ''}`} data-testid="nav-documents">
                <Upload className="h-4 w-4" />
                <span>Upload Subiecte</span>
              </Link>
              <Link href="/exam-analysis" className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm ${isActive('/exam-analysis') ? 'active' : ''}`} data-testid="nav-exam-analysis">
                <BarChart3 className="h-4 w-4" />
                <span>Analiză Pattern</span>
              </Link>
            </div>
          )}

          {/* SECTION 3: Part 1 - Multiple Choice */}
          <div className="pt-4">
            <button 
              onClick={() => toggleSection('part1')}
              className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
            >
              <span className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                3. Partea 1 - Grile
              </span>
              {expandedSections['part1'] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
          
          {expandedSections['part1'] && (
            <div className="pl-2 space-y-1">
              <Link href="/bulk-import" className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm ${isActive('/bulk-import') ? 'active' : ''}`} data-testid="nav-bulk-import">
                <Plus className="h-4 w-4" />
                <span>Import Întrebări</span>
              </Link>
              <Link href="/question-bank" className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm ${isActive('/question-bank') ? 'active' : ''}`} data-testid="nav-question-bank">
                <Search className="h-4 w-4" />
                <span>Bancă de Întrebări</span>
              </Link>
              
              <div className="py-2 px-4">
                <span className="text-xs text-muted-foreground">Practică pe materie:</span>
              </div>
              
              {subjects.map((subject) => {
                const Icon = subject.icon;
                const progressPercent = getSubjectProgress(subject.id);
                
                return (
                  <Link key={subject.id} href={subject.href} className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm ${isActive(subject.href) ? 'active' : ''}`} data-testid={`nav-${subject.id}`}>
                    <Icon className="h-4 w-4" />
                    <div className="flex-1">
                      <span>{subject.name}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full transition-all duration-300" 
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{progressPercent}%</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
              
              <Link href="/simulation" className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm ${isActive('/simulation') ? 'active' : ''}`} data-testid="nav-simulation">
                <Timer className="h-4 w-4" />
                <span>Simulare Examen</span>
              </Link>
            </div>
          )}

          {/* SECTION 4: Part 2 - Case Studies */}
          <div className="pt-4">
            <button 
              onClick={() => toggleSection('part2')}
              className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
            >
              <span className="flex items-center gap-2">
                <PenTool className="h-4 w-4" />
                4. Partea 2 - Spețe
              </span>
              {expandedSections['part2'] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
          
          {expandedSections['part2'] && (
            <div className="pl-2 space-y-1">
              <Link href="/case-studies" className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm ${isActive('/case-studies') ? 'active' : ''}`} data-testid="nav-case-studies">
                <FileText className="h-4 w-4" />
                <span>Spețe Practice</span>
              </Link>
            </div>
          )}
          
          {/* Progress & Analytics */}
          <div className="pt-4 pb-2">
            <p className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Progres & Analiză
            </p>
          </div>
          
          <Link href="/performance" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/performance') ? 'active' : ''}`} data-testid="nav-performance">
            <TrendingUp className="h-5 w-5" />
            <span className="font-medium">Istoric Performanță</span>
          </Link>
          
          <Link href="/weak-points" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/weak-points') ? 'active' : ''}`} data-testid="nav-weak-points">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">Puncte Slabe</span>
          </Link>
          
          <Link href="/study-plan" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/study-plan') ? 'active' : ''}`} data-testid="nav-study-plan">
            <Calendar className="h-5 w-5" />
            <span className="font-medium">Plan de Studiu</span>
          </Link>
        </div>
      </nav>
    </aside>
  );
}
