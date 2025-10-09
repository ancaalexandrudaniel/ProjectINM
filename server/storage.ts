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
