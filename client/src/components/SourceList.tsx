import { ExternalLink } from 'lucide-react';
import type { Source } from '../types/infographic';

interface Props {
  sources: Source[];
}

export default function SourceList({ sources }: Props) {
  return (
    <div className="infographic-card rounded-2xl p-6 animate-fade-in">
      <h3 className="infographic-text-primary font-bold text-base mb-4 flex items-center gap-2">
        <span className="w-6 h-6 rounded-md infographic-accent-bg flex items-center justify-center text-xs text-white font-bold opacity-80">S</span>
        Sources & References
      </h3>
      <div className="space-y-3">
        {sources.map((source, i) => (
          <div key={source.id} className="flex items-start gap-3 group">
            <span className="infographic-accent font-mono text-xs mt-0.5 shrink-0 w-6 text-right opacity-60">
              [{i + 1}]
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 flex-wrap">
                <span className="infographic-text-primary text-sm font-medium">{source.name}</span>
                {source.url && source.url !== 'https://github.com' && (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="infographic-accent text-xs flex items-center gap-0.5 opacity-70 hover:opacity-100 transition-opacity shrink-0 export-exclude"
                  >
                    <ExternalLink size={10} />
                    Visit
                  </a>
                )}
              </div>
              {source.note && (
                <p className="infographic-text-muted text-xs mt-0.5 leading-relaxed">
                  {source.note}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
      <p className="infographic-text-muted text-xs mt-4 pt-4 border-t infographic-border leading-relaxed">
        Data sourced from publicly available research, institutional reports, and authoritative publications.
        Always verify critical facts independently.
      </p>
    </div>
  );
}
