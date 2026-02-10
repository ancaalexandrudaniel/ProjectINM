import { lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Loader2 } from "lucide-react";

// Layout components — always loaded (they're in every page)
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";

// Login is eager since it's the entry point for unauthenticated users
import Login from "@/pages/login";

// Lazy-load all page components — only fetched when the route is visited
const NotFound = lazy(() => import("@/pages/not-found"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Quiz = lazy(() => import("@/pages/quiz"));
const Simulation = lazy(() => import("@/pages/simulation"));
const Library = lazy(() => import("@/pages/library"));
const Performance = lazy(() => import("@/pages/performance"));
const WeakPoints = lazy(() => import("@/pages/weak-points"));
const WrongAnswers = lazy(() => import("@/pages/wrong-answers"));
const Documents = lazy(() => import("@/pages/documents"));
const ExamAnalysis = lazy(() => import("@/pages/exam-analysis"));
const StudyPlan = lazy(() => import("@/pages/study-plan"));
const LegalAssistant = lazy(() => import("@/pages/legal-assistant"));
const BulkImport = lazy(() => import("@/pages/bulk-import"));
const QuestionBank = lazy(() => import("@/pages/question-bank"));
const SpeteImport = lazy(() => import("@/pages/spete-import"));
const SpeteBank = lazy(() => import("@/pages/spete-bank"));
const Etapa2Placeholder = lazy(() => import("@/pages/etapa2-placeholder"));
const QuizModeSelect = lazy(() => import("@/pages/quiz-mode-select"));
const QuizGodMode = lazy(() => import("@/pages/quiz-god-mode"));
const LegalArticlesImport = lazy(() => import("@/pages/legal-articles-import"));
const SolveCase = lazy(() => import("@/pages/solve-case"));
const SrsReview = lazy(() => import("@/pages/srs-review"));
const Essay = lazy(() => import("@/pages/essay"));
const LegalActs = lazy(() => import("@/pages/legal-acts"));
const Syllabus = lazy(() => import("@/pages/syllabus"));
const BulletinBoard = lazy(() => import("@/pages/bulletin-board"));
const ExamPapersImport = lazy(() => import("@/pages/exam-papers-import"));
const ExamEssaysImport = lazy(() => import("@/pages/exam-essays-import"));
const EssayPractice = lazy(() => import("@/pages/essay-practice"));
const TimeMachine = lazy(() => import("@/pages/time-machine"));
const TimeMachineProba1 = lazy(() => import("@/pages/time-machine-proba1"));
const TimeMachineProba2 = lazy(() => import("@/pages/time-machine-proba2"));
const ImportManagement = lazy(() => import("@/pages/import-management"));
const RoadmapPage = lazy(() => import("@/pages/roadmap"));
const RoadmapNodeView = lazy(() => import("@/pages/roadmap/node-view"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        {/* Public route */}
        <Route path="/login" component={Login} />

        {/* Protected student routes */}
        <Route path="/">{() => <ProtectedRoute><Dashboard /></ProtectedRoute>}</Route>
        <Route path="/dashboard">{() => <ProtectedRoute><Dashboard /></ProtectedRoute>}</Route>
        <Route path="/roadmap">{() => <ProtectedRoute><RoadmapPage /></ProtectedRoute>}</Route>
        <Route path="/roadmap/node/:id">{() => <ProtectedRoute><RoadmapNodeView /></ProtectedRoute>}</Route>
        <Route path="/syllabus">{() => <ProtectedRoute><Syllabus /></ProtectedRoute>}</Route>
        <Route path="/quiz/:subject?">{() => <ProtectedRoute><Quiz /></ProtectedRoute>}</Route>
        <Route path="/simulation">{() => <ProtectedRoute><Simulation /></ProtectedRoute>}</Route>
        <Route path="/library">{() => <ProtectedRoute><Library /></ProtectedRoute>}</Route>
        <Route path="/essay">{() => <ProtectedRoute><Essay /></ProtectedRoute>}</Route>
        <Route path="/performance">{() => <ProtectedRoute><Performance /></ProtectedRoute>}</Route>
        <Route path="/weak-points">{() => <ProtectedRoute><WeakPoints /></ProtectedRoute>}</Route>
        <Route path="/srs-review">{() => <ProtectedRoute><SrsReview /></ProtectedRoute>}</Route>
        <Route path="/wrong-answers">{() => <ProtectedRoute><WrongAnswers /></ProtectedRoute>}</Route>
        <Route path="/documents">{() => <ProtectedRoute><Documents /></ProtectedRoute>}</Route>
        <Route path="/exam-analysis">{() => <ProtectedRoute><ExamAnalysis /></ProtectedRoute>}</Route>
        <Route path="/study-plan">{() => <ProtectedRoute><StudyPlan /></ProtectedRoute>}</Route>
        <Route path="/legal-assistant">{() => <ProtectedRoute><LegalAssistant /></ProtectedRoute>}</Route>
        <Route path="/question-bank">{() => <ProtectedRoute><QuestionBank /></ProtectedRoute>}</Route>
        <Route path="/raw-data">{() => <ProtectedRoute><Documents /></ProtectedRoute>}</Route>
        <Route path="/spete-bank">{() => <ProtectedRoute><SpeteBank /></ProtectedRoute>}</Route>
        <Route path="/solve-case/:id">{() => <ProtectedRoute><SolveCase /></ProtectedRoute>}</Route>
        <Route path="/quiz-select">{() => <ProtectedRoute><QuizModeSelect /></ProtectedRoute>}</Route>
        <Route path="/quiz-god-mode">{() => <ProtectedRoute><QuizGodMode /></ProtectedRoute>}</Route>
        <Route path="/legal-acts">{() => <ProtectedRoute><LegalActs /></ProtectedRoute>}</Route>
        <Route path="/bulletin-board">{() => <ProtectedRoute><BulletinBoard /></ProtectedRoute>}</Route>
        <Route path="/essay-practice">{() => <ProtectedRoute><EssayPractice /></ProtectedRoute>}</Route>
        <Route path="/time-machine">{() => <ProtectedRoute><TimeMachine /></ProtectedRoute>}</Route>
        <Route path="/time-machine/:year/proba-1">{() => <ProtectedRoute><TimeMachineProba1 /></ProtectedRoute>}</Route>
        <Route path="/time-machine/:year/proba-2">{() => <ProtectedRoute><TimeMachineProba2 /></ProtectedRoute>}</Route>
        <Route path="/psihologic">{() => <ProtectedRoute><Etapa2Placeholder type="psihologic" /></ProtectedRoute>}</Route>
        <Route path="/interviu">{() => <ProtectedRoute><Etapa2Placeholder type="interviu" /></ProtectedRoute>}</Route>

        {/* Admin-only routes */}
        <Route path="/bulk-import">{() => <ProtectedRoute adminOnly><BulkImport /></ProtectedRoute>}</Route>
        <Route path="/spete-import">{() => <ProtectedRoute adminOnly><SpeteImport /></ProtectedRoute>}</Route>
        <Route path="/legal-articles-import">{() => <ProtectedRoute adminOnly><LegalArticlesImport /></ProtectedRoute>}</Route>
        <Route path="/exam-papers-import">{() => <ProtectedRoute adminOnly><ExamPapersImport /></ProtectedRoute>}</Route>
        <Route path="/exam-essays-import">{() => <ProtectedRoute adminOnly><ExamEssaysImport /></ProtectedRoute>}</Route>
        <Route path="/import-management">{() => <ProtectedRoute adminOnly><ImportManagement /></ProtectedRoute>}</Route>

        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Router />
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <AppLayout />
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
