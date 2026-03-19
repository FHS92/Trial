import { useState, useEffect } from 'react';
import { Sparkles, AlertCircle } from 'lucide-react';

interface Props {
  onGenerate: (topic: string) => void;
  error?: string | null;
  initialTopic?: string;
}

const EXAMPLE_TOPICS = [
  'Renewable Energy',
  'Ancient Egypt',
  'Artificial Intelligence',
  'Global Coffee Market',
  'Space Exploration',
  'Climate Change',
  'Quantum Computing',
  'The Human Brain',
];

const ANIMATED_PLACEHOLDERS = [
  'Try "Renewable Energy"...',
  'Try "Ancient Rome"...',
  'Try "Quantum Computing"...',
  'Try "The Ocean"...',
  'Try "Climate Change"...',
];

export default function LandingPage({ onGenerate, error, initialTopic = '' }: Props) {
  const [topic, setTopic] = useState(initialTopic);
  const [inputError, setInputError] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const interval = setInterval(() => {
      setPlaceholderIndex(i => (i + 1) % ANIMATED_PLACEHOLDERS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = topic.trim();
    if (!trimmed) {
      setInputError('Please enter a topic to research.');
      return;
    }
    if (trimmed.length < 2) {
      setInputError('Topic must be at least 2 characters.');
      return;
    }
    setInputError('');
    onGenerate(trimmed);
  };

  const handleChipClick = (chip: string) => {
    setTopic(chip);
    setInputError('');
  };

  return (
    <div className="landing-bg min-h-screen flex flex-col items-center justify-center px-4 py-16 relative overflow-hidden">
      {/* Background orbs */}
      <div
        className="orb w-96 h-96 bg-indigo-600/20 top-[-80px] right-[-60px] animate-float"
        style={{ animationDelay: '0s' }}
      />
      <div
        className="orb w-80 h-80 bg-violet-600/15 bottom-[-60px] left-[-80px] animate-float"
        style={{ animationDelay: '2s' }}
      />
      <div
        className="orb w-64 h-64 bg-blue-500/10 top-1/2 left-1/4 animate-float"
        style={{ animationDelay: '4s' }}
      />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(99, 102, 241, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99, 102, 241, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Main content */}
      <div
        className={`relative z-10 w-full max-w-2xl mx-auto text-center transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      >
        {/* Logo / Brand */}
        <div className="flex items-center justify-center gap-3 mb-8 animate-fade-in">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5">
              <rect x="3" y="4" width="4" height="10" rx="1.5" fill="white" opacity="0.9" />
              <rect x="9" y="6" width="4" height="8" rx="1.5" fill="white" opacity="0.7" />
              <rect x="15" y="9" width="2" height="5" rx="1" fill="white" opacity="0.5" />
              <rect x="3" y="15.5" width="14" height="1.5" rx="0.75" fill="white" opacity="0.4" />
            </svg>
          </div>
          <span className="text-white font-bold text-xl tracking-tight">FactCanvas</span>
        </div>

        {/* Headline */}
        <h1
          className="text-5xl sm:text-6xl font-display font-bold text-white leading-tight mb-5 animate-slide-up"
          style={{ animationDelay: '100ms', opacity: 0, animation: 'slideUp 0.6s 0.1s ease-out forwards' }}
        >
          Turn any topic into a{' '}
          <span className="text-gradient">stunning infographic</span>
        </h1>

        {/* Subheading */}
        <p
          className="text-slate-400 text-lg sm:text-xl mb-10 max-w-lg mx-auto leading-relaxed"
          style={{ animation: 'slideUp 0.6s 0.2s ease-out forwards', opacity: 0 }}
        >
          AI-powered research, beautiful design, and source-backed facts — delivered instantly.
        </p>

        {/* Input form */}
        <form
          onSubmit={handleSubmit}
          className="mb-6"
          style={{ animation: 'slideUp 0.6s 0.3s ease-out forwards', opacity: 0 }}
        >
          <div className="relative">
            <input
              type="text"
              value={topic}
              onChange={e => {
                setTopic(e.target.value);
                if (inputError) setInputError('');
              }}
              placeholder={ANIMATED_PLACEHOLDERS[placeholderIndex]}
              className="glass-input w-full rounded-2xl px-6 py-5 text-lg text-white placeholder-slate-500 pr-36"
              maxLength={200}
              autoFocus
            />
            <button
              type="submit"
              className="btn-primary absolute right-2 top-1/2 -translate-y-1/2 px-6 py-3 rounded-xl text-white font-semibold flex items-center gap-2 shadow-lg"
            >
              <Sparkles size={16} />
              Generate
            </button>
          </div>

          {/* Input validation error */}
          {inputError && (
            <p className="mt-2 text-red-400 text-sm flex items-center gap-1.5">
              <AlertCircle size={14} />
              {inputError}
            </p>
          )}

          {/* API / generation error */}
          {error && !inputError && (
            <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-2">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </form>

        {/* Example chips */}
        <div
          className="flex flex-wrap gap-2 justify-center"
          style={{ animation: 'slideUp 0.6s 0.4s ease-out forwards', opacity: 0 }}
        >
          <span className="text-slate-500 text-sm mr-1 self-center">Try:</span>
          {EXAMPLE_TOPICS.map(chip => (
            <button
              key={chip}
              onClick={() => handleChipClick(chip)}
              className="px-4 py-1.5 rounded-full text-sm text-slate-300 border border-white/10 hover:border-indigo-400/50 hover:text-indigo-300 hover:bg-indigo-500/10 transition-all duration-200"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <p
        className="absolute bottom-6 text-slate-600 text-xs"
        style={{ animation: 'fadeIn 1s 1s ease-out forwards', opacity: 0 }}
      >
        Powered by Gemini AI · Demo mode active without API key
      </p>
    </div>
  );
}
