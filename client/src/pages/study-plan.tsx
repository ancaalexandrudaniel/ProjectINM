import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Calendar, Target, Lightbulb, BookOpen, TrendingUp } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format, addDays } from "date-fns";

type StudyPlan = {
  id?: string;
  dailySchedule: Array<{
    day: number;
    date: string;
    topics: string[];
    focus: string;
    hours: number;
  }>;
  priorityChapters: string[];
  weeklyGoals: string[];
  studyTips: string[];
  daysUntilExam?: number;
  hoursPerDay?: number;
  generatedAt?: string;
};

export default function StudyPlanPage() {
  const [daysUntilExam, setDaysUntilExam] = useState<string>("30");
  const [hoursPerDay, setHoursPerDay] = useState<string>("4");
  
  // Fetch latest study plan
  const { data: existingPlan } = useQuery<StudyPlan>({
    queryKey: ["/api/study-plan/latest"],
    retry: false
  });
  
  // Generate study plan mutation
  const generatePlan = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/study-plan/generate", {
        daysUntilExam: parseInt(daysUntilExam),
        hoursPerDay: parseInt(hoursPerDay)
      });
      return await response.json() as StudyPlan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/study-plan/latest"] });
    }
  });
  
  const handleGenerate = () => {
    if (daysUntilExam && hoursPerDay) {
      generatePlan.mutate();
    }
  };
  
  const displayPlan = generatePlan.data || existingPlan;
  
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Calendar className="w-8 h-8 text-cyan-600" />
          <h1 className="text-3xl font-bold">Plan de Studiu Personalizat</h1>
        </div>
        <p className="text-muted-foreground">
          AI generează un plan de studiu bazat pe progresul tău și timpul disponibil
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Input Form */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Generează Plan AI</CardTitle>
            <CardDescription>Introduceți detalii despre timpul disponibil</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Zile până la examen
              </label>
              <Input
                type="number"
                value={daysUntilExam}
                onChange={(e) => setDaysUntilExam(e.target.value)}
                min="1"
                max="365"
                placeholder="30"
                data-testid="input-days-until-exam"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Câte zile aveți la dispoziție pentru studiu
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">
                Ore de studiu pe zi
              </label>
              <Input
                type="number"
                value={hoursPerDay}
                onChange={(e) => setHoursPerDay(e.target.value)}
                min="1"
                max="12"
                placeholder="4"
                data-testid="input-hours-per-day"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Câte ore pe zi puteți dedica studiului
              </p>
            </div>
            
            <Button 
              onClick={handleGenerate} 
              disabled={!daysUntilExam || !hoursPerDay || generatePlan.isPending}
              className="w-full"
              data-testid="button-generate-plan"
            >
              {generatePlan.isPending ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                  AI generează plan...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generează Plan cu AI
                </>
              )}
            </Button>
            
            {existingPlan && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-blue-800 dark:text-blue-400">
                  <strong>Plan existent:</strong><br />
                  {existingPlan.daysUntilExam} zile, {existingPlan.hoursPerDay}h/zi
                  {existingPlan.generatedAt && (
                    <><br />Generat: {new Date(existingPlan.generatedAt).toLocaleDateString('ro-RO')}</>
                  )}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Right: Study Plan Display */}
        <div className="lg:col-span-2 space-y-6">
          {displayPlan ? (
            <>
              {/* Priority Chapters */}
              {displayPlan.priorityChapters && displayPlan.priorityChapters.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-red-600" />
                      Capitole Prioritare
                    </CardTitle>
                    <CardDescription>Focalizează-te pe aceste capitole critice</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2" data-testid="list-priority-chapters">
                      {displayPlan.priorityChapters.map((chapter, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Badge variant="destructive" className="mt-0.5">#{idx + 1}</Badge>
                          <span className="text-sm">{chapter}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
              
              {/* Weekly Goals */}
              {displayPlan.weeklyGoals && displayPlan.weeklyGoals.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                      Obiective Săptămânale
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3" data-testid="list-weekly-goals">
                      {displayPlan.weeklyGoals.map((goal, idx) => (
                        <li key={idx} className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                          <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                            {idx + 1}
                          </div>
                          <p className="text-sm pt-1">{goal}</p>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
              
              {/* Daily Schedule */}
              {displayPlan.dailySchedule && displayPlan.dailySchedule.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-cyan-600" />
                      Program Zilnic
                    </CardTitle>
                    <CardDescription>
                      Plan detaliat pentru următoarele {displayPlan.dailySchedule.length} zile
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-96 overflow-y-auto" data-testid="list-daily-schedule">
                      {displayPlan.dailySchedule.map((day, idx) => (
                        <div key={idx} className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-semibold text-sm">
                                Ziua {day.day}
                                {day.date && ` - ${format(new Date(day.date), 'dd MMM yyyy')}`}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">{day.focus}</p>
                            </div>
                            <Badge variant="outline">{day.hours}h</Badge>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {day.topics.map((topic, topicIdx) => (
                              <Badge key={topicIdx} variant="secondary" className="text-xs">
                                {topic}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Study Tips */}
              {displayPlan.studyTips && displayPlan.studyTips.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-yellow-600" />
                      Sfaturi de Studiu
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2" data-testid="list-study-tips">
                      {displayPlan.studyTips.map((tip, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <span className="text-yellow-600 mt-0.5">💡</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card className="lg:col-span-2">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <BookOpen className="w-16 h-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Niciun Plan de Studiu</h3>
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  Introduceți câte zile aveți până la examen și câte ore pe zi puteți studia,
                  apoi apăsați "Generează Plan cu AI" pentru a primi un plan personalizat.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
