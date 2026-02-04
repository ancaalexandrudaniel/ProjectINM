import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Lock,
  CheckCircle,
  Play,
  Star,
  Map,
  Trophy,
  Zap
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type RoadmapNode = {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  status: "LOCKED" | "AVAILABLE" | "COMPLETED" | "MASTERED";
  score: number;
  orderIndex: number;
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

  // Calculate XP progress for next level (simplified: level * 1000)
  const xpForNextLevel = stats.currentLevel * 1000;
  const xpProgress = (stats.currentXp % 1000) / 10; // 0-100% assuming 1000 XP per level steps for now

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

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 px-3 py-1 rounded-full font-medium text-sm">
              <Zap className="w-4 h-4 fill-current" />
              <span>{stats.currentStreak} Zile Streak</span>
            </div>
          </div>
        </div>
      </div>

      {/* Roadmap Content */}
      <div className="container mx-auto p-6 max-w-3xl">
        <div className="text-center mb-10 mt-4">
          <h1 className="text-3xl font-bold flex items-center justify-center gap-3 mb-2">
            <Map className="w-8 h-8 text-primary" />
            Călătoria Ta
          </h1>
          <p className="text-muted-foreground">
            Urmează calea pentru a stăpâni materia de examen.
          </p>
        </div>

        <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent dark:before:via-slate-700">
          {nodes.length === 0 ? (
             <div className="text-center py-10 bg-white dark:bg-slate-900 rounded-lg shadow-sm border">
                <p className="text-muted-foreground">Roadmap-ul este în construcție. Te rugăm să revii curând!</p>
             </div>
          ) : (
            nodes.map((node, index) => (
              <RoadmapNodeCard key={node.id} node={node} index={index} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function RoadmapNodeCard({ node, index }: { node: RoadmapNode; index: number }) {
  const isLocked = node.status === "LOCKED";
  const isCompleted = node.status === "COMPLETED" || node.status === "MASTERED";
  const isMastered = node.status === "MASTERED";
  const isCurrent = node.status === "AVAILABLE";

  return (
    <div className={`relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group ${isLocked ? 'opacity-60 grayscale' : ''}`}>

      {/* Icon Connector */}
      <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-50 dark:border-slate-950 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-colors duration-300 ${
        isCurrent ? 'bg-primary animate-pulse' : 'bg-slate-200 dark:bg-slate-800'
      }`}>
        {isLocked ? (
          <Lock className="w-4 h-4 text-slate-500" />
        ) : isMastered ? (
          <Star className="w-5 h-5 text-yellow-500 fill-current" />
        ) : isCompleted ? (
          <CheckCircle className="w-5 h-5 text-green-500" />
        ) : (
          <Play className="w-4 h-4 text-white fill-current" />
        )}
      </div>

      {/* Card */}
      <Card className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] transition-all duration-300 hover:shadow-lg ${
        !isLocked ? 'hover:-translate-y-1' : ''
      } ${isMastered ? 'border-yellow-200 dark:border-yellow-900/50 bg-yellow-50/50 dark:bg-yellow-900/10' : ''} ${
        isCurrent ? 'border-primary ring-2 ring-primary/20 shadow-xl scale-[1.02]' : ''
      }`}>
        <CardContent className="p-5">
          <div className="flex justify-between items-start mb-2">
            <Badge variant={isCurrent ? "default" : isLocked ? "outline" : "secondary"} className="mb-2">
              {isCurrent ? "Obiectiv Curent" : `Capitolul ${index + 1}`}
            </Badge>
            {node.xpReward && (
              <span className="text-xs font-semibold text-yellow-600 dark:text-yellow-500 flex items-center gap-1">
                <Zap className="w-3 h-3" />
                {node.xpReward} XP
              </span>
            )}
          </div>

          <h3 className="font-bold text-lg mb-1">{node.title}</h3>
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {node.description || "Stăpânește conceptele fundamentale din acest capitol."}
          </p>

          <div className="flex items-center justify-between mt-4">
            {isCompleted && (
              <div className="text-xs font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                Scor: {node.score}%
              </div>
            )}

            <div className="ml-auto">
              {isLocked ? (
                <Button disabled size="sm" variant="outline" className="gap-2">
                  <Lock className="w-4 h-4" />
                  Blocat
                </Button>
              ) : (
                <Link href={`/roadmap/node/${node.id}`}>
                  <Button size="sm" className={isCompleted ? "bg-secondary text-secondary-foreground hover:bg-secondary/80" : ""}>
                    {isCompleted ? "Revizuiește" : "Începe"}
                    <Play className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
