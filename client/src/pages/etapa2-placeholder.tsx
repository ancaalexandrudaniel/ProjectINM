import { Link } from "wouter";
import { ArrowLeft, Construction, Brain, MessageSquare, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Etapa2PlaceholderProps {
  type: 'psihologic' | 'interviu';
}

export default function Etapa2Placeholder({ type }: Etapa2PlaceholderProps) {
  const isPsihologic = type === 'psihologic';
  
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
            {isPsihologic ? <Brain className="h-8 w-8" /> : <MessageSquare className="h-8 w-8" />}
            {isPsihologic ? 'Pregătire Test Psihologic' : 'Pregătire Interviu Final'}
          </h1>
          <p className="text-muted-foreground">
            ETAPA II - {isPsihologic ? 'Evaluare Psihologică' : 'Interviu cu Comisia'}
          </p>
        </div>
      </div>

      <Card className="border-orange-500/30 bg-orange-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-400">
            <Construction className="h-5 w-5" />
            Modul în Dezvoltare
          </CardTitle>
          <CardDescription>
            Această secțiune va fi disponibilă în curând
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {isPsihologic ? (
              <>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Brain className="h-4 w-4 text-cyan-400" />
                    Test Scris Psihologic
                  </h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Chestionare de personalitate</li>
                    <li>• Teste de raționament logic</li>
                    <li>• Evaluare capacități cognitive</li>
                    <li>• Simulări și exemple</li>
                  </ul>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Users className="h-4 w-4 text-cyan-400" />
                    Interviu cu Psihologii
                  </h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Întrebări frecvente</li>
                    <li>• Scenarii și situații</li>
                    <li>• Gestionarea stresului</li>
                    <li>• Sfaturi pentru autenticitate</li>
                  </ul>
                </div>
              </>
            ) : (
              <>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-cyan-400" />
                    Componente Interviu
                  </h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Prezentare personală și CV</li>
                    <li>• Analiză text la prima vedere</li>
                    <li>• Speță cu dilemă etică</li>
                    <li>• Motivația pentru magistratură</li>
                  </ul>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Users className="h-4 w-4 text-cyan-400" />
                    Pregătire Practică
                  </h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Modele de răspunsuri</li>
                    <li>• Dileme etice frecvente</li>
                    <li>• Fișă de personalitate</li>
                    <li>• Simulări de interviu</li>
                  </ul>
                </div>
              </>
            )}
          </div>

          <div className="p-4 border border-cyan-500/30 rounded-lg bg-cyan-500/5">
            <p className="text-sm">
              <strong className="text-cyan-400">Important:</strong> Conform structurii examenului INM, 
              testarea psihologică și interviul final sunt probe eliminatorii. Candidații primesc calificativul 
              "admis" sau "respins", fără a influența clasamentul final (care depinde de notele din Etapa I).
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
