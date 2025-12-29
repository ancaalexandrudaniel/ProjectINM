import { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  ArrowLeft, 
  GraduationCap, 
  Flame, 
  Clock, 
  Target, 
  Zap,
  Brain,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Info
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const subjectLabels: Record<string, string> = {
  'all': 'Toate Materiile',
  'civil': 'Drept Civil',
  'civil-procedural': 'Drept Procesual Civil',
  'penal': 'Drept Penal',
  'penal-procedural': 'Drept Procesual Penal'
};

export default function QuizModeSelect() {
  const [, setLocation] = useLocation();
  const [selectedMode, setSelectedMode] = useState<'exam' | 'god' | null>(null);
  const [subject, setSubject] = useState('all');
  const [questionCount, setQuestionCount] = useState(20);
  const [godModeSet, setGodModeSet] = useState<'A' | 'B' | 'C'>('A');
  const [timeLimit, setTimeLimit] = useState(180);

  const startQuiz = () => {
    if (selectedMode === 'exam') {
      const params = new URLSearchParams({
        mode: 'exam-simulation',
        subjects: subject,
        questionCount: questionCount.toString(),
        timeLimit: timeLimit.toString()
      });
      setLocation(`/quiz?${params.toString()}`);
    } else if (selectedMode === 'god') {
      const params = new URLSearchParams({
        mode: 'god-mode',
        subjects: subject,
        questionCount: questionCount.toString(),
        godModeSet: godModeSet
      });
      setLocation(`/quiz-god-mode?${params.toString()}`);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon" data-testid="back-home">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Target className="h-8 w-8" />
            Test Grilă - Alege Modul
          </h1>
          <p className="text-muted-foreground">
            Selectează tipul de test pe care vrei să-l susții
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card 
          className={`cursor-pointer transition-all hover:border-primary ${
            selectedMode === 'exam' ? 'border-primary ring-2 ring-primary/20' : ''
          }`}
          onClick={() => setSelectedMode('exam')}
          data-testid="select-exam-mode"
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-6 w-6 text-blue-500" />
                Simulare Examen INM
              </CardTitle>
              <Badge variant="secondary">Format Oficial</Badge>
            </div>
            <CardDescription>
              Exact ca la admiterea INM 2025
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 p-3 bg-secondary/50 rounded-lg">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>3 variante</span>
              </div>
              <div className="flex items-center gap-2 p-3 bg-secondary/50 rounded-lg">
                <Target className="h-4 w-4 text-blue-500" />
                <span>1 corectă</span>
              </div>
              <div className="flex items-center gap-2 p-3 bg-secondary/50 rounded-lg">
                <Clock className="h-4 w-4 text-orange-500" />
                <span>Timp limitat</span>
              </div>
              <div className="flex items-center gap-2 p-3 bg-secondary/50 rounded-lg">
                <Shield className="h-4 w-4 text-purple-500" />
                <span>100 întrebări</span>
              </div>
            </div>
            
            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm">
              <p className="text-blue-400">
                <strong>Format identic cu examenul real.</strong> Pregătește-te în condiții reale 
                pentru a-ți evalua corect nivelul.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all hover:border-primary ${
            selectedMode === 'god' ? 'border-primary ring-2 ring-primary/20' : ''
          }`}
          onClick={() => setSelectedMode('god')}
          data-testid="select-god-mode"
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Flame className="h-6 w-6 text-orange-500" />
                God Mode
              </CardTitle>
              <Badge variant="destructive">Dificultate Maximă</Badge>
            </div>
            <CardDescription>
              Format exponențial mai dificil pentru antrenament intens
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="p-3 bg-secondary/50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-green-500 border-green-500">Set A</Badge>
                  <span className="text-sm">Exact 1 variantă corectă</span>
                </div>
                <p className="text-xs text-muted-foreground">Similar cu examenul, dar cu 4 opțiuni</p>
              </div>
              
              <div className="p-3 bg-secondary/50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-yellow-500 border-yellow-500">Set B</Badge>
                  <span className="text-sm">1-3 variante corecte</span>
                </div>
                <p className="text-xs text-muted-foreground">Trebuie să selectezi TOATE răspunsurile corecte</p>
              </div>
              
              <div className="p-3 bg-secondary/50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-red-500 border-red-500">Set C</Badge>
                  <span className="text-sm">0-4 variante corecte</span>
                </div>
                <p className="text-xs text-muted-foreground">Poate să nu existe niciun răspuns corect!</p>
              </div>
            </div>

            <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg text-sm">
              <p className="text-orange-400">
                <strong>Scopul:</strong> Când revii la formatul INM cu 3 variante și 1 răspuns, 
                ți se va părea mult mai ușor.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedMode && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Configurare {selectedMode === 'exam' ? 'Simulare Examen' : 'God Mode'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Materie</Label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger data-testid="select-subject">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(subjectLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Număr întrebări: {questionCount}</Label>
                <Slider
                  value={[questionCount]}
                  onValueChange={([value]) => setQuestionCount(value)}
                  min={10}
                  max={selectedMode === 'exam' ? 100 : 50}
                  step={5}
                  data-testid="slider-question-count"
                />
              </div>

              {selectedMode === 'exam' && (
                <div className="space-y-2">
                  <Label>Timp limită: {timeLimit} minute</Label>
                  <Slider
                    value={[timeLimit]}
                    onValueChange={([value]) => setTimeLimit(value)}
                    min={30}
                    max={180}
                    step={15}
                    data-testid="slider-time-limit"
                  />
                </div>
              )}

              {selectedMode === 'god' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>Set de Dificultate</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p><strong>Set A:</strong> Exact 1 corectă (warmup)</p>
                          <p><strong>Set B:</strong> 1-3 corecte (intermediar)</p>
                          <p><strong>Set C:</strong> 0-4 corecte (expert)</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Select value={godModeSet} onValueChange={(v) => setGodModeSet(v as 'A' | 'B' | 'C')}>
                    <SelectTrigger data-testid="select-god-mode-set">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">
                        <span className="flex items-center gap-2">
                          <Badge variant="outline" className="text-green-500 border-green-500">A</Badge>
                          Exact 1 corectă
                        </span>
                      </SelectItem>
                      <SelectItem value="B">
                        <span className="flex items-center gap-2">
                          <Badge variant="outline" className="text-yellow-500 border-yellow-500">B</Badge>
                          1-3 corecte
                        </span>
                      </SelectItem>
                      <SelectItem value="C">
                        <span className="flex items-center gap-2">
                          <Badge variant="outline" className="text-red-500 border-red-500">C</Badge>
                          0-4 corecte (include "niciunul")
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {selectedMode === 'god' && godModeSet === 'C' && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-500">Mod Expert - Set C</p>
                    <p className="text-sm text-muted-foreground">
                      Unele întrebări pot avea <strong>0 răspunsuri corecte</strong>. În acest caz, 
                      trebuie să apeși butonul "Niciunul corect" în loc să selectezi o opțiune.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <Button 
              onClick={startQuiz} 
              size="lg" 
              className="w-full"
              data-testid="start-quiz"
            >
              {selectedMode === 'exam' ? (
                <>
                  <GraduationCap className="h-5 w-5 mr-2" />
                  Începe Simularea ({questionCount} întrebări, {timeLimit} min)
                </>
              ) : (
                <>
                  <Flame className="h-5 w-5 mr-2" />
                  Începe God Mode - Set {godModeSet} ({questionCount} întrebări)
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
