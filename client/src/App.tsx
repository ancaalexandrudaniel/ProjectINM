import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
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
      <Route path="/login" component={Login} />
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/roadmap" component={RoadmapPage} />
      <Route path="/roadmap/node/:id" component={RoadmapNodeView} />
      <Route path="/syllabus" component={Syllabus} />
      <Route path="/quiz/:subject?" component={Quiz} />
      <Route path="/simulation" component={Simulation} />
      <Route path="/library" component={Library} />
      <Route path="/essay" component={Essay} />
      <Route path="/performance" component={Performance} />
      <Route path="/weak-points" component={WeakPoints} />
      <Route path="/srs-review" component={SrsReview} />
      <Route path="/wrong-answers" component={WrongAnswers} />
      <Route path="/documents" component={Documents} />
      <Route path="/exam-analysis" component={ExamAnalysis} />
      <Route path="/study-plan" component={StudyPlan} />
      <Route path="/legal-assistant" component={LegalAssistant} />
      <Route path="/bulk-import" component={BulkImport} />
      <Route path="/question-bank" component={QuestionBank} />
      <Route path="/raw-data" component={Documents} />
      <Route path="/spete-import" component={SpeteImport} />
      <Route path="/spete-bank" component={SpeteBank} />
      <Route path="/solve-case/:id" component={SolveCase} />
      <Route path="/quiz-select" component={QuizModeSelect} />
      <Route path="/quiz-god-mode" component={QuizGodMode} />
      <Route path="/legal-articles-import" component={LegalArticlesImport} />
      <Route path="/legal-acts" component={LegalActs} />
      <Route path="/bulletin-board" component={BulletinBoard} />
      <Route path="/exam-papers-import" component={ExamPapersImport} />
      <Route path="/exam-essays-import" component={ExamEssaysImport} />
      <Route path="/essay-practice" component={EssayPractice} />
      <Route path="/time-machine" component={TimeMachine} />
      <Route path="/time-machine/:year/proba-1" component={TimeMachineProba1} />
      <Route path="/time-machine/:year/proba-2" component={TimeMachineProba2} />
      <Route path="/import-management" component={ImportManagement} />
      <Route path="/psihologic">{() => <Etapa2Placeholder type="psihologic" />}</Route>
      <Route path="/interviu">{() => <Etapa2Placeholder type="interviu" />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-background">
          <Header />
          <div className="flex">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">
              <Router />
            </main>
          </div>
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
