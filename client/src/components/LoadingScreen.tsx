import { useEffect, useState } from 'react';

interface Props {
  topic: string;
}

const STAGES = [
  { message: 'Researching trusted sources', icon: '🔍', duration: 2000 },
  { message: 'Extracting key facts & figures', icon: '📊', duration: 2500 },
  { message: 'Structuring infographic story', icon: '🗂️', duration: 2000 },
  { message: 'Validating citations & data', icon: '✅', duration: 1500 },
  { message: 'Rendering high-resolution infographic', icon: '🎨', duration: 2000 },
];

export default function LoadingScreen({ topic }: Props) {
  const [stageIndex, setStageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [dots, setDots] = useState('');

  useEffect(() => {
    let totalElapsed = 0;
    const totalDuration = STAGES.reduce((sum, s) => sum + s.duration, 0);
    const startTime = Date.now();

    // Animated dots
    const dotsInterval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 400);

    // Progress and stage advancement
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / totalDuration) * 95, 95);
      setProgress(pct);

      // Advance stage
      let cumulative = 0;
      for (let i = 0; i < STAGES.length; i++) {
        cumulative += STAGES[i].duration;
        if (elapsed < cumulative) {
          setStageIndex(i);
          break;
        }
      }
    }, 80);

    return () => {
      clearInterval(dotsInterval);
      clearInterval(progressInterval);
    };
  }, []);

  const currentStage = STAGES[stageIndex];

  return (
    <div className="landing-bg min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background orbs */}
      <div className="orb w-80 h-80 bg-indigo-600/20 top-[-40px] right-[-60px] animate-pulse-slow" />
      <div className="orb w-64 h-64 bg-violet-600/15 bottom-[-40px] left-[-60px] animate-pulse-slow" style={{ animationDelay: '1s' }} />

      <div className="relative z-10 w-full max-w-md mx-auto text-center animate-fade-in">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-12">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
              <rect x="3" y="4" width="4" height="10" rx="1.5" fill="white" opacity="0.9" />
              <rect x="9" y="6" width="4" height="8" rx="1.5" fill="white" opacity="0.7" />
              <rect x="15" y="9" width="2" height="5" rx="1" fill="white" opacity="0.5" />
            </svg>
          </div>
          <span className="text-white/60 font-medium text-sm">FactCanvas</span>
        </div>

        {/* Animated spinner */}
        <div className="relative w-20 h-20 mx-auto mb-8">
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20" />
          {/* Spinning arc */}
          <div
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-indigo-400 border-r-violet-400 animate-spin"
            style={{ animationDuration: '1.2s' }}
          />
          {/* Inner ring */}
          <div
            className="absolute inset-3 rounded-full border-2 border-transparent border-t-violet-400/60 animate-spin"
            style={{ animationDuration: '0.8s', animationDirection: 'reverse' }}
          />
          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center text-2xl">
            {currentStage.icon}
          </div>
        </div>

        {/* Topic display */}
        <div className="mb-4">
          <p className="text-slate-400 text-sm mb-1">Generating infographic for</p>
          <p className="text-white font-semibold text-xl">"{topic}"</p>
        </div>

        {/* Current stage message */}
        <div className="h-8 flex items-center justify-center mb-8">
          <p className="text-indigo-300 text-sm font-medium transition-all duration-300">
            {currentStage.message}{dots}
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-white/5 rounded-full h-1.5 mb-4 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Stage indicators */}
        <div className="flex justify-center gap-2 mt-4">
          {STAGES.map((stage, i) => (
            <div
              key={i}
              className={`transition-all duration-300 rounded-full ${
                i < stageIndex
                  ? 'w-2 h-2 bg-indigo-400'
                  : i === stageIndex
                  ? 'w-4 h-2 bg-indigo-400'
                  : 'w-2 h-2 bg-white/15'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
