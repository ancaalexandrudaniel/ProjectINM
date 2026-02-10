/**
 * Frontend badge catalog — mirrors server/services/badge-definitions.ts
 * Maps badge IDs to display metadata (name, description, emoji).
 */

export interface BadgeInfo {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: "milestone" | "streak" | "mastery" | "xp";
}

export const BADGE_CATALOG: Record<string, BadgeInfo> = {
  FIRST_STEP: {
    id: "FIRST_STEP",
    name: "Primul Pas",
    description: "Ai completat primul nod din roadmap",
    emoji: "\ud83d\udc63",
    category: "milestone",
  },
  CHAPTER_DONE: {
    id: "CHAPTER_DONE",
    name: "Capitol Terminat",
    description: "Ai completat toate nodurile dintr-un capitol",
    emoji: "\ud83d\udcd7",
    category: "milestone",
  },
  PERFECT_SCORE: {
    id: "PERFECT_SCORE",
    name: "Scor Perfect",
    description: "Ai ob\u021binut 100% la un nod",
    emoji: "\u2b50",
    category: "milestone",
  },
  STREAK_3: {
    id: "STREAK_3",
    name: "3 Zile Consecutive",
    description: "Ai studiat 3 zile la r\u00e2nd",
    emoji: "\ud83d\udd25",
    category: "streak",
  },
  STREAK_7: {
    id: "STREAK_7",
    name: "S\u0103pt\u0103m\u00e2na Perfect\u0103",
    description: "Ai studiat 7 zile la r\u00e2nd",
    emoji: "\ud83d\udd25",
    category: "streak",
  },
  STREAK_30: {
    id: "STREAK_30",
    name: "Luna de Foc",
    description: "Ai studiat 30 de zile la r\u00e2nd",
    emoji: "\ud83c\udf1f",
    category: "streak",
  },
  MASTERY_10: {
    id: "MASTERY_10",
    name: "Maestru",
    description: "Ai ob\u021binut MASTERED pe 10+ noduri",
    emoji: "\ud83d\udc51",
    category: "mastery",
  },
  XP_1000: {
    id: "XP_1000",
    name: "1K XP",
    description: "Ai acumulat 1.000 XP",
    emoji: "\u26a1",
    category: "xp",
  },
  XP_5000: {
    id: "XP_5000",
    name: "5K XP",
    description: "Ai acumulat 5.000 XP",
    emoji: "\u26a1",
    category: "xp",
  },
  XP_10000: {
    id: "XP_10000",
    name: "10K XP",
    description: "Ai acumulat 10.000 XP",
    emoji: "\ud83d\udca0",
    category: "xp",
  },
};

export function getBadgeInfo(badgeId: string): BadgeInfo | null {
  return BADGE_CATALOG[badgeId] || null;
}
