import type { KeyStat } from '../types/infographic';

interface Props {
  stat: KeyStat;
  index: number;
}

export default function StatCard({ stat, index }: Props) {
  return (
    <div
      className="infographic-card rounded-2xl p-5 flex flex-col gap-2 animate-slide-up"
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'backwards' }}
    >
      <div
        className="text-3xl font-display font-bold leading-none infographic-accent"
        aria-label={stat.value}
      >
        {stat.value}
      </div>
      <div className="infographic-text-primary font-semibold text-sm leading-snug">
        {stat.label}
      </div>
      <div className="infographic-text-muted text-xs leading-relaxed">
        {stat.context}
      </div>
    </div>
  );
}
