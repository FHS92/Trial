import type { Comparison } from '../types/infographic';

interface Props {
  comparisons: Comparison[];
}

function ComparisonItem({ item, index }: { item: Comparison; index: number }) {
  return (
    <div
      className="animate-slide-up"
      style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'backwards' }}
    >
      <p className="infographic-text-muted text-xs font-medium mb-3 uppercase tracking-widest">
        {item.label}
      </p>
      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
        {/* Left */}
        <div className="infographic-stat-bg rounded-xl p-4 text-center">
          <p className="infographic-text-primary font-bold text-xl font-display mb-1">
            {item.leftValue}
          </p>
          <p className="infographic-text-muted text-xs">
            {item.leftLabel}
          </p>
        </div>

        {/* VS */}
        <div className="infographic-text-muted font-bold text-sm">vs</div>

        {/* Right */}
        <div className="infographic-accent-bg rounded-xl p-4 text-center" style={{ opacity: 0.85 }}>
          <p className="text-white font-bold text-xl font-display mb-1">
            {item.rightValue}
          </p>
          <p className="text-white/70 text-xs">
            {item.rightLabel}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ComparisonBlock({ comparisons }: Props) {
  if (!comparisons || comparisons.length === 0) return null;

  return (
    <div className="infographic-card rounded-2xl p-6 animate-fade-in">
      <h3 className="infographic-text-primary font-bold text-base mb-5 flex items-center gap-2">
        <span className="w-6 h-6 rounded-md infographic-accent-bg flex items-center justify-center text-xs text-white font-bold opacity-80">≈</span>
        Comparisons
      </h3>
      <div className="space-y-6">
        {comparisons.map((item, i) => (
          <ComparisonItem key={i} item={item} index={i} />
        ))}
      </div>
    </div>
  );
}
