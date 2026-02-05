import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  BookOpen,
  Brain,
  Swords,
  ArrowLeft,
  CheckCircle,
  Loader2,
  Sparkles,
  Play
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

type RoadmapNodeContent = {
  node: {
    id: string;
    title: string;
    description: string;
    xpReward: number;
  };
  syllabusTopic?: {
    id: string;
    topicTitle: string;
  };
  relevantQuestions: Array<{
    id: string;
    questionText: string;
    options: any[];
    correctAnswer: number;
  }>;
};

export default function RoadmapNodeView() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("theory");
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [aiScenario, setAiScenario] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState<number | null>(null);

  const { data, isLoading } = useQuery<RoadmapNodeContent>({
    queryKey: [`/api/roadmap/node/${id}`],
    enabled: !!id,
  });

  const completeNodeMutation = useMutation({
    mutationFn: async (score: number) => {
      const res = await apiRequest("POST", `/api/roadmap/node/${id}/complete`, { score });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Felicitări! 🎉",
        description: `Ai completat nodul și ai câștigat ${data.xpGained} XP!`,
      });
      // Optionally redirect or show success screen
      queryClient.invalidateQueries({ queryKey: ["/api/roadmap"] });
    },
  });

  // Mock AI calls for now (to be replaced with actual endpoints if available)
  const handleExplain = () => {
    setAiExplanation("Aceasta este o explicație simplificată generată de AI pentru conceptul curent. (Mock)");
  };

  const handleGenerateScenario = () => {
    setAiScenario("Scenariu: Popescu cumpără o casă de la Ionescu... (Mock)");
  };

  const handleQuizSubmit = (score: number) => {
    setQuizScore(score);
    completeNodeMutation.mutate(score);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!data) return <div>Nodul nu a fost găsit.</div>;

  const { node, syllabusTopic, relevantQuestions } = data;

  return (
    <div className="min-h-screen bg-background pb-10">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto max-w-4xl p-4">
          <Button variant="ghost" className="mb-2 pl-0 hover:bg-transparent" onClick={() => setLocation("/roadmap")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Înapoi la Roadmap
          </Button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold">{node.title}</h1>
              <p className="text-muted-foreground">{node.description}</p>
            </div>
            <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50">
              Reward: {node.xpReward} XP
            </Badge>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl p-4 mt-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="theory" className="flex gap-2">
              <BookOpen className="h-4 w-4" />
              Studiu (Teorie)
            </TabsTrigger>
            <TabsTrigger value="context" className="flex gap-2">
              <Brain className="h-4 w-4" />
              Aplicare (Context)
            </TabsTrigger>
            <TabsTrigger value="challenge" className="flex gap-2">
              <Swords className="h-4 w-4" />
              Testare (Challenge)
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: THEORY */}
          <TabsContent value="theory" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-blue-500" />
                  Conținut Legislativ
                </CardTitle>
                <CardDescription>
                  Surse oficiale pentru {syllabusTopic?.topicTitle || node.title}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Placeholder for legislative content */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border text-sm space-y-4">
                  <p>
                    <strong>Art. X:</strong> Textul articolului relevant din Codul Civil/Penal...
                  </p>
                  <p className="text-muted-foreground italic">
                    (Conținutul detaliat va fi încărcat din baza de date legislativă)
                  </p>
                </div>

                <div className="mt-6">
                  <Button variant="outline" onClick={handleExplain} className="w-full">
                    <Sparkles className="mr-2 h-4 w-4 text-purple-500" />
                    Explică-mi ca unui copil de 11 ani (AI)
                  </Button>

                  {aiExplanation && (
                    <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-lg animate-in fade-in slide-in-from-top-2">
                      <h4 className="font-semibold text-purple-700 dark:text-purple-300 mb-2 flex items-center gap-2">
                        <Brain className="h-4 w-4" />
                        Explicație Simplificată
                      </h4>
                      <p className="text-sm">{aiExplanation}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: CONTEXT */}
          <TabsContent value="context" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-orange-500" />
                  Pune în Context
                </CardTitle>
                <CardDescription>
                  Vezi cum se aplică teoria în practică
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-6">
                    Generează o speță simplă pentru a înțelege mecanismul juridic.
                  </p>
                  <Button onClick={handleGenerateScenario}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generează Speță cu AI
                  </Button>
                </div>

                {aiScenario && (
                  <div className="mt-4 p-6 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 rounded-lg">
                    <h3 className="font-bold text-lg mb-2">Scenariu Practic</h3>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                      {aiScenario}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: CHALLENGE */}
          <TabsContent value="challenge" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Swords className="h-5 w-5 text-red-500" />
                  Boss Fight: {node.title}
                </CardTitle>
                <CardDescription>
                  Răspunde corect pentru a debloca următorul nivel.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {quizScore !== null ? (
                  <div className="text-center py-10">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="h-8 w-8" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Nivel Completat!</h2>
                    <p className="text-lg mb-6">Scor: {quizScore}%</p>
                    <Button onClick={() => setLocation("/roadmap")}>
                      Continuă Călătoria
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded border">
                      <p className="font-medium mb-4">Întrebări disponibile: {relevantQuestions.length}</p>
                      {relevantQuestions.length === 0 ? (
                        <p className="text-muted-foreground text-sm">Nu există întrebări suficiente în baza de date pentru acest topic încă.</p>
                      ) : (
                        <div className="space-y-4">
                          {/* Simplified Quiz Interface Placeholder */}
                          {relevantQuestions.map((q, idx) => (
                            <div key={q.id} className="pb-4 border-b last:border-0">
                              <p className="text-sm font-medium mb-2">{idx + 1}. {q.questionText}</p>
                              {/* Options would go here */}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <Button
                      className="w-full"
                      size="lg"
                      onClick={() => handleQuizSubmit(100)} // Mock passing
                      disabled={relevantQuestions.length === 0}
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Începe Testul
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
