import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TimeTravelAnimationProps {
    year: number;
    probaLabel: string;
    variant: "wormhole" | "starfield";
    onComplete: () => void;
}

export function TimeTravelAnimation({ year, probaLabel, variant, onComplete }: TimeTravelAnimationProps) {
    const [travelYear, setTravelYear] = useState(new Date().getFullYear());

    // Auto-dismiss after animation
    useEffect(() => {
        if (variant === "wormhole") {
            const timer = setTimeout(onComplete, 2500);
            return () => clearTimeout(timer);
        }
        // Starfield: animate year countdown then dismiss
        const interval = setInterval(() => {
            setTravelYear(prev => {
                const step = Math.max(1, Math.abs(prev - year) > 10 ? 3 : 1);
                const next = prev > year ? prev - step : prev + step;
                if (Math.abs(next - year) < step) {
                    clearInterval(interval);
                    setTimeout(onComplete, 800);
                    return year;
                }
                return next;
            });
        }, 60);
        return () => clearInterval(interval);
    }, [year, variant, onComplete]);

    if (variant === "wormhole") {
        return (
            <div className="fixed inset-0 bg-black z-50 flex items-center justify-center overflow-hidden">
                <div className="relative">
                    {[...Array(6)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute rounded-full border-2 border-purple-500/30"
                            style={{
                                width: `${200 + i * 80}px`,
                                height: `${200 + i * 80}px`,
                                left: `${-(100 + i * 40)}px`,
                                top: `${-(100 + i * 40)}px`,
                                animation: `tm-spin ${3 + i * 0.5}s linear infinite ${i % 2 === 0 ? '' : 'reverse'}`,
                                opacity: 1 - i * 0.15,
                            }}
                        />
                    ))}
                    <div className="relative w-48 h-48 rounded-full bg-gradient-to-br from-purple-600 via-blue-500 to-purple-700 flex items-center justify-center animate-pulse">
                        <div className="absolute inset-4 rounded-full bg-black/80 flex items-center justify-center">
                            <div className="text-center">
                                <Clock className="h-12 w-12 mx-auto text-purple-400 animate-spin" style={{ animationDuration: '3s' }} />
                                <p className="text-purple-300 mt-2 text-sm font-medium">Calibrare temporală...</p>
                                <p className="text-3xl font-bold text-white mt-1">{year}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="absolute bottom-16 text-center">
                    <p className="text-purple-400 text-sm">Destinație</p>
                    <p className="text-white text-2xl font-bold">Concurs Admitere INM {year}</p>
                    <p className="text-purple-300 text-sm mt-1">{probaLabel}</p>
                </div>
                <style>{`
                    @keyframes tm-spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    // Starfield variant
    return (
        <div className="fixed inset-0 bg-gradient-to-b from-purple-950 via-black to-purple-950 flex items-center justify-center overflow-hidden z-50">
            <div className="absolute inset-0">
                {[...Array(50)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
                        style={{
                            left: `${(i * 37 + 13) % 100}%`,
                            top: `${(i * 53 + 7) % 100}%`,
                            animationDelay: `${(i * 0.04)}s`,
                        }}
                    />
                ))}
            </div>
            <div className="text-center z-10">
                <Clock className="h-20 w-20 mx-auto text-purple-400 animate-spin" style={{ animationDuration: '2s' }} />
                <p className="text-purple-300 mt-4 text-lg">Călătorie în timp...</p>
                <p className="text-6xl font-bold text-white mt-2 font-mono">{travelYear}</p>
                <p className="text-purple-300 text-sm mt-4">{probaLabel}</p>
            </div>
        </div>
    );
}
