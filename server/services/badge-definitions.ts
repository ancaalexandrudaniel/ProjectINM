/**
 * Badge definitions and check logic for the gamification system.
 */

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji or icon key
  category: "milestone" | "streak" | "mastery" | "xp";
}

export const BADGE_CATALOG: BadgeDefinition[] = [
  // Milestone badges
  {
    id: "FIRST_STEP",
    name: "Primul Pas",
    description: "Ai completat primul nod din roadmap",
    icon: "footprints",
    category: "milestone",
  },
  {
    id: "CHAPTER_DONE",
    name: "Capitol Terminat",
    description: "Ai completat toate nodurile dintr-un capitol",
    icon: "book-check",
    category: "milestone",
  },
  {
    id: "PERFECT_SCORE",
    name: "Scor Perfect",
    description: "Ai obtinut 100% la un nod",
    icon: "star",
    category: "milestone",
  },

  // Streak badges
  {
    id: "STREAK_3",
    name: "3 Zile Consecutive",
    description: "Ai studiat 3 zile la rand",
    icon: "flame",
    category: "streak",
  },
  {
    id: "STREAK_7",
    name: "Saptamana Perfecta",
    description: "Ai studiat 7 zile la rand",
    icon: "flame",
    category: "streak",
  },
  {
    id: "STREAK_30",
    name: "Luna de Foc",
    description: "Ai studiat 30 de zile la rand",
    icon: "flame",
    category: "streak",
  },

  // Mastery badges
  {
    id: "MASTERY_10",
    name: "Maestru",
    description: "Ai obtinut MASTERED pe 10+ noduri",
    icon: "crown",
    category: "mastery",
  },

  // XP badges
  {
    id: "XP_1000",
    name: "1K XP",
    description: "Ai acumulat 1.000 XP",
    icon: "zap",
    category: "xp",
  },
  {
    id: "XP_5000",
    name: "5K XP",
    description: "Ai acumulat 5.000 XP",
    icon: "zap",
    category: "xp",
  },
  {
    id: "XP_10000",
    name: "10K XP",
    description: "Ai acumulat 10.000 XP",
    icon: "zap",
    category: "xp",
  },
];

export interface BadgeCheckStats {
  currentXp: number;
  currentStreak: number;
  completedNodes: number;
  masteredNodes: number;
  isPerfectScore: boolean;
  alreadyUnlocked: string[];
}

/**
 * Given user stats, returns array of newly earned badge IDs
 * (i.e. badges that should be awarded but haven't been yet).
 */
export function checkBadges(stats: BadgeCheckStats): string[] {
  const { currentXp, currentStreak, completedNodes, masteredNodes, isPerfectScore, alreadyUnlocked } = stats;
  const already = new Set(alreadyUnlocked);
  const newBadges: string[] = [];

  const award = (id: string) => {
    if (!already.has(id)) newBadges.push(id);
  };

  // Milestone
  if (completedNodes >= 1) award("FIRST_STEP");
  if (isPerfectScore) award("PERFECT_SCORE");

  // Streak
  if (currentStreak >= 3) award("STREAK_3");
  if (currentStreak >= 7) award("STREAK_7");
  if (currentStreak >= 30) award("STREAK_30");

  // Mastery
  if (masteredNodes >= 10) award("MASTERY_10");

  // XP
  if (currentXp >= 1000) award("XP_1000");
  if (currentXp >= 5000) award("XP_5000");
  if (currentXp >= 10000) award("XP_10000");

  return newBadges;
}
