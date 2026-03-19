import type { TimelineItem } from '../types/infographic';

interface Props {
  items: TimelineItem[];
}

export default function TimelineBlock({ items }: Props) {
  if (!items || items.length === 0) return null;

  return (
    <div className="infographic-card rounded-2xl p-6 animate-fade-in">
      <h3 className="infographic-text-primary font-bold text-base mb-6 flex items-center gap-2">
        <span className="w-6 h-6 rounded-md infographic-accent-bg flex items-center justify-center text-xs text-white font-bold opacity-80">T</span>
        Timeline
      </h3>
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[52px] top-3 bottom-3 w-px infographic-accent-bg opacity-20" />

        <div className="space-y-0">
          {items.map((item, i) => (
            <div key={i} className="flex gap-4 items-start relative group">
              {/* Year bubble */}
              <div className="w-26 shrink-0 text-right pr-3">
                <span className="infographic-accent text-xs font-bold font-display tracking-wide">
                  {item.year}
                </span>
              </div>

              {/* Dot */}
              <div className="shrink-0 relative z-10 mt-1">
                <div className="w-3 h-3 rounded-full border-2 infographic-accent-bg opacity-80 border-transparent" />
              </div>

              {/* Content */}
              <div className="flex-1 pb-5">
                <p className="infographic-text-secondary text-sm leading-relaxed">
                  {item.event}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
