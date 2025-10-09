import { ExternalLink, Download, FileText, BookOpen, Scale, History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Library() {
  const resources = [
    {
      title: "Tematică Oficială INM 2025",
      description: "Document oficial cu programa completă pentru examenul de admitere",
      icon: FileText,
      type: "PDF",
      date: "17.07.2025",
      url: "https://inm-lex.ro/concurs-de-admitere-la-institutul-national-al-magistraturii-organizat-in-perioada-iulie-2025-martie-2026-data-publicarii-17-07-2025/",
      category: "oficial"
    },
    {
      title: "Bibliografie Recomandată",
      description: "Lista completă de manuale și resurse bibliografice oficiale",
      icon: BookOpen,
      type: "Web",
      date: "Actualizat permanent",
      url: "https://www.csm1909.ro/Pages.aspx?PageId=283",
      category: "bibliografie"
    },
    {
      title: "Subiecte & Bareme Anterioare",
      description: "Arhivă completă cu subiectele date la sesiunile anterioare",
      icon: History,
      type: "Arhivă",
      date: "2020-2025",
      url: "https://inm-lex.ro/subiecte-admitere-la-inm-2024-2025/",
      category: "subiecte"
    },
    {
      title: "Regulamente & Proceduri",
      description: "Regulament admitere INM (nr. 114/2023) și alte documente oficiale",
      icon: Scale,
      type: "Legal",
      date: "2023",
      url: "https://www.csm1909.ro",
      category: "regulamente"
    }
  ];

  const subjects = [
    {
      id: "civil",
      name: "Drept Civil",
      chapters: [
        "Persoanele fizice și juridice",
        "Capacitatea de exercițiu",
        "Bunurile și patrimoniul",
        "Dreptul de proprietate",
        "Drepturi reale principale",
        "Drepturi reale accesorii",
        "Obligațiile civile",
        "Contracte speciale",
        "Răspunderea civilă delictuală",
        "Prescripția extinctivă și decăderea"
      ]
    },
    {
      id: "civil-procedural", 
      name: "Drept Procesual Civil",
      chapters: [
        "Principiile procesului civil",
        "Competența instanțelor",
        "Părțile în proces",
        "Actele de procedură",
        "Probele în procesul civil",
        "Judecata în primeira instanță",
        "Căile de atac ordinare",
        "Căile de atac extraordinare",
        "Executarea silită",
        "Proceduri speciale"
      ]
    },
    {
      id: "penal",
      name: "Drept Penal", 
      chapters: [
        "Principiile dreptului penal",
        "Legea penală în timp și spațiu",
        "Infracțiunea",
        "Formele infracțiunii",
        "Cauzele care înlătură caracterul penal",
        "Sancțiunile penale",
        "Individualizarea pedepsei",
        "Aplicarea pedepsei",
        "Infracțiuni contra persoanei",
        "Infracțiuni contra patrimoniului"
      ]
    },
    {
      id: "penal-procedural",
      name: "Drept Procesual Penal",
      chapters: [
        "Principiile procesului penal",
        "Organele de urmărire penală",
        "Participanții la procesul penal",
        "Probele în procesul penal", 
        "Măsurile preventive",
        "Urmărirea penală",
        "Trimiterea în judecată",
        "Judecata",
        "Căile de atac",
        "Executarea hotărârilor penale"
      ]
    }
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-foreground">Bibliotecă Digitală</h2>
        <p className="text-muted-foreground mt-1">
          Resurse oficiale, tematică și bibliografie pentru Admiterea INM 2025
        </p>
      </div>

      {/* Official Resources */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {resources.map((resource, index) => {
          const Icon = resource.icon;
          
          return (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    resource.category === 'oficial' ? 'bg-primary/10' :
                    resource.category === 'bibliografie' ? 'bg-success/10' :
                    resource.category === 'subiecte' ? 'bg-accent/10' :
                    'bg-muted'
                  }`}>
                    <Icon className={`h-6 w-6 ${
                      resource.category === 'oficial' ? 'text-primary' :
                      resource.category === 'bibliografie' ? 'text-success' :
                      resource.category === 'subiecte' ? 'text-accent' :
                      'text-muted-foreground'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{resource.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mb-3">
                      {resource.description}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="bg-muted px-2 py-1 rounded">{resource.type}</span>
                      <span>• {resource.date}</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => window.open(resource.url, '_blank')}
                  data-testid={`open-resource-${index}`}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Accesează Resursa
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Subject Syllabus */}
      <div>
        <h3 className="text-2xl font-semibold mb-6">Tematică pe Materii</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {subjects.map((subject) => (
            <Card key={subject.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                    <Scale className="h-5 w-5 text-primary" />
                  </div>
                  {subject.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {subject.chapters.map((chapter, index) => (
                    <div 
                      key={index}
                      className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-secondary/50 transition-colors"
                    >
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-medium flex items-center justify-center flex-shrink-0">
                        {index + 1}
                      </div>
                      <span className="text-sm">{chapter}</span>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 pt-4 border-t border-border">
                  <Link href={`/quiz/${subject.id}`}>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      data-testid={`practice-${subject.id}`}
                    >
                      Exersează {subject.name}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Study Tips */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Sfaturi pentru Studiu Eficient</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3">Organizarea timpului:</h4>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li>• Dedică 2-3 ore zilnic pentru studiu</li>
                <li>• Alternează materiile pentru diversitate</li>
                <li>• Ia pauze regulate de 15 minute</li>
                <li>• Programează simulări săptămânale</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Tehnici de memorare:</h4>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li>• Realizează scheme și diagrame</li>
                <li>• Repetă activ, nu doar citește</li>
                <li>• Asociază informațiile cu cazuri practice</li>
                <li>• Testează-te regulat cu grile</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
