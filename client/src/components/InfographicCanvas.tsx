import { forwardRef } from 'react';
import type { InfographicData, Theme } from '../types/infographic';
import StatCard from './StatCard';
import FactSectionCard from './FactSectionCard';
import TimelineBlock from './TimelineBlock';
import ComparisonBlock from './ComparisonBlock';
import ChartBlock from './ChartBlock';
import SourceList from './SourceList';
import ConfidenceFooter from './ConfidenceFooter';

interface Props {
  data: InfographicData;
  theme: Theme;
}

const InfographicCanvas = forwardRef<HTMLDivElement, Props>(({ data, theme }, ref) => {
  return (
    <div
      ref={ref}
      className={`infographic-canvas ${theme === 'midnight-data' ? 'theme-midnight-data' : 'theme-editorial-light'}`}
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        {/* Header */}
        <div className="infographic-card rounded-2xl p-7 animate-slide-up">
          {/* Theme badge */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
              style={{
                background: theme === 'midnight-data' ? 'rgba(0,217,245,0.12)' : 'rgba(79,70,229,0.1)',
                color: theme === 'midnight-data' ? '#00D9F5' : '#4F46E5',
              }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: theme === 'midnight-data' ? '#00D9F5' : '#4F46E5' }}
              />
              {theme === 'midnight-data' ? 'Midnight Data' : 'Editorial Light'}
            </div>
            {/* FactCanvas watermark */}
            <div className="flex items-center gap-1.5 opacity-40">
              <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
                <rect x="2" y="3" width="3" height="8" rx="1" fill="currentColor" className="infographic-text-muted" />
                <rect x="7" y="5" width="3" height="6" rx="1" fill="currentColor" className="infographic-text-muted" />
                <rect x="12" y="7" width="2" height="4" rx="0.5" fill="currentColor" className="infographic-text-muted" />
              </svg>
              <span className="infographic-text-muted text-xs font-medium">FactCanvas</span>
            </div>
          </div>

          <h1 className="font-display font-bold text-3xl sm:text-4xl infographic-text-primary leading-tight mb-2">
            {data.title}
          </h1>
          <p
            className="text-lg font-medium mb-4 leading-snug"
            style={{ color: theme === 'midnight-data' ? '#00D9F5' : '#4F46E5' }}
          >
            {data.subtitle}
          </p>
          <p className="infographic-text-secondary text-sm sm:text-base leading-relaxed">
            {data.summary}
          </p>
        </div>

        {/* Key Stats Grid */}
        {data.keyStats.length > 0 && (
          <div>
            <h2 className="infographic-text-muted text-xs font-bold uppercase tracking-widest mb-3 px-1">
              Key Statistics
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {data.keyStats.map((stat, i) => (
                <StatCard key={i} stat={stat} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* Charts */}
        {data.charts && data.charts.length > 0 && (
          <div>
            <h2 className="infographic-text-muted text-xs font-bold uppercase tracking-widest mb-3 px-1">
              Data Visualizations
            </h2>
            <div className="space-y-4">
              {data.charts.map((chart, i) => (
                <ChartBlock key={i} chart={chart} theme={theme} />
              ))}
            </div>
          </div>
        )}

        {/* Fact Sections */}
        {data.factSections.length > 0 && (
          <div>
            <h2 className="infographic-text-muted text-xs font-bold uppercase tracking-widest mb-3 px-1">
              Key Insights
            </h2>
            <div className="space-y-3">
              {data.factSections.map((section, i) => (
                <FactSectionCard key={i} section={section} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* Timeline */}
        {data.timeline && data.timeline.length > 0 && (
          <TimelineBlock items={data.timeline} />
        )}

        {/* Comparisons */}
        {data.comparisons && data.comparisons.length > 0 && (
          <ComparisonBlock comparisons={data.comparisons} />
        )}

        {/* Sources */}
        <SourceList sources={data.sources} />

        {/* Confidence Footer */}
        <ConfidenceFooter
          score={data.confidenceScore}
          lastResearched={data.lastResearched}
        />
      </div>
    </div>
  );
});

InfographicCanvas.displayName = 'InfographicCanvas';

export default InfographicCanvas;
