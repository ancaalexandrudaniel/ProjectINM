// Final seed script to reach 100+ questions
import { db } from "./db";
import { questions } from "@shared/schema";

export const finalQuestions = [
  // Final 10 questions - mix of all subjects
  {
    subject: "civil",
    chapter: "Contracte speciale",
    difficulty: "hard",
    questionText: "Contractul de antrepriză se deosebește de contractul de muncă prin:",
    options: [
      { text: "Nu există nicio diferență", correct: false },
      { text: "Antreprenorul este independent și își asumă riscul", correct: true },
      { text: "Durata contractului", correct: false },
      { text: "Valoarea remunerației", correct: false }
    ],
    correctAnswer: 1,
    explanation: "În contractul de antrepriză, antreprenorul lucrează independent, își asumă riscul și nu este subordonat beneficiarului, spre deosebire de contractul de muncă unde există raport de subordonare.",
    legalReferences: ["Codul Civil, art. 1851"]
  },
  {
    subject: "civil-procedural",
    chapter: "Probele în procesul civil",
    difficulty: "medium",
    questionText: "Interogatoriul este:",
    options: [
      { text: "Un mijloc de probă prin care instanța pune întrebări părților", correct: true },
      { text: "Un act de executare", correct: false },
      { text: "O cale de atac", correct: false },
      { text: "O procedură specială", correct: false }
    ],
    correctAnswer: 0,
    explanation: "Interogatoriul este mijlocul de probă prin care instanța pune părților întrebări pentru lămurirea unor chestiuni de fapt (art. 362 C.proc.civ.).",
    legalReferences: ["C.proc.civ., art. 362-367"]
  },
  {
    subject: "penal",
    chapter: "Infracțiuni contra persoanei",
    difficulty: "medium",
    questionText: "Violul se pedepsește cu:",
    options: [
      { text: "Închisoare de la 3 la 10 ani și interzicerea unor drepturi", correct: true },
      { text: "Doar amendă", correct: false },
      { text: "Închisoare de la 1 la 3 ani", correct: false },
      { text: "Avertisment", correct: false }
    ],
    correctAnswer: 0,
    explanation: "Violul se pedepsește cu închisoare de la 3 la 10 ani și interzicerea exercitării unor drepturi, conform art. 218 C.pen.",
    legalReferences: ["Cod penal, art. 218"]
  },
  {
    subject: "penal-procedural",
    chapter: "Probele în procesul penal",
    difficulty: "hard",
    questionText: "Interceptarea convorbirilor se poate dispune:",
    options: [
      { text: "De procuror singur", correct: false },
      { text: "De judecătorul de drepturi și libertăți la cererea procurorului", correct: true },
      { text: "De instanța de judecată", correct: false },
      { text: "De organele de poliție", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Interceptarea convorbirilor este o metodă specială de supraveghere care se dispune de judecătorul de drepturi și libertăți, la cererea motivată a procurorului (art. 140 C.proc.pen.).",
    legalReferences: ["C.proc.pen., art. 140"]
  },
  {
    subject: "civil",
    chapter: "Obligațiile civile",
    difficulty: "medium",
    questionText: "Cesiunea de creanță presupune:",
    options: [
      { text: "Transmiterea creanței de la cedent la cesionar", correct: true },
      { text: "Stingerea obligației", correct: false },
      { text: "Schimbarea debitorului", correct: false },
      { text: "Anularea contractului", correct: false }
    ],
    correctAnswer: 0,
    explanation: "Cesiunea de creanță este contractul prin care cedentu l transmite cesionarului dreptul său de creanță împotriva debitorului cedat (art. 1566 C.civ.).",
    legalReferences: ["Codul Civil, art. 1566-1579"]
  },
  {
    subject: "civil-procedural",
    chapter: "Executarea silită",
    difficulty: "hard",
    questionText: "Sechestrului asigurător îi corespunde în executare:",
    options: [
      { text: "Poprirea", correct: false },
      { text: "Executarea silită propriu-zisă", correct: true },
      { text: "Încetarea executării", correct: false },
      { text: "Suspendarea", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Sechestrului asigurător, care este o măsură asiguratorie luată în timpul procesului, îi corespunde în executare executarea silită propriu-zisă asupra bunurilor sechestrate.",
    legalReferences: ["C.proc.civ., art. 954"]
  },
  {
    subject: "penal",
    chapter: "Infracțiuni contra patrimoniului",
    difficulty: "medium",
    questionText: "Înșelăciunea constă în:",
    options: [
      { text: "Luarea bunului prin violență", correct: false },
      { text: "Inducerea în eroare a unei persoane pentru obținerea unui folos material injust", correct: true },
      { text: "Refuzul de a plăti", correct: false },
      { text: "Păstrarea bunului găsit", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Înșelăciunea (art. 244 C.pen.) constă în inducerea în eroare a unei persoane prin prezentarea ca adevărată a unei fapte mincinoase sau ca mincinoasă a unei fapte adevărate, în scopul obținerii unui folos patrimonial injust.",
    legalReferences: ["Cod penal, art. 244"]
  },
  {
    subject: "penal-procedural",
    chapter: "Urmărirea penală",
    difficulty: "medium",
    questionText: "Plângerea penală prealabilă se depune:",
    options: [
      { text: "La orice infracțiune", correct: false },
      { text: "Doar la infracțiunile pentru care legea o prevede expres", correct: true },
      { text: "La toate infracțiunile contra persoanei", correct: false },
      { text: "Nu există așa ceva", correct: false }
    ],
    correctAnswer: 1,
    explanation: "Plângerea penală prealabilă este o condiție de procedibilitate necesară doar la anumite infracțiuni pentru care legea o prevede expres (ex: vătămarea corporală simplă - art. 193 C.pen.).",
    legalReferences: ["C.proc.pen., art. 289"]
  },
  {
    subject: "civil",
    chapter: "Drepturi reale principale",
    difficulty: "easy",
    questionText: "Uzul este:",
    options: [
      { text: "Dreptul de a folosi bunul și de a culege fructele necesare nevoilor proprii", correct: true },
      { text: "Dreptul de a vinde bunul", correct: false },
      { text: "Dreptul de a distruge bunul", correct: false },
      { text: "Dreptul de a închiria bunul", correct: false }
    ],
    correctAnswer: 0,
    explanation: "Uzul este dreptul real de a folosi bunul altuia și de a culege fructele acestuia, în măsura necesară satisfacerii nevoilor proprii și ale familiei (art. 748 C.civ.).",
    legalReferences: ["Codul Civil, art. 748"]
  },
  {
    subject: "penal",
    chapter: "Aplicarea pedepsei",
    difficulty: "hard",
    questionText: "Liberarea condiționată se poate revoca dacă:",
    options: [
      { text: "Liberatul săvârșește o nouă infracțiune în termenul de supraveghere", correct: true },
      { text: "Liberatul schimbă domiciliul", correct: false },
      { text: "Liberatul refuză să muncească", correct: false },
      { text: "Niciodată", correct: false }
    ],
    correctAnswer: 0,
    explanation: "Liberarea condiționată se revocă de drept dacă liberatul săvârșește o nouă infracțiune în cursul termenului de supraveghere, pentru care este condamnat la pedeapsa închisorii (art. 103 C.pen.).",
    legalReferences: ["Cod penal, art. 103"]
  }
];

async function seedFinal() {
  console.log("🌱 Starting final database seed...");

  try {
    await db.insert(questions).values(finalQuestions);

    console.log(`✅ Successfully seeded ${finalQuestions.length} final questions`);
    
    const totals = await db.select().from(questions);
    const breakdown = {
      civil: totals.filter(q => q.subject === 'civil').length,
      'civil-procedural': totals.filter(q => q.subject === 'civil-procedural').length,
      penal: totals.filter(q => q.subject === 'penal').length,
      'penal-procedural': totals.filter(q => q.subject === 'penal-procedural').length
    };
    
    console.log(`\n📊 FINAL DATABASE STATUS:`);
    console.log(`   Total: ${totals.length} questions`);
    console.log(`   - Drept Civil: ${breakdown.civil}`);
    console.log(`   - Drept Procesual Civil: ${breakdown['civil-procedural']}`);
    console.log(`   - Drept Penal: ${breakdown.penal}`);
    console.log(`   - Drept Procesual Penal: ${breakdown['penal-procedural']}`);
  } catch (error) {
    console.error("❌ Error seeding final questions:", error);
    throw error;
  }
}

seedFinal()
  .then(() => {
    console.log("\n✨ Database expansion complete - 100+ questions achieved!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
