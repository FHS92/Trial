interface Props {
  score: number;
  lastResearched: string;
}

function getConfidenceLabel(score: number): { label: string; color: string } {
  if (score >= 0.9) return { label: 'Very High', color: '#22c55e' };
  if (score >= 0.75) return { label: 'High', color: '#84cc16' };
  if (score >= 0.6) return { label: 'Moderate', color: '#f59e0b' };
  return { label: 'Low', color: '#ef4444' };
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function ConfidenceFooter({ score, lastResearched }: Props) {
  const { label, color } = getConfidenceLabel(score);
  const pct = Math.round(score * 100);

  return (
    <div className="infographic-card rounded-2xl p-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Confidence score */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="infographic-text-muted text-xs mb-1.5">Confidence Score</span>
            <div className="flex items-center gap-3">
              <div className="w-32 h-2 rounded-full infographic-surface-2 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: color }}
                />
              </div>
              <span className="font-bold text-sm" style={{ color }}>
                {pct}% · {label}
              </span>
            </div>
          </div>
        </div>

        {/* Last researched */}
        <div className="flex flex-col">
          <span className="infographic-text-muted text-xs mb-1">Last Researched</span>
          <span className="infographic-text-secondary text-sm font-medium">
            {formatDate(lastResearched)}
          </span>
        </div>
      </div>

      <p className="infographic-text-muted text-xs mt-3 leading-relaxed">
        Confidence score reflects data availability and source quality. Generated via AI synthesis — verify critical data with primary sources.
      </p>
    </div>
  );
}
