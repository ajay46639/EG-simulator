import React, { useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  RotateCcw,
  X,
} from 'lucide-react';
import { AnimationStep } from '../animations/stepEngine';
import { useProjectStore } from '../state/useProjectStore';

interface AnimationBarProps {
  steps: AnimationStep[];
}

export const AnimationBar: React.FC<AnimationBarProps> = ({ steps }) => {
  const {
    animationActive,
    animationPlaying,
    animationStep,
    animationSpeed,
    setAnimationActive,
    setAnimationPlaying,
    setAnimationStep,
    setAnimationSpeed,
  } = useProjectStore();

  useEffect(() => {
    if (!animationActive || !animationPlaying) return;
    const timer = setInterval(() => {
      setAnimationStep(
        animationStep + 1 < steps.length ? animationStep + 1 : 0
      );
    }, animationSpeed);
    return () => clearInterval(timer);
  }, [animationActive, animationPlaying, animationStep, animationSpeed, steps.length, setAnimationStep]);

  if (!animationActive || steps.length === 0) return null;

  const current = steps[Math.min(animationStep, steps.length - 1)];

  return (
    <div className="no-print border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-blue-600/20 text-blue-400 border border-blue-500/30 shrink-0">
          STEP {current.stepNumber} / {steps.length}
        </span>
        <div className="min-w-0">
          <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
            {current.title}
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
            {current.explanation}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => {
            setAnimationPlaying(false);
            setAnimationStep(Math.max(0, animationStep - 1));
          }}
          disabled={animationStep === 0}
          className="p-1.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40"
          title="Previous Step"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          onClick={() => setAnimationPlaying(!animationPlaying)}
          className="px-2.5 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1"
          title="Play / Pause"
        >
          {animationPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span>{animationPlaying ? 'Pause' : 'Play'}</span>
        </button>

        <button
          onClick={() => {
            setAnimationPlaying(false);
            setAnimationStep(Math.min(steps.length - 1, animationStep + 1));
          }}
          disabled={animationStep >= steps.length - 1}
          className="p-1.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40"
          title="Next Step"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <button
          onClick={() => {
            setAnimationPlaying(false);
            setAnimationStep(0);
          }}
          className="p-1.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
          title="Reset Animation"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <select
          value={animationSpeed}
          onChange={(e) => setAnimationSpeed(Number(e.target.value))}
          className="text-xs bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-1 outline-none"
          title="Animation Speed"
        >
          <option value={2500}>0.5x</option>
          <option value={1800}>1x</option>
          <option value={900}>2x</option>
        </select>

        <button
          onClick={() => setAnimationActive(false)}
          className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400"
          title="Exit Step Mode"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
