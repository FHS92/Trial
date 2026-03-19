import type { FactSection } from '../types/infographic';

interface Props {
  section: FactSection;
  index: number;
}

export default function FactSectionCard({ section, index }: Props) {
  return (
    <div
      className="infographic-card rounded-2xl p-6 animate-slide-up"
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'backwards' }}
    >
      <div className="flex items-start gap-4">
        <div
          className="infographic-accent-bg rounded-lg w-1 self-stretch shrink-0 opacity-60"
          style={{ minHeight: '100%' }}
        />
        <div className="flex-1 min-w-0">
          <h3 className="infographic-text-primary font-bold text-base mb-2 leading-snug">
            {section.heading}
          </h3>
          <p className="infographic-text-secondary text-sm leading-relaxed">
            {section.body}
          </p>
        </div>
      </div>
    </div>
  );
}
