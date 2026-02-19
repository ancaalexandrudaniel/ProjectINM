import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Timer, AlertTriangle, Home } from "lucide-react";
import { formatTime } from "@/lib/constants";

interface ExamTimerBarProps {
    year: number;
    probaLabel: string;
    timeRemaining: number;
    isLowTime: boolean;
    onExit: () => void;
    children?: React.ReactNode;
}

export function ExamTimerBar({ year, probaLabel, timeRemaining, isLowTime, onExit, children }: ExamTimerBarProps) {
    return (
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-purple-500/30">
            <div className="container mx-auto px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="sm" onClick={onExit}>
                            <Home className="h-4 w-4 mr-1" />
                            Ieșire
                        </Button>
                        <Badge variant="outline" className="text-purple-400 border-purple-500/50">
                            <Clock className="h-3 w-3 mr-1" />
                            {year} • {probaLabel}
                        </Badge>
                    </div>

                    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${isLowTime ? 'bg-red-500/20 text-red-400' : 'bg-purple-500/20 text-purple-300'}`}>
                        <Timer className="h-5 w-5" />
                        <span className="font-mono text-xl font-bold">
                            {formatTime(timeRemaining)}
                        </span>
                        {isLowTime && (
                            <AlertTriangle className="h-4 w-4 animate-pulse" />
                        )}
                    </div>

                    {children}
                </div>
            </div>
        </div>
    );
}
