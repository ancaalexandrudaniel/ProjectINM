// Seed script to populate database with sample legal questions for INM exam preparation
import { db } from "./db";
import { questions, users } from "@shared/schema";
import { eq } from "drizzle-orm";

export const sampleQuestions = [
  // Drept Civil - 10 questions
  {
    subject: "civil",
    chapter: "Persoanele fizice și juridice",
    difficulty: "medium",
    questionText: "Care dintre următoarele reprezintă o persoană juridică de drept privat?",
    options: [
      { text: "Ministerul Justiției", correct: false },
      { text: "Societatea comercială pe acțiuni", correct: true },
      { text: "Primăria municipiului București", correct: false },
      { text: "Curtea de Apel", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Societatea comercială pe acțiuni este o persoană juridică de drept privat, înființată în baza legii comerciale. Celelalte opțiuni sunt instituții publice, reprezentând persoane juridice de drept public.",
    legalReferences: ["Codul Civil, art. 187-188", "Legea nr. 31/1990"]
  },
  {
    subject: "civil",
    chapter: "Capacitatea de exercițiu",
    difficulty: "easy",
    questionText: "La ce vârstă dobândește o persoană fizică capacitate deplină de exercițiu?",
    options: [
      { text: "14 ani", correct: false },
      { text: "16 ani", correct: false },
      { text: "18 ani", correct: true },
      { text: "21 ani", correct: false }
    ],
    correctAnswer: 2,
    explanation: "Conform art. 38 C.civ., capacitatea deplină de exercițiu se dobândește la împlinirea vârstei de 18 ani, când persoana devine majoră.",
    legalReferences: ["Codul Civil, art. 38"]
  },
  {
    subject: "civil",
    chapter: "Dreptul de proprietate",
    difficulty: "hard",
    questionText: "Care dintre următoarele nu constituie un mod de dobândire a dreptului de proprietate?",
    options: [
      { text: "Accesiunea", correct: false },
      { text: "Uzucapiunea", correct: false },
      { text: "Servitutea", correct: true },
      { text: "Succesiunea", correct: false }
    ],
    correctAnswer: 2,
    explanation: "Servitutea este un drept real accesoriu, nu un mod de dobândire a proprietății. Accesiunea, uzucapiunea și succesiunea sunt moduri de dobândire a proprietății.",
    legalReferences: ["Codul Civil, art. 558-647", "Codul Civil, art. 713-746"]
  },
  {
    subject: "civil",
    chapter: "Obligațiile civile",
    difficulty: "medium",
    questionText: "Ce efect produce compensația asupra obligațiilor?",
    options: [
      { text: "Suspendă executarea obligației", correct: false },
      { text: "Stinge obligațiile reciproce", correct: true },
      { text: "Anulează obligațiile", correct: false },
      { text: "Amână termenul de plată", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Compensația stinge două obligații reciproce până la concurența celei mai mici dintre ele, conform art. 1616 C.civ.",
    legalReferences: ["Codul Civil, art. 1616-1622"]
  },
  {
    subject: "civil",
    chapter: "Contracte speciale",
    difficulty: "medium",
    questionText: "În contractul de vânzare-cumpărare, transmiterea proprietății are loc:",
    options: [
      { text: "La data semnării contractului", correct: false },
      { text: "La data plății prețului", correct: false },
      { text: "Prin acordul de voință al părților", correct: true },
      { text: "La data înregistrării în cartea funciară", correct: false }
    ],
    correctAnswer: 2,
    explanation: "Conform principiului consensualismului (art. 1674 C.civ.), proprietatea bunului se transmite prin simplul acord de voință al părților, fără alte formalități.",
    legalReferences: ["Codul Civil, art. 1674"]
  },
  {
    subject: "civil",
    chapter: "Răspunderea civilă delictuală",
    difficulty: "hard",
    questionText: "Care sunt condițiile răspunderii civile delictuale?",
    options: [
      { text: "Fapta ilicită, prejudiciul, raportul de cauzalitate", correct: true },
      { text: "Contractul, culpa, dauna", correct: false },
      { text: "Actul juridic, vinovăția, paguba", correct: false },
      { text: "Intenția, riscul, despăgubirea", correct: false }
    ],
    correctAnswer: 0,
    explanation: "Cele trei condiții cumulative ale răspunderii civile delictuale sunt: fapta ilicită (culpă/vinovăție), prejudiciul (dauna) și raportul de cauzalitate între faptă și prejudiciu.",
    legalReferences: ["Codul Civil, art. 1357"]
  },
  {
    subject: "civil",
    chapter: "Drepturi reale principale",
    difficulty: "medium",
    questionText: "Uzufructul poate fi constituit:",
    options: [
      { text: "Doar prin lege", correct: false },
      { text: "Prin lege, acte juridice sau uzucapiune", correct: true },
      { text: "Doar prin convenție", correct: false },
      { text: "Doar prin testament", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Uzufructul poate fi constituit prin lege (uzufruct legal), prin acte juridice (convenție, testament) sau prin uzucapiune, conform art. 746 C.civ.",
    legalReferences: ["Codul Civil, art. 746"]
  },
  {
    subject: "civil",
    chapter: "Bunurile și patrimoniul",
    difficulty: "easy",
    questionText: "Bunurile mobile sunt:",
    options: [
      { text: "Bunurile care pot fi mutate dintr-un loc în altul", correct: true },
      { text: "Doar bunurile înregistrate", correct: false },
      { text: "Bunurile care nu pot fi înstrăinate", correct: false },
      { text: "Bunurile care aparțin statului", correct: false }
    ],
    correctAnswer: 0,
    explanation: "Conform art. 535 C.civ., bunurile mobile sunt acelea care pot fi mutate dintr-un loc în altul, fie prin forțe proprii, fie prin forță externă.",
    legalReferences: ["Codul Civil, art. 535"]
  },
  {
    subject: "civil",
    chapter: "Drepturi reale accesorii",
    difficulty: "hard",
    questionText: "Ipoteca are ca obiect:",
    options: [
      { text: "Doar bunuri mobile", correct: false },
      { text: "Doar bunuri imobile", correct: true },
      { text: "Atât bunuri mobile cât și imobile", correct: false },
      { text: "Doar drepturi de creanță", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Ipoteca este o garanție reală care se constituie exclusiv asupra bunurilor imobile pentru garantarea executării unei obligații, conform art. 2343 C.civ.",
    legalReferences: ["Codul Civil, art. 2343"]
  },
  {
    subject: "civil",
    chapter: "Prescripția extinctivă",
    difficulty: "medium",
    questionText: "Care este termenul general de prescripție extinctivă?",
    options: [
      { text: "1 an", correct: false },
      { text: "3 ani", correct: true },
      { text: "5 ani", correct: false },
      { text: "10 ani", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Termenul general de prescripție extinctivă este de 3 ani de la nașterea dreptului la acțiune, conform art. 2517 C.civ.",
    legalReferences: ["Codul Civil, art. 2517"]
  },

  // Drept Procesual Civil - 8 questions
  {
    subject: "civil-procedural",
    chapter: "Competența instanțelor",
    difficulty: "medium",
    questionText: "Competența materială se determină în funcție de:",
    options: [
      { text: "Domiciliul pârâtului", correct: false },
      { text: "Natura și valoarea obiectului cererii", correct: true },
      { text: "Locul încheierii contractului", correct: false },
      { text: "Naționalitatea părților", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Conform art. 94 C.proc.civ., competența materială se stabilește în funcție de natura și valoarea obiectului cererii de chemare în judecată.",
    legalReferences: ["C.proc.civ., art. 94"]
  },
  {
    subject: "civil-procedural",
    chapter: "Probele în procesul civil",
    difficulty: "hard",
    questionText: "Mărturia este inadmisibilă pentru:",
    options: [
      { text: "Dovada existenței unui contract", correct: false },
      { text: "Dovada actelor juridice peste 250 lei", correct: true },
      { text: "Dovada comisioniștilor", correct: false },
      { text: "Dovada actelor de comerț", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Mărturia este inadmisibilă pentru a dovedi actele juridice cu o valoare peste 250 lei, fiind necesară proba scrisă, conform art. 309 C.proc.civ.",
    legalReferences: ["C.proc.civ., art. 309"]
  },
  {
    subject: "civil-procedural",
    chapter: "Căile de atac ordinare",
    difficulty: "medium",
    questionText: "Apelul se formulează în termen de:",
    options: [
      { text: "10 zile", correct: false },
      { text: "15 zile", correct: false },
      { text: "30 zile", correct: true },
      { text: "60 zile", correct: false }
    ],
    correctAnswer: 2,
    explanation: "Termenul de apel este de 30 de zile de la comunicarea hotărârii, conform art. 467 C.proc.civ.",
    legalReferences: ["C.proc.civ., art. 467"]
  },
  {
    subject: "civil-procedural",
    chapter: "Principiile procesului civil",
    difficulty: "easy",
    questionText: "Principiul disponibilității înseamnă:",
    options: [
      { text: "Judecătorul decide asupra introducerii în instanță", correct: false },
      { text: "Partea dispune de obiectul și limitele procesului", correct: true },
      { text: "Procesul este gratuit", correct: false },
      { text: "Procesul este secret", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Principiul disponibilității prevede că partea are dreptul să dispună de obiectul și limitele procesului (să introducă cererea, să renunțe, să facă tranzacții etc.).",
    legalReferences: ["C.proc.civ., art. 9"]
  },
  {
    subject: "civil-procedural",
    chapter: "Executarea silită",
    difficulty: "medium",
    questionText: "Titlul executoriu este:",
    options: [
      { text: "Cererea de chemare în judecată", correct: false },
      { text: "Hotărârea judecătorească definitivă și executorie", correct: true },
      { text: "Contractul semnat între părți", correct: false },
      { text: "Declarația pe propria răspundere", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Titlul executoriu este actul care conferă dreptul la executare silită, principalul exemplu fiind hotărârea judecătorească definitivă și executorie.",
    legalReferences: ["C.proc.civ., art. 632"]
  },
  {
    subject: "civil-procedural",
    chapter: "Judecata în primă instanță",
    difficulty: "medium",
    questionText: "Cererea de chemare în judecată se formulează:",
    options: [
      { text: "Oral în fața judecătorului", correct: false },
      { text: "În scris la instanța competentă", correct: true },
      { text: "Prin telefon", correct: false },
      { text: "Prin SMS", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Cererea de chemare în judecată trebuie formulată în scris și depusă la instanța competentă, conform art. 194 C.proc.civ.",
    legalReferences: ["C.proc.civ., art. 194"]
  },
  {
    subject: "civil-procedural",
    chapter: "Căile de atac extraordinare",
    difficulty: "hard",
    questionText: "Recursul în anulare se poate exercita pentru:",
    options: [
      { text: "Eroare de drept", correct: false },
      { text: "Greșită apreciere a probelor", correct: false },
      { text: "Cazuri limitativ enumerate de lege", correct: true },
      { text: "Orice nemulțumire a părții", correct: false }
    ],
    correctAnswer: 2,
    explanation: "Recursul în anulare este o cale extraordinară de atac care poate fi exercitată doar în cazurile limitativ și expres prevăzute de lege (art. 509 C.proc.civ.).",
    legalReferences: ["C.proc.civ., art. 509"]
  },
  {
    subject: "civil-procedural",
    chapter: "Actele de procedură",
    difficulty: "easy",
    questionText: "Citația este:",
    options: [
      { text: "Un act prin care se aduce la cunoștința părții data ședinței", correct: true },
      { text: "O hotărâre judecătorească", correct: false },
      { text: "Un mijloc de probă", correct: false },
      { text: "O cale de atac", correct: false }
    ],
    correctAnswer: 0,
    explanation: "Citația este actul de procedură prin care instanța comunică părților data și locul ședinței de judecată, conform art. 159 C.proc.civ.",
    legalReferences: ["C.proc.civ., art. 159"]
  },

  // Drept Penal - 12 questions
  {
    subject: "penal",
    chapter: "Principiile dreptului penal",
    difficulty: "easy",
    questionText: "Principiul legalității incriminării presupune:",
    options: [
      { text: "Nimeni nu poate fi sancționat pentru o faptă care nu este prevăzută de lege", correct: true },
      { text: "Legea penală se aplică retroactiv", correct: false },
      { text: "Judecătorul poate crea infracțiuni", correct: false },
      { text: "Analogia este permisă în defavoarea inculpatului", correct: false }
    ],
    correctAnswer: 0,
    explanation: "Principiul legalității (nullum crimen sine lege) prevede că nimeni nu poate fi tras la răspundere penală pentru o faptă care nu era prevăzută ca infracțiune de legea penală la momentul săvârșirii.",
    legalReferences: ["Cod penal, art. 1", "Constituție, art. 23(12)"]
  },
  {
    subject: "penal",
    chapter: "Legea penală în timp",
    difficulty: "medium",
    questionText: "Legea penală mai favorabilă se aplică:",
    options: [
      { text: "Doar în viitor", correct: false },
      { text: "Retroactiv și în executare", correct: true },
      { text: "Doar dacă este mai severă", correct: false },
      { text: "Niciodată retroactiv", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Conform art. 5 C.pen., legea penală mai favorabilă se aplică retroactiv (pentru faptele săvârșite anterior) și în executare (pentru condamnările în curs de executare).",
    legalReferences: ["Cod penal, art. 5"]
  },
  {
    subject: "penal",
    chapter: "Infracțiunea",
    difficulty: "medium",
    questionText: "Care nu este un element constitutiv al infracțiunii?",
    options: [
      { text: "Latura obiectivă", correct: false },
      { text: "Latura subiectivă", correct: false },
      { text: "Subiectul infracțiunii", correct: false },
      { text: "Sancțiunea penală", correct: true }
    ],
    correctAnswer: 3,
    explanation: "Elementele constitutive ale infracțiunii sunt: subiectul, latura obiectivă, latura subiectivă și obiectul infracțiunii. Sancțiunea este o consecință, nu un element constitutiv.",
    legalReferences: ["Cod penal, art. 15-17"]
  },
  {
    subject: "penal",
    chapter: "Formele infracțiunii",
    difficulty: "hard",
    questionText: "Tentativa se pedepsește:",
    options: [
      { text: "La toate infracțiunile", correct: false },
      { text: "Doar la infracțiunile intenționate pentru care legea prevede", correct: true },
      { text: "Doar la infracțiunile din culpă", correct: false },
      { text: "Niciodată", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Conform art. 32 C.pen., tentativa se pedepsește numai la infracțiunile săvârșite cu intenție și doar când legea prevede în mod expres pedepsirea tentativei.",
    legalReferences: ["Cod penal, art. 32"]
  },
  {
    subject: "penal",
    chapter: "Cauzele care înlătură caracterul penal",
    difficulty: "medium",
    questionText: "Legitima apărare presupune:",
    options: [
      { text: "Orice reacție împotriva unui atac", correct: false },
      { text: "Apărare proporțională împotriva unui atac injust", correct: true },
      { text: "Răzbunare pentru un prejudiciu suferit", correct: false },
      { text: "Atacul preventiv", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Legitima apărare (art. 19 C.pen.) presupune o apărare necesară și proporțională cu gravitatea atacului și cu pericolul ce amenință persoana, bunurile sale sau ale altuia.",
    legalReferences: ["Cod penal, art. 19"]
  },
  {
    subject: "penal",
    chapter: "Sancțiunile penale",
    difficulty: "easy",
    questionText: "Pedeapsa principală pentru persoane fizice poate fi:",
    options: [
      { text: "Închisoarea și amenda", correct: true },
      { text: "Doar închisoarea", correct: false },
      { text: "Munca în folosul comunității", correct: false },
      { text: "Interzicerea unor drepturi", correct: false }
    ],
    correctAnswer: 0,
    explanation: "Conform art. 61 C.pen., pedepsele principale aplicate persoanelor fizice sunt închisoarea și amenda. Celelalte sunt pedepse complementare sau accesorii.",
    legalReferences: ["Cod penal, art. 61"]
  },
  {
    subject: "penal",
    chapter: "Individualizarea pedepsei",
    difficulty: "medium",
    questionText: "Circumstanțele atenuante:",
    options: [
      { text: "Sunt limitativ enumerate de lege", correct: false },
      { text: "Pot fi orice împrejurări favorabile infractorului", correct: true },
      { text: "Nu influențează pedeapsa", correct: false },
      { text: "Se aplică doar la recidivă", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Circumstanțele atenuante nu sunt limitativ prevăzute de lege și pot fi orice împrejurări anterioare sau ulterioare săvârșirii infracțiunii, favorabile infractorului (art. 75 C.pen.).",
    legalReferences: ["Cod penal, art. 75"]
  },
  {
    subject: "penal",
    chapter: "Aplicarea pedepsei",
    difficulty: "hard",
    questionText: "Suspendarea executării pedepsei sub supraveghere se poate dispune dacă:",
    options: [
      { text: "Pedeapsa este de până la 10 ani", correct: false },
      { text: "Pedeapsa este de până la 3 ani", correct: true },
      { text: "La orice pedeapsă", correct: false },
      { text: "Doar pentru infracțiuni ușoare", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Conform art. 91 C.pen., suspendarea executării pedepsei sub supraveghere se poate dispune când pedeapsa stabilită este închisoarea de cel mult 3 ani.",
    legalReferences: ["Cod penal, art. 91"]
  },
  {
    subject: "penal",
    chapter: "Infracțiuni contra persoanei",
    difficulty: "medium",
    questionText: "Omorul calificat se pedepsește cu:",
    options: [
      { text: "Închisoare de la 1 la 5 ani", correct: false },
      { text: "Închisoare de la 5 la 15 ani", correct: false },
      { text: "Închisoare de la 10 la 20 ani și interzicerea unor drepturi", correct: true },
      { text: "Detenție pe viață", correct: false }
    ],
    correctAnswer: 2,
    explanation: "Omorul calificat prevăzut la art. 189 C.pen. se pedepsește cu închisoarea de la 10 la 20 ani și interzicerea exercitării unor drepturi.",
    legalReferences: ["Cod penal, art. 189"]
  },
  {
    subject: "penal",
    chapter: "Infracțiuni contra patrimoniului",
    difficulty: "medium",
    questionText: "Furtul se săvârșește prin:",
    options: [
      { text: "Luarea bunului altuia prin violență", correct: false },
      { text: "Luarea bunului altuia fără consimțământul acestuia", correct: true },
      { text: "Însușirea bunului găsit", correct: false },
      { text: "Refuzul de a restitui un bun împrumutat", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Furtul constă în luarea unui bun mobil din posesia sau detenția altuia, fără consimțământul acestuia, în scopul de a și-l însuși pe nedrept (art. 228 C.pen.).",
    legalReferences: ["Cod penal, art. 228"]
  },
  {
    subject: "penal",
    chapter: "Concursul de infracțiuni",
    difficulty: "hard",
    questionText: "În cazul concursului real de infracțiuni, pedeapsa se stabilește prin:",
    options: [
      { text: "Adunarea pedepselor", correct: false },
      { text: "Cumul juridic (pedeapsa cea mai grea + spor)", correct: true },
      { text: "Media aritmetică a pedepselor", correct: false },
      { text: "Aplicarea celei mai mici pedepse", correct: false }
    ],
    correctAnswer: 1,
    explanation: "La concursul real, se aplică sistemul cumulului juridic: se stabilește pedeapsa pentru fiecare infracțiune, apoi se aplică pedeapsa cea mai grea la care se adaugă un spor din celelalte pedepse (art. 39 C.pen.).",
    legalReferences: ["Cod penal, art. 39"]
  },
  {
    subject: "penal",
    chapter: "Răspunderea penală",
    difficulty: "easy",
    questionText: "Vârsta răspunderii penale este de:",
    options: [
      { text: "12 ani", correct: false },
      { text: "14 ani", correct: true },
      { text: "16 ani", correct: false },
      { text: "18 ani", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Conform art. 113 C.pen., răspunde penal minorul care a împlinit vârsta de 14 ani și a săvârșit o faptă prevăzută de legea penală.",
    legalReferences: ["Cod penal, art. 113"]
  },

  // Drept Procesual Penal - 10 questions
  {
    subject: "penal-procedural",
    chapter: "Principiile procesului penal",
    difficulty: "easy",
    questionText: "Prezumția de nevinovăție înseamnă:",
    options: [
      { text: "Inculpatul este considerat nevinovat până la proba contrară", correct: true },
      { text: "Inculpatul trebuie să își dovedească nevinovăția", correct: false },
      { text: "Procurorul nu trebuie să dovedească vinovăția", correct: false },
      { text: "Instanța presupune vinovăția", correct: false }
    ],
    correctAnswer: 0,
    explanation: "Conform art. 4 C.proc.pen., orice persoană este considerată nevinovată până când vinovăția sa este stabilită prin hotărâre definitivă de condamnare.",
    legalReferences: ["C.proc.pen., art. 4", "Constituție, art. 23(11)"]
  },
  {
    subject: "penal-procedural",
    chapter: "Organele de urmărire penală",
    difficulty: "medium",
    questionText: "Procurorul conduce și supraveghează:",
    options: [
      { text: "Judecata", correct: false },
      { text: "Urmărirea penală", correct: true },
      { text: "Executarea pedepsei", correct: false },
      { text: "Apărarea inculpatului", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Conform art. 55 C.proc.pen., procurorul conduce și supraveghează activitatea de cercetare penală desfășurată de organele de cercetare penală în faza de urmărire penală.",
    legalReferences: ["C.proc.pen., art. 55"]
  },
  {
    subject: "penal-procedural",
    chapter: "Probele în procesul penal",
    difficulty: "medium",
    questionText: "Declarația suspectului/inculpatului este:",
    options: [
      { text: "Un mijloc de probă obligatoriu", correct: false },
      { text: "Un drept al suspectului/inculpatului", correct: true },
      { text: "O obligație a inculpatului", correct: false },
      { text: "Interzisă de lege", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Declarația suspectului sau inculpatului este un drept al acestuia, nu o obligație. El are dreptul să nu facă nicio declarație și să nu răspundă la întrebări (art. 83 C.proc.pen.).",
    legalReferences: ["C.proc.pen., art. 83"]
  },
  {
    subject: "penal-procedural",
    chapter: "Măsurile preventive",
    difficulty: "hard",
    questionText: "Arestarea preventivă se poate dispune pentru o durată de:",
    options: [
      { text: "Maximum 10 zile", correct: false },
      { text: "30 de zile, cu posibilitatea prelungirii", correct: true },
      { text: "3 luni, fără prelungire", correct: false },
      { text: "1 an", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Conform art. 238 C.proc.pen., arestarea preventivă se dispune pe o durată de cel mult 30 de zile și poate fi prelungită în condițiile legii.",
    legalReferences: ["C.proc.pen., art. 238"]
  },
  {
    subject: "penal-procedural",
    chapter: "Urmărirea penală",
    difficulty: "medium",
    questionText: "Urmărirea penală începe:",
    options: [
      { text: "La data sesizării organului de urmărire penală", correct: false },
      { text: "Din oficiu sau la sesizare", correct: true },
      { text: "Doar la plângerea prealabilă", correct: false },
      { text: "După autorizarea judecătorului", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Urmărirea penală se efectuează din oficiu sau la sesizarea organului de urmărire penală, cu excepția cazurilor în care legea prevede plângerea prealabilă (art. 305 C.proc.pen.).",
    legalReferences: ["C.proc.pen., art. 305"]
  },
  {
    subject: "penal-procedural",
    chapter: "Trimiterea în judecată",
    difficulty: "medium",
    questionText: "Rechizitoriul este actul prin care:",
    options: [
      { text: "Se clasează cauza", correct: false },
      { text: "Procurorul dispune trimiterea în judecată", correct: true },
      { text: "Instanța pronunță sentința", correct: false },
      { text: "Se solicită arestarea", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Rechizitoriul este actul prin care procurorul dispune trimiterea în judecată a inculpatului, după finalizarea urmăririi penale (art. 327 C.proc.pen.).",
    legalReferences: ["C.proc.pen., art. 327"]
  },
  {
    subject: "penal-procedural",
    chapter: "Judecata",
    difficulty: "easy",
    questionText: "Dezbaterile judiciare sunt:",
    options: [
      { text: "Secrete", correct: false },
      { text: "Publice, cu excepțiile prevăzute de lege", correct: true },
      { text: "În scris", correct: false },
      { text: "Opționale", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Conform art. 352 C.proc.pen., ședințele de judecată sunt publice, cu excepția cazurilor în care legea dispune altfel pentru protejarea unor interese superioare.",
    legalReferences: ["C.proc.pen., art. 352"]
  },
  {
    subject: "penal-procedural",
    chapter: "Căile de atac",
    difficulty: "medium",
    questionText: "Apelul se judecă de:",
    options: [
      { text: "Aceeași instanță", correct: false },
      { text: "Instanța ierarhic superioară", correct: true },
      { text: "Curtea Constituțională", correct: false },
      { text: "Parchet", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Apelul se judecă de instanța ierarhic superioară celei care a pronunțat hotărârea atacată (art. 417 C.proc.pen.).",
    legalReferences: ["C.proc.pen., art. 417"]
  },
  {
    subject: "penal-procedural",
    chapter: "Executarea hotărârilor penale",
    difficulty: "hard",
    questionText: "Liberarea condițională se poate acorda dacă:",
    options: [
      { text: "S-a executat jumătate din pedeapsă", correct: false },
      { text: "S-a executat 2/3 din pedeapsă și există progrese în reeducare", correct: true },
      { text: "S-a executat 1/3 din pedeapsă", correct: false },
      { text: "Condamnatul solicită", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Liberarea condițională se acordă dacă s-au executat cel puțin 2/3 din durata pedepsei și condamnatul a făcut progrese constante în reeducare (art. 100 C.pen.).",
    legalReferences: ["Cod penal, art. 100", "C.proc.pen., art. 586"]
  },
  {
    subject: "penal-procedural",
    chapter: "Participanții la procesul penal",
    difficulty: "easy",
    questionText: "Avocatul în procesul penal:",
    options: [
      { text: "Este obligatoriu în toate cauzele", correct: false },
      { text: "Asigură apărarea suspectului/inculpatului", correct: true },
      { text: "Reprezintă doar procurorul", correct: false },
      { text: "Nu poate consulta dosarul", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Avocatul asigură exercitarea dreptului la apărare al suspectului sau inculpatului pe tot parcursul procesului penal (art. 90 C.proc.pen.).",
    legalReferences: ["C.proc.pen., art. 90"]
  }
];

async function seed() {
  console.log("🌱 Starting database seed...");

  try {
    // Check if questions already exist
    const existingQuestions = await db.select().from(questions).limit(1);
    
    if (existingQuestions.length > 0) {
      console.log("⚠️  Database already contains questions. Skipping seed.");
      return;
    }

    // Insert sample questions in batch
    await db.insert(questions).values(sampleQuestions);

    console.log(`✅ Successfully seeded ${sampleQuestions.length} questions`);
    console.log("\nBreakdown:");
    console.log(`- Drept Civil: ${sampleQuestions.filter(q => q.subject === 'civil').length} questions`);
    console.log(`- Drept Procesual Civil: ${sampleQuestions.filter(q => q.subject === 'civil-procedural').length} questions`);
    console.log(`- Drept Penal: ${sampleQuestions.filter(q => q.subject === 'penal').length} questions`);
    console.log(`- Drept Procesual Penal: ${sampleQuestions.filter(q => q.subject === 'penal-procedural').length} questions`);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

// Run seed
seed()
  .then(() => {
    console.log("\n✨ Seed complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
