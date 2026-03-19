import { useRef, useState } from 'react';
import { ArrowLeft, Share2, RefreshCw, Sun, Moon, Download, Check, Loader2 } from 'lucide-react';
import type { InfographicData, Theme } from '../types/infographic';
import InfographicCanvas from './InfographicCanvas';
import { exportInfographic } from '../lib/export';

interface Props {
  data: InfographicData;
  theme: Theme;
  topic: string;
  onBack: () => void;
  onRegenerate: () => void;
  onThemeToggle: () => void;
}

export default function InfographicPage({
  data,
  theme,
  topic,
  onBack,
  onRegenerate,
  onThemeToggle,
}: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleExport = async () => {
    if (!canvasRef.current || isExporting) return;
    setIsExporting(true);
    setExportSuccess(false);
    try {
      await exportInfographic(canvasRef.current, data.title);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleRegenerate = async () => {
    if (isRegenerating) return;
    setIsRegenerating(true);
    try {
      await onRegenerate();
    } finally {
      setIsRegenerating(false);
    }
  };

  const isDark = theme === 'midnight-data';

  return (
    <div
      className={`min-h-screen ${isDark ? 'bg-[#0D1117]' : 'bg-[#F0EDE5]'}`}
    >
      {/* Top bar */}
      <div
        className={`sticky top-0 z-50 border-b export-exclude ${
          isDark
            ? 'bg-[#0D1117]/90 border-[#21262D]'
            : 'bg-[#F8F7F2]/90 border-[#E5E2D8]'
        } backdrop-blur-md`}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          {/* Left: Back + topic */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onBack}
              className={`flex items-center gap-1.5 text-sm font-medium transition-all rounded-lg px-3 py-1.5 shrink-0 ${
                isDark
                  ? 'text-slate-400 hover:text-white hover:bg-white/8'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-black/5'
              }`}
            >
              <ArrowLeft size={15} />
              Back
            </button>
            <div className={`w-px h-4 ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-5 h-5 rounded bg-gradient-to-br from-indigo-500 to-violet-600 flex-shrink-0" />
              <span className={`font-semibold text-sm truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {topic}
              </span>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Theme toggle */}
            <button
              onClick={onThemeToggle}
              title={isDark ? 'Switch to Editorial Light' : 'Switch to Midnight Data'}
              className={`p-2 rounded-lg transition-all ${
                isDark
                  ? 'text-slate-400 hover:text-yellow-300 hover:bg-white/8'
                  : 'text-slate-600 hover:text-indigo-600 hover:bg-black/5'
              }`}
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* Regenerate */}
            <button
              onClick={handleRegenerate}
              disabled={isRegenerating}
              title="Regenerate"
              className={`p-2 rounded-lg transition-all ${
                isDark
                  ? 'text-slate-400 hover:text-white hover:bg-white/8 disabled:opacity-40'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-black/5 disabled:opacity-40'
              }`}
            >
              <RefreshCw size={16} className={isRegenerating ? 'animate-spin' : ''} />
            </button>

            {/* Export/Share */}
            <button
              onClick={handleExport}
              disabled={isExporting}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                exportSuccess
                  ? 'bg-green-500 text-white'
                  : 'btn-primary text-white'
              }`}
            >
              {isExporting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span className="hidden sm:inline">Exporting...</span>
                </>
              ) : exportSuccess ? (
                <>
                  <Check size={14} />
                  <span className="hidden sm:inline">Saved!</span>
                </>
              ) : (
                <>
                  <Share2 size={14} />
                  <span className="hidden sm:inline">Share</span>
                  <Download size={14} className="hidden sm:inline" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Infographic canvas */}
      <div className="py-6 px-2 sm:px-4">
        <div className="max-w-5xl mx-auto">
          <div
            className={`rounded-2xl overflow-hidden shadow-2xl ${
              isDark ? 'shadow-black/60' : 'shadow-black/15'
            }`}
          >
            <InfographicCanvas ref={canvasRef} data={data} theme={theme} />
          </div>
        </div>
      </div>

      {/* Footer note */}
      <div className="pb-8 text-center export-exclude">
        <p className={`text-xs ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
          Click <strong>Share</strong> to download as a high-resolution PNG image
        </p>
      </div>
    </div>
  );
}
