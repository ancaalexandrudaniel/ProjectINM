import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Flame, Star, ArrowUp, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getBadgeInfo } from "@/lib/badge-catalog";

/** Shape of the completeNode API response */
export interface CompletionResult {
  success: boolean;
  xpGained: number;
  status: string;
  nodeId: string;
  leveledUp: boolean;
  newLevel: number;
  nextLevelXp: number;
  currentXp: number;
  streakUpdated: boolean;
  currentStreak: number;
  newBadges: string[];
}

interface CelebrationOverlayProps {
  result: CompletionResult | null;
  onClose: () => void;
}

// Confetti particle
function ConfettiParticle({ delay, color }: { delay: number; color: string }) {
  const left = Math.random() * 100;
  const size = 6 + Math.random() * 8;
  const duration = 2 + Math.random() * 1.5;

  return (
    <motion.div
      className="absolute rounded-sm pointer-events-none"
      style={{
        left: `${left}%`,
        top: "-5%",
        width: size,
        height: size,
        backgroundColor: color,
      }}
      initial={{ y: 0, opacity: 1, rotate: 0 }}
      animate={{
        y: "110vh",
        opacity: [1, 1, 0],
        rotate: Math.random() * 720 - 360,
        x: (Math.random() - 0.5) * 200,
      }}
      transition={{
        duration,
        delay,
        ease: "easeIn",
      }}
    />
  );
}

const CONFETTI_COLORS = [
  "#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1",
  "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8",
  "#F7DC6F", "#BB8FCE",
];

export default function CelebrationOverlay({ result, onClose }: CelebrationOverlayProps) {
  const [step, setStep] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  // Build the sequence of celebration "cards" to show
  const buildSteps = useCallback(() => {
    if (!result) return [];
    const steps: Array<{ type: string; data?: any }> = [];

    // Always show XP earned first
    steps.push({ type: "xp", data: { xp: result.xpGained, totalXp: result.currentXp } });

    // Level up
    if (result.leveledUp) {
      steps.push({ type: "levelup", data: { newLevel: result.newLevel } });
    }

    // Streak
    if (result.streakUpdated && result.currentStreak > 1) {
      steps.push({ type: "streak", data: { streak: result.currentStreak } });
    }

    // New badges — one card per badge
    if (result.newBadges && result.newBadges.length > 0) {
      for (const badgeId of result.newBadges) {
        const info = getBadgeInfo(badgeId);
        if (info) {
          steps.push({ type: "badge", data: info });
        }
      }
    }

    return steps;
  }, [result]);

  const steps_ = buildSteps();

  useEffect(() => {
    if (result) {
      setStep(0);
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [result]);

  if (!result || steps_.length === 0) return null;

  const currentStep = steps_[step];
  const isLastStep = step >= steps_.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onClose();
    } else {
      setStep((s) => s + 1);
      // Re-trigger confetti on level-up or badge
      if (steps_[step + 1]?.type === "levelup" || steps_[step + 1]?.type === "badge") {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

        {/* Confetti */}
        {showConfetti && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 50 }).map((_, i) => (
              <ConfettiParticle
                key={i}
                delay={Math.random() * 0.8}
                color={CONFETTI_COLORS[i % CONFETTI_COLORS.length]}
              />
            ))}
          </div>
        )}

        {/* Card */}
        <motion.div
          key={step}
          className="relative z-10 bg-card rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center border border-border"
          initial={{ scale: 0.5, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Step indicator */}
          {steps_.length > 1 && (
            <div className="flex justify-center gap-1.5 mb-6">
              {steps_.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === step ? "w-6 bg-primary" : "w-1.5 bg-muted"
                  }`}
                />
              ))}
            </div>
          )}

          {/* XP Card */}
          {currentStep.type === "xp" && (
            <div>
              <motion.div
                className="w-20 h-20 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4"
                initial={{ rotate: -15 }}
                animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <Sparkles className="h-10 w-10" />
              </motion.div>
              <motion.p
                className="text-4xl font-bold text-yellow-600 mb-1"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
              >
                +{currentStep.data.xp} XP
              </motion.p>
              <p className="text-muted-foreground text-sm mb-1">
                Total: {currentStep.data.totalXp.toLocaleString()} XP
              </p>
              <p className="text-lg font-medium mt-2">Nod completat!</p>
            </div>
          )}

          {/* Level Up Card */}
          {currentStep.type === "levelup" && (
            <div>
              <motion.div
                className="w-24 h-24 bg-gradient-to-br from-primary to-primary/60 text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4"
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ duration: 0.6 }}
              >
                <div className="text-center">
                  <ArrowUp className="h-6 w-6 mx-auto mb-0.5" />
                  <span className="text-3xl font-bold">{currentStep.data.newLevel}</span>
                </div>
              </motion.div>
              <motion.h2
                className="text-2xl font-bold mb-2"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                Level Up!
              </motion.h2>
              <p className="text-muted-foreground">
                Ai avansat la nivelul {currentStep.data.newLevel}!
              </p>
            </div>
          )}

          {/* Streak Card */}
          {currentStep.type === "streak" && (
            <div>
              <motion.div
                className="w-20 h-20 bg-orange-100 dark:bg-orange-900/30 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-4"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: 2, duration: 0.4 }}
              >
                <Flame className="h-10 w-10" />
              </motion.div>
              <p className="text-4xl font-bold text-orange-500 mb-1">
                {currentStep.data.streak} zile
              </p>
              <p className="text-lg font-medium">Streak!</p>
              <p className="text-muted-foreground text-sm mt-1">
                Continua sa studiezi in fiecare zi!
              </p>
            </div>
          )}

          {/* Badge Card */}
          {currentStep.type === "badge" && (
            <div>
              <motion.div
                className="text-6xl mb-4"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200 }}
              >
                {currentStep.data.emoji}
              </motion.div>
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <div className="inline-flex items-center gap-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full px-3 py-1 text-xs font-medium mb-3">
                  <Trophy className="h-3.5 w-3.5" />
                  Badge Nou!
                </div>
                <h2 className="text-xl font-bold mb-1">{currentStep.data.name}</h2>
                <p className="text-muted-foreground text-sm">{currentStep.data.description}</p>
              </motion.div>
            </div>
          )}

          {/* Next / Close button */}
          <Button className="mt-6 w-full" onClick={handleNext}>
            {isLastStep ? "Continuare" : "Mai departe"}
          </Button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
