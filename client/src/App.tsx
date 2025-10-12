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
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/quiz/:subject?" component={Quiz} />
      <Route path="/simulation" component={Simulation} />
      <Route path="/library" component={Library} />
      <Route path="/performance" component={Performance} />
      <Route path="/weak-points" component={WeakPoints} />
      <Route path="/wrong-answers" component={WrongAnswers} />
      <Route path="/documents" component={Documents} />
      <Route path="/exam-analysis" component={ExamAnalysis} />
      <Route path="/study-plan" component={StudyPlan} />
      <Route path="/legal-assistant" component={LegalAssistant} />
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
