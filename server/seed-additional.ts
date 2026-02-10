// Additional seed script to expand question database to 100+ questions
import { db } from "./db";
import { questions } from "@shared/schema";

export const additionalQuestions = [
  // Drept Civil - 15 additional questions
  {
    subject: "civil",
    chapter: "Capacitatea de exercițiu",
    difficulty: "medium",
    questionText: "Minorul cu capacitate de exercițiu restrânsă poate încheia singur:",
    options: [
      { text: "Contracte de valoare mare", correct: false },
      { text: "Acte de conservare", correct: true },
      { text: "Acte de dispoziție", correct: false },
      { text: "Acte de administrare", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Minorul cu capacitate restrânsă (14-18 ani) poate încheia singur numai acte de conservare și acte de dispoziție cu privire la bunurile pe care le-a dobândit din muncă sa.",
    legalReferences: ["Codul Civil, art. 41"]
  },
  {
    subject: "civil",
    chapter: "Bunurile și patrimoniul",
    difficulty: "hard",
    questionText: "Bunurile imobile prin destinație sunt:",
    options: [
      { text: "Mobile care devin imobile prin legea lor", correct: false },
      { text: "Mobile afectate exploatării unui imobil", correct: true },
      { text: "Toate bunurile fixate în sol", correct: false },
      { text: "Bunurile înscrise în cartea funciară", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Bunurile imobile prin destinație sunt bunuri mobile care, prin afectarea lor la exploatarea unui bun imobil, capătă regimul juridic al bunurilor imobile (art. 532 C.civ.).",
    legalReferences: ["Codul Civil, art. 532"]
  },
  {
    subject: "civil",
    chapter: "Contracte speciale",
    difficulty: "medium",
    questionText: "În contractul de locațiune, locatarul are obligația:",
    options: [
      { text: "Să plătească impozitele", correct: false },
      { text: "Să plătească chiria și să folosească bunul ca un bun proprietar", correct: true },
      { text: "Să facă reparațiile capitale", correct: false },
      { text: "Să asigure bunul", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Principalele obligații ale locatarului sunt: plata chiriei la termenele stabilite și folosirea bunului ca un bun proprietar, conform art. 1788 C.civ.",
    legalReferences: ["Codul Civil, art. 1788-1790"]
  },
  {
    subject: "civil",
    chapter: "Dreptul de proprietate",
    difficulty: "easy",
    questionText: "Caracterele dreptului de proprietate sunt:",
    options: [
      { text: "Absolut, exclusiv, perpetuu", correct: true },
      { text: "Relativ, temporar, limitat", correct: false },
      { text: "Accesibil, divizibil, temporar", correct: false },
      { text: "Abstract, concret, perpetuu", correct: false }
    ],
    correctAnswer: 0,
    explanation: "Dreptul de proprietate este un drept real absolut (opozabil erga omnes), exclusiv (titular este doar proprietarul) și perpetuu (nu se stinge prin neuz).",
    legalReferences: ["Codul Civil, art. 555-556"]
  },
  {
    subject: "civil",
    chapter: "Drepturi reale accesorii",
    difficulty: "hard",
    questionText: "Privilegiul general este:",
    options: [
      { text: "O garanție reală asupra bunurilor mobile", correct: false },
      { text: "Un drept de preferință acordat unor creditori", correct: true },
      { text: "O formă de ipotecă", correct: false },
      { text: "O cauză de preferin ță specială", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Privilegiul general este un drept de preferință acordat de lege anumitor creditori în considerarea calității creanței lor, care poartă asupra totalității bunurilor mobile ale debitorului.",
    legalReferences: ["Codul Civil, art. 2332-2336"]
  },
  {
    subject: "civil",
    chapter: "Obligațiile civile",
    difficulty: "medium",
    questionText: "Novația se poate face prin:",
    options: [
      { text: "Schimbarea obiectului, creditorului sau debitorului", correct: true },
      { text: "Doar prin schimbarea sumei", correct: false },
      { text: "Prin schimbarea locului de plată", correct: false },
      { text: "Prin amânarea termenului", correct: false }
    ],
    correctAnswer: 0,
    explanation: "Novația este un mod de stingere a obligațiilor prin schimbarea elementelor acesteia: obiectului (novație obiectivă) sau subiecților - creditor sau debitor (novație subiectivă), conform art. 1629 C.civ.",
    legalReferences: ["Codul Civil, art. 1629-1632"]
  },
  {
    subject: "civil",
    chapter: "Răspunderea civilă delictuală",
    difficulty: "hard",
    questionText: "Răspunderea pentru fapta proprie presupune:",
    options: [
      { text: "Doar prejudiciul", correct: false },
      { text: "Fapta ilicită, prejudiciul, legătura de cauzalitate, vinovăția", correct: true },
      { text: "Doar vinovăția", correct: false },
      { text: "Riscul și prejudiciul", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Răspunderea pentru fapta proprie necesită 4 condiții cumulative: fapta ilicită (acțiune/inacțiune contrară legii), prejudiciul (dauna materială/morală), legătura de cauzalitate și vinovăția (culpă/dolozitate).",
    legalReferences: ["Codul Civil, art. 1357"]
  },
  {
    subject: "civil",
    chapter: "Prescripția extinctivă",
    difficulty: "medium",
    questionText: "Întreruperea prescripției extinctive se produce prin:",
    options: [
      { text: "Cerere de chemare în judecată sau recunoașterea dreptului", correct: true },
      { text: "Doar prin plata datoriei", correct: false },
      { text: "Prin simpla cerere extrajudiciară", correct: false },
      { text: "Prin trecerea timpului", correct: false }
    ],
    correctAnswer: 0,
    explanation: "Întreruperea prescripției se face prin cerere de chemare în judecată sau prin recunoașterea dreptului de către cel în dauna căruia curge prescripția (art. 2537 C.civ.).",
    legalReferences: ["Codul Civil, art. 2537-2541"]
  },
  {
    subject: "civil",
    chapter: "Persoanele fizice și juridice",
    difficulty: "medium",
    questionText: "Sediul profesional al unei persoane fizice este:",
    options: [
      { text: "Același cu domiciliul", correct: false },
      { text: "Locul unde își exercită profesia în mod obișnuit", correct: true },
      { text: "Locul unde s-a născut", correct: false },
      { text: "Reședința sa", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Sediul profesional este locul unde persoana fizică își exercită în mod obișnuit profesia sau activitatea independentă (art. 87 C.civ.).",
    legalReferences: ["Codul Civil, art. 87"]
  },
  {
    subject: "civil",
    chapter: "Contracte speciale",
    difficulty: "hard",
    questionText: "Contractul de mandat este:",
    options: [
      { text: "Un contract real", correct: false },
      { text: "Un contract consensual, bilateral și cu titlu gratuit/oneros", correct: true },
      { text: "Un contract solemn", correct: false },
      { text: "Un contract unilateral", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Mandatul este un contract consensual (se încheie prin simplul acord de voințe), bilateral (creează obligații pentru ambele părți) și poate fi cu titlu gratuit sau oneros.",
    legalReferences: ["Codul Civil, art. 2009"]
  },
  {
    subject: "civil",
    chapter: "Drepturi reale principale",
    difficulty: "medium",
    questionText: "Superficia este:",
    options: [
      { text: "Dreptul de a construi pe terenul altuia", correct: true },
      { text: "Dreptul de a culege fructele", correct: false },
      { text: "Dreptul de a folosi terenul", correct: false },
      { text: "Dreptul de proprietate", correct: false }
    ],
    correctAnswer: 0,
    explanation: "Superficia este dreptul real principal de a avea o construcție pe terenul altuia (art. 694 C.civ.).",
    legalReferences: ["Codul Civil, art. 694-697"]
  },
  {
    subject: "civil",
    chapter: "Obligațiile civile",
    difficulty: "easy",
    questionText: "Executarea în natură a obligației înseamnă:",
    options: [
      { text: "Plata unor daune-interese", correct: false },
      { text: "Executarea exactă a prestației datorate", correct: true },
      { text: "Executarea prin echivalent bănesc", correct: false },
      { text: "Anularea obligației", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Executarea în natură constă în prestarea exactă a obligației așa cum a fost convenită, fiind principalul mod de executare voluntară a obligațiilor (art. 1516 C.civ.).",
    legalReferences: ["Codul Civil, art. 1516"]
  },
  {
    subject: "civil",
    chapter: "Bunurile și patrimoniul",
    difficulty: "medium",
    questionText: "Bunurile fungibile sunt:",
    options: [
      { text: "Bunurile care se pot înlocui unele cu altele", correct: true },
      { text: "Bunurile care nu pot fi înlocuite", correct: false },
      { text: "Bunurile mobile", correct: false },
      { text: "Bunurile imobile", correct: false }
    ],
    correctAnswer: 0,
    explanation: "Bunurile fungibile sunt acelea care pot fi înlocuite unele cu altele în raporturile juridice, având aceeași putere liberatorie (ex: bani, cereale).",
    legalReferences: ["Codul Civil, art. 543"]
  },
  {
    subject: "civil",
    chapter: "Răspunderea civilă delictuală",
    difficulty: "medium",
    questionText: "Răspunderea pentru produse defectuoase este:",
    options: [
      { text: "O răspundere bazată pe culpă", correct: false },
      { text: "O răspundere obiectivă", correct: true },
      { text: "O răspundere contractuală", correct: false },
      { text: "O răspundere penală", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Răspunderea pentru produse defectuoase este o răspundere obiectivă (fără culpă), producătorul răspunzând indiferent de vinovăție pentru prejudiciile cauzate de defectele produselor.",
    legalReferences: ["Codul Civil, art. 1349-1356"]
  },
  {
    subject: "civil",
    chapter: "Prescripția extinctivă",
    difficulty: "hard",
    questionText: "Suspendarea prescripției:",
    options: [
      { text: "Șterge timpul scurs anterior", correct: false },
      { text: "Oprește temporar cursul prescripției fără a șterge timpul anterior", correct: true },
      { text: "Începe un termen nou", correct: false },
      { text: "Anulează prescripția", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Suspendarea prescripției oprește temporar cursul acesteia, dar nu șterge timpul scurs anterior. După încetarea cauzei de suspendare, prescripția continuă să curgă (art. 2532 C.civ.).",
    legalReferences: ["Codul Civil, art. 2532-2536"]
  },

  // Drept Procesual Civil - 15 additional questions
  {
    subject: "civil-procedural",
    chapter: "Competența instanțelor",
    difficulty: "medium",
    questionText: "Competența teritorială se stabilește după:",
    options: [
      { text: "Valoarea obiectului cererii", correct: false },
      { text: "Domiciliul pârâtului (regula generală)", correct: true },
      { text: "Natura litigiului", correct: false },
      { text: "Dorința reclamantului", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Regula generală a competenței teritoriale este 'actor sequitur forum rei' - acțiunea se introduce la instanța de la domiciliul pârâtului (art. 107 C.proc.civ.).",
    legalReferences: ["C.proc.civ., art. 107"]
  },
  {
    subject: "civil-procedural",
    chapter: "Părțile în proces",
    difficulty: "hard",
    questionText: "Intervenția forțată se dispune:",
    options: [
      { text: "La cererea intervenientului", correct: false },
      { text: "Din oficiu de către instanță sau la cererea părților", correct: true },
      { text: "Doar din oficiu", correct: false },
      { text: "La cererea martorilor", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Intervenția forțată (chemarea în garanție) poate fi dispusă din oficiu de către instanță sau la cererea părților pentru chemarea în judecată a unui terț (art. 67 C.proc.civ.).",
    legalReferences: ["C.proc.civ., art. 67"]
  },
  {
    subject: "civil-procedural",
    chapter: "Probele în procesul civil",
    difficulty: "medium",
    questionText: "Înscrisul sub semnătură privată face dovadă:",
    options: [
      { text: "De la data autentificării", correct: false },
      { text: "De la data când este recunoscut sau verificat în justiție", correct: true },
      { text: "De la data întocmirii", correct: false },
      { text: "Nu face niciodată dovadă", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Înscrisul sub semnătură privată face dovadă ca dată certă față de terți de la momentul când este recunoscut sau verificat în instanță (art. 274 C.proc.civ.).",
    legalReferences: ["C.proc.civ., art. 274"]
  },
  {
    subject: "civil-procedural",
    chapter: "Actele de procedură",
    difficulty: "easy",
    questionText: "Termenul procesual este:",
    options: [
      { text: "O perioadă de timp în care trebuie îndeplinit un act procesual", correct: true },
      { text: "Ziua în care se ține ședința", correct: false },
      { text: "Data pronunțării hotărârii", correct: false },
      { text: "Durata procesului", correct: false }
    ],
    correctAnswer: 0,
    explanation: "Termenul procesual este intervalul de timp în care trebuie îndeplinit un act de procedură sau în care poate fi exercitat un drept procesual (art. 179 C.proc.civ.).",
    legalReferences: ["C.proc.civ., art. 179-188"]
  },
  {
    subject: "civil-procedural",
    chapter: "Căile de atac ordinare",
    difficulty: "hard",
    questionText: "Judecata în apel se face:",
    options: [
      { text: "Doar pe baza dosarului", correct: false },
      { text: "Cu rejudecare în fapt și în drept", correct: true },
      { text: "Doar în drept", correct: false },
      { text: "Cu rejudecare doar în fapt", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Instanța de apel rejudecă cauza atât în fapt cât și în drept, putând administra probe noi și poate pronunța o hotărâre diferită de prima instanță (art. 476 C.proc.civ.).",
    legalReferences: ["C.proc.civ., art. 476"]
  },
  {
    subject: "civil-procedural",
    chapter: "Executarea silită",
    difficulty: "medium",
    questionText: "Executarea silită se întemeiază pe:",
    options: [
      { text: "Cererea de chemare în judecată", correct: false },
      { text: "Titlu executoriu și înștiințare de executare", correct: true },
      { text: "Contractul dintre părți", correct: false },
      { text: "Hotărârea atacată", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Executarea silită se face în baza titlului executoriu și necesită înștiințarea debitorului prin înștiințare de executare (art. 662 C.proc.civ.).",
    legalReferences: ["C.proc.civ., art. 662-663"]
  },
  {
    subject: "civil-procedural",
    chapter: "Principiile procesului civil",
    difficulty: "medium",
    questionText: "Principiul contradictorialității presupune:",
    options: [
      { text: "Judecătorul decide singur", correct: false },
      { text: "Părțile au dreptul de a fi ascultate și de a-și formula apărările", correct: true },
      { text: "Procesul este secret", correct: false },
      { text: "Procesul este gratuit", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Principiul contradictorialității garantează că părțile au dreptul de a fi ascultate, de a cunoaște pretențiile adverse și de a-și formula apărările (art. 13 C.proc.civ.).",
    legalReferences: ["C.proc.civ., art. 13"]
  },
  {
    subject: "civil-procedural",
    chapter: "Judecata în primă instanță",
    difficulty: "hard",
    questionText: "Judecata în lipsă se poate face când:",
    options: [
      { text: "Pârâtul nu dorește să vină", correct: false },
      { text: "Pârâtul legal citat nu se prezintă", correct: true },
      { text: "Reclamantul nu se prezintă", correct: false },
      { text: "Martorii nu vin", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Judecata în lipsă poate avea loc când pârâtul, deși legal citat, nu se prezintă la ședința de judecată (art. 234 C.proc.civ.).",
    legalReferences: ["C.proc.civ., art. 234"]
  },
  {
    subject: "civil-procedural",
    chapter: "Căile de atac extraordinare",
    difficulty: "hard",
    questionText: "Contestația în anulare se poate introduce:",
    options: [
      { text: "Pentru orice nemulțumire", correct: false },
      { text: "Pentru motive limitativ prevăzute de lege", correct: true },
      { text: "Pentru greșită interpretare", correct: false },
      { text: "Pentru eroare de fapt", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Contestația în anulare este o cale extraordinară de atac care poate fi exercitată doar pentru motivele limitativ și expres prevăzute de art. 503 C.proc.civ.",
    legalReferences: ["C.proc.civ., art. 503-508"]
  },
  {
    subject: "civil-procedural",
    chapter: "Proceduri speciale",
    difficulty: "medium",
    questionText: "Ordonanța președințială este:",
    options: [
      { text: "O hotărâre definitivă", correct: false },
      { text: "O măsură provizorie pronunțată de președintele instanței", correct: true },
      { text: "O hotărâre executorie", correct: false },
      { text: "O cale de atac", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Ordonanța președințială este o măsură provizorie pe care președintele instanței o poate lua pentru soluționarea provizorie a unei situații urgente (art. 996 C.proc.civ.).",
    legalReferences: ["C.proc.civ., art. 996-1007"]
  },
  {
    subject: "civil-procedural",
    chapter: "Competența instanțelor",
    difficulty: "easy",
    questionText: "Judecătoria este competentă să judece:",
    options: [
      { text: "Doar cauze până la 200.000 lei", correct: false },
      { text: "Cauze în primă instanță, în limitele legii", correct: true },
      { text: "Doar căile de atac", correct: false },
      { text: "Doar cauze penale", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Judecătoria are competență de primă instanță pentru cauzele în materie civilă în limitele prevăzute de lege (art. 94-95 C.proc.civ.).",
    legalReferences: ["C.proc.civ., art. 94-95"]
  },
  {
    subject: "civil-procedural",
    chapter: "Probele în procesul civil",
    difficulty: "hard",
    questionText: "Expertiza judiciară se dispune când:",
    options: [
      { text: "Părțile o solicită", correct: false },
      { text: "Sunt necesare cunoștințe de specialitate", correct: true },
      { text: "Judecătorul nu vrea să analizeze dosarul", correct: false },
      { text: "Procesul durează prea mult", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Expertiza judiciară se dispune când lămurirea unei situații de fapt necesită cunoștințe de specialitate pe care judecătorul nu le are (art. 330 C.proc.civ.).",
    legalReferences: ["C.proc.civ., art. 330-343"]
  },
  {
    subject: "civil-procedural",
    chapter: "Executarea silită",
    difficulty: "medium",
    questionText: "Poprirea este:",
    options: [
      { text: "O măsură de executare asupra bunurilor mobile", correct: false },
      { text: "O măsură de executare asupra creanțelor", correct: true },
      { text: "O măsură de executare asupra imobilelor", correct: false },
      { text: "O cale de atac", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Poprirea este o modalitate de executare silită prin care se indisponibilizează sumele de bani sau alte bunuri pe care debitorul le are de primit de la terți (art. 780 C.proc.civ.).",
    legalReferences: ["C.proc.civ., art. 780-792"]
  },
  {
    subject: "civil-procedural",
    chapter: "Căile de atac ordinare",
    difficulty: "medium",
    questionText: "Recursul se judecă:",
    options: [
      { text: "Cu rejudecare în fapt și drept", correct: false },
      { text: "Numai în drept", correct: true },
      { text: "Doar în fapt", correct: false },
      { text: "Cu probe noi", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Recursul se judecă numai în drept, verificând corectitudinea aplicării legii de către instanța anterioară (art. 488 C.proc.civ.).",
    legalReferences: ["C.proc.civ., art. 488"]
  },
  {
    subject: "civil-procedural",
    chapter: "Actele de procedură",
    difficulty: "easy",
    questionText: "Încheierile sunt:",
    options: [
      { text: "Hotărâri definitive", correct: false },
      { text: "Hotărâri prin care se rezolvă chestiuni procedurale", correct: true },
      { text: "Acte ale părților", correct: false },
      { text: "Cereri de chemare în judecată", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Încheierile sunt hotărâri judecătorești prin care se rezolvă chestiuni de procedură sau incidente procesuale (art. 424 C.proc.civ.).",
    legalReferences: ["C.proc.civ., art. 424"]
  },

  // Drept Penal - 15 additional questions  
  {
    subject: "penal",
    chapter: "Legea penală în spațiu",
    difficulty: "medium",
    questionText: "Principiul teritorialității înseamnă:",
    options: [
      { text: "Legea penală română se aplică pentru infracțiuni săvârșite pe teritoriul României", correct: true },
      { text: "Legea penală se aplică oriunde", correct: false },
      { text: "Legea penală nu se aplică străinilor", correct: false },
      { text: "Legea penală se aplică doar românilor", correct: false }
    ],
    correctAnswer: 0,
    explanation: "Principiul teritorialității prevede că legea penală română se aplică infracțiunilor săvârșite pe teritoriul României, indiferent de cetățenia autorului (art. 7 C.pen.).",
    legalReferences: ["Cod penal, art. 7"]
  },
  {
    subject: "penal",
    chapter: "Infracțiunea",
    difficulty: "hard",
    questionText: "Infracțiunea continuată presupune:",
    options: [
      { text: "Mai multe acțiuni distincte", correct: false },
      { text: "Mai multe acțiuni sau inacțiuni executate în împrejurări asemănătoare în executarea aceleiași rezoluții infracționale", correct: true },
      { text: "O singură acțiune", correct: false },
      { text: "Mai multe victime", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Infracțiunea continuată (art. 35 C.pen.) presupune săvârșirea mai multor acțiuni/inacțiuni în împrejurări asemănătoare, în executarea aceleiași rezoluții infracționale, toate întrunind elementele aceleiași infracțiuni.",
    legalReferences: ["Cod penal, art. 35"]
  },
  {
    subject: "penal",
    chapter: "Formele infracțiunii",
    difficulty: "medium",
    questionText: "Actele preparatorii:",
    options: [
      { text: "Se pedepsesc întotdeauna", correct: false },
      { text: "Nu se pedepsesc, cu excepția cazurilor expres prevăzute", correct: true },
      { text: "Se pedepsesc la toate infracțiunile", correct: false },
      { text: "Sunt forme de participație", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Actele preparatorii (pregătirea infracțiunii) nu sunt pedepsite ca regulă generală, cu excepția cazurilor în care legea prevede expres sancționarea lor (art. 31 C.pen.).",
    legalReferences: ["Cod penal, art. 31"]
  },
  {
    subject: "penal",
    chapter: "Participația penală",
    difficulty: "hard",
    questionText: "Complicitatea presupune:",
    options: [
      { text: "Executarea directă a infracțiunii", correct: false },
      { text: "Ajutor sau înlesnire dat cu știință autorului pentru săvârșirea infracțiunii", correct: true },
      { text: "Determinarea la săvârșirea infracțiunii", correct: false },
      { text: "Participare după săvârșirea infracțiunii", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Complicele este persoana care, cu știință, înlesnește sau ajută în orice mod la săvârșirea faptei de către autor (art. 49 C.pen.).",
    legalReferences: ["Cod penal, art. 49"]
  },
  {
    subject: "penal",
    chapter: "Cauzele care înlătură caracterul penal",
    difficulty: "medium",
    questionText: "Starea de necesitate presupune:",
    options: [
      { text: "Salvarea unui bun propriu sau al altuia de la un pericol imediat prin sacrificarea altui bun", correct: true },
      { text: "Apărare împotriva unui atac", correct: false },
      { text: "Executarea ordinului", correct: false },
      { text: "Consimțământul victimei", correct: false }
    ],
    correctAnswer: 0,
    explanation: "Starea de necesitate (art. 20 C.pen.) există când salvarea de la un pericol imediat a unui bun propriu sau al altuia nu poate fi obținută decât prin sacrificarea altui bun, iar valoarea bunului salvat este vădit superioară valorii bunului sacrificat.",
    legalReferences: ["Cod penal, art. 20"]
  },
  {
    subject: "penal",
    chapter: "Sancțiunile penale",
    difficulty: "easy",
    questionText: "Pedeapsa complementară:",
    options: [
      { text: "Se aplică obligatoriu", correct: false },
      { text: "Se aplică facultativ alături de pedeapsa principală", correct: true },
      { text: "Înlocuiește pedeapsa principală", correct: false },
      { text: "Este o măsură de siguranță", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Pedeapsa complementară se aplică facultativ de către instanță alături de pedeapsa principală, constând în interzicerea unor drepturi (art. 65 C.pen.).",
    legalReferences: ["Cod penal, art. 65-67"]
  },
  {
    subject: "penal",
    chapter: "Individualizarea pedepsei",
    difficulty: "hard",
    questionText: "Circumstanțele agravante generale sunt:",
    options: [
      { text: "Limitativ enumerate", correct: true },
      { text: "Nelimitate", correct: false },
      { text: "La aprecierea instanței", correct: false },
      { text: "Doar recidiva", correct: false }
    ],
    correctAnswer: 0,
    explanation: "Circumstanțele agravante generale sunt limitativ prevăzute de lege (art. 77-78 C.pen.) și includ recidiva și infracțiunea săvârșită de o persoană în stare de intoxicație voluntară.",
    legalReferences: ["Cod penal, art. 77-78"]
  },
  {
    subject: "penal",
    chapter: "Aplicarea pedepsei",
    difficulty: "medium",
    questionText: "Amânarea aplicării pedepsei se dispune dacă:",
    options: [
      { text: "Pedeapsa e peste 3 ani", correct: false },
      { text: "Pedeapsa e de până la 2 ani și există premise favorabile de îndreptare", correct: true },
      { text: "La orice pedeapsă", correct: false },
      { text: "Doar pentru recidiviști", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Amânarea aplicării pedepsei poate fi dispusă când pedeapsa stabilită este închisoarea de cel mult 2 ani și există premise temeinice că infractorul se va îndrepta fără executare (art. 83 C.pen.).",
    legalReferences: ["Cod penal, art. 83"]
  },
  {
    subject: "penal",
    chapter: "Infracțiuni contra persoanei",
    difficulty: "medium",
    questionText: "Vătămarea corporală se pedepsește cu:",
    options: [
      { text: "Închisoare de la 3 luni la 2 ani sau amendă", correct: true },
      { text: "Doar amendă", correct: false },
      { text: "Închisoare de la 5 la 12 ani", correct: false },
      { text: "Detenție pe viață", correct: false }
    ],
    correctAnswer: 0,
    explanation: "Vătămarea corporală se pedepsește cu închisoare de la 3 luni la 2 ani sau cu amendă (art. 193 C.pen.).",
    legalReferences: ["Cod penal, art. 193"]
  },
  {
    subject: "penal",
    chapter: "Infracțiuni contra patrimoniului",
    difficulty: "hard",
    questionText: "Tâlhăria se deosebește de furt prin:",
    options: [
      { text: "Valoarea bunului furat", correct: false },
      { text: "Folosirea violenței sau amenințării pentru luarea bunului", correct: true },
      { text: "Locul săvârșirii", correct: false },
      { text: "Timpul săvârșirii", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Tâlhăria (art. 233 C.pen.) se caracterizează prin luarea bunului altuia prin violență, amenințare sau punerea în stare de inconștiență/neputință de a se apăra, spre deosebire de furt care se săvârșește fără violență.",
    legalReferences: ["Cod penal, art. 233"]
  },
  {
    subject: "penal",
    chapter: "Concursul de infracțiuni",
    difficulty: "medium",
    questionText: "Concursul formal de infracțiuni presupune:",
    options: [
      { text: "Mai multe fapte distincte", correct: false },
      { text: "O singură faptă care întrunește elementele mai multor infracțiuni", correct: true },
      { text: "Mai multe victime", correct: false },
      { text: "Participație la infracțiune", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Concursul formal (ideal) de infracțiuni există când o singură acțiune sau inacțiune a persoanei întrunește, în același timp, elementele constitutive ale mai multor infracțiuni (art. 38 alin. 2 C.pen.).",
    legalReferences: ["Cod penal, art. 38(2)"]
  },
  {
    subject: "penal",
    chapter: "Răspunderea penală",
    difficulty: "easy",
    questionText: "Cauza care înlătură răspunderea penală este:",
    options: [
      { text: "Prescripția răspunderii penale", correct: true },
      { text: "Circumstanța atenuantă", correct: false },
      { text: "Recidiva", correct: false },
      { text: "Agravarea pedepsei", correct: false }
    ],
    correctAnswer: 0,
    explanation: "Cauzele care înlătură răspunderea penală sunt prevăzute de art. 16 C.pen. și includ: lipsa plângerii prealabile, lipsa autorizării, amnistia, prescripția, decesul.",
    legalReferences: ["Cod penal, art. 16"]
  },
  {
    subject: "penal",
    chapter: "Infracțiunea",
    difficulty: "medium",
    questionText: "Eroarea de fapt înlătură vinovăția când:",
    options: [
      { text: "Persoana nu cunoaște legea", correct: false },
      { text: "Persoana nu cunoaște situația de fapt care constituie infracțiunea", correct: true },
      { text: "Persoana crede că face bine", correct: false },
      { text: "Întotdeauna", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Eroarea de fapt (art. 30 C.pen.) înlătură răspunderea penală când persoana nu cunoaște existența unei situații de fapt care constituie elementul material al infracțiunii.",
    legalReferences: ["Cod penal, art. 30"]
  },
  {
    subject: "penal",
    chapter: "Sancțiunile penale",
    difficulty: "hard",
    questionText: "Măsurile educative se aplică:",
    options: [
      { text: "Majorilor", correct: false },
      { text: "Minorilor care au săvârșit o faptă prevăzută de legea penală", correct: true },
      { text: "Persoanelor juridice", correct: false },
      { text: "Recidiviștilor", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Măsurile educative (art. 114-123 C.pen.) se aplică minorilor care au săvârșit o faptă prevăzută de legea penală și constau în: mustrare, asistență zilnică, libertate supravegheată, internare într-un centru educativ/detenție.",
    legalReferences: ["Cod penal, art. 114-123"]
  },
  {
    subject: "penal",
    chapter: "Infracțiuni contra persoanei",
    difficulty: "medium",
    questionText: "Lovirea sau vătămarea cauzatoare de moarte se caracterizează prin:",
    options: [
      { text: "Intenție directă de a ucide", correct: false },
      { text: "Praeterintenție (intenție de vătămare, rezultat de moarte)", correct: true },
      { text: "Culpă", correct: false },
      { text: "Caz fortuit", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Lovirea sau vătămarea cauzatoare de moarte (art. 195 C.pen.) este o infracțiune praeterintențională: autorul are intenția de a lovi/vătăma, dar nu de a ucide, însă victima decedează.",
    legalReferences: ["Cod penal, art. 195"]
  },

  // Drept Procesual Penal - 10 additional questions
  {
    subject: "penal-procedural",
    chapter: "Principiile procesului penal",
    difficulty: "medium",
    questionText: "Aflarea adevărului înseamnă:",
    options: [
      { text: "Instanța decide fără probe", correct: false },
      { text: "Organele judiciare au obligația de a stabili starea de fapt reală", correct: true },
      { text: "Părțile stabilesc adevărul", correct: false },
      { text: "Martorii stabilesc vinovăția", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Principiul aflării adevărului (art. 5 C.proc.pen.) obligă organele judiciare să stabilească starea de fapt reală și să aplice corect legea penală.",
    legalReferences: ["C.proc.pen., art. 5"]
  },
  {
    subject: "penal-procedural",
    chapter: "Organele de urmărire penală",
    difficulty: "hard",
    questionText: "Organele de cercetare penală sunt:",
    options: [
      { text: "Judecătorii", correct: false },
      { text: "Polițiști, jandarmi și alte organe prevăzute de lege", correct: true },
      { text: "Avocații", correct: false },
      { text: "Părțile civile", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Organele de cercetare penală sunt: polițiștii, jandarmii și alte organe stabilite prin lege, care efectuează actele de urmărire penală sub conducerea și supravegherea procurorului (art. 56 C.proc.pen.).",
    legalReferences: ["C.proc.pen., art. 56"]
  },
  {
    subject: "penal-procedural",
    chapter: "Probele în procesul penal",
    difficulty: "medium",
    questionText: "Mijloacele de probă sunt:",
    options: [
      { text: "Doar declarațiile", correct: false },
      { text: "Declarații, înscrisuri, rapoarte de expertiză, mijloace materiale de probă", correct: true },
      { text: "Doar înscrisurile", correct: false },
      { text: "Doar expertiza", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Conform art. 97 C.proc.pen., mijloacele de probă sunt: declarațiile suspectului/inculpatului, declarațiile martorului, înscrisurile, rapoartele de expertiză și constatare, mijloacele materiale de probă.",
    legalReferences: ["C.proc.pen., art. 97"]
  },
  {
    subject: "penal-procedural",
    chapter: "Măsurile preventive",
    difficulty: "hard",
    questionText: "Măsura obligării de a nu părăsi țara se dispune dacă:",
    options: [
      { text: "Pentru orice infracțiune", correct: false },
      { text: "Există probe că suspectul/inculpatul a săvârșit infracțiunea și există temeri de sustragere", correct: true },
      { text: "Procurorul decide", correct: false },
      { text: "Victima cere", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Obligarea de a nu părăsi țara se dispune de judecătorul de drepturi și libertăți când există probe că persoana a săvârșit infracțiunea și există temeri justificate de sustragere de la urmărire/judecată (art. 215 C.proc.pen.).",
    legalReferences: ["C.proc.pen., art. 215"]
  },
  {
    subject: "penal-procedural",
    chapter: "Urmărirea penală",
    difficulty: "medium",
    questionText: "Soluția de clasare se ia când:",
    options: [
      { text: "Fapta există și e dovedită", correct: false },
      { text: "Fapta nu există, nu e prevăzută de legea penală sau există o cauză de netrimitere în judecată", correct: true },
      { text: "Suspectul recunoaște", correct: false },
      { text: "Victima cere", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Clasarea (art. 315 C.proc.pen.) se dispune când: fapta nu există, nu e prevăzută de legea penală, nu e o faptă penală, există o cauză de nepedepsire sau lipsește o condiție de procedibilitate.",
    legalReferences: ["C.proc.pen., art. 315-318"]
  },
  {
    subject: "penal-procedural",
    chapter: "Trimiterea în judecată",
    difficulty: "easy",
    questionText: "Camera preliminară are ca scop:",
    options: [
      { text: "Judecarea fondului", correct: false },
      { text: "Verificarea legalității actelor de urmărire penală și a administrării probelor", correct: true },
      { text: "Pronunțarea sentinței", correct: false },
      { text: "Arestarea inculpatului", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Procedura în camera preliminară (art. 342-350 C.proc.pen.) are ca scop verificarea legalității sesizării instanței și a actelor de urmărire penală, precum și a legalității și temeiniciei măsurilor preventive.",
    legalReferences: ["C.proc.pen., art. 342-350"]
  },
  {
    subject: "penal-procedural",
    chapter: "Judecata",
    difficulty: "hard",
    questionText: "Rejudecarea în fond poate avea loc:",
    options: [
      { text: "Întotdeauna", correct: false },
      { text: "În cazul în care instanța de apel constată că s-a greșit aplicarea legii", correct: false },
      { text: "Când instanța de apel admite apelul și constată neregularități grave sau rejudecă în baza probelor administrate", correct: true },
      { text: "Niciodată", correct: false }
    ],
    correctAnswer: 2,
    explanation: "Instanța de apel poate rejudeca cauza în fond când admite apelul și constată neregularități esențiale sau când judecă în baza probelor administrate în apel (art. 421 C.proc.pen.).",
    legalReferences: ["C.proc.pen., art. 421"]
  },
  {
    subject: "penal-procedural",
    chapter: "Căile de atac",
    difficulty: "medium",
    questionText: "Termenul de apel este de:",
    options: [
      { text: "5 zile", correct: false },
      { text: "10 zile de la comunicare", correct: true },
      { text: "30 zile", correct: false },
      { text: "60 zile", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Apelul se declară în termen de 10 zile de la comunicarea hotărârii, conform art. 411 C.proc.pen.",
    legalReferences: ["C.proc.pen., art. 411"]
  },
  {
    subject: "penal-procedural",
    chapter: "Executarea hotărârilor penale",
    difficulty: "hard",
    questionText: "Amânarea executării pedepsei se poate dispune:",
    options: [
      { text: "Pentru orice condamnat", correct: false },
      { text: "Când executarea imediată ar pune în pericol viața/sănătatea condamnatului", correct: true },
      { text: "La cererea condamnatului, fără condiții", correct: false },
      { text: "Doar pentru femei", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Amânarea executării pedepsei (art. 585 C.proc.pen.) se poate dispune când executarea imediată ar pune în pericol grav viața sau sănătatea condamnatului sau când condamnata este gravidă/are un copil sub 1 an.",
    legalReferences: ["C.proc.pen., art. 585"]
  },
  {
    subject: "penal-procedural",
    chapter: "Participanții la procesul penal",
    difficulty: "medium",
    questionText: "Partea civilă este:",
    options: [
      { text: "Persoana păgubită care cere despăgubiri în procesul penal", correct: true },
      { text: "Inculpatul", correct: false },
      { text: "Procurorul", correct: false },
      { text: "Martorul", correct: false }
    ],
    correctAnswer: 0,
    explanation: "Partea civilă este persoana fizică sau juridică care a suferit un prejudiciu prin infracțiune și își exercită acțiunea civilă în procesul penal pentru repararea prejudiciului (art. 19 C.proc.pen.).",
    legalReferences: ["C.proc.pen., art. 19-28"]
  }
];

async function seedAdditional() {
  console.log("🌱 Starting additional database seed...");

  try {
    // Insert additional questions in batch
    const withSetType = additionalQuestions.map(q => ({ ...q, setType: (q as any).setType || 'A' }));
    await db.insert(questions).values(withSetType as any);

    console.log(`✅ Successfully seeded ${additionalQuestions.length} additional questions`);
    console.log("\nBreakdown:");
    console.log(`- Drept Civil: ${additionalQuestions.filter(q => q.subject === 'civil').length} questions`);
    console.log(`- Drept Procesual Civil: ${additionalQuestions.filter(q => q.subject === 'civil-procedural').length} questions`);
    console.log(`- Drept Penal: ${additionalQuestions.filter(q => q.subject === 'penal').length} questions`);
    console.log(`- Drept Procesual Penal: ${additionalQuestions.filter(q => q.subject === 'penal-procedural').length} questions`);
    
    // Get total count
    const totals = await db.select().from(questions);
    console.log(`\n📊 Total questions in database: ${totals.length}`);
  } catch (error) {
    console.error("❌ Error seeding additional questions:", error);
    throw error;
  }
}

// Run seed
seedAdditional()
  .then(() => {
    console.log("\n✨ Additional seed complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
