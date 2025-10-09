import { useState } from "react";
import { Timer, Play, Settings, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Simulation() {
  const [simulationSettings, setSimulationSettings] = useState({
    timeLimit: '180', // minutes
    questionCount: '100',
    subjects: 'all'
  });

  const [isSimulationStarted, setIsSimulationStarted] = useState(false);

  const examInfo = {
    officialDate: "28 Septembrie 2025",
    timeLimit: "3 ore (180 minute)",
    questionCount: "100 întrebări",
    subjects: "Toate cele 4 materii",
    passingScore: "Minimum 60%"
  };

  const handleStartSimulation = () => {
    setIsSimulationStarted(true);
    // Redirect to quiz with simulation mode
    window.location.href = '/quiz?mode=simulation';
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-foreground">Simulare Examen INM</h2>
        <p className="text-muted-foreground mt-1">
          Testează-te în condiții reale de examen cu cronometru și notare automată
        </p>
      </div>

      {/* Exam Info Alert */}
      <Alert className="border-primary/20 bg-primary/5">
        <AlertCircle className="h-4 w-4 text-primary" />
        <AlertDescription className="text-primary">
          <strong>Examen Oficial:</strong> {examInfo.officialDate} • {examInfo.timeLimit} • {examInfo.questionCount}
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Simulation Settings */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configurare Simulare
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Timp limită</label>
                  <Select 
                    value={simulationSettings.timeLimit} 
                    onValueChange={(value) => setSimulationSettings(prev => ({...prev, timeLimit: value}))}
                  >
                    <SelectTrigger data-testid="time-limit-select">
                      <SelectValue placeholder="Selectează timpul" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="60">60 minute (test scurt)</SelectItem>
                      <SelectItem value="120">120 minute (test mediu)</SelectItem>
                      <SelectItem value="180">180 minute (simulare completă)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Număr întrebări</label>
                  <Select 
                    value={simulationSettings.questionCount} 
                    onValueChange={(value) => setSimulationSettings(prev => ({...prev, questionCount: value}))}
                  >
                    <SelectTrigger data-testid="question-count-select">
                      <SelectValue placeholder="Selectează numărul" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25 întrebări (test rapid)</SelectItem>
                      <SelectItem value="50">50 întrebări (test mediu)</SelectItem>
                      <SelectItem value="100">100 întrebări (simulare completă)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Materii incluse</label>
                  <Select 
                    value={simulationSettings.subjects} 
                    onValueChange={(value) => setSimulationSettings(prev => ({...prev, subjects: value}))}
                  >
                    <SelectTrigger data-testid="subjects-select">
                      <SelectValue placeholder="Selectează materiile" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toate materiile (recomandat)</SelectItem>
                      <SelectItem value="civil">Doar Drept Civil</SelectItem>
                      <SelectItem value="civil-procedural">Doar Drept Procesual Civil</SelectItem>
                      <SelectItem value="penal">Doar Drept Penal</SelectItem>
                      <SelectItem value="penal-procedural">Doar Drept Procesual Penal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="bg-secondary/50 rounded-lg p-4">
                <h4 className="font-semibold mb-2">Condiții de simulare:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Cronometru activ cu timp limitat</li>
                  <li>• Fără posibilitate de revenire la întrebări anterioare</li>
                  <li>• Notare automată la final</li>
                  <li>• Raport detaliat de performanță</li>
                  <li>• Feedback pentru fiecare răspuns greșit</li>
                </ul>
              </div>

              <Button 
                onClick={handleStartSimulation}
                className="w-full" 
                size="lg"
                data-testid="start-simulation"
              >
                <Play className="h-5 w-5 mr-2" />
                Începe Simularea
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Exam Details */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timer className="h-5 w-5 text-primary" />
                Detalii Examen Oficial
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium">Data:</span>
                  <span className="text-sm text-right">{examInfo.officialDate}</span>
                </div>
                
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium">Durată:</span>
                  <span className="text-sm text-right">{examInfo.timeLimit}</span>
                </div>
                
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium">Întrebări:</span>
                  <span className="text-sm text-right">{examInfo.questionCount}</span>
                </div>
                
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium">Materii:</span>
                  <span className="text-sm text-right">{examInfo.subjects}</span>
                </div>
                
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium">Nota trecere:</span>
                  <span className="text-sm text-right font-semibold text-success">
                    {examInfo.passingScore}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <h4 className="font-semibold mb-2 text-sm">Distribuție materii:</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span>Drept Civil</span>
                    <span>25%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Drept Procesual Civil</span>
                    <span>25%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Drept Penal</span>
                    <span>25%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Drept Procesual Penal</span>
                    <span>25%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tips Card */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Sfaturi pentru Simulare</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li>• Alege un mediu liniștit, fără distracții</li>
                <li>• Respectă strict timpul alocat</li>
                <li>• Nu consulta materiale auxiliare</li>
                <li>• Citește atent fiecare întrebare</li>
                <li>• Nu petrece prea mult timp pe o întrebare</li>
                <li>• Verifică răspunsurile la final</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
