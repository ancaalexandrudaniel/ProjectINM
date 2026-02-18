import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Lock,
  CheckCircle,
  Play,
  Star,
  Map,
  Trophy,
  Zap,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Calendar,
  Target,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

type RoadmapNode = {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  status: "LOCKED" | "AVAILABLE" | "COMPLETED" | "MASTERED";
  score: number;
  orderIndex: number;
  phaseId?: string;
  unitId?: string;
  weekRange?: string;
  subject?: string;
  chapter?: string;
  articleRefs?: string[];
  nodeType?: string; // "phase-milestone" | "unit-milestone" | "topic"
  pathType?: string;
};

type UserGamification = {
  currentXp: number;
  currentLevel: number;
  currentStreak: number;
};

type RoadmapResponse = {
  nodes: RoadmapNode[];
  stats: UserGamification;
};

// Phase colors
const PHASE_COLORS: Record<string, { bg: string; border: string; text: string; accent: string }> = {
  "phase-0": { bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-200 dark:border-blue-800", text: "text-blue-700 dark:text-blue-300", accent: "bg-blue-500" },
  "phase-1": { bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800", text: "text-emerald-700 dark:text-emerald-300", accent: "bg-emerald-500" },
  "phase-2": { bg: "bg-red-50 dark:bg-red-950/30", border: "border-red-200 dark:border-red-800", text: "text-red-700 dark:text-red-300", accent: "bg-red-500" },
  "phase-3": { bg: "bg-purple-50 dark:bg-purple-950/30", border: "border-purple-200 dark:border-purple-800", text: "text-purple-700 dark:text-purple-300", accent: "bg-purple-500" },
  "phase-4": { bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800", text: "text-amber-700 dark:text-amber-300", accent: "bg-amber-500" },
  "phase-5": { bg: "bg-rose-50 dark:bg-rose-950/30", border: "border-rose-200 dark:border-rose-800", text: "text-rose-700 dark:text-rose-300", accent: "bg-rose-500" },
};

const SUBJECT_LABELS: Record<string, string> = {
  civil: "Drept Civil",
  penal: "Drept Penal",
  procesual_civil: "Drept Procesual Civil",
  procesual_penal: "Drept Procesual Penal",
};

export default function RoadmapPage() {
  const { data, isLoading } = useQuery<RoadmapResponse>({
    queryKey: ["/api/roadmap"],
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl space-y-8">
        <div className="flex justify-between items-center">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const { nodes, stats } = data || { nodes: [], stats: { currentXp: 0, currentLevel: 1, currentStreak: 0 } };

  const xpProgress = (stats.currentXp % 1000) / 10;

  // Group nodes by phase
  const phases = groupByPhase(nodes);

  // Overall progress
  const topicNodes = nodes.filter(n => n.nodeType === "topic");
  const completedTopics = topicNodes.filter(n => n.status === "COMPLETED" || n.status === "MASTERED").length;
  const totalTopics = topicNodes.length;
  const overallProgress = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      {/* Gamification Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-200 dark:border-slate-800 p-4">
        <div className="container mx-auto max-w-4xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold">Nivelul {stats.currentLevel}</span>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                  <Trophy className="w-3 h-3 mr-1" />
                  {stats.currentXp} XP
                </Badge>
              </div>
              <Progress value={xpProgress} className="h-2 w-32 mt-1" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs font-medium text-muted-foreground">
              {completedTopics}/{totalTopics} topicuri
            </div>
            <div className="flex items-center gap-1 bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 px-3 py-1 rounded-full font-medium text-sm">
              <Zap className="w-4 h-4 fill-current" />
              <span>{stats.currentStreak} Zile</span>
            </div>
          </div>
        </div>
      </div>

      {/* Roadmap Content */}
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="text-center mb-10 mt-4">
          <h1 className="text-3xl font-bold flex items-center justify-center gap-3 mb-2">
            <Map className="w-8 h-8 text-primary" />
            Parcursul Tău
          </h1>
          <p className="text-muted-foreground mb-4">
            De la zero la examen — pas cu pas, fază cu fază.
          </p>
          <Progress value={overallProgress} className="h-3 w-64 mx-auto" />
          <p className="text-xs text-muted-foreground mt-1">{overallProgress}% completat</p>
        </div>

        <div className="space-y-6">
          {phases.length === 0 ? (
            <div className="text-center py-10 bg-white dark:bg-slate-900 rounded-lg shadow-sm border">
              <p className="text-muted-foreground">Parcursul este în construcție. Te rugăm să revii curând!</p>
            </div>
          ) : (
            phases.map((phase) => (
              <PhaseSection key={phase.phaseId} phase={phase} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ===== Phase grouping logic =====

interface PhaseGroup {
  phaseId: string;
  phaseMilestone: RoadmapNode;
  units: UnitGroup[];
}

interface UnitGroup {
  unitId: string;
  unitMilestone: RoadmapNode;
  topics: RoadmapNode[];
}

function groupByPhase(nodes: RoadmapNode[]): PhaseGroup[] {
  const phases: PhaseGroup[] = [];
  let currentPhase: PhaseGroup | null = null;
  let currentUnit: UnitGroup | null = null;

  for (const node of nodes) {
    if (node.nodeType === "phase-milestone") {
      currentPhase = {
        phaseId: node.phaseId || "",
        phaseMilestone: node,
        units: [],
      };
      phases.push(currentPhase);
      currentUnit = null;
    } else if (node.nodeType === "unit-milestone" && currentPhase) {
      currentUnit = {
        unitId: node.unitId || "",
        unitMilestone: node,
        topics: [],
      };
      currentPhase.units.push(currentUnit);
    } else if (node.nodeType === "topic" && currentUnit) {
      currentUnit.topics.push(node);
    }
  }

  return phases;
}

// ===== Phase Section Component =====

function PhaseSection({ phase }: { phase: PhaseGroup }) {
  const colors = PHASE_COLORS[phase.phaseId] || PHASE_COLORS["phase-0"];
  const isLocked = phase.phaseMilestone.status === "LOCKED";

  // Calculate phase progress
  const allTopics = phase.units.flatMap(u => u.topics);
  const completedTopics = allTopics.filter(t => t.status === "COMPLETED" || t.status === "MASTERED").length;
  const phaseProgress = allTopics.length > 0 ? Math.round((completedTopics / allTopics.length) * 100) : 0;
  const isComplete = phaseProgress === 100;

  const [isExpanded, setIsExpanded] = useState(!isLocked && !isComplete);

  return (
    <div className={`rounded-2xl border-2 overflow-hidden transition-all ${isLocked ? 'opacity-50' : ''} ${colors.border}`}>
      {/* Phase Header */}
      <button
        onClick={() => !isLocked && setIsExpanded(!isExpanded)}
        className={`w-full p-5 flex items-center justify-between ${colors.bg} ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer hover:brightness-95'}`}
        disabled={isLocked}
      >
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl ${colors.accent} flex items-center justify-center shadow-lg`}>
            {isLocked ? (
              <Lock className="w-5 h-5 text-white" />
            ) : isComplete ? (
              <CheckCircle className="w-6 h-6 text-white" />
            ) : (
              <Target className="w-5 h-5 text-white" />
            )}
          </div>
          <div className="text-left">
            <h2 className={`text-lg font-bold ${colors.text}`}>
              {phase.phaseMilestone.title}
            </h2>
            <p className="text-sm text-muted-foreground line-clamp-1">
              {phase.phaseMilestone.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {phase.phaseMilestone.weekRange && (
            <Badge variant="outline" className="hidden sm:flex gap-1">
              <Calendar className="w-3 h-3" />
              Săpt. {phase.phaseMilestone.weekRange}
            </Badge>
          )}
          <div className="text-right mr-2">
            <div className="text-xs font-medium text-muted-foreground">
              {completedTopics}/{allTopics.length}
            </div>
            <Progress value={phaseProgress} className="h-1.5 w-16 mt-0.5" />
          </div>
          {!isLocked && (
            isExpanded ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Phase Content — Units & Topics */}
      {isExpanded && !isLocked && (
        <div className="p-4 space-y-4 bg-white dark:bg-slate-900">
          {phase.units.map((unit) => (
            <UnitSection key={unit.unitId} unit={unit} phaseId={phase.phaseId} />
          ))}
        </div>
      )}
    </div>
  );
}

// ===== Unit Section Component =====

function UnitSection({ unit, phaseId }: { unit: UnitGroup; phaseId: string }) {
  const colors = PHASE_COLORS[phaseId] || PHASE_COLORS["phase-0"];
  const completedTopics = unit.topics.filter(t => t.status === "COMPLETED" || t.status === "MASTERED").length;

  return (
    <div className="space-y-3">
      {/* Unit Header */}
      <div className="flex items-center gap-3 px-2">
        <BookOpen className={`w-4 h-4 ${colors.text}`} />
        <h3 className="font-semibold text-sm">{unit.unitMilestone.title}</h3>
        {unit.unitMilestone.weekRange && (
          <Badge variant="outline" className="text-xs">
            Săpt. {unit.unitMilestone.weekRange}
          </Badge>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          {completedTopics}/{unit.topics.length}
        </span>
      </div>

      {/* Topics */}
      <div className="grid gap-2">
        {unit.topics.map((topic) => (
          <TopicCard key={topic.id} topic={topic} phaseId={phaseId} />
        ))}
      </div>
    </div>
  );
}

// ===== Topic Card Component =====

function TopicCard({ topic, phaseId }: { topic: RoadmapNode; phaseId: string }) {
  const isLocked = topic.status === "LOCKED";
  const isCompleted = topic.status === "COMPLETED" || topic.status === "MASTERED";
  const isMastered = topic.status === "MASTERED";
  const isCurrent = topic.status === "AVAILABLE";
  const colors = PHASE_COLORS[phaseId] || PHASE_COLORS["phase-0"];

  return (
    <Card className={`transition-all duration-200 ${
      isLocked ? 'opacity-50 grayscale' : 'hover:shadow-md hover:-translate-y-0.5'
    } ${isCurrent ? 'ring-2 ring-primary/30 shadow-md' : ''} ${
      isMastered ? 'border-yellow-200 dark:border-yellow-900/50' : ''
    }`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Left: Status icon + Content */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              isMastered ? 'bg-yellow-100 dark:bg-yellow-900/30' :
              isCompleted ? 'bg-green-100 dark:bg-green-900/30' :
              isCurrent ? colors.bg : 'bg-slate-100 dark:bg-slate-800'
            }`}>
              {isLocked ? (
                <Lock className="w-3.5 h-3.5 text-slate-400" />
              ) : isMastered ? (
                <Star className="w-4 h-4 text-yellow-500 fill-current" />
              ) : isCompleted ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <Play className="w-3.5 h-3.5 text-primary fill-current" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm leading-tight">{topic.title}</h4>
              {topic.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{topic.description}</p>
              )}

              {/* Article refs & subject badge */}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {topic.subject && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {SUBJECT_LABELS[topic.subject] || topic.subject}
                  </Badge>
                )}
                {topic.articleRefs && topic.articleRefs.length > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    {(topic.articleRefs as string[]).join(", ")}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: XP + Action */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            {topic.xpReward > 0 && (
              <span className="text-[10px] font-semibold text-yellow-600 dark:text-yellow-500 flex items-center gap-0.5">
                <Zap className="w-3 h-3" />
                {topic.xpReward}
              </span>
            )}

            {isCompleted && (
              <span className="text-[10px] font-medium text-green-600">{topic.score}%</span>
            )}

            {!isLocked && (
              <Link href={`/roadmap/node/${topic.id}`}>
                <Button size="sm" variant={isCompleted ? "outline" : "default"} className="h-7 text-xs px-3">
                  {isCompleted ? "Revizuiește" : "Începe"}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
