'use client';

import { cn } from '@/lib/utils';

interface BracketConnectorProps {
  matchCount: number;
  className?: string;
}

export function BracketConnector({ matchCount, className }: BracketConnectorProps) {
  if (matchCount <= 0) return null;

  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-around self-stretch',
        'w-8 shrink-0',
        className
      )}
    >
      {Array.from({ length: matchCount }).map((_, i) => (
        <div key={i} className="relative flex items-center h-full w-full">
          {/* Horizontal line from left (previous round) */}
          <div className="absolute left-0 top-1/2 h-0 w-2 border-t-2 border-border" />

          {/* Vertical line connecting pairs */}
          {matchCount > 1 && i % 2 === 0 && i + 1 < matchCount && (
            <div
              className="absolute right-2 border-r-2 border-border"
              style={{
                top: '50%',
                height: '100%',
              }}
            />
          )}
          {matchCount > 1 && i % 2 === 1 && (
            <div
              className="absolute right-2 border-r-2 border-border"
              style={{
                bottom: '50%',
                height: '100%',
              }}
            />
          )}

          {/* Horizontal line to right (next round) */}
          <div className="absolute right-0 top-1/2 h-0 w-2 border-t-2 border-border" />
        </div>
      ))}
    </div>
  );
}
