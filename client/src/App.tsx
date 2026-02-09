import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Quiz from "@/pages/quiz";
import Simulation from "@/pages/simulation";
import Library from "@/pages/library";
import Performance from "@/pages/performance";
import WeakPoints from "@/pages/weak-points";
import WrongAnswers from "@/pages/wrong-answers";
import Documents from "@/pages/documents";
import ExamAnalysis from "@/pages/exam-analysis";
import StudyPlan from "@/pages/study-plan";
import LegalAssistant from "@/pages/legal-assistant";
import BulkImport from "@/pages/bulk-import";
import QuestionBank from "@/pages/question-bank";
import SpeteImport from "@/pages/spete-import";
import SpeteBank from "@/pages/spete-bank";
import Etapa2Placeholder from "@/pages/etapa2-placeholder";
import QuizModeSelect from "@/pages/quiz-mode-select";
import QuizGodMode from "@/pages/quiz-god-mode";
import LegalArticlesImport from "@/pages/legal-articles-import";
import SolveCase from "@/pages/solve-case";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import Login from "@/pages/login";
import SrsReview from "@/pages/srs-review";
import Essay from "@/pages/essay";
import LegalActs from "@/pages/legal-acts";
import Syllabus from "@/pages/syllabus";
import BulletinBoard from "@/pages/bulletin-board";
import ExamPapersImport from "@/pages/exam-papers-import";
import ExamEssaysImport from "@/pages/exam-essays-import";
import EssayPractice from "@/pages/essay-practice";
import TimeMachine from "@/pages/time-machine";
import TimeMachineProba1 from "@/pages/time-machine-proba1";
import TimeMachineProba2 from "@/pages/time-machine-proba2";
import ImportManagement from "@/pages/import-management";
import RoadmapPage from "@/pages/roadmap";
import RoadmapNodeView from "@/pages/roadmap/node-view";

function Router() {
  return (
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
