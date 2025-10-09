import { 
  type User, 
  type InsertUser,
  type Question,
  type InsertQuestion,
  type QuizSession,
  type InsertQuizSession,
  type UserAnswer,
  type InsertUserAnswer,
  type UserProgress,
  type InsertUserProgress
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Questions
  getAllQuestions(): Promise<Question[]>;
  getQuestionsBySubject(subject: string): Promise<Question[]>;
  getQuestionsByChapter(subject: string, chapter: string): Promise<Question[]>;
  getQuestionsByDifficulty(difficulty: string): Promise<Question[]>;
  getRandomQuestions(subject?: string, count?: number): Promise<Question[]>;
  createQuestion(question: InsertQuestion): Promise<Question>;

  // Quiz Sessions
  createQuizSession(session: InsertQuizSession): Promise<QuizSession>;
  getQuizSession(id: string): Promise<QuizSession | undefined>;
  updateQuizSession(id: string, updates: Partial<QuizSession>): Promise<QuizSession | undefined>;
  getUserQuizSessions(userId: string): Promise<QuizSession[]>;

  // User Answers
  createUserAnswer(answer: InsertUserAnswer): Promise<UserAnswer>;
  getUserAnswers(userId: string): Promise<UserAnswer[]>;
  getSessionAnswers(sessionId: string): Promise<UserAnswer[]>;

  // User Progress
  getUserProgress(userId: string): Promise<UserProgress[]>;
  getSubjectProgress(userId: string, subject: string): Promise<UserProgress[]>;
  updateUserProgress(userId: string, subject: string, chapter: string, updates: Partial<UserProgress>): Promise<UserProgress>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private questions: Map<string, Question>;
  private quizSessions: Map<string, QuizSession>;
  private userAnswers: Map<string, UserAnswer>;
  private userProgress: Map<string, UserProgress>;

  constructor() {
    this.users = new Map();
    this.questions = new Map();
    this.quizSessions = new Map();
    this.userAnswers = new Map();
    this.userProgress = new Map();
    
    // Initialize with sample questions
    this.initializeSampleData();
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  // Questions
  async getAllQuestions(): Promise<Question[]> {
    return Array.from(this.questions.values());
  }

  async getQuestionsBySubject(subject: string): Promise<Question[]> {
    return Array.from(this.questions.values()).filter(q => q.subject === subject);
  }

  async getQuestionsByChapter(subject: string, chapter: string): Promise<Question[]> {
    return Array.from(this.questions.values()).filter(
      q => q.subject === subject && q.chapter === chapter
    );
  }

  async getQuestionsByDifficulty(difficulty: string): Promise<Question[]> {
    return Array.from(this.questions.values()).filter(q => q.difficulty === difficulty);
  }

  async getRandomQuestions(subject?: string, count = 20): Promise<Question[]> {
    let questions = Array.from(this.questions.values());
    if (subject) {
      questions = questions.filter(q => q.subject === subject);
    }
    
    // Shuffle and take first 'count' questions
    const shuffled = questions.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  async createQuestion(insertQuestion: InsertQuestion): Promise<Question> {
    const id = randomUUID();
    const question: Question = {
      ...insertQuestion,
      id,
      legalReferences: insertQuestion.legalReferences || null,
      createdAt: new Date()
    };
    this.questions.set(id, question);
    return question;
  }

  // Quiz Sessions
  async createQuizSession(insertSession: InsertQuizSession): Promise<QuizSession> {
    const id = randomUUID();
    const session: QuizSession = {
      ...insertSession,
      subject: insertSession.subject || null,
      completedAt: insertSession.completedAt || null,
      correctAnswers: insertSession.correctAnswers ?? 0,
      timeSpent: insertSession.timeSpent ?? null,
      id,
      startedAt: new Date()
    };
    this.quizSessions.set(id, session);
    return session;
  }

  async getQuizSession(id: string): Promise<QuizSession | undefined> {
    return this.quizSessions.get(id);
  }

  async updateQuizSession(id: string, updates: Partial<QuizSession>): Promise<QuizSession | undefined> {
    const session = this.quizSessions.get(id);
    if (!session) return undefined;
    
    const updated = { ...session, ...updates };
    this.quizSessions.set(id, updated);
    return updated;
  }

  async getUserQuizSessions(userId: string): Promise<QuizSession[]> {
    return Array.from(this.quizSessions.values()).filter(s => s.userId === userId);
  }

  // User Answers
  async createUserAnswer(insertAnswer: InsertUserAnswer): Promise<UserAnswer> {
    const id = randomUUID();
    const answer: UserAnswer = {
      ...insertAnswer,
      sessionId: insertAnswer.sessionId || null,
      selectedAnswer: insertAnswer.selectedAnswer ?? null,
      timeToAnswer: insertAnswer.timeToAnswer ?? null,
      id,
      answeredAt: new Date()
    };
    this.userAnswers.set(id, answer);
    return answer;
  }

  async getUserAnswers(userId: string): Promise<UserAnswer[]> {
    return Array.from(this.userAnswers.values()).filter(a => a.userId === userId);
  }

  async getSessionAnswers(sessionId: string): Promise<UserAnswer[]> {
    return Array.from(this.userAnswers.values()).filter(a => a.sessionId === sessionId);
  }

  // User Progress
  async getUserProgress(userId: string): Promise<UserProgress[]> {
    return Array.from(this.userProgress.values()).filter(p => p.userId === userId);
  }

  async getSubjectProgress(userId: string, subject: string): Promise<UserProgress[]> {
    return Array.from(this.userProgress.values()).filter(
      p => p.userId === userId && p.subject === subject
    );
  }

  async updateUserProgress(
    userId: string, 
    subject: string, 
    chapter: string, 
    updates: Partial<UserProgress>
  ): Promise<UserProgress> {
    // Find existing progress or create new
    let progress = Array.from(this.userProgress.values()).find(
      p => p.userId === userId && p.subject === subject && p.chapter === chapter
    );

    if (progress) {
      progress = { ...progress, ...updates, updatedAt: new Date() };
      this.userProgress.set(progress.id, progress);
    } else {
      const id = randomUUID();
      progress = {
        id,
        userId,
        subject,
        chapter,
        totalQuestions: 0,
        correctAnswers: 0,
        accuracy: 0,
        lastPracticed: new Date(),
        updatedAt: new Date(),
        ...updates
      };
      this.userProgress.set(id, progress);
    }

    return progress;
  }

  private initializeSampleData() {
    // Create default user
    const defaultUser: User = {
      id: "default-user",
      username: "andrei.popescu",
      password: "password123",
      fullName: "Andrei Popescu",
      email: "andrei.popescu@example.com",
      createdAt: new Date()
    };
    this.users.set("default-user", defaultUser);

    // Create sample questions for each subject
    const sampleQuestions: InsertQuestion[] = [
      {
        subject: "civil",
        chapter: "Contracte",
        difficulty: "medium",
        questionText: "Potrivit art. 1270 Cod civil, contractul de vânzare-cumpărare este contract translativ de proprietate. Care dintre următoarele afirmații este CORECTĂ cu privire la momentul transferului proprietății?",
        options: [
          { text: "Proprietatea se transferă la data încheierii contractului, chiar dacă bunul nu a fost predat", correct: true },
          { text: "Proprietatea se transferă la data predării bunului către cumpărător", correct: false },
          { text: "Proprietatea se transferă la data plății integrale a prețului de către cumpărător", correct: false },
          { text: "Proprietatea se transferă la data înregistrării contractului la autoritățile competente", correct: false }
        ],
        correctAnswer: 0,
        explanation: "Potrivit art. 1270 alin. (1) Cod civil, în principiu, transferul proprietății are loc la data încheierii contractului (solo consensu), chiar dacă bunul nu a fost predat și prețul nu a fost plătit. Aceasta reprezintă regula generală a caracterului translativ de proprietate al contractului de vânzare-cumpărare.",
        legalReferences: [
          "Codul civil - Art. 1270 alin. (1) - Transferul proprietății",
          "Codul civil - Art. 1674-1676 - Obligația de predare",
          "Decizia ÎCCJ nr. 12/2017 - Caracterul translativ al vânzării"
        ]
      },
      {
        subject: "civil",
        chapter: "Locațiunea",
        difficulty: "hard",
        questionText: "În cazul contractului de locațiune de locuință, conform Codului civil, care este durata maximă pentru care poate fi încheiat contractul?",
        options: [
          { text: "5 ani", correct: false },
          { text: "10 ani", correct: false },
          { text: "20 ani", correct: false },
          { text: "99 de ani", correct: true }
        ],
        correctAnswer: 3,
        explanation: "Conform art. 1777 Cod civil, contractul de locațiune poate fi încheiat pe o durată determinată care nu poate depăși 99 de ani.",
        legalReferences: [
          "Codul civil - Art. 1777 - Durata contractului de locațiune",
          "Codul civil - Art. 1756 - Definiția locațiunii"
        ]
      },
      {
        subject: "civil-procedural",
        chapter: "Căile de atac",
        difficulty: "hard",
        questionText: "Recursul în casație poate fi declarat împotriva hotărârilor pronunțate în primă instanță de:",
        options: [
          { text: "Tribunale, în toate cauzele", correct: false },
          { text: "Curțile de apel, în toate cauzele", correct: false },
          { text: "Înalta Curte de Casație și Justiție", correct: false },
          { text: "Tribunale, numai în anumite cauze prevăzute expres de lege", correct: true }
        ],
        correctAnswer: 3,
        explanation: "Potrivit art. 304 Cod de procedură civilă, recursul în casație poate fi declarat împotriva hotărârilor pronunțate în primă instanță de tribunale, numai în cazurile prevăzute expres de lege.",
        legalReferences: [
          "Codul de procedură civilă - Art. 304 - Recursul în casație",
          "Codul de procedură civilă - Art. 301 - Căile de atac"
        ]
      },
      {
        subject: "penal",
        chapter: "Circumstanțe atenuante și agravante",
        difficulty: "medium",
        questionText: "Conform Codului penal, recidiva constituie:",
        options: [
          { text: "Circumstanță atenuantă", correct: false },
          { text: "Circumstanță agravantă", correct: true },
          { text: "Cauză de justificare", correct: false },
          { text: "Cauză de neimputabilitate", correct: false }
        ],
        correctAnswer: 1,
        explanation: "Potrivit art. 77 lit. a) Cod penal, recidiva constituie circumstanță agravantă care determină majorarea pedepsei în limitele speciale.",
        legalReferences: [
          "Codul penal - Art. 77 lit. a) - Circumstanțe agravante",
          "Codul penal - Art. 44 - Recidiva"
        ]
      },
      {
        subject: "penal-procedural",
        chapter: "Proba în procesul penal",
        difficulty: "medium",
        questionText: "Potrivit Codului de procedură penală, probele trebuie să fie:",
        options: [
          { text: "Doar pertinente", correct: false },
          { text: "Doar concludente", correct: false },
          { text: "Pertinente, concludente și obținute în mod legal", correct: true },
          { text: "Doar obținute în mod legal", correct: false }
        ],
        correctAnswer: 2,
        explanation: "Conform art. 97 Cod de procedură penală, probele trebuie să îndeplinească cumulativ trei condiții: să fie pertinente, concludente și obținute în mod legal.",
        legalReferences: [
          "Codul de procedură penală - Art. 97 - Condițiile probei",
          "Codul de procedură penală - Art. 96 - Definiția probei"
        ]
      },
      {
        subject: "penal",
        chapter: "Infracțiuni",
        difficulty: "easy",
        questionText: "Tentativa se pedepsește:",
        options: [
          { text: "În toate cazurile", correct: false },
          { text: "Numai când legea prevede în mod expres", correct: true },
          { text: "Doar la infracțiunile grave", correct: false },
          { text: "Doar la infracțiunile contra persoanei", correct: false }
        ],
        correctAnswer: 1,
        explanation: "Conform art. 32 alin. (2) Cod penal, tentativa se pedepsește numai când legea prevede în mod expres.",
        legalReferences: [
          "Codul penal - Art. 32 - Tentativa",
          "Codul penal - Art. 33 - Sancționarea tentativei"
        ]
      },
      {
        subject: "penal",
        chapter: "Pedepse",
        difficulty: "medium",
        questionText: "Pedeapsa închisorii pe viață poate fi aplicată pentru:",
        options: [
          { text: "Orice infracțiune gravă", correct: false },
          { text: "Numai pentru infracțiunile prevăzute expres de lege", correct: true },
          { text: "Toate infracțiunile contra vieții", correct: false },
          { text: "Infracțiunile săvârșite cu intenție", correct: false }
        ],
        correctAnswer: 1,
        explanation: "Conform art. 53 Cod penal, pedeapsa închisorii pe viață poate fi aplicată numai pentru infracțiunile pentru care legea prevede în mod expres această pedeapsă.",
        legalReferences: [
          "Codul penal - Art. 53 - Închisoarea pe viață",
          "Codul penal - Art. 61 - Individualizarea pedepsei"
        ]
      },
      {
        subject: "penal",
        chapter: "Circumstanțe atenuante și agravante",
        difficulty: "medium",
        questionText: "Care dintre următoarele constituie circumstanță atenuantă:",
        options: [
          { text: "Comiterea infracțiunii în stare de legitima apărare", correct: false },
          { text: "Comportarea bună după comiterea infracțiunii", correct: true },
          { text: "Vârsta majoră a infractorului", correct: false },
          { text: "Funcția publică a infractorului", correct: false }
        ],
        correctAnswer: 1,
        explanation: "Potrivit art. 75 alin. (2) lit. d) Cod penal, comportarea bună după comiterea infracțiunii constituie circumstanță atenuantă.",
        legalReferences: [
          "Codul penal - Art. 75 - Circumstanțe atenuante legale",
          "Codul penal - Art. 74 - Individualizarea judiciară a pedepsei"
        ]
      },
      {
        subject: "penal",
        chapter: "Infracțiuni",
        difficulty: "hard",
        questionText: "Complementul este obligatoriu atunci când:",
        options: [
          { text: "Infracțiunea este săvârșită în recidivă", correct: false },
          { text: "Pedeapsa principală este amenda", correct: false },
          { text: "Legea prevede în mod obligatoriu aplicarea lui", correct: true },
          { text: "Infractorul este recidivist", correct: false }
        ],
        correctAnswer: 2,
        explanation: "Conform art. 65 Cod penal, pedepsele complementare se aplică obligatoriu când legea prevede acest lucru în mod expres.",
        legalReferences: [
          "Codul penal - Art. 65 - Pedepsele complementare",
          "Codul penal - Art. 66 - Aplicarea pedepselor complementare"
        ]
      },
      {
        subject: "civil",
        chapter: "Proprietatea",
        difficulty: "medium",
        questionText: "Uzucapiunea este un mod de:",
        options: [
          { text: "Dobândire a dreptului de proprietate", correct: true },
          { text: "Stingere a obligațiilor", correct: false },
          { text: "Apărare a dreptului de proprietate", correct: false },
          { text: "Transfer al dreptului de proprietate", correct: false }
        ],
        correctAnswer: 0,
        explanation: "Conform art. 930 Cod civil, uzucapiunea este un mod de dobândire a dreptului de proprietate prin posesie îndelungată.",
        legalReferences: [
          "Codul civil - Art. 930 - Uzucapiunea",
          "Codul civil - Art. 888 - Modurile de dobândire a proprietății"
        ]
      },
      {
        subject: "civil",
        chapter: "Obligațiile",
        difficulty: "easy",
        questionText: "Obligația solidară presupune:",
        options: [
          { text: "Mai mulți creditori sau mai mulți debitori", correct: true },
          { text: "Un singur creditor și un singur debitor", correct: false },
          { text: "Doar debitori persoane juridice", correct: false },
          { text: "Doar creditori persoane fizice", correct: false }
        ],
        correctAnswer: 0,
        explanation: "Conform art. 1420 Cod civil, obligația este solidară când există mai mulți creditori sau mai mulți debitori și fiecare dintre creditori poate cere plata întregii datorii.",
        legalReferences: [
          "Codul civil - Art. 1420 - Solidaritatea activă și pasivă",
          "Codul civil - Art. 1421 - Efectele solidarității"
        ]
      },
      {
        subject: "civil-procedural",
        chapter: "Proba",
        difficulty: "medium",
        questionText: "Sarcina probei revine:",
        options: [
          { text: "Întotdeauna reclamantului", correct: false },
          { text: "Celui care face o susținere în proces", correct: true },
          { text: "Întotdeauna pârâtului", correct: false },
          { text: "Instanței de judecată", correct: false }
        ],
        correctAnswer: 1,
        explanation: "Potrivit art. 249 Cod de procedură civilă, cel care face o susținere în cursul procesului trebuie să o dovedească, în afară de cazurile anume prevăzute de lege.",
        legalReferences: [
          "Codul de procedură civilă - Art. 249 - Sarcina probei",
          "Codul de procedură civilă - Art. 250 - Obiectul probei"
        ]
      },
      {
        subject: "civil-procedural",
        chapter: "Procedura",
        difficulty: "hard",
        questionText: "Excepția de necompetenţă se poate invoca:",
        options: [
          { text: "Oricând în cursul procesului", correct: false },
          { text: "Numai la prima zi de înfățișare", correct: true },
          { text: "Doar în apel", correct: false },
          { text: "Doar în recurs", correct: false }
        ],
        correctAnswer: 1,
        explanation: "Conform art. 132 Cod de procedură civilă, excepția de necompetenţă se invocă de către părți la prima zi de înfățișare, înainte de orice altă apărare sau cerere.",
        legalReferences: [
          "Codul de procedură civilă - Art. 132 - Invocarea excepției",
          "Codul de procedură civilă - Art. 130 - Competența instanțelor"
        ]
      },
      {
        subject: "penal-procedural",
        chapter: "Urmărirea penală",
        difficulty: "easy",
        questionText: "Urmărirea penală este efectuată de:",
        options: [
          { text: "Judecător", correct: false },
          { text: "Procuror", correct: true },
          { text: "Avocat", correct: false },
          { text: "Martor", correct: false }
        ],
        correctAnswer: 1,
        explanation: "Conform art. 55 Cod de procedură penală, urmărirea penală este efectuată de procuror, care conduce și supraveghează activitatea organelor de cercetare penală.",
        legalReferences: [
          "Codul de procedură penală - Art. 55 - Procurorul",
          "Codul de procedură penală - Art. 305 - Urmărirea penală"
        ]
      },
      {
        subject: "penal-procedural",
        chapter: "Judecata",
        difficulty: "medium",
        questionText: "Hotărârea prin care se dispune condamnarea inculpatului se numește:",
        options: [
          { text: "Sentință", correct: true },
          { text: "Ordonanță", correct: false },
          { text: "Încheiere", correct: false },
          { text: "Decizie preliminară", correct: false }
        ],
        correctAnswer: 0,
        explanation: "Conform art. 374 Cod de procedură penală, hotărârile judecătorești pot fi sentințe (prin care se soluționează fondul cauzei) sau încheieri (pentru rezolvarea unor chestiuni procedurale).",
        legalReferences: [
          "Codul de procedură penală - Art. 374 - Hotărâri judecătorești",
          "Codul de procedură penală - Art. 396 - Deliberarea și votul"
        ]
      },
      {
        subject: "penal",
        chapter: "Tentativa",
        difficulty: "medium",
        questionText: "Tentativa consumată reprezintă:",
        options: [
          { text: "Executarea parțială a actelor de executare", correct: false },
          { text: "Executarea tuturor actelor de executare fără producerea rezultatului", correct: true },
          { text: "Executarea cu rezultat parțial", correct: false },
          { text: "Renunțarea la comiterea infracțiunii", correct: false }
        ],
        correctAnswer: 1,
        explanation: "Conform art. 32 alin. (1) lit. b) Cod penal, tentativa consumată este atunci când infractorul execută toate actele de executare dar rezultatul nu se produce din cauze independente de voința sa.",
        legalReferences: [
          "Codul penal - Art. 32 - Tentativa",
          "Codul penal - Art. 33 - Sancționarea tentativei"
        ]
      },
      {
        subject: "penal",
        chapter: "Pedepse",
        difficulty: "easy",
        questionText: "Amenda este o pedeapsă:",
        options: [
          { text: "Complementară", correct: false },
          { text: "Accesorii", correct: false },
          { text: "Principală", correct: true },
          { text: "Facultativă", correct: false }
        ],
        correctAnswer: 2,
        explanation: "Conform art. 61 lit. b) Cod penal, amenda este o pedeapsă principală aplicabilă persoanelor fizice.",
        legalReferences: [
          "Codul penal - Art. 61 - Pedepsele principale",
          "Codul penal - Art. 62 - Pedeapsa amenzii"
        ]
      },
      {
        subject: "civil",
        chapter: "Contracte",
        difficulty: "hard",
        questionText: "Leziunea este cauză de anulare a contractului când:",
        options: [
          { text: "Există un dezechilibru oarecare între prestații", correct: false },
          { text: "Există vătămare de peste 1/2 din valoarea prestației", correct: true },
          { text: "Una din părți nu își execută obligațiile", correct: false },
          { text: "Contractul este încheiat sub constrângere", correct: false }
        ],
        correctAnswer: 1,
        explanation: "Conform art. 1221 Cod civil, leziunea ca viciu de consimțământ se reține când una dintre părți, profitând de starea de nevoie, de lipsa de experiență sau de lipsa de cunoștințe a celeilalte părți, stipulează în favoarea sa o prestație de o valoare considerabilă mai mare decât valoarea propriei prestații.",
        legalReferences: [
          "Codul civil - Art. 1221 - Leziunea",
          "Codul civil - Art. 1206 - Vicii de consimțământ"
        ]
      },
      {
        subject: "civil-procedural",
        chapter: "Executarea",
        difficulty: "medium",
        questionText: "Executarea silită se poate face pe baza:",
        options: [
          { text: "Oricărui înscris sub semnătură privată", correct: false },
          { text: "Titlurilor executorii", correct: true },
          { text: "Acordurilor verbale", correct: false },
          { text: "Promisiunilor unilaterale", correct: false }
        ],
        correctAnswer: 1,
        explanation: "Potrivit art. 623 Cod de procedură civilă, executarea silită se face numai pe baza unui titlu executoriu.",
        legalReferences: [
          "Codul de procedură civilă - Art. 623 - Titlul executoriu",
          "Codul de procedură civilă - Art. 624 - Încuviințarea executării"
        ]
      },
      {
        subject: "penal-procedural",
        chapter: "Căile de atac",
        difficulty: "hard",
        questionText: "Apelul se judecă de:",
        options: [
          { text: "Aceeași instanță care a pronunțat hotărârea", correct: false },
          { text: "Instanța ierarhic superioară", correct: true },
          { text: "Înalta Curte de Casație și Justiție", correct: false },
          { text: "Curtea de Apel în toate cazurile", correct: false }
        ],
        correctAnswer: 1,
        explanation: "Conform art. 417 Cod de procedură penală, apelul se judecă de instanța ierarhic superioară celei care a pronunțat hotărârea atacată.",
        legalReferences: [
          "Codul de procedură penală - Art. 417 - Instanța de apel",
          "Codul de procedură penală - Art. 408 - Calea de atac a apelului"
        ]
      },
      {
        subject: "penal",
        chapter: "Infracțiuni",
        difficulty: "medium",
        questionText: "Participația improprie reprezintă:",
        options: [
          { text: "Comiterea unei infracțiuni de mai multe persoane", correct: false },
          { text: "Contribuția la comiterea unei infracțiuni care nu are calitatea cerută de lege", correct: true },
          { text: "Ajutorul dat după comiterea infracțiunii", correct: false },
          { text: "Instigarea la o infracțiune", correct: false }
        ],
        correctAnswer: 1,
        explanation: "Conform art. 52 Cod penal, participația improprie există când cel care nu are calitatea cerută de legea penală pentru a fi autor contribuie la săvârșirea unei infracțiuni care reclamă o astfel de calitate.",
        legalReferences: [
          "Codul penal - Art. 52 - Participația improprie",
          "Codul penal - Art. 46 - Formele de participație"
        ]
      },
      {
        subject: "civil",
        chapter: "Obligațiile",
        difficulty: "hard",
        questionText: "Compensația legală operează când:",
        options: [
          { text: "Părțile convin asupra acesteia", correct: false },
          { text: "Creditele sunt lichide, exigibile și fungibile", correct: true },
          { text: "Judecătorul o dispune", correct: false },
          { text: "Una din părți o solicită", correct: false }
        ],
        correctAnswer: 1,
        explanation: "Conform art. 1616 Cod civil, compensația legală operează de drept când creditele sunt lichide (certitudine și determinare), exigibile și au ca obiect bunuri fungibile de aceeași natură.",
        legalReferences: [
          "Codul civil - Art. 1616 - Condițiile compensației legale",
          "Codul civil - Art. 1615 - Efectele compensației"
        ]
      },
      {
        subject: "civil-procedural",
        chapter: "Căile de atac",
        difficulty: "medium",
        questionText: "Termenul de apel în materie civilă este de:",
        options: [
          { text: "10 zile", correct: false },
          { text: "30 de zile", correct: true },
          { text: "60 de zile", correct: false },
          { text: "90 de zile", correct: false }
        ],
        correctAnswer: 1,
        explanation: "Potrivit art. 303 alin. (1) Cod de procedură civilă, apelul se declară în termen de 30 de zile de la comunicarea hotărârii, dacă legea nu prevede altfel.",
        legalReferences: [
          "Codul de procedură civilă - Art. 303 - Termenul de declarare a apelului",
          "Codul de procedură civilă - Art. 301 - Calea de atac a apelului"
        ]
      },
      {
        subject: "penal",
        chapter: "Circumstanțe atenuante și agravante",
        difficulty: "easy",
        questionText: "Săvârșirea infracțiunii de către un funcționar public în exercitarea atribuțiilor de serviciu reprezintă:",
        options: [
          { text: "Circumstanță atenuantă", correct: false },
          { text: "Circumstanță agravantă", correct: true },
          { text: "Cauză de nepedepsire", correct: false },
          { text: "Cauză de justificare", correct: false }
        ],
        correctAnswer: 1,
        explanation: "Conform art. 77 lit. g) Cod penal, săvârșirea infracțiunii de către un funcționar public în exercitarea atribuțiilor de serviciu constituie circumstanță agravantă.",
        legalReferences: [
          "Codul penal - Art. 77 - Circumstanțe agravante",
          "Codul penal - Art. 75 - Circumstanțe atenuante"
        ]
      }
    ];

    sampleQuestions.forEach((q, index) => {
      const question: Question = {
        ...q,
        id: `question-${index + 1}`,
        legalReferences: q.legalReferences || null,
        createdAt: new Date()
      };
      this.questions.set(question.id, question);
    });

    // Initialize progress for default user
    const subjects = ["civil", "civil-procedural", "penal", "penal-procedural"];
    const chapters = {
      "civil": ["Contracte", "Locațiunea", "Proprietatea", "Obligațiile"],
      "civil-procedural": ["Căile de atac", "Proba", "Procedura", "Executarea"],
      "penal": ["Infracțiuni", "Pedepse", "Circumstanțe atenuante și agravante", "Tentativa"],
      "penal-procedural": ["Proba în procesul penal", "Urmărirea penală", "Judecata", "Căile de atac"]
    };

    subjects.forEach(subject => {
      chapters[subject as keyof typeof chapters]?.forEach((chapter, idx) => {
        const progressId = `${subject}-${chapter}-progress`;
        const progress: UserProgress = {
          id: progressId,
          userId: "default-user",
          subject,
          chapter,
          totalQuestions: Math.floor(Math.random() * 50) + 20,
          correctAnswers: Math.floor(Math.random() * 40) + 10,
          accuracy: Math.floor(Math.random() * 60) + 40,
          lastPracticed: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
          updatedAt: new Date()
        };
        this.userProgress.set(progressId, progress);
      });
    });
  }
}

export const storage = new MemStorage();
