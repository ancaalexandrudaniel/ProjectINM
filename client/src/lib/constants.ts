import { Scale, FileText, Shield, Gavel, type LucideIcon } from "lucide-react";

/**
 * Central subject definitions used throughout the app.
 * Single source of truth for subject IDs, names, icons, and colors.
 */

export type SubjectId = "civil" | "civil-procedural" | "penal" | "penal-procedural";

export interface SubjectDefinition {
  id: SubjectId;
  name: string;
  shortName: string;
  icon: LucideIcon;
  color: string;        // Tailwind bg class
  textColor: string;     // Tailwind text class
}

export const SUBJECTS: SubjectDefinition[] = [
  { id: "civil", name: "Drept Civil", shortName: "Civil", icon: Scale, color: "bg-blue-500", textColor: "text-blue-600" },
  { id: "civil-procedural", name: "Drept Procesual Civil", shortName: "Proc.Civil", icon: FileText, color: "bg-green-500", textColor: "text-green-600" },
  { id: "penal", name: "Drept Penal", shortName: "Penal", icon: Shield, color: "bg-red-500", textColor: "text-red-600" },
  { id: "penal-procedural", name: "Drept Procesual Penal", shortName: "Proc.Penal", icon: Gavel, color: "bg-purple-500", textColor: "text-purple-600" },
];

export const SUBJECT_MAP: Record<SubjectId, SubjectDefinition> = Object.fromEntries(
  SUBJECTS.map(s => [s.id, s])
) as Record<SubjectId, SubjectDefinition>;

/**
 * Get subject display name from ID.
 */
export function getSubjectName(subjectId: string): string {
  return (SUBJECT_MAP as Record<string, SubjectDefinition>)[subjectId]?.name ?? subjectId;
}

/**
 * Get subject icon from ID.
 */
export function getSubjectIcon(subjectId: string): LucideIcon {
  return (SUBJECT_MAP as Record<string, SubjectDefinition>)[subjectId]?.icon ?? Scale;
}

/**
 * Format seconds into MM:SS or HH:MM:SS string.
 */
export function formatTime(seconds: number): string {
  if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
}

/**
 * Calculate accuracy percentage.
 */
export function calcAccuracy(correct: number, total: number): number {
  return total > 0 ? Math.round((correct / total) * 100) : 0;
}
