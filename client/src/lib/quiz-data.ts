import type { Subject, Difficulty } from "@/types/quiz";

export const SUBJECTS = {
  civil: {
    id: 'civil' as const,
    name: 'Drept Civil',
    shortName: 'Civil',
    color: 'hsl(210, 90%, 45%)',
    icon: 'Scale'
  },
  'civil-procedural': {
    id: 'civil-procedural' as const,
    name: 'Drept Procesual Civil',
    shortName: 'Procesual Civil',
    color: 'hsl(204, 88%, 53%)',
    icon: 'FileText'
  },
  penal: {
    id: 'penal' as const,
    name: 'Drept Penal',
    shortName: 'Penal',
    color: 'hsl(145, 65%, 45%)',
    icon: 'Shield'
  },
  'penal-procedural': {
    id: 'penal-procedural' as const,
    name: 'Drept Procesual Penal',
    shortName: 'Procesual Penal',
    color: 'hsl(356, 91%, 54%)',
    icon: 'Balance'
  }
} as const;

export const CHAPTERS = {
  civil: [
    'Persoanele fizice și juridice',
    'Capacitatea de exercițiu',
    'Bunurile și patrimoniul',
    'Dreptul de proprietate',
    'Drepturi reale principale',
    'Drepturi reale accesorii',
    'Obligațiile civile',
    'Contracte',
    'Locațiunea',
    'Răspunderea civilă delictuală',
    'Prescripția extinctivă și decăderea'
  ],
  'civil-procedural': [
    'Principiile procesului civil',
    'Competența instanțelor',
    'Părțile în proces',
    'Actele de procedură',
    'Proba în procesul civil',
    'Judecata în primeira instanță',
    'Căile de atac',
    'Căile de atac ordinare',
    'Căile de atac extraordinare',
    'Executarea silită',
    'Proceduri speciale'
  ],
  penal: [
    'Principiile dreptului penal',
    'Legea penală în timp și spațiu',
    'Infracțiunea',
    'Formele infracțiunii',
    'Cauzele care înlătură caracterul penal',
    'Sancțiunile penale',
    'Individualizarea pedepsei',
    'Aplicarea pedepsei',
    'Circumstanțe atenuante și agravante',
    'Infracțiuni contra persoanei',
    'Infracțiuni contra patrimoniului'
  ],
  'penal-procedural': [
    'Principiile procesului penal',
    'Organele de urmărire penală',
    'Participanții la procesul penal',
    'Proba în procesul penal',
    'Măsurile preventive',
    'Urmărirea penală',
    'Trimiterea în judecată',
    'Judecata',
    'Căile de atac',
    'Executarea hotărârilor penale'
  ]
} as const;

export const DIFFICULTIES: Record<Difficulty, { label: string; color: string }> = {
  easy: {
    label: 'Ușoară',
    color: 'hsl(145, 65%, 45%)'
  },
  medium: {
    label: 'Medie',
    color: 'hsl(42, 93%, 56%)'
  },
  hard: {
    label: 'Grea',
    color: 'hsl(0, 75%, 55%)'
  }
};

export const EXAM_INFO = {
  officialDate: '28 Septembrie 2025',
  writtenExamDates: '18-19 Octombrie 2025',
  psychologicalTestDates: '16-27 Ianuarie 2026',
  interviewDates: '21 Februarie – 10 Martie 2026',
  availableSeats: 250,
  applicationFee: '1.500 lei',
  applicationDeadline: '4 August 2025',
  timeLimit: '180 minutes',
  totalQuestions: 100,
  passingScore: 60
} as const;

export const QUESTION_DISTRIBUTION = {
  civil: 25,
  'civil-procedural': 25,
  penal: 25,
  'penal-procedural': 25
} as const;

export const OFFICIAL_LINKS = {
  inm: 'https://inm-lex.ro',
  csm: 'https://www.csm1909.ro',
  syllabus: 'https://inm-lex.ro/concurs-de-admitere-la-institutul-national-al-magistraturii-organizat-in-perioada-iulie-2025-martie-2026-data-publicarii-17-07-2025/',
  previousExams: 'https://inm-lex.ro/subiecte-admitere-la-inm-2024-2025/',
  bibliography: 'https://www.csm1909.ro/Pages.aspx?PageId=283'
} as const;

// Utility functions
export const getSubjectInfo = (subjectId: Subject) => {
  return SUBJECTS[subjectId];
};

export const getSubjectChapters = (subjectId: Subject) => {
  return CHAPTERS[subjectId];
};

export const getDifficultyInfo = (difficulty: Difficulty) => {
  return DIFFICULTIES[difficulty];
};

export const formatSubjectName = (subjectId: Subject, short = false) => {
  const subject = SUBJECTS[subjectId];
  return short ? subject.shortName : subject.name;
};

export const getSubjectColor = (subjectId: Subject) => {
  return SUBJECTS[subjectId].color;
};

// Progress calculations
export const calculateOverallProgress = (progressData: Array<{ totalQuestions: number; correctAnswers: number }>) => {
  const totalQuestions = progressData.reduce((sum, p) => sum + p.totalQuestions, 0);
  const correctAnswers = progressData.reduce((sum, p) => sum + p.correctAnswers, 0);
  return totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
};

export const calculateSubjectProgress = (subjectProgressData: Array<{ totalQuestions: number; correctAnswers: number }>) => {
  return calculateOverallProgress(subjectProgressData);
};

// Weak points identification
export const identifyWeakPoints = (
  progressData: Array<{ subject: string; chapter: string; accuracy: number; totalQuestions: number }>
) => {
  return progressData
    .filter(p => p.totalQuestions > 0 && p.accuracy < 70)
    .sort((a, b) => a.accuracy - b.accuracy)
    .map(p => ({
      ...p,
      priority: p.accuracy < 40 ? 'critical' as const : 
               p.accuracy < 60 ? 'high' as const : 'medium' as const
    }));
};

// Study recommendations
export const getStudyRecommendations = (accuracy: number) => {
  if (accuracy < 50) {
    return {
      level: 'Începător',
      recommendations: [
        'Studiază teoria de bază pentru fiecare materie',
        'Începe cu întrebări ușoare și medii',
        'Dedică minimum 3 ore zilnic pentru studiu',
        'Consultă bibliografia oficială INM'
      ]
    };
  } else if (accuracy < 70) {
    return {
      level: 'Mediu',
      recommendations: [
        'Consolidează cunoștințele de bază',
        'Exersează cu întrebări de dificultate medie și grea',
        'Analizează greșelile făcute în teste',
        'Participă la simulări de examen'
      ]
    };
  } else if (accuracy < 85) {
    return {
      level: 'Mediu-Avansat',
      recommendations: [
        'Perfecționează cunoștințele în punctele slabe',
        'Exersează constant cu grile dificile',
        'Studiază jurisprudența relevantă',
        'Menține ritmul de studiu constant'
      ]
    };
  } else {
    return {
      level: 'Avansat',
      recommendations: [
        'Menține nivelul de pregătire ridicat',
        'Exersează cu simulări complete de examen',
        'Ajută-i pe colegii mai puțin pregătiți',
        'Revizuiește periodic toate materiile'
      ]
    };
  }
};

export default {
  SUBJECTS,
  CHAPTERS,
  DIFFICULTIES,
  EXAM_INFO,
  QUESTION_DISTRIBUTION,
  OFFICIAL_LINKS,
  getSubjectInfo,
  getSubjectChapters,
  getDifficultyInfo,
  formatSubjectName,
  getSubjectColor,
  calculateOverallProgress,
  calculateSubjectProgress,
  identifyWeakPoints,
  getStudyRecommendations
};
