import { useState, useEffect, useRef, useCallback } from "react";
import { formatTime } from "@/lib/constants";

interface UseExamTimerOptions {
    duration: number;
    paused: boolean;
    onTimeUp?: () => void;
}

interface UseExamTimerReturn {
    timeRemaining: number;
    isLowTime: boolean;
    formatted: string;
    elapsed: number;
}

export function useExamTimer({ duration, paused, onTimeUp }: UseExamTimerOptions): UseExamTimerReturn {
    const [timeRemaining, setTimeRemaining] = useState(duration);
    const onTimeUpRef = useRef(onTimeUp);
    onTimeUpRef.current = onTimeUp;

    useEffect(() => {
        if (paused) return;

        const timer = setInterval(() => {
            setTimeRemaining(prev => {
                const next = Math.max(0, prev - 1);
                if (next === 0) onTimeUpRef.current?.();
                return next;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [paused]);

    return {
        timeRemaining,
        isLowTime: timeRemaining < 1800,
        formatted: formatTime(timeRemaining),
        elapsed: duration - timeRemaining,
    };
}
